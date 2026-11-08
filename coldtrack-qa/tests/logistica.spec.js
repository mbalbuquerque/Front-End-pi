
const { test, expect } = require("@playwright/test");

test.describe("ColdTrack - Gestão Logística", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/logistica.html");
  });

  test("QA-023: página de logística carrega", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Gestão Logística" })
    ).toBeVisible();

    await expect(page.locator("#tabelaCargas")).toBeVisible();
  });

  test("QA-024: indicadores logísticos aparecem", async ({ page }) => {
    await expect(page.locator("#totalCargas")).toHaveText("3");
    await expect(page.locator("#cargasTransporte")).toHaveText("2");
    await expect(page.locator("#cargasAtencao")).toHaveText("1");
    await expect(page.locator("#totalSensores")).toHaveText("3");
  });

  test("QA-025: pesquisa por produto funciona", async ({ page }) => {
    await page.locator("#pesquisaCarga").fill("Manga");

    const linhas = page.locator("#tabelaCargas tr");

    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText("Manga");
    await expect(linhas.first()).toContainText("CT-002");
  });

  test("QA-026: filtro por situação funciona", async ({ page }) => {
    await page.locator("#filtroStatus").selectOption("Atenção");

    const linhas = page.locator("#tabelaCargas tr");

    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText("CT-002");
    await expect(linhas.first()).toContainText("Atenção");
  });

  test("QA-027: cadastro de carga válida", async ({ page }) => {
    await page.locator("#btnNovaCarga").click();

    await expect(page.locator("#modalCarga")).toBeVisible();

    await page.locator("#produto").fill("Morango");
    await page.locator("#origem").fill("Gravatá/PE");
    await page.locator("#destino").fill("Recife/PE");
    await page.locator("#sensor").fill("ESP32-04");
    await page.locator("#tempMin").fill("2");
    await page.locator("#tempMax").fill("6");

    await page.getByRole("button", {
      name: "Cadastrar carga demonstrativa"
    }).click();

    await expect(page.locator("#modalCarga")).not.toBeVisible();

    await expect(page.locator("#tabelaCargas")).toContainText("Morango");
    await expect(page.locator("#tabelaCargas")).toContainText("CT-004");
    await expect(page.locator("#totalCargas")).toHaveText("4");
  });

  test("QA-028: rejeita temperatura inválida", async ({ page }) => {
    await page.locator("#btnNovaCarga").click();

    await page.locator("#produto").fill("Uva");
    await page.locator("#origem").fill("Petrolina/PE");
    await page.locator("#destino").fill("Recife/PE");
    await page.locator("#sensor").fill("ESP32-05");

    // Temperatura mínima maior que a máxima.
    await page.locator("#tempMin").fill("15");
    await page.locator("#tempMax").fill("5");

    await page.getByRole("button", {
      name: "Cadastrar carga demonstrativa"
    }).click();

    await expect(page.locator("#mensagemForm")).toContainText(
      "faixa de temperatura válida"
    );

    await expect(page.locator("#totalCargas")).toHaveText("3");
    await expect(page.locator("#modalCarga")).toBeVisible();
  });

  test("QA-029: detalhes da carga são exibidos", async ({ page }) => {
    const linha = page.locator("#tabelaCargas tr").filter({
      hasText: "CT-001"
    });

    await linha.getByRole("button", { name: "Detalhes" }).click();

    await expect(page.locator("#modalDetalhes")).toBeVisible();

    await expect(page.locator("#conteudoDetalhes")).toContainText("CT-001");
    await expect(page.locator("#conteudoDetalhes")).toContainText("Uva");
    await expect(page.locator("#conteudoDetalhes")).toContainText("ESP32-01");

    await page.locator("#fecharDetalhes").click();

    await expect(page.locator("#modalDetalhes")).not.toBeVisible();
  });

  test("QA-030: clique real no menu Dashboard", async ({ page }) => {
    const linkDashboard = page.locator(
      'nav a[href="dashboard.html"]'
    );

    await expect(linkDashboard).toBeVisible();
    await linkDashboard.click();

    await expect(page).toHaveURL(/\/dashboard\.html$/);
    await expect(page.locator("body")).toBeVisible();
  });

});
