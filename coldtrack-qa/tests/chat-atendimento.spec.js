
import { expect, simularChat, test } from "./apoio.js";

// Sem simularChat, a rota /chat responde 503: o campo livre cai no FAQ local.

test.describe("QA - Assistente Virtual ColdTrack", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Cada teste começa com avaliações locais limpas.
    await page.evaluate(() => {
      localStorage.removeItem("coldtrack_chat_avaliacoes_v1");
    });

    await page.reload();
  });

  async function abrirChat(page) {
    await page.locator("#ctChatToggle").click();
    await expect(page.locator("#ctChatPanel")).toBeVisible();
  }

  async function perguntar(page, pergunta) {
    await page.locator("#ctChatInput").fill(pergunta);
    await page.locator("#ctChatForm button[type=submit]").click();

    // Aguarda o fim do indicador de digitação.
    await expect(
      page.locator(".ct-chat-message.typing")
    ).toHaveCount(0);

    await expect(
      page.locator("#ctChatResolution")
    ).toBeVisible();
  }

  test("QA-CHAT-01: botão do chat aparece na Home", async ({ page }) => {
    await expect(page.locator("#ctChatToggle")).toBeVisible();
    await expect(page.locator("#ctChatPanel")).toBeHidden();
  });

  test("QA-CHAT-02: abre e fecha corretamente", async ({ page }) => {
    await abrirChat(page);

    await page.locator("#ctChatClose").click();

    await expect(page.locator("#ctChatPanel")).toBeHidden();
    await expect(page.locator("#ctChatToggle"))
      .toHaveAttribute("aria-expanded", "false");
  });

  test("QA-CHAT-03: apresenta mensagem inicial", async ({ page }) => {
    await abrirChat(page);

    await expect(page.locator("#ctChatMessages"))
      .toContainText("Bem-vindo ao ColdTrack Control");
  });

  test("QA-CHAT-04: responde pergunta cadastrada", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "Como funciona o monitoramento?");

    await expect(page.locator("#ctChatMessages"))
      .toContainText("API no Azure");
  });

  test("QA-CHAT-05: trata pergunta desconhecida", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "Qual é a cor do caminhão lunar?");

    await expect(page.locator("#ctChatMessages"))
      .toContainText("não tenho uma resposta cadastrada");
  });

  test("QA-CHAT-06: apresenta resolução da dúvida", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "O que é ColdTrack?");

    await expect(page.locator("#ctChatYes")).toBeVisible();
    await expect(page.locator("#ctChatNo")).toBeVisible();
  });

  test("QA-CHAT-07: dúvida resolvida abre avaliação", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "O que é ColdTrack?");

    await page.locator("#ctChatYes").click();

    await expect(page.locator("#ctChatRating")).toBeVisible();
  });

  test("QA-CHAT-08: dúvida não resolvida abre avaliação", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "Qual é o preço?");

    await page.locator("#ctChatNo").click();

    await expect(page.locator("#ctChatRating")).toBeVisible();

    await expect(page.locator("#ctChatWhatsApp")).toBeVisible();
  });

  test("QA-CHAT-09: link do WhatsApp está correto", async ({ page }) => {
    await abrirChat(page);

    const link = page.locator("#ctChatWhatsApp");

    await expect(link).toHaveAttribute(
      "href",
      /https:\/\/wa\.me\/558196878213/
    );

    await expect(link).toHaveAttribute(
      "target",
      "_blank"
    );
  });

  test("QA-CHAT-10: WhatsApp inclui a dúvida", async ({ page }) => {
    await abrirChat(page);

    await perguntar(page, "Preciso de ajuda com o sensor");

    const url = await page.locator("#ctChatWhatsApp")
      .getAttribute("href");

    expect(url).toContain("558196878213");

    const mensagem = new URL(url).searchParams.get("text");

    expect(mensagem).toContain(
      "Preciso de ajuda com o sensor"
    );
  });

  test("QA-CHAT-11: exige seleção de estrelas", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "O que é ColdTrack?");

    await page.locator("#ctChatYes").click();
    await page.locator("#ctChatSaveRating").click();

    await expect(page.locator("#ctChatRatingFeedback"))
      .toContainText("Selecione uma nota");
  });

  test("QA-CHAT-12: salva avaliação no navegador", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "O que é ColdTrack?");

    await page.locator("#ctChatYes").click();

    await page.locator('[data-star="5"]').click();

    await page.locator("#ctChatComment")
      .fill("Atendimento excelente!");

    await page.locator("#ctChatSaveRating").click();

    const avaliacoes = await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem(
          "coldtrack_chat_avaliacoes_v1"
        ) || "[]"
      )
    );

    expect(avaliacoes).toHaveLength(1);
    expect(avaliacoes[0].nota).toBe(5);
    expect(avaliacoes[0].resolvida).toBe(true);
    expect(avaliacoes[0].comentario)
      .toBe("Atendimento excelente!");
  });

  test("QA-CHAT-13: impede envio duplicado da avaliação", async ({ page }) => {
    await abrirChat(page);
    await perguntar(page, "O que é ColdTrack?");

    await page.locator("#ctChatYes").click();
    await page.locator('[data-star="4"]').click();
    await page.locator("#ctChatSaveRating").click();

    await expect(page.locator("#ctChatSaveRating"))
      .toBeDisabled();

    const avaliacoes = await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem(
          "coldtrack_chat_avaliacoes_v1"
        ) || "[]"
      )
    );

    expect(avaliacoes).toHaveLength(1);
  });

  test("QA-CHAT-14: fecha com a tecla Escape", async ({ page }) => {
    await abrirChat(page);

    await page.keyboard.press("Escape");

    await expect(page.locator("#ctChatPanel")).toBeHidden();
  });

  test("QA-CHAT-15: mensagem não executa HTML", async ({ page }) => {
    await abrirChat(page);

    await perguntar(
      page,
      '<img src=x onerror=alert("teste")>'
    );

    await expect(
      page.locator("#ctChatMessages img")
    ).toHaveCount(0);

    await expect(page.locator("#ctChatMessages"))
      .toContainText("<img");
  });

  test("QA-CHAT-16: chat cabe na tela sem transbordamento", async ({ page }) => {
    await abrirChat(page);

    const medidas = await page.locator("#ctChatPanel")
      .evaluate(elemento => {
        const rect = elemento.getBoundingClientRect();

        return {
          esquerda: rect.left,
          direita: rect.right,
          topo: rect.top,
          baixo: rect.bottom,
          larguraTela: window.innerWidth,
          alturaTela: window.innerHeight
        };
      });

    expect(medidas.esquerda).toBeGreaterThanOrEqual(0);
    expect(medidas.direita)
      .toBeLessThanOrEqual(medidas.larguraTela + 1);
    expect(medidas.topo).toBeGreaterThanOrEqual(0);
    expect(medidas.baixo)
      .toBeLessThanOrEqual(medidas.alturaTela + 1);
  });

  // ---------------------------------------------------------
  // CHAT COM AZURE OPENAI (rota /chat simulada)
  // ---------------------------------------------------------

  const FONTES = ["README.md", "FAQ do chat"];

  const RESPOSTA_IA =
    "O ColdTrack acompanha a temperatura da carga.\n" +
    "- **Sensor** no baú\n" +
    "- API no Azure <b>sem HTML</b>";

  test("QA-CHAT-17: resposta da IA aparece como texto, com as fontes", async ({ page }) => {
    const pedidos = await simularChat(page, () => ({
      json: { resposta: RESPOSTA_IA, fontes: FONTES, origem: "ia" }
    }));

    await abrirChat(page);
    await perguntar(page, "Como o ColdTrack protege a carga?");

    const resposta = page.locator(".ct-chat-message.bot").last();

    await expect(resposta).toContainText("O ColdTrack acompanha a temperatura da carga.");
    await expect(resposta).toContainText("- **Sensor** no baú");
    await expect(resposta).toContainText("<b>sem HTML</b>");
    await expect(resposta.locator("b")).toHaveCount(0);

    // Quebras de linha preservadas (texto puro com white-space: pre-wrap).
    const texto = await resposta.evaluate(el => el.firstChild.textContent);
    expect(texto.split("\n")).toHaveLength(3);

    await expect(resposta.locator(".ct-chat-fontes"))
      .toHaveText("Fontes: README.md, FAQ do chat");

    // A IA respondeu: sem o aviso do WhatsApp.
    await expect(page.locator("#ctChatMessages"))
      .not.toContainText("logo abaixo do campo de mensagem");

    expect(pedidos).toEqual([{ pergunta: "Como o ColdTrack protege a carga?" }]);
  });

  test("QA-CHAT-18: sem fontes, não mostra a linha de fontes", async ({ page }) => {
    await simularChat(page, () => ({ json: { resposta: "Resposta sem fonte.", fontes: [], origem: "ia" } }));

    await abrirChat(page);
    await perguntar(page, "Pergunta qualquer sobre o projeto");

    await expect(page.locator("#ctChatMessages")).toContainText("Resposta sem fonte.");
    await expect(page.locator(".ct-chat-fontes")).toHaveCount(0);
  });

  test("QA-CHAT-19: mostra 'Digitando...' enquanto a IA responde", async ({ page }) => {
    await simularChat(page, () => ({
      atraso: 1500,
      json: { resposta: "Pronto.", fontes: FONTES, origem: "ia" }
    }));

    await abrirChat(page);

    await page.locator("#ctChatInput").fill("Como funciona o alerta?");
    await page.locator("#ctChatForm button[type=submit]").click();

    const digitando = page.locator(".ct-chat-message.typing");

    await expect(digitando).toHaveText("Digitando...");
    await expect(page.locator("#ctChatMessages")).toHaveAttribute("aria-live", "polite");
    await expect(page.locator("#ctChatResolution")).toBeHidden();

    await expect(digitando).toHaveCount(0);
    await expect(page.locator("#ctChatMessages")).toContainText("Pronto.");
    await expect(page.locator("#ctChatResolution")).toBeVisible();
    await expect(page.locator("#ctChatInput")).toBeFocused();
  });

  test("QA-CHAT-20: botão de enviar fica desabilitado e não há envio duplo", async ({ page }) => {
    const pedidos = await simularChat(page, () => ({
      atraso: 1500,
      json: { resposta: "Uma resposta só.", fontes: [], origem: "ia" }
    }));

    await abrirChat(page);

    const enviar = page.locator("#ctChatForm button[type=submit]");

    await page.locator("#ctChatInput").fill("Primeira pergunta");
    await enviar.click();

    await expect(enviar).toBeDisabled();
    await expect(page.locator("#ctChatInput")).toBeDisabled();

    // Tentativas durante a espera: clique forçado, Enter e pergunta rápida.
    await enviar.click({ force: true });
    await page.keyboard.press("Enter");
    await page.locator('[data-question="O que é ColdTrack?"]').click();

    await expect(page.locator(".ct-chat-message.typing")).toHaveCount(0);
    await expect(enviar).toBeEnabled();

    expect(pedidos).toHaveLength(1);
    await expect(page.locator(".ct-chat-message.user")).toHaveCount(1);
    await expect(page.locator("#ctChatMessages")).toContainText("Uma resposta só.");
  });

  test("QA-CHAT-21: IA fora do ar (503) cai no FAQ local", async ({ page }) => {
    const pedidos = await simularChat(page, () => ({
      status: 503,
      json: { erros: ["chat indisponível"] }
    }));

    await abrirChat(page);
    await perguntar(page, "Quais sensores são utilizados?");

    await expect(page.locator("#ctChatMessages")).toContainText("ESP32-C3 e sensor da família DHT");
    await expect(page.locator("#ctChatMessages")).not.toContainText("chat indisponível");
    await expect(page.locator(".ct-chat-fontes")).toHaveCount(0);

    expect(pedidos).toHaveLength(1);
  });

  test("QA-CHAT-22: IA sem resposta em 15 s cai no FAQ local", async ({ page }) => {
    test.setTimeout(60000);

    const pedidos = await simularChat(page, () => ({
      atraso: 20000,
      json: { resposta: "Tarde demais.", fontes: [], origem: "ia" }
    }));

    await abrirChat(page);

    await page.locator("#ctChatInput").fill("Como funciona o monitoramento?");

    const inicio = Date.now();
    await page.locator("#ctChatForm button[type=submit]").click();

    await expect(page.locator(".ct-chat-message.typing")).toHaveCount(0, { timeout: 20000 });

    const espera = Date.now() - inicio;

    expect(espera).toBeGreaterThanOrEqual(14000);
    expect(espera).toBeLessThan(19000);

    await expect(page.locator("#ctChatMessages")).toContainText("Cada sensor envia temperatura");
    await expect(page.locator("#ctChatMessages")).not.toContainText("Tarde demais.");
    await expect(page.locator("#ctChatResolution")).toBeVisible();

    expect(pedidos).toHaveLength(1);
  });

  test("QA-CHAT-23: muitas perguntas seguidas (429) mostra o aviso da API", async ({ page }) => {
    await simularChat(page, () => ({
      status: 429,
      json: { erros: ["muitas perguntas seguidas. Tente de novo em 1 min."] }
    }));

    await abrirChat(page);
    await perguntar(page, "Quais sensores são utilizados?");

    await expect(page.locator("#ctChatMessages"))
      .toContainText("muitas perguntas seguidas. Tente de novo em 1 min.");

    // 429 não cai no FAQ.
    await expect(page.locator("#ctChatMessages")).not.toContainText("sensor da família DHT");
  });

  test("QA-CHAT-24: manda as últimas perguntas e respostas como histórico", async ({ page }) => {
    const pedidos = await simularChat(page, (_corpo, numero) => ({
      json: { resposta: `Resposta ${numero}.`, fontes: ["FAQ do chat"], origem: "ia" }
    }));

    await abrirChat(page);

    // Manual não é turno de pergunta e resposta: não vai no histórico.
    await page.locator('[data-action="manual"]').click();

    await perguntar(page, "Pergunta um");
    await perguntar(page, "Pergunta dois");
    await perguntar(page, "Pergunta três");
    await perguntar(page, "Pergunta quatro");
    await perguntar(page, "Pergunta cinco");

    expect(pedidos).toHaveLength(5);
    expect(pedidos[0]).toEqual({ pergunta: "Pergunta um" });
    expect(pedidos[1]).toEqual({
      pergunta: "Pergunta dois",
      historico: [
        { papel: "usuario", texto: "Pergunta um" },
        { papel: "assistente", texto: "Resposta 1." }
      ]
    });

    // No máximo 6 mensagens: as 3 últimas trocas.
    expect(pedidos[4].historico).toEqual([
      { papel: "usuario", texto: "Pergunta dois" },
      { papel: "assistente", texto: "Resposta 2." },
      { papel: "usuario", texto: "Pergunta três" },
      { papel: "assistente", texto: "Resposta 3." },
      { papel: "usuario", texto: "Pergunta quatro" },
      { papel: "assistente", texto: "Resposta 4." }
    ]);
  });

  test("QA-CHAT-25: perguntas rápidas respondem pelo FAQ, sem chamar a IA", async ({ page }) => {
    const pedidos = await simularChat(page, () => ({
      json: { resposta: "Não devia aparecer.", fontes: [], origem: "ia" }
    }));

    await abrirChat(page);

    await page.locator('[data-question="Quais são os limites de temperatura?"]').click();
    await expect(page.locator("#ctChatResolution")).toBeVisible();

    await expect(page.locator("#ctChatMessages")).toContainText("perfil de carga");
    await expect(page.locator("#ctChatMessages")).not.toContainText("Não devia aparecer.");

    expect(pedidos).toHaveLength(0);
  });
});
