import { entrarComo, expect, simularApi, test } from "./apoio.js";

// Tela de Sensores: selo Online/Offline e último contato vindos de GET /dispositivos (API simulada).

test.beforeEach(async ({ page }) => {
  await entrarComo(page, "gestor");
  await simularApi(page);
});


test("QA-SENSORES selo: Online com último contato e Offline sem contato", async ({ page }) => {

  await page.goto("/sensores");

  const linhas = page.locator("table.tabela tbody tr");

  const online = linhas.filter({ hasText: "esp32-teste-01" });
  await expect(online.locator('[data-conexao="online"]')).toHaveText("Online");
  await expect(online.locator("[data-ultimo-contato]")).toHaveText(/^Último contato: \d{2}\/\d{2} \d{2}:\d{2}$/);

  const offline = linhas.filter({ hasText: "esp32-teste-02" });
  await expect(offline.locator('[data-conexao="offline"]')).toHaveText("Offline");
  await expect(offline.locator("[data-ultimo-contato]")).toHaveText("Sem contato");

});
