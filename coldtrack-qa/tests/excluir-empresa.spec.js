import { entrarComo, errosDoConsole, expect, simularApi, test } from "./apoio.js";

// Configurações > Excluir empresa (DELETE /empresa). A API é simulada: nada
// é apagado de verdade e nenhuma chamada sai para a produção.

const ROTA_EMPRESA = /func-coldtrack-7319\.azurewebsites\.net\/api\/empresa(\?|$)/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};


// `respostas` é a fila de respostas { status, json }; a última se repete.
// Devolve a lista (viva) dos corpos recebidos.
async function simularExclusao(page, respostas) {

  const corpos = [];

  await page.route(ROTA_EMPRESA, route => {

    const pedido = route.request();

    if (pedido.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }

    const { status, json } = respostas[Math.min(corpos.length, respostas.length - 1)];
    corpos.push(pedido.postDataJSON());

    return route.fulfill({ status, json, headers: CORS });

  });

  return corpos;

}


async function abrirDialogo(page) {

  await page.goto("/configuracoes");
  await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
  await page.locator("#excluirEmpresa").getByRole("button", { name: "Excluir empresa" }).click();

  const dialogo = page.locator("#excluirEmpresaDialogo");
  await expect(dialogo).toBeVisible();

  return dialogo;

}


test.beforeEach(async ({ page }) => {
  await entrarComo(page, "gestor");
  await simularApi(page);
});


test("QA-EXCLUIR operador não vê a opção", async ({ page }) => {

  await page.addInitScript(() => localStorage.removeItem("coldtrack.sessao"));
  await entrarComo(page, "operador");
  await page.goto("/configuracoes");

  await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
  await expect(page.locator("#excluirEmpresa")).toHaveCount(0);

});


test("QA-EXCLUIR botão só habilita com o nome e a senha; 200 encerra a sessão e avisa no login", async ({ page }) => {

  const erros = errosDoConsole(page);
  const corpos = await simularExclusao(page, [{ status: 200, json: { excluida: true, removidos: { empresas: 1 } } }]);

  const dialogo = await abrirDialogo(page);
  const confirmar = dialogo.getByRole("button", { name: "Excluir empresa para sempre" });

  await expect(dialogo).toContainText("não pode ser desfeita");
  await expect(confirmar).toBeDisabled();

  await dialogo.getByLabel(/nome da empresa/).fill("outra empresa");
  await dialogo.getByLabel("Sua senha atual").fill("senha-de-teste");
  await expect(confirmar).toBeDisabled();

  await dialogo.getByLabel(/nome da empresa/).fill("Frio Sul");
  await expect(confirmar).toBeEnabled();

  await confirmar.click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#loginMessage")).toContainText("Empresa excluída");
  expect(corpos).toEqual([{ confirmacao: "Frio Sul", senha: "senha-de-teste" }]);
  expect(await page.evaluate(() => localStorage.getItem("coldtrack.sessao"))).toBeNull();
  expect(erros.filter(e => !e.includes("Failed to load resource"))).toEqual([]);

});


test("QA-EXCLUIR 202 repete o mesmo pedido até o 200", async ({ page }) => {

  const aindaFalta = { status: 202, json: { excluida: false, mensagem: "exclusão em andamento: repita o mesmo pedido para continuar de onde parou." } };
  const corpos = await simularExclusao(page, [aindaFalta, aindaFalta, { status: 200, json: { excluida: true, removidos: {} } }]);

  const dialogo = await abrirDialogo(page);
  await dialogo.getByLabel(/nome da empresa/).fill("Frio Sul");
  await dialogo.getByLabel("Sua senha atual").fill("senha-de-teste");
  await dialogo.getByRole("button", { name: "Excluir empresa para sempre" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#loginMessage")).toContainText("Empresa excluída");
  expect(corpos).toHaveLength(3);
  expect(new Set(corpos.map(c => JSON.stringify(c))).size).toBe(1);

});


test("QA-EXCLUIR 400 mostra a mensagem da API, mantém o nome e limpa a senha", async ({ page }) => {

  await simularExclusao(page, [{ status: 400, json: { erros: ["senha: senha atual incorreta"] } }]);

  const dialogo = await abrirDialogo(page);
  await dialogo.getByLabel(/nome da empresa/).fill("Frio Sul");
  await dialogo.getByLabel("Sua senha atual").fill("errada");
  await dialogo.getByRole("button", { name: "Excluir empresa para sempre" }).click();

  await expect(dialogo.getByRole("alert")).toContainText("senha atual incorreta");
  await expect(dialogo.getByLabel(/nome da empresa/)).toHaveValue("Frio Sul");
  await expect(dialogo.getByLabel("Sua senha atual")).toHaveValue("");
  await expect(page).toHaveURL(/\/configuracoes$/);

});
