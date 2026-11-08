import { expect, test } from "@playwright/test";
import { ESTADO, TEM_CREDENCIAIS, chamarApi, errosDoConsole, tokenDe } from "./apoio-real.js";

// Parte pública do site publicado: home, carrossel, menu, âncoras, chat,
// URLs antigas e rotas limpas. Nada aqui grava na API.

const ROTAS_LIMPAS = [
  "/", "/login", "/cadastro", "/dashboard", "/alertas", "/relatorios", "/veiculos",
  "/sensores", "/viagens", "/configuracoes", "/usuarios", "/auditoria",
  "/cadastro-usuario", "/logistica", "/monitoramento"
];

const SECOES = ["inicio", "projeto", "diferencial", "quem-somos", "contato"];


test.describe("Home", () => {

  // Sem avanço automático do carrossel: o teste controla o slide.
  test.use({ reducedMotion: "reduce" });

  test("REAL-PUB-01: home carrega com título, carrossel e sem erro no console", async ({ page }) => {

    const erros = errosDoConsole(page);
    const resposta = await page.goto("/");

    expect(resposta.status()).toBe(200);
    await expect(page).toHaveTitle("ColdTrack Control | Monitoramento da Cadeia Fria");
    await expect(page.locator("#header")).toBeVisible();
    await expect(page.locator("#inicio")).toBeVisible();

    const pontos = page.locator("#sliderDots button");
    const total = await pontos.count();
    expect(total).toBeGreaterThan(1);
    await expect(pontos.nth(0)).toHaveClass(/active/);

    await page.locator("#nextSlide").click();
    await expect(pontos.nth(1)).toHaveClass(/active/);
    await expect(pontos.nth(0)).not.toHaveClass(/active/);

    await page.locator("#prevSlide").click();
    await expect(pontos.nth(0)).toHaveClass(/active/);

    // Seta para trás no primeiro slide volta ao último.
    await page.locator("#prevSlide").click();
    await expect(pontos.nth(total - 1)).toHaveClass(/active/);

    await pontos.nth(1).click();
    await expect(pontos.nth(1)).toHaveClass(/active/);

    expect(erros, erros.join("\n")).toEqual([]);

  });

  test("REAL-PUB-02: âncoras do menu levam a cada seção (1280 px)", async ({ page }) => {

    await page.goto("/");

    for (const secao of SECOES) {
      await page.locator(`#menu a[href="#${secao}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${secao}$`));
      await expect(page.locator(`#${secao}`)).toBeInViewport();
    }

    // Link direto com âncora (o antigo /#projeto).
    await page.goto("/#contato");
    await expect(page.locator("#contato")).toBeInViewport();

  });

  test("REAL-PUB-03: menu do celular abre, navega e fecha (390 px)", async ({ page }) => {

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const botao = page.locator("#menuToggle");
    await expect(botao).toBeVisible();
    await expect(botao).toHaveAttribute("aria-expanded", "false");

    await botao.click();
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#menu")).toHaveClass(/open/);

    await page.locator('#menu a[href="#quem-somos"]').click();
    await expect(page).toHaveURL(/#quem-somos$/);
    await expect(page.locator("#menu")).not.toHaveClass(/open/);
    await expect(page.locator("#quem-somos")).toBeInViewport();

    const medidas = await page.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: window.innerWidth }));
    expect(medidas.conteudo).toBeLessThanOrEqual(medidas.tela);

  });

});


test.describe("Chat de atendimento", () => {

  async function abrir(page) {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("coldtrack_chat_avaliacoes_v1"));
    await page.locator("#ctChatToggle").click();
    await expect(page.locator("#ctChatPanel")).toBeVisible();
    await expect(page.locator("#ctChatMessages")).toContainText("Bem-vindo ao ColdTrack Control");
  }

  async function perguntar(page, texto) {
    await page.locator("#ctChatInput").fill(texto);
    await page.locator("#ctChatForm button[type=submit]").click();
    await expect(page.locator(".ct-chat-message.typing")).toHaveCount(0);
    await expect(page.locator("#ctChatResolution")).toBeVisible();
  }

  // Pergunta rápida responde pelo FAQ local, sem chamar a IA.
  test("REAL-PUB-04: pergunta rápida responde e avaliação é salva", async ({ page }) => {

    await abrir(page);
    await page.locator('[data-question="Como funciona o monitoramento?"]').click();
    await expect(page.locator(".ct-chat-message.typing")).toHaveCount(0);
    await expect(page.locator("#ctChatResolution")).toBeVisible();
    await expect(page.locator("#ctChatMessages")).toContainText("API no Azure");

    await page.locator("#ctChatYes").click();
    await expect(page.locator("#ctChatRating")).toBeVisible();

    // Sem estrela: pede a nota.
    await page.locator("#ctChatSaveRating").click();
    await expect(page.locator("#ctChatRatingFeedback")).toContainText("Selecione uma nota");

    await page.locator('[data-star="5"]').click();
    await page.locator("#ctChatComment").fill("Teste e2e real");
    await page.locator("#ctChatSaveRating").click();
    await expect(page.locator("#ctChatSaveRating")).toBeDisabled();

    const avaliacoes = await page.evaluate(() => JSON.parse(localStorage.getItem("coldtrack_chat_avaliacoes_v1") || "[]"));
    expect(avaliacoes).toHaveLength(1);
    expect(avaliacoes[0]).toMatchObject({ nota: 5, resolvida: true, comentario: "Teste e2e real" });

  });

  // Campo livre: chat com Azure OpenAI (POST /chat). Cada execução da suíte
  // faz só 2 perguntas de verdade (REAL-PUB-05 e REAL-PUB-09), longe do
  // limite de uso por IP da rota.

  // Última resposta do assistente, já sem o "Digitando...".
  async function ultimaResposta(page) {
    const resposta = page.locator(".ct-chat-message.bot:not(.typing)").last();
    const texto = (await resposta.innerText()).trim();
    test.info().annotations.push({ type: "resposta do chat", description: texto });
    return { resposta, texto };
  }

  test("REAL-PUB-05: pergunta fora do assunto é recusada e oferece o WhatsApp com a dúvida", async ({ page }) => {

    await abrir(page);
    const pergunta = "Me passa uma receita de bolo de chocolate?";
    await perguntar(page, pergunta);

    const { texto } = await ultimaResposta(page);
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).toMatch(/whatsapp/i);
    // Veio da IA, não do FAQ local (plano B quando a rota falha).
    expect(texto).not.toContain("não tenho uma resposta cadastrada");
    expect(texto).not.toMatch(/farinha|forno|ovos/i);

    await page.locator("#ctChatNo").click();
    await expect(page.locator("#ctChatRating")).toBeVisible();

    const link = page.locator("#ctChatWhatsApp");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");

    const href = await link.getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/558196878213/);
    expect(new URL(href).searchParams.get("text")).toContain(pergunta);

  });

  test("REAL-PUB-09: pergunta sobre o ColdTrack recebe resposta da IA em português, com fontes", async ({ page }) => {

    await abrir(page);
    await perguntar(page, "Como o ColdTrack decide se a temperatura da carga está em atenção?");

    const { resposta, texto } = await ultimaResposta(page);
    expect(texto.length).toBeGreaterThan(40);
    expect(texto).toMatch(/\b(de|que|da|do|para|com|é)\b/i);
    expect(texto).toMatch(/[ãáâçéêíóôõú]/i);

    await expect(resposta.locator(".ct-chat-fontes")).toHaveText(/^Fontes: \S/);
    await expect(page.locator("#ctChatYes")).toBeVisible();

  });

});


test.describe("URLs e rotas", () => {

  test("REAL-PUB-06: rotas limpas e páginas antigas .html respondem 200", async ({ request }) => {

    const falhas = [];

    for (const rota of ROTAS_LIMPAS) {
      const antiga = rota === "/" ? "/index.html" : `${rota}.html`;
      for (const caminho of [rota, antiga]) {
        const resposta = await request.get(caminho, { maxRedirects: 0 });
        if (resposta.status() !== 200) falhas.push(`${caminho}: ${resposta.status()}`);
      }
    }

    expect(falhas, falhas.join("\n")).toEqual([]);

  });

  test("REAL-PUB-07: /login.html abre o login; /dashboard.html sem sessão vai ao login", async ({ page }) => {

    await page.goto("/login.html");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#loginForm")).toBeVisible();

    await page.goto("/dashboard.html?veiculo=CT-002");
    await expect(page).toHaveURL(/\/login$/);

  });

  test.describe("com sessão de gestor", () => {

    test.skip(!TEM_CREDENCIAIS, "sem credenciais");
    test.use({ storageState: ESTADO.gestor });

    test("REAL-PUB-08: etiqueta QR antiga /dashboard.html?veiculo=X abre o painel no veículo", async ({ page }) => {

      const { dados } = await chamarApi("/veiculos", { token: tokenDe("gestor") });
      const codigo = dados.veiculos[0]?.id || "SEM-VEICULO";

      await page.goto(`/dashboard.html?veiculo=${encodeURIComponent(codigo)}`);
      await expect(page).toHaveURL(new RegExp(`/dashboard\\?veiculo=${codigo}$`));
      await expect(page.getByRole("heading", { level: 1, name: "Visão Geral" })).toBeVisible();

      if (dados.veiculos.length) {
        await expect(page.locator("#veiculoCodigo")).toHaveText(codigo);
      }

    });

  });

});
