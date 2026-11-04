
const { test, expect } = require("@playwright/test");

test.describe("QA - Assistente Virtual ColdTrack", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");

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
      .toContainText("ThingSpeak");
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
});
