import { expect, test } from "@playwright/test";
import { TEM_CREDENCIAIS, chamarApi, tokenDe } from "./apoio-real.js";

// Contrato da API de produção, por fetch direto. Só leituras e pedidos que a
// validação recusa antes de gravar (nenhum 2xx de escrita sai daqui).
// POST /empresas não tem rota de remoção: só se testam erros de validação.

function conferirErros(dados) {
  expect(dados).toEqual({ erros: expect.any(Array) });
  expect(dados.erros.length).toBeGreaterThan(0);
  for (const erro of dados.erros) expect(typeof erro).toBe("string");
}


test("REAL-API-01: GET /perfis responde 200 com os perfis de carga", async () => {

  const { status, dados } = await chamarApi("/perfis");

  expect(status).toBe(200);
  expect(Array.isArray(dados.perfis)).toBe(true);
  expect(dados.perfis.length).toBeGreaterThan(0);

  for (const p of dados.perfis) {
    expect(typeof p.id).toBe("string");
    expect(typeof p.nome).toBe("string");
    expect(p.min === null || typeof p.min === "number").toBe(true);
    expect(typeof p.max).toBe("number");
    expect(typeof p.margem).toBe("number");
  }

  expect(dados.perfis.map(p => p.id)).toEqual(expect.arrayContaining(["demonstrativo", "manga", "uva"]));

});


test("REAL-API-02: rotas do painel sem token respondem 401 com {erros}", async () => {

  for (const rota of ["/leituras?deviceId=coldtrack-01", "/eu", "/veiculos", "/dispositivos", "/viagens", "/usuarios"]) {
    const { status, dados } = await chamarApi(rota);
    expect(status, rota).toBe(401);
    expect(dados, rota).toEqual({ erros: ["faça login para continuar"] });
  }

  // Token que não é JWT válido também.
  const { status } = await chamarApi("/leituras?deviceId=coldtrack-01", { token: "token.invalido.qa" });
  expect(status).toBe(401);

});


test("REAL-API-03: POST /empresas inválido responde 400 com {erros} e não cria nada", async () => {

  // E-mail sem @ e senha curta: a validação recusa antes de gravar.
  const { status, dados } = await chamarApi("/empresas", {
    metodo: "POST",
    corpo: { empresa: "", nome: "QA", email: "qa-invalido", senha: "123" }
  });

  expect(status).toBe(400);
  conferirErros(dados);
  expect(dados.erros).toEqual(expect.arrayContaining([
    expect.stringMatching(/^empresa:/),
    expect.stringMatching(/^email:/),
    expect.stringMatching(/^senha:/)
  ]));

  const cru = await chamarApi("/empresas", { metodo: "POST", corpoCru: "isto não é json" });
  expect(cru.status).toBe(400);
  expect(cru.dados).toEqual({ erros: ["corpo não é JSON válido"] });

});


test.describe("com token de gestor", () => {

  test.skip(!TEM_CREDENCIAIS, "sem credenciais");

  test("REAL-API-04: GET /eu devolve o usuário da sessão", async () => {

    const { status, dados } = await chamarApi("/eu", { token: tokenDe("gestor") });

    expect(status).toBe(200);
    expect(dados).toEqual({
      id: expect.any(String),
      nome: expect.any(String),
      perfil: "gestor",
      empresaId: expect.any(String),
      empresa: expect.any(String)
    });

  });

  test("REAL-API-05: cadastros inválidos respondem 400 com {erros} por campo", async () => {

    const token = tokenDe("gestor");

    const casos = [
      { rota: "/veiculos", corpo: { id: "x", tipo: "", deviceId: "", perfil: "nenhum" }, campos: ["id", "tipo"] },
      { rota: "/dispositivos", corpo: { id: "a" }, campos: ["id"] },
      { rota: "/viagens", corpo: { veiculo: "", origem: "", destino: "", carga: "", inicio: "ontem" }, campos: ["origem", "inicio"] },
      { rota: "/usuarios", corpo: { email: "qa-invalido", nome: "", perfil: "admin", senha: "1" }, campos: ["email", "perfil", "senha"] }
    ];

    for (const caso of casos) {
      const { status, dados } = await chamarApi(caso.rota, { metodo: "POST", token, corpo: caso.corpo });
      expect(status, caso.rota).toBe(400);
      conferirErros(dados);
      for (const campo of caso.campos) {
        expect(dados.erros.some(e => e.startsWith(`${campo}:`)), `${caso.rota}: falta erro de ${campo} em ${JSON.stringify(dados.erros)}`).toBe(true);
      }
    }

  });

  test("REAL-API-06: GET /leituras sem deviceId é 400 e sensor de fora é 404", async () => {

    const token = tokenDe("gestor");

    const semId = await chamarApi("/leituras", { token });
    expect(semId.status).toBe(400);
    expect(semId.dados).toEqual({ erros: ["informe ?deviceId="] });

    const deFora = await chamarApi("/leituras?deviceId=qa-nao-existe-0000", { token });
    expect(deFora.status).toBe(404);
    expect(deFora.dados).toEqual({ erros: ["dispositivo não encontrado"] });

  });

});


test("REAL-CAD-01: tela de cadastro mostra os erros sem criar empresa", async ({ page }) => {

  const pedidos = [];
  page.on("request", r => {
    if (r.url().endsWith("/api/empresas")) pedidos.push(r);
  });

  await page.goto("/cadastro");
  await expect(page).toHaveTitle("Cadastrar empresa · ColdTrack Control");

  // Campos em branco: a tela recusa sem chamar a API.
  await page.locator("#botaoCadastrar").click();
  await expect(page.locator("#erroCadastro")).toHaveText("Preencha todos os campos.");
  expect(pedidos).toHaveLength(0);

  // E-mail sem @ e senha curta: a API recusa (400) e a tela mostra os erros.
  const form = page.locator("#formCadastro");
  await form.locator("input[name=empresa]").fill("QA empresa que nao deve existir");
  await form.locator("input[name=nome]").fill("QA");
  await form.locator("input[name=email]").fill("qa-invalido");
  await form.locator("input[name=senha]").fill("123");

  const [resposta] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith("/api/empresas")),
    page.locator("#botaoCadastrar").click()
  ]);

  expect(resposta.status()).toBe(400);
  await expect(page.locator("#erroCadastro")).toContainText("email:");
  await expect(page.locator("#erroCadastro")).toContainText("senha:");
  await expect(page).toHaveURL(/\/cadastro$/);

});
