import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  CARIMBO,
  ESTADO,
  MOTIVO_SEM_CREDENCIAIS,
  QA,
  TEM_CREDENCIAIS,
  aceitarDialogos,
  chamarApi,
  limparQa,
  tokenDe
} from "./apoio-real.js";

// Ciclo de vida de um usuário QA (operador), do cadastro pelo gestor até a
// remoção. Senha errada só vai para ESTE usuário descartável, nunca para as
// contas fixas.

test.skip(!TEM_CREDENCIAIS, MOTIVO_SEM_CREDENCIAIS);
test.describe.configure({ mode: "serial" });

const senha = () => `Qa-${randomBytes(9).toString("base64url")}`;

const SENHAS = { inicial: senha(), redefinida: senha(), trocada: senha() };

const linhaUsuario = page => page.locator("#painelUsuarios tbody tr", {
  has: page.locator("td", { hasText: new RegExp(`^${QA.usuarioEmail}$`) })
});


async function entrarPelaTela(page, email, senhaUsada) {

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(senhaUsada);

  const [resposta] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith("/api/login")),
    page.locator("#botaoEntrar").click()
  ]);

  return resposta.status();

}


test.afterAll(async () => {
  if (!TEM_CREDENCIAIS) return;
  const { falhas } = await limparQa(tokenDe("gestor"), { carimbo: CARIMBO });
  expect(falhas, falhas.join("\n")).toEqual([]);
});


test.describe("gestor", () => {

  test.use({ storageState: ESTADO.gestor });

  test("REAL-USR-01: gestor cria usuário QA com perfil operador", async ({ page }) => {

    await page.goto("/configuracoes");
    const form = page.locator("#formUsuario");
    await expect(form).toBeVisible();

    await form.locator("input[name=nome]").fill(QA.usuarioNome);
    await form.locator("input[name=email]").fill(QA.usuarioEmail);
    await form.locator("select[name=perfil]").selectOption("operador");
    await form.locator("input[name=senha]").fill(SENHAS.inicial);

    const [resposta] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith("/api/usuarios") && r.request().method() === "POST"),
      form.getByRole("button", { name: "Criar usuário" }).click()
    ]);
    expect(resposta.status(), JSON.stringify(await resposta.json())).toBe(201);

    await expect(linhaUsuario(page)).toBeVisible();
    await expect(linhaUsuario(page)).toContainText(QA.usuarioNome);
    await expect(linhaUsuario(page)).toContainText("Operador logístico");

    const { dados } = await chamarApi("/usuarios", { token: tokenDe("gestor") });
    expect(dados.usuarios.find(u => u.id === QA.usuarioEmail)).toEqual({
      id: QA.usuarioEmail, nome: QA.usuarioNome, perfil: "operador"
    });

  });

  test("REAL-USR-02: gestor redefine a senha do usuário QA", async ({ page }) => {

    const dialogos = aceitarDialogos(page);

    await page.goto("/configuracoes");
    await linhaUsuario(page).locator(`[data-redefinir="${QA.usuarioEmail}"]`).click();

    const dialogo = page.locator("dialog#redefinir");
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText(QA.usuarioEmail);
    await dialogo.locator("input[name=senha]").fill(SENHAS.redefinida);

    const [resposta] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/usuarios/") && r.request().method() === "PUT"),
      dialogo.getByRole("button", { name: "Redefinir senha" }).click()
    ]);
    expect(resposta.status()).toBe(200);

    await expect(dialogo).toHaveCount(0);
    await expect.poll(() => dialogos).toContain(`Senha de ${QA.usuarioEmail} redefinida.`);

  });

});


test("REAL-USR-03: usuário QA entra, troca a própria senha e entra com a nova", async ({ browser }) => {

  // Contexto novo, sem sessão nenhuma.
  const contexto = await browser.newContext();
  const page = await contexto.newPage();

  try {

    // A senha inicial caiu com a redefinição; vale a redefinida.
    expect(await entrarPelaTela(page, QA.usuarioEmail, SENHAS.redefinida)).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator(".usuario-menu")).toContainText(QA.usuarioNome);
    await expect(page.locator(".usuario-menu")).toContainText("Operador logístico");

    await page.locator("nav").getByRole("link", { name: /Configurações/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
    await expect(page.locator("#painelUsuarios")).toHaveCount(0);

    // Senha atual errada: a API recusa e a tela mostra.
    const form = page.locator("#formSenha");
    await form.locator("input[name=atual]").fill("senha-atual-errada");
    await form.locator("input[name=nova]").fill(SENHAS.trocada);
    await form.getByRole("button", { name: "Trocar senha" }).click();
    await expect(page.locator("#erroSenha")).toHaveText("atual: senha atual incorreta");

    await form.locator("input[name=atual]").fill(SENHAS.redefinida);
    await form.locator("input[name=nova]").fill(SENHAS.trocada);
    await form.getByRole("button", { name: "Trocar senha" }).click();
    await expect(page.locator("#okSenha")).toBeVisible();
    await expect(page.locator("#erroSenha")).toBeHidden();

    // Token novo guardado: continua logado depois de recarregar.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
    await expect(page.getByText("Azure conectado")).toBeVisible();

    // Sair encerra a sessão no servidor: o token de antes do clique deixa de valer.
    // (Feito com a conta descartável: na conta compartilhada derrubaria a sessão
    // salva que os outros testes reaproveitam.)
    const tokenAntes = await page.evaluate(() => JSON.parse(localStorage.getItem("coldtrack.sessao")).token);
    expect((await chamarApi("/eu", { token: tokenAntes })).status).toBe(200);
    await page.locator("#botaoSair").click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("coldtrack.sessao"))).toBeNull();
    await expect.poll(async () => (await chamarApi("/eu", { token: tokenAntes })).status).toBe(401);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);

    // Senha antiga: recusada com a mensagem de senha errada (1 erro, conta descartável).
    expect(await entrarPelaTela(page, QA.usuarioEmail, SENHAS.redefinida)).toBe(401);
    await expect(page.locator("#loginMessage")).toHaveText(/e-mail ou senha incorretos/);
    await expect(page).toHaveURL(/\/login$/);

    // Senha nova: entra (e zera o contador de erros).
    expect(await entrarPelaTela(page, QA.usuarioEmail, SENHAS.trocada)).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);

  } finally {
    await contexto.close();
  }

});


test.describe("gestor remove", () => {

  test.use({ storageState: ESTADO.gestor });

  test("REAL-USR-04: gestor remove o usuário QA e o login dele deixa de valer", async ({ page }) => {

    const dialogos = aceitarDialogos(page);

    await page.goto("/configuracoes");
    await linhaUsuario(page).locator(`[data-remover-usuario="${QA.usuarioEmail}"]`).click();
    await expect(linhaUsuario(page)).toHaveCount(0);
    expect(dialogos[0]).toBe(`Remover o acesso de ${QA.usuarioEmail}?`);

    const { dados } = await chamarApi("/usuarios", { token: tokenDe("gestor") });
    expect(dados.usuarios.some(u => u.id === QA.usuarioEmail)).toBe(false);

    // Conta removida: login recusado (conta descartável, não é conta fixa).
    const login = await chamarApi("/login", { metodo: "POST", corpo: { email: QA.usuarioEmail, senha: SENHAS.trocada } });
    expect(login.status).toBe(401);

  });

});
