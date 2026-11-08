import {
  entrarComo,
  errosDoConsole,
  expect,
  simularApi,
  simularAssistente,
  test,
  tokenFalso,
  USUARIOS
} from "./apoio.js";

// Assistente do painel (POST /assistente, com token), sempre simulado.
// Botão "Assistente" em toda tela logada e em nenhuma pública; sugestão,
// histórico, avisos de erro, Escape, celular e impressão.

const LOGADAS = [
  { rota: "/dashboard", titulo: "Visão Geral" },
  { rota: "/veiculos", titulo: "Veículos" },
  { rota: "/sensores", titulo: "Sensores" },
  { rota: "/viagens", titulo: "Viagens" },
  { rota: "/alertas", titulo: "Alertas" },
  { rota: "/relatorios", titulo: "Relatórios" },
  { rota: "/configuracoes", titulo: "Configurações" }
];

const PUBLICAS = ["/", "/login", "/cadastro", "/usuarios", "/auditoria", "/cadastro-usuario", "/logistica", "/monitoramento"];

const INDISPONIVEL = "O assistente está indisponível agora. Tente de novo em instantes.";

const RESPOSTA = {
  resposta: "Você tem 1 veículo cadastrado.\nVAN-01 está com 6,0 °C (Normal).",
  fontes: ["veículos", "últimas leituras"],
  origem: "ia"
};


const botao = page => page.getByRole("button", { name: "Assistente", exact: true });
const painel = page => page.getByRole("dialog", { name: "Assistente do painel" });
const campo = page => page.getByLabel("Sua pergunta ao assistente");


async function abrirAssistente(page, rota = "/dashboard") {

  await page.goto(rota);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await botao(page).click();
  await expect(painel(page)).toBeVisible();

}


for (const perfil of ["gestor", "operador"]) {

  test(`QA-ASSIST-01 (${perfil}): botão Assistente nas 7 telas logadas`, async ({ page }) => {

    await entrarComo(page, perfil);
    await simularApi(page);
    const erros = errosDoConsole(page);

    for (const tela of LOGADAS) {
      await page.goto(tela.rota);
      await expect(page.getByRole("heading", { level: 1, name: tela.titulo })).toBeVisible();
      await expect(botao(page), `botão em ${tela.rota}`).toBeVisible();
      await expect(botao(page)).toHaveAttribute("aria-expanded", "false");
    }

    expect(erros, erros.join("\n")).toEqual([]);

  });

}


test("QA-ASSIST-02: telas públicas não têm o assistente do painel", async ({ page }) => {

  await simularApi(page);

  for (const rota of PUBLICAS) {
    await page.goto(rota);
    await page.locator("a[href]:visible, button:visible").first().waitFor();
    await expect(page.locator("#assistenteBotao"), rota).toHaveCount(0);
  }

});


test("QA-ASSIST-03: sugestão pergunta com token e mostra resposta com fontes", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  const pedidos = await simularAssistente(page, () => ({ json: RESPOSTA, atraso: 600 }));

  await abrirAssistente(page);

  await expect(painel(page)).toContainText("Olá, Gestora!");
  await expect(campo(page)).toBeFocused();

  await page.getByRole("button", { name: "Como estão meus veículos agora?" }).click();

  // Esperando a resposta: indicador, campo e envio desligados.
  await expect(painel(page).getByText("Assistente digitando…")).toBeVisible();
  await expect(campo(page)).toBeDisabled();
  await expect(painel(page).getByRole("button", { name: "Enviar" })).toBeDisabled();

  const resposta = painel(page).locator(".assistente-msg-assistente").last();
  await expect(resposta).toContainText("Você tem 1 veículo cadastrado.");
  await expect(resposta.locator(".assistente-fontes")).toHaveText("Fontes: veículos, últimas leituras");
  await expect(painel(page).getByText("Assistente digitando…")).toHaveCount(0);

  // Quebra de linha preservada (texto puro, sem HTML).
  const texto = await resposta.evaluate(el => el.firstChild.textContent);
  expect(texto).toBe(RESPOSTA.resposta);

  expect(pedidos).toHaveLength(1);
  expect(pedidos[0].corpo).toEqual({ pergunta: "Como estão meus veículos agora?" });
  expect(pedidos[0].autorizacao).toMatch(/^Bearer .+\..+\..+/);

  // As sugestões somem depois da primeira pergunta.
  await expect(page.getByRole("button", { name: "Como cadastro um sensor?" })).toHaveCount(0);

});


test("QA-ASSIST-04: segunda pergunta (Enter) leva o histórico no corpo", async ({ page }) => {

  await entrarComo(page, "operador");
  await simularApi(page);
  const pedidos = await simularAssistente(page, (_corpo, numero) => ({
    json: { resposta: `Resposta ${numero}`, fontes: [], origem: "ia" }
  }));

  await abrirAssistente(page, "/alertas");

  await page.getByRole("button", { name: "Teve alerta nas últimas 24 h?" }).click();
  await expect(painel(page).getByText("Resposta 1")).toBeVisible();

  await campo(page).fill("E qual foi a temperatura mais alta?");
  await campo(page).press("Enter");
  await expect(painel(page).getByText("Resposta 2")).toBeVisible();

  expect(pedidos[1].corpo).toEqual({
    pergunta: "E qual foi a temperatura mais alta?",
    historico: [
      { papel: "usuario", texto: "Teve alerta nas últimas 24 h?" },
      { papel: "assistente", texto: "Resposta 1" }
    ]
  });

  // Trocar de tela pelo menu (SPA) mantém a conversa.
  await page.getByRole("link", { name: /Relatórios/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Relatórios" })).toBeVisible();
  await botao(page).click();
  await expect(painel(page).getByText("Resposta 2")).toBeVisible();

});


test("QA-ASSIST-05: 429 mostra o aviso da API", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  await simularAssistente(page, () => ({
    status: 429,
    json: { erros: ["muitas perguntas seguidas. Tente de novo em 1 min."] }
  }));

  await abrirAssistente(page);
  await campo(page).fill("Quantos sensores eu tenho?");
  await painel(page).getByRole("button", { name: "Enviar" }).click();

  await expect(painel(page).locator(".assistente-msg-erro"))
    .toHaveText("muitas perguntas seguidas. Tente de novo em 1 min.");
  await expect(campo(page)).toBeEnabled();

});


test("QA-ASSIST-06: 503 (padrão sem simulação) mostra o aviso de indisponível", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);

  await abrirAssistente(page, "/veiculos");
  await page.getByRole("button", { name: "Como cadastro um sensor?" }).click();

  await expect(painel(page).locator(".assistente-msg-erro")).toHaveText(INDISPONIVEL);

});


test("QA-ASSIST-07: Escape fecha e o foco volta ao botão", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);

  await abrirAssistente(page, "/sensores");
  await expect(botao(page)).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");

  await expect(painel(page)).toBeHidden();
  await expect(botao(page)).toBeFocused();
  await expect(botao(page)).toHaveAttribute("aria-expanded", "false");

  // O × também fecha.
  await botao(page).click();
  await page.getByRole("button", { name: "Fechar assistente" }).click();
  await expect(painel(page)).toBeHidden();
  await expect(botao(page)).toBeFocused();

});


test("QA-ASSIST-08: sair e entrar de novo começa uma conversa nova", async ({ page }) => {

  await simularApi(page);
  await simularAssistente(page, () => ({ json: { resposta: "Primeira conversa.", fontes: [] } }));

  // Login pela tela (a sessão de addInitScript voltaria a cada documento).
  await page.route(/azurewebsites\.net\/api\/login$/, route => route.fulfill({
    json: { token: tokenFalso(USUARIOS.gestor), usuario: USUARIOS.gestor },
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }
  }));

  async function entrarPelaTela() {
    await page.locator("#email").fill(USUARIOS.gestor.email);
    await page.locator("#password").fill("senha-de-teste");
    await page.locator("#botaoEntrar").click();
    await expect(page.getByRole("heading", { level: 1, name: "Visão Geral" })).toBeVisible();
  }

  await page.goto("/login");
  await entrarPelaTela();

  await botao(page).click();
  await page.getByRole("button", { name: "O que o operador pode fazer?" }).click();
  await expect(painel(page).getByText("Primeira conversa.")).toBeVisible();

  await page.locator("#botaoSair").click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#assistenteBotao")).toHaveCount(0);

  // Mesmo documento (memória viva), mesmo token devolvido pelo login simulado:
  // quem apaga é o Sair, não a troca de token.
  await entrarPelaTela();
  await botao(page).click();

  await expect(painel(page).getByText("Primeira conversa.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "O que o operador pode fazer?" })).toBeVisible();

});


test.describe("QA-ASSIST - celular e impressão", () => {

  test.skip(({ isMobile }) => isMobile, "viewport fixo; roda só no projeto desktop");

  test("QA-ASSIST-09: 390 px com o painel aberto, sem rolagem horizontal e na largura toda", async ({ page }) => {

    await page.setViewportSize({ width: 390, height: 844 });
    await entrarComo(page, "gestor");
    await simularApi(page);
    await simularAssistente(page, () => ({ json: RESPOSTA }));

    for (const tela of LOGADAS) {
      await abrirAssistente(page, tela.rota);

      const medidas = await page.evaluate(() => ({
        conteudo: document.documentElement.scrollWidth,
        tela: window.innerWidth,
        util: document.documentElement.clientWidth
      }));
      expect(medidas.conteudo, `${tela.rota}: ${medidas.conteudo}px em ${medidas.tela}px`).toBeLessThanOrEqual(medidas.tela);

      // Medida depois da entrada (180 ms com scale), não no meio dela.
      await painel(page).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
      const caixa = await painel(page).boundingBox();
      // Largura toda da área útil (sem a barra de rolagem, quando existe).
      expect(Math.abs(caixa.width - medidas.util), `${tela.rota}: painel com ${caixa.width}px`).toBeLessThanOrEqual(1);
      expect(Math.round(caixa.x), tela.rota).toBe(0);
    }

    // Uma resposta longa também cabe.
    await page.getByRole("button", { name: "Como estão meus veículos agora?" }).click();
    await expect(painel(page).locator(".assistente-fontes")).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(390);

  });

  test("QA-ASSIST-10: o botão não cobre o rodapé no fim da página (390 px)", async ({ page }) => {

    await page.setViewportSize({ width: 390, height: 844 });
    await entrarComo(page, "gestor");
    await simularApi(page);

    await page.goto("/configuracoes");
    await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const rodape = await page.locator("footer").last().boundingBox();
    const caixaBotao = await botao(page).boundingBox();
    expect(rodape.y + rodape.height, "rodapé acima do botão flutuante").toBeLessThanOrEqual(caixaBotao.y);

  });

  test("QA-ASSIST-11: na impressão o assistente some (etiqueta QR limpa)", async ({ page }) => {

    await entrarComo(page, "gestor");
    await simularApi(page);

    await abrirAssistente(page, "/veiculos");
    await page.emulateMedia({ media: "print" });

    await expect(botao(page)).toBeHidden();
    await expect(page.locator(".assistente-painel")).toBeHidden();

    await page.emulateMedia({ media: "screen" });
    await expect(botao(page)).toBeVisible();

  });

});
