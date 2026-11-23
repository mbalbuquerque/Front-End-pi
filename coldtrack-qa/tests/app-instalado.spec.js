import { entrarComo, expect, simularApi, test } from "./apoio.js";

// App instalado (PWA, issue #74): o ícone na tela de início abre o start_url do
// manifest. Ele aponta para /login, que manda a sessão válida para a tela do
// perfil (motorista -> /motorista, gestor e operador -> /dashboard) sem chamar a
// API, e mostra o formulário a quem não está logado. No navegador, / continua
// sendo o site público. O "id" fica "/" (o start_url antigo) para o celular
// atualizar o app já instalado em vez de tratá-lo como outro app.

async function lerManifest(request) {

  const manifest = await (await request.get("/manifest.json")).json();

  return manifest;

}


test("QA-PWA manifest abre a plataforma e mantém a identidade do app instalado", async ({ request }) => {

  const manifest = await lerManifest(request);

  expect(manifest.start_url).toBe("/login");
  expect(manifest.id).toBe("/");
  expect(manifest.scope).toBe("/");
  expect(manifest.display).toBe("standalone");

});


test("QA-PWA sem sessão: o app instalado abre no login", async ({ page, request }) => {

  const { start_url: inicio } = await lerManifest(request);

  await page.goto(inicio);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#loginForm")).toBeVisible();

});


for (const [perfil, destino] of [["motorista", /\/motorista$/], ["operador", /\/dashboard$/], ["gestor", /\/dashboard$/]]) {

  test(`QA-PWA ${perfil} logado: o app instalado abre direto na tela dele`, async ({ page, request }) => {

    const { start_url: inicio } = await lerManifest(request);
    await entrarComo(page, perfil);
    await simularApi(page);

    await page.goto(inicio);
    await expect(page).toHaveURL(destino);
    await expect(page.locator("#loginForm")).toHaveCount(0);

  });

}


test("QA-PWA no navegador, / continua sendo o site público", async ({ page }) => {

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /Acessar Plataforma/ })).toBeVisible();

});
