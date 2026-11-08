import { entrarComo, errosDoConsole, expect, simularApi, simularSair, test } from "./apoio.js";

// Telas logadas com sessão de teste e API simulada (nada sai para o Azure).
// Cada tela abre com o título certo e sem erro no console, para os dois perfis.

const TELAS = [
  { rota: "/dashboard", titulo: "Visão Geral", documento: "ColdTrack Control" },
  { rota: "/alertas", titulo: "Alertas" },
  { rota: "/relatorios", titulo: "Relatórios" },
  { rota: "/veiculos", titulo: "Veículos" },
  { rota: "/sensores", titulo: "Sensores" },
  { rota: "/viagens", titulo: "Viagens" },
  { rota: "/configuracoes", titulo: "Configurações" }
];

// Controles que só o gestor vê (o operador só acompanha).
const SO_GESTOR = {
  "/veiculos": ["#painelNovo", "#formVeiculo"],
  "/sensores": ["#painelCabo", "#formSensor"],
  "/configuracoes": ["#painelUsuarios", "#formUsuario"]
};


for (const perfil of ["gestor", "operador"]) {

  test.describe(`QA - Painel logado (${perfil})`, () => {

    test.beforeEach(async ({ page }) => {
      await entrarComo(page, perfil);
      await simularApi(page);
    });

    for (const tela of TELAS) {

      test(`QA-PAINEL ${tela.rota} (${perfil}): abre com título e sem erro no console`, async ({ page }) => {

        const erros = errosDoConsole(page);

        await page.goto(tela.rota);

        await expect(page).toHaveURL(new RegExp(`${tela.rota}$`));
        await expect(page.getByRole("heading", { level: 1, name: tela.titulo })).toBeVisible();
        await expect(page).toHaveTitle(tela.documento || `${tela.titulo} · ColdTrack Control`);

        // Dados simulados chegaram: o selo do topo mostra a conexão.
        await expect(page.getByText("Azure conectado")).toBeVisible();

        const seletores = SO_GESTOR[tela.rota] || [];

        for (const seletor of seletores) {
          if (perfil === "gestor") {
            await expect(page.locator(seletor), `${seletor} deveria aparecer para o gestor`).toHaveCount(1);
          } else {
            await expect(page.locator(seletor), `${seletor} não deveria aparecer para o operador`).toHaveCount(0);
          }
        }

        expect(erros, `Erros no console em ${tela.rota}:\n${erros.join("\n")}`).toEqual([]);

      });

    }

  });

}


test("QA-PAINEL sair: botão Sair limpa a sessão e volta ao login", async ({ page }) => {

  await entrarComo(page, "operador");
  await simularApi(page);
  await page.goto("/alertas");
  await expect(page.getByRole("heading", { level: 1, name: "Alertas" })).toBeVisible();

  // addInitScript grava a sessão de novo a cada documento; aqui a navegação é da SPA.
  await page.locator("#botaoSair").click();

  await expect(page).toHaveURL(/\/login$/);
  const sessao = await page.evaluate(() => localStorage.getItem("coldtrack.sessao"));
  expect(sessao).toBeNull();

});


test("QA-SEG-01: Sair chama POST /sair com o Bearer e limpa a sessão", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  const pedidos = await simularSair(page, 204);

  await page.goto("/alertas");
  await expect(page.getByRole("heading", { level: 1, name: "Alertas" })).toBeVisible();

  const token = await page.evaluate(() => JSON.parse(localStorage.getItem("coldtrack.sessao")).token);

  await page.locator("#botaoSair").click();

  await expect(page).toHaveURL(/\/login$/);
  await expect.poll(() => pedidos.length).toBe(1);
  expect(pedidos[0].autorizacao).toBe(`Bearer ${token}`);
  expect(await page.evaluate(() => localStorage.getItem("coldtrack.sessao"))).toBeNull();

});


for (const status of [404, 500]) {

  test(`QA-SEG-02: Sair continua funcionando se /sair responde ${status}`, async ({ page }) => {

    await entrarComo(page, "operador");
    await simularApi(page);
    const pedidos = await simularSair(page, status);

    await page.goto("/alertas");
    await expect(page.getByRole("heading", { level: 1, name: "Alertas" })).toBeVisible();

    await page.locator("#botaoSair").click();

    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => pedidos.length).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem("coldtrack.sessao"))).toBeNull();

  });

}


test("QA-SEG-02: Sair continua funcionando se /sair não responde (rede cai)", async ({ page }) => {

  await entrarComo(page, "operador");
  await simularApi(page);
  await page.route(/azurewebsites\.net\/api\/sair(\?|$)/, route => route.abort());

  await page.goto("/alertas");
  await expect(page.getByRole("heading", { level: 1, name: "Alertas" })).toBeVisible();
  await page.locator("#botaoSair").click();

  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("coldtrack.sessao"))).toBeNull();

});


test("QA-SEG-09: lista de usuários não oferece Redefinir senha na linha do próprio gestor", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  await page.goto("/configuracoes");

  // Operador: tem Redefinir e Remover. Gestor logado (u-gestor): só "você".
  await expect(page.locator("[data-redefinir='u-operador']")).toHaveCount(1);
  await expect(page.locator("[data-redefinir='u-gestor']")).toHaveCount(0);
  await expect(page.locator("[data-remover-usuario='u-gestor']")).toHaveCount(0);
  await expect(page.locator("tr", { hasText: "Gestora Teste" }).getByText("você")).toBeVisible();

});
