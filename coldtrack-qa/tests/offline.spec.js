import { entrarComo, expect, simularApi, test } from "./apoio.js";

// Estado offline (issue #13): sem internet o navegador mostra a faixa fixa com a hora
// dos últimos dados recebidos; ao voltar, a faixa some. A API é simulada, nada sai para o Azure.

const TELAS = ["/dashboard", "/alertas", "/relatorios", "/veiculos", "/sensores", "/viagens", "/configuracoes"];

test.beforeEach(async ({ page }) => {
  await entrarComo(page, "gestor");
  await simularApi(page);
});


test("QA-OFFLINE online: a faixa não aparece", async ({ page }) => {

  await page.goto("/dashboard");
  await expect(page.locator("#fonteDados")).toHaveText("Azure conectado");
  await expect(page.locator("#faixaOffline")).toHaveCount(0);

});


test("QA-OFFLINE sem internet: faixa com a hora dos últimos dados, some ao voltar", async ({ page, context }) => {

  await page.goto("/dashboard");
  await expect(page.locator("#fonteDados")).toHaveText("Azure conectado");

  await context.setOffline(true);

  const faixa = page.locator("#faixaOffline");
  await expect(faixa).toBeVisible();
  await expect(faixa).toHaveText(/^Sem conexão — exibindo os últimos dados recebidos às \d{2}:\d{2}$/);
  await expect(page.locator("#fonteDados")).toHaveText("Sem internet");

  // Piso visual: texto >= 15px e peso >= 600.
  const estilo = await faixa.evaluate(el => {
    const css = getComputedStyle(el);
    return { tamanho: parseFloat(css.fontSize), peso: parseInt(css.fontWeight, 10), posicao: css.position };
  });
  expect(estilo.tamanho).toBeGreaterThanOrEqual(15);
  expect(estilo.peso).toBeGreaterThanOrEqual(600);
  expect(estilo.posicao).toBe("sticky");

  await context.setOffline(false);

  await expect(faixa).toHaveCount(0);
  await expect(page.locator("#fonteDados")).toHaveText("Azure conectado");

});


for (const rota of TELAS) {

  test(`QA-OFFLINE ${rota}: faixa presente sem internet`, async ({ page, context }) => {

    await page.goto(rota);
    await expect(page.locator("h1")).toBeVisible();

    await context.setOffline(true);
    await expect(page.locator("#faixaOffline")).toContainText("Sem conexão — exibindo os últimos dados recebidos às");

  });

}
