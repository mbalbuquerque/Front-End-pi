import { entrarComo, expect, simularApi, test } from "./apoio.js";

// Publicação nova com a aba aberta (issue #69): o pedaço da tela de uma versão
// anterior sumiu do servidor (o Azure responde 404 com o index.html). A tela
// nunca fica em branco: recarrega uma vez e, se não resolver, mostra "Atualizar".

const PEDACO_VIAGENS = /\/assets\/Viagens-[\w-]+\.js$/;

// Igual ao site estático: arquivo que não existe volta 404 com o index.html.
function pedacoSumido(route) {
  return route.fulfill({ status: 404, contentType: "text/html", body: "<!doctype html><title>ColdTrack</title>" });
}


test("QA-VER-01: pedaço sumido recarrega uma vez e a tela abre", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);

  let falhas = 0;
  await page.route(PEDACO_VIAGENS, route => {
    if (falhas === 0) {
      falhas += 1;
      return pedacoSumido(route);
    }
    return route.continue();
  });

  await page.goto("/viagens");

  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page).toHaveURL(/\/viagens$/);
  await expect(page.getByRole("alert").filter({ hasText: "Atualizar" })).toHaveCount(0);
  expect(falhas).toBe(1);

});


test("QA-VER-02: pedaço que continua sumido mostra o aviso com Atualizar, não tela em branco", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  await page.route(PEDACO_VIAGENS, pedacoSumido);

  await page.goto("/viagens");

  await expect(page.getByRole("heading", { name: "Há uma versão nova do ColdTrack" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Atualizar" })).toBeVisible();

  // A trava da sessão impede um laço: a página recarregou só uma vez.
  const recargas = await page.evaluate(() => sessionStorage.getItem("coldtrack.recarga-versao"));
  expect(recargas).not.toBeNull();

  // Outra rota volta a funcionar sem recarregar.
  await page.evaluate(() => {
    history.pushState({}, "", "/dashboard");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { name: "Há uma versão nova do ColdTrack" })).toHaveCount(0);

});
