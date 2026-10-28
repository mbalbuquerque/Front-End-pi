
const { test, expect } = require("@playwright/test");

const URL = "/monitoramento.html";

const fake = feeds => ({ feeds });

const feed = (
  field1,
  field2,
  field3,
  date = new Date().toISOString()
) => ({
  created_at: date,
  field1,
  field2,
  field3
});

test.describe("QA - Monitoramento ColdTrack", () => {

  test(
    "QA-035: página abre e apresenta a fonte dos dados",
    async ({ page }) => {

      await page.route(
        "**/api.thingspeak.com/**",
        route => route.fulfill({
          json: fake([
            feed("6.2", "70", "-61")
          ])
        })
      );

      await page.goto(URL);

      await expect(
        page.getByRole("heading", {
          name: "Monitoramento de sensores"
        })
      ).toBeVisible();

      await expect(
        page.locator("#origemDados")
      ).toContainText("canal 3496439");
    }
  );

  test(
    "QA-036: leitura recente normal é exibida",
    async ({ page }) => {

      await page.route(
        "**/api.thingspeak.com/**",
        route => route.fulfill({
          json: fake([
            feed("6.2", "70", "-61")
          ])
        })
      );

      await page.goto(URL);

      await expect(
        page.locator("#temperatura")
      ).toHaveText("6.2");

      await expect(
        page.locator("#situacao")
      ).toHaveText("Normal");
    }
  );

  test(
    "QA-037: leitura acima de 20 graus é crítica",
    async ({ page }) => {

      await page.route(
        "**/api.thingspeak.com/**",
        route => route.fulfill({
          json: fake([
            feed("21.1", "65", "-63")
          ])
        })
      );

      await page.goto(URL);

      await expect(
        page.locator("#situacao")
      ).toHaveText("Crítico");
    }
  );

  test(
    "QA-038: falha de API não mostra leitura fictícia",
    async ({ page }) => {

      await page.route(
        "**/api.thingspeak.com/**",
        route => route.fulfill({
          status: 503,
          body: "Indisponível"
        })
      );

      await page.goto(URL);

      await expect(
        page.locator("#conexao")
      ).toHaveText("Indisponível");

      await expect(
        page.locator("#temperatura")
      ).toHaveText("—");
    }
  );

});
