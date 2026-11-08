import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";
import { CONTAS, ESTADO, MOTIVO_SEM_CREDENCIAIS, TEM_CREDENCIAIS } from "./apoio-real.js";

// REAL-AUTH-01/02: login pela tela das duas contas fixas, uma vez por execução.
// O storageState salvo aqui é reaproveitado pelos outros arquivos: nenhuma
// outra parte da suíte manda senha das contas fixas.
// Senha errada NUNCA vai para essas contas (5 erros bloqueiam por 15 min).

test.skip(!TEM_CREDENCIAIS, MOTIVO_SEM_CREDENCIAIS);

for (const perfil of ["gestor", "operador"]) {

  test(`REAL-AUTH-0${perfil === "gestor" ? 1 : 2}: login do ${perfil} pela tela`, async ({ page }) => {

    const { email, senha } = CONTAS[perfil];

    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(senha);

    const [resposta] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith("/login") && r.request().method() === "POST"),
      page.locator("#botaoEntrar").click()
    ]);

    // Senha recusada: para tudo aqui, sem tentar de novo.
    expect(resposta.status(), `login de ${perfil} recusado; confira as variáveis de ambiente`).toBe(200);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "Visão Geral" })).toBeVisible();
    await expect(page.locator(".usuario-menu")).toContainText(perfil === "gestor" ? "Gestor" : "Operador logístico");

    const sessao = await page.evaluate(() => JSON.parse(localStorage.getItem("coldtrack.sessao")));
    expect(sessao.usuario.id).toBe(email.toLowerCase());
    expect(sessao.usuario.perfil).toBe(perfil);
    expect(sessao.expiraEm).toBeGreaterThan(Date.now());

    mkdirSync(dirname(ESTADO[perfil]), { recursive: true });
    await page.context().storageState({ path: ESTADO[perfil] });

  });

}
