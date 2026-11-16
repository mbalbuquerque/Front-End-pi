import { entrarComo, errosDoConsole, expect, simularApi, test } from "./apoio.js";

// Card "Risco térmico da saída" do dashboard (rota GET /api/predict).
// API simulada: nada sai para o Azure. Valores de teste (apoio.js: predicao()).

const ROTA_PREDICT = /func-coldtrack-7319\.azurewebsites\.net\/api\/predict(\?|$)/;


test.describe("QA - Risco térmico da saída", () => {

  test.beforeEach(async ({ page }) => {
    await entrarComo(page, "operador");
    await simularApi(page);
  });

  test("QA-RISCO-01: mostra chance, nível, média geral e modelo para a hora atual", async ({ page }) => {

    const erros = errosDoConsole(page);
    const pedidos = [];
    page.on("request", pedido => {
      if (ROTA_PREDICT.test(pedido.url()) && pedido.method() === "GET") {
        pedidos.push(new URL(pedido.url()));
      }
    });

    await page.goto("/dashboard");

    const card = page.locator("#riscoSaida");
    await expect(card.getByRole("heading", { name: "Risco térmico da saída" })).toBeVisible();
    await expect(card.locator("#riscoSaidaChance")).toHaveText(/^(90|2)%$/);
    await expect(card.locator("#riscoSaidaNivel")).toHaveText(/RISCO (ALTO|BAIXO)/);
    await expect(card).toContainText("Média geral sem considerar mês e hora: 21%");
    await expect(card).toContainText("Modelo teste-v1");
    await expect(card).toContainText("não as leituras do sensor do baú");

    // Mês e hora de Recife, os mesmos do seletor.
    const agora = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Recife", month: "numeric", hour: "numeric", hourCycle: "h23"
    }).formatToParts(new Date());
    const parte = tipo => agora.find(p => p.type === tipo).value;
    expect(pedidos[0].searchParams.get("mes")).toBe(parte("month"));
    await expect(card.locator("#riscoSaidaHora")).toHaveValue(pedidos[0].searchParams.get("hora"));

    expect(erros).toEqual([]);

  });

  test("QA-RISCO-02: trocar a hora de saída consulta de novo", async ({ page }) => {

    await page.goto("/dashboard");
    const card = page.locator("#riscoSaida");
    await expect(card.locator("#riscoSaidaChance")).toBeVisible();

    const pedido = page.waitForRequest(r => ROTA_PREDICT.test(r.url()) && r.url().includes("hora=15"));
    await card.locator("#riscoSaidaHora").selectOption("15");
    await pedido;

    await expect(card.locator("#riscoSaidaChance")).toHaveText("90%");
    await expect(card.locator("#riscoSaidaNivel")).toHaveText("RISCO ALTO");
    await expect(card).toContainText("às 15h");

    await card.locator("#riscoSaidaHora").selectOption("3");
    await expect(card.locator("#riscoSaidaChance")).toHaveText("2%");
    await expect(card.locator("#riscoSaidaNivel")).toHaveText("RISCO BAIXO");

  });

  test("QA-RISCO-03: rota ainda não publicada (404) avisa sem quebrar o painel", async ({ page }) => {

    await page.route(ROTA_PREDICT, route => route.fulfill({
      status: 404,
      body: "",
      headers: { "Access-Control-Allow-Origin": "*" }
    }));

    await page.goto("/dashboard");

    const card = page.locator("#riscoSaida");
    await expect(card).toContainText("O modelo de risco ainda não está publicado nesta versão da API.");
    await expect(card.locator("#riscoSaidaChance")).toHaveCount(0);

    // O resto do dashboard segue com os dados.
    await expect(page.getByText("Azure conectado")).toBeVisible();
    await expect(page.locator("#veiculoCodigo")).toHaveText("VAN-01");
    await expect(page).toHaveURL(/\/dashboard$/);

  });

  test("QA-RISCO-04: falha da API mostra erro no card", async ({ page }) => {

    await page.route(ROTA_PREDICT, route => route.fulfill({
      status: 503,
      json: { erros: ["modelo indisponível"] },
      headers: { "Access-Control-Allow-Origin": "*" }
    }));

    await page.goto("/dashboard");

    const card = page.locator("#riscoSaida");
    await expect(card).toContainText("Não foi possível consultar o risco agora.");
    await expect(card.locator("#riscoSaidaChance")).toHaveCount(0);

  });

});
