import { expect, test } from "@playwright/test";
import { ESTADO, MOTIVO_SEM_CREDENCIAIS, TEM_CREDENCIAIS, sessaoSalva } from "./apoio-real.js";

// Sessão no site publicado. O login em si (REAL-AUTH-01/02) está no
// login.setup.js; aqui só se reaproveita a sessão salva, sem mandar senha.

const LOGADAS = ["/dashboard", "/alertas", "/relatorios", "/veiculos", "/sensores", "/viagens", "/configuracoes"];

test.skip(!TEM_CREDENCIAIS, MOTIVO_SEM_CREDENCIAIS);


async function gravarSessao(page, sessao) {
  await page.goto("/login");
  await page.evaluate(valor => localStorage.setItem("coldtrack.sessao", valor), JSON.stringify(sessao));
}


test.describe("com sessão de gestor", () => {

  test.use({ storageState: ESTADO.gestor });

  test("REAL-AUTH-03: sessão continua depois de recarregar a página", async ({ page }) => {

    await page.goto("/veiculos");
    await expect(page.getByRole("heading", { level: 1, name: "Veículos" })).toBeVisible();
    await expect(page.getByText("Azure conectado")).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/veiculos$/);
    await expect(page.getByRole("heading", { level: 1, name: "Veículos" })).toBeVisible();
    await expect(page.getByText("Azure conectado")).toBeVisible();

    // Já logado, /login leva direto ao painel.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);

  });

  test("REAL-AUTH-04: Sair limpa a sessão e bloqueia as telas logadas", async ({ page }) => {

    await page.goto("/alertas");
    await expect(page.getByRole("heading", { level: 1, name: "Alertas" })).toBeVisible();

    await page.locator("#botaoSair").click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("coldtrack.sessao"))).toBeNull();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);

  });

});


test("REAL-AUTH-05: telas logadas sem sessão vão para /login", async ({ page }) => {

  for (const rota of LOGADAS) {
    await page.goto(rota);
    await expect(page, rota).toHaveURL(/\/login$/);
    await expect(page.locator("#loginForm")).toBeVisible();
  }

});


test("REAL-AUTH-06: token inválido (assinatura adulterada) volta para /login", async ({ page }) => {

  const sessao = sessaoSalva("gestor");
  const partes = sessao.token.split(".");
  const adulterado = `${partes[0]}.${partes[1]}.${"A".repeat(partes[2].length)}`;

  await gravarSessao(page, { ...sessao, token: adulterado });

  const [resposta] = await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/") && r.status() === 401),
    page.goto("/veiculos")
  ]);

  expect(resposta.status()).toBe(401);
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("coldtrack.sessao"))).toBeNull();

});


test("REAL-AUTH-07: sessão vencida (expiraEm no passado) volta para /login", async ({ page }) => {

  const sessao = sessaoSalva("gestor");

  await gravarSessao(page, { ...sessao, expiraEm: Date.now() - 60000 });

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

});
