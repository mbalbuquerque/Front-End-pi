import { expect, simularApi, test } from "./apoio.js";

// Mensagem de login: a UI mostra o texto de erros[] da API, seja o 401 novo
// (senha errada, e-mail desconhecido e pausa por excesso de tentativas, tudo
// com a mesma frase) ou o 429 do backend antigo.

const TEXTO_NOVO = "e-mail ou senha incorretos. Se errou várias vezes, aguarde alguns minutos.";
const TEXTO_429 = "muitas tentativas de login erradas. Aguarde alguns minutos.";

const ROTA_LOGIN = /azurewebsites\.net\/api\/login$/;

const RESPOSTA_429 = route => route.fulfill({
  status: 429,
  json: { erros: [TEXTO_429] },
  headers: { "Access-Control-Allow-Origin": "*" }
});


async function preencher(page, email, senha) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(senha);
}


test("QA-SEG-03: tela de login mostra a mensagem única do 401", async ({ page }) => {

  await simularApi(page);
  await page.goto("/login");
  await preencher(page, "alguem@teste.com", "senha-errada");
  await page.locator("#botaoEntrar").click();

  await expect(page.locator("#loginMessage")).toHaveText(TEXTO_NOVO);
  await expect(page).toHaveURL(/\/login$/);

});


test("QA-SEG-04: tela de login ainda mostra o 429 do backend antigo", async ({ page }) => {

  await simularApi(page);
  await page.route(ROTA_LOGIN, RESPOSTA_429);
  await page.goto("/login");
  await preencher(page, "alguem@teste.com", "senha-errada");
  await page.locator("#botaoEntrar").click();

  await expect(page.locator("#loginMessage")).toHaveText(TEXTO_429);

});


test("QA-SEG-05: formulário de login da Home mostra a mensagem do 401 e do 429", async ({ page }) => {

  await simularApi(page);
  await page.goto("/");

  const formulario = page.locator("#loginForm");
  await formulario.locator("input[name=email]").fill("alguem@teste.com");
  await formulario.locator("input[name=password]").fill("senha-errada");
  await formulario.locator("button[type=submit]").click();

  await expect(formulario.getByText(TEXTO_NOVO)).toBeVisible();

  await page.route(ROTA_LOGIN, RESPOSTA_429);
  await formulario.locator("button[type=submit]").click();

  await expect(formulario.getByText(TEXTO_429)).toBeVisible();

});
