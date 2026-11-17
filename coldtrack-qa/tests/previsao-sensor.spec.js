import { entrarComo, errosDoConsole, expect, previsaoSensor, simularApi, test } from "./apoio.js";

// Previsão da temperatura do sensor em 10 min (GET /api/predict/sensor) no
// dashboard e na tela do motorista. API simulada: nada sai para o Azure.

const ROTA_PREVISAO = /func-coldtrack-7319\.azurewebsites\.net\/api\/predict\/sensor(\?|$)/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

function responderPrevisao(page, status, json) {
  return page.route(ROTA_PREVISAO, route => route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers: CORS })
    : route.fulfill({ status, json, headers: CORS }));
}


test.describe("QA - Previsão em 10 min", () => {

  test("QA-PREV-01: dashboard mostra a recomendada com o método e os erros dos dois", async ({ page }) => {

    const erros = errosDoConsole(page);
    const pedidos = [];
    page.on("request", pedido => {
      if (ROTA_PREVISAO.test(pedido.url()) && pedido.method() === "GET") pedidos.push(new URL(pedido.url()));
    });

    await entrarComo(page, "operador");
    await simularApi(page);
    await page.goto("/dashboard");

    await expect(page.locator("#previsaoTexto")).toHaveText("Previsão 10 min: 11.8 °C — método: persistência");
    await expect(page.locator("#previsaoErros")).toContainText("modelo 0,342 °C · persistência 0,313 °C");
    await expect(page.locator("#previsaoErros")).toContainText("O modelo ainda não supera a persistência.");
    await expect(page.locator("#previsaoAviso")).toHaveCount(0);
    expect(pedidos[0].searchParams.get("deviceId")).toBe("esp32-teste-01");
    expect(erros).toEqual([]);

  });

  test("QA-PREV-02: antecipa a excursão com texto e cor", async ({ page }) => {

    await entrarComo(page, "operador");
    await simularApi(page);
    await responderPrevisao(page, 200, previsaoSensor({
      baseline: { para: new Date().toISOString(), temperatura: 17.5, status: "CRITICO" },
      antecipaExcursao: true
    }));
    await page.goto("/dashboard");

    const aviso = page.locator("#previsaoAviso");
    await expect(aviso).toContainText("Previsto: CRÍTICO em 10 min");
    await expect(aviso).toHaveClass(/previsao-aviso--critico/);

  });

  test("QA-PREV-03: sem previsão diz o motivo e não mostra número", async ({ page }) => {

    await entrarComo(page, "operador");
    await simularApi(page);
    await responderPrevisao(page, 200, previsaoSensor({ previsao: null, baseline: null, motivo: "historico_insuficiente" }));
    await page.goto("/dashboard");

    await expect(page.locator("#previsaoTexto")).toContainText("Sem previsão para 10 min.");
    await expect(page.locator("#previsaoTexto")).toContainText("10 min contínuos");
    await expect(page.locator("#previsaoTexto")).not.toContainText("°C");

  });

  test("QA-PREV-04: rota ainda não publicada (404): nada aparece e o painel segue", async ({ page }) => {

    await entrarComo(page, "operador");
    await simularApi(page);
    await responderPrevisao(page, 404, { erros: ["rota não encontrada"] });
    await page.goto("/dashboard");

    await expect(page.locator("#veiculoCodigo")).toHaveText("VAN-01");
    await expect(page.locator("#temperatura")).not.toContainText("--");
    await expect(page.locator("#previsaoSensor")).toHaveCount(0);

  });

  test("QA-PREV-05: motorista vê a previsão do próprio veículo, sem escolher sensor", async ({ page }) => {

    const pedidos = [];
    page.on("request", pedido => {
      if (ROTA_PREVISAO.test(pedido.url()) && pedido.method() === "GET") pedidos.push(new URL(pedido.url()));
    });

    await entrarComo(page, "motorista");
    await simularApi(page);
    await responderPrevisao(page, 200, previsaoSensor({
      baseline: { para: new Date().toISOString(), temperatura: 14.2, status: "ATENCAO" },
      antecipaExcursao: true
    }));
    await page.goto("/motorista");

    await expect(page.locator("#previsaoTexto")).toContainText("Previsão 10 min: 14.2 °C — método: persistência");
    await expect(page.locator("#previsaoAviso")).toContainText("Previsto: ATENÇÃO em 10 min");
    await expect(page.locator("#previsaoErros")).toHaveCount(0);
    expect(pedidos[0].search).toBe("");

  });

  test("QA-PREV-06: motorista com a rota fora do ar: tela igual à de antes", async ({ page }) => {

    await entrarComo(page, "motorista");
    await simularApi(page);
    await responderPrevisao(page, 503, { erros: ["modelo indisponível"] });
    await page.goto("/motorista");

    await expect(page.locator("#statusMotorista")).toHaveText("NORMAL");
    await expect(page.locator("#previsaoSensor")).toHaveCount(0);

  });

});
