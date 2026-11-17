import {
  USUARIOS,
  entrarComo,
  errosDoConsole,
  expect,
  respostaMotorista,
  simularApi,
  test,
  tokenFalso
} from "./apoio.js";

// Tela do motorista (/motorista): login e rotas por perfil, cadastro do motorista
// pelo gestor, os estados da carga, alerta normal -> crítico -> normal e modo
// offline. A API é simulada (apoio.js); nada sai para o Azure. O relógio da página
// é controlado (page.clock) para a atualização de 20 s acontecer na hora.

const ROTA_MOTORISTA = /func-coldtrack-7319\.azurewebsites\.net\/api\/motorista(\?|$)/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};


// GET /motorista devolve o status de `estado.status`, trocado pelo teste.
async function simularMotorista(page, estado) {

  await page.route(ROTA_MOTORISTA, route => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    return route.fulfill({ json: respostaMotorista(estado.status, estado.minutos || 0), headers: CORS });
  });

}


// Celular simulado: vibração e notificação gravam o que foi pedido.
async function simularCelular(page) {

  await page.addInitScript(() => {
    window.__celular = { vibracoes: [], notificacoes: [] };
    navigator.vibrate = padrao => {
      window.__celular.vibracoes.push(padrao);
      return true;
    };
    let permissao = "default";
    function Notificacao(titulo) {
      window.__celular.notificacoes.push(titulo);
    }
    Object.defineProperty(Notificacao, "permission", { get: () => permissao });
    Notificacao.requestPermission = async () => {
      permissao = "granted";
      return permissao;
    };
    window.Notification = Notificacao;
  });

}


test.describe("QA-MOTORISTA login e rotas por perfil", () => {

  test("motorista entra pelo login e cai na /motorista", async ({ page }) => {

    await simularApi(page);
    await page.route(/func-coldtrack-7319\.azurewebsites\.net\/api\/login(\?|$)/, route => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: CORS });
      }
      const usuario = USUARIOS.motorista;
      return route.fulfill({ json: { token: tokenFalso(usuario), usuario }, headers: CORS });
    });

    await page.goto("/login");
    await page.getByLabel("E-mail").fill("motorista@teste.com");
    await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste");
    await page.getByRole("button", { name: /Entrar/ }).click();

    await expect(page).toHaveURL(/\/motorista$/);
    await expect(page.locator("#statusMotorista")).toHaveText("NORMAL");

  });

  test("motorista tentando /dashboard volta para /motorista, sem menu lateral", async ({ page }) => {

    const erros = errosDoConsole(page);
    await entrarComo(page, "motorista");
    await simularApi(page);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/motorista$/);
    await expect(page.locator("#sidebar")).toHaveCount(0);

    await page.goto("/configuracoes");
    await expect(page).toHaveURL(/\/motorista$/);
    await expect(page).toHaveTitle("Motorista · ColdTrack Control");
    expect(erros).toEqual([]);

  });

  test("operador e gestor continuam no painel; /motorista os manda ao dashboard", async ({ page }) => {

    await entrarComo(page, "operador");
    await simularApi(page);

    await page.goto("/motorista");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("#sidebar")).toBeVisible();

  });

  test("gestor cria motorista com veículo", async ({ page }) => {

    await entrarComo(page, "gestor");
    await simularApi(page);

    const pedidos = [];
    await page.route(/func-coldtrack-7319\.azurewebsites\.net\/api\/usuarios(\?|$)/, route => {
      const pedido = route.request();
      if (pedido.method() === "POST") {
        pedidos.push(pedido.postDataJSON());
        return route.fulfill({ status: 201, json: {}, headers: CORS });
      }
      return route.fallback();
    });

    await page.goto("/configuracoes");
    const form = page.locator("#formUsuario");
    await form.getByLabel("Nome").fill("Mario Motorista");
    await form.getByLabel("E-mail").fill("mario@teste.com");
    await form.getByLabel("Perfil").selectOption("motorista");
    await form.getByLabel("Veículo do motorista").selectOption("VAN-01");
    await form.getByLabel("Senha inicial (mín. 8)").fill("senha-de-teste");
    await form.getByRole("button", { name: "Criar usuário" }).click();

    await expect.poll(() => pedidos.length).toBe(1);
    expect(pedidos[0]).toEqual({
      nome: "Mario Motorista",
      email: "mario@teste.com",
      perfil: "motorista",
      veiculo: "VAN-01",
      senha: "senha-de-teste"
    });

  });

});


test.describe("QA-MOTORISTA tela", () => {

  test.beforeEach(async ({ page }) => {
    await entrarComo(page, "motorista");
    await simularApi(page);
  });

  test("os quatro estados aparecem com texto e cor", async ({ page }) => {

    const estado = { status: "NORMAL" };
    await page.clock.install();
    await simularMotorista(page, estado);
    await page.goto("/motorista");

    for (const [status, texto, classe, minutos] of [
      ["NORMAL", "NORMAL", /normal/, 0],
      ["ATENCAO", "ATENÇÃO", /atencao/, 0],
      ["CRITICO", "CRÍTICO", /critico/, 0],
      ["NORMAL", "SEM SINAL", /sem-sinal/, 8]
    ]) {
      Object.assign(estado, { status, minutos });
      await page.clock.fastForward(20000);
      await expect(page.locator("#statusMotorista")).toHaveText(texto);
      await expect(page.locator("#blocoStatus")).toHaveClass(classe);
    }

    await expect(page.locator("#seloAntigo")).toHaveText("LEITURA ANTIGA");

  });

  test("normal -> crítico -> normal: vibra, notifica, aviso fica e some", async ({ page }) => {

    const estado = { status: "NORMAL" };
    await simularCelular(page);
    await page.clock.install();
    await simularMotorista(page, estado);
    await page.goto("/motorista");

    await expect(page.locator("#statusMotorista")).toHaveText("NORMAL");
    await page.getByRole("button", { name: "Ativar alertas (som e notificação)" }).click();
    await expect(page.locator("#ativarAlertas")).toHaveCount(0);

    estado.status = "CRITICO";
    await page.clock.fastForward(20000);
    await expect(page.locator("#avisoMotorista")).toContainText("CRÍTICO");
    await expect(page.locator("#tempMotorista")).toHaveText("17.5 °C");
    await expect.poll(() => page.evaluate(() => window.__celular.vibracoes.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__celular.notificacoes)).toEqual(["Carga em CRÍTICO"]);

    // Continua crítico: não vibra de novo a cada atualização.
    await page.clock.fastForward(20000);
    await expect(page.locator("#avisoMotorista")).toBeVisible();
    expect(await page.evaluate(() => window.__celular.vibracoes.length)).toBe(1);

    estado.status = "NORMAL";
    await page.clock.fastForward(20000);
    await expect(page.locator("#statusMotorista")).toHaveText("NORMAL");
    await expect(page.locator("#avisoMotorista")).toHaveCount(0);

  });

  test("sem internet: faixa com a hora da última leitura e valor marcado como antigo", async ({ page, context }) => {

    await page.clock.install();
    await simularMotorista(page, { status: "NORMAL" });
    await page.goto("/motorista");
    await expect(page.locator("#tempMotorista")).toHaveText("11.8 °C");

    await context.setOffline(true);
    await page.clock.fastForward(20000);

    const faixa = page.locator("#faixaOffline");
    await expect(faixa).toHaveText(/^Sem conexão — última leitura às \d{2}:\d{2}$/);
    await expect(page.locator("#tempMotorista")).toHaveText("11.8 °C");
    await expect(page.locator("#seloAntigo")).toBeVisible();

    await context.setOffline(false);
    await page.clock.fastForward(20000);
    await expect(faixa).toHaveCount(0);
    await expect(page.locator("#seloAntigo")).toHaveCount(0);

  });

  test("API ainda sem a rota (404): orienta falar com o gestor", async ({ page }) => {

    await page.route(ROTA_MOTORISTA, route => route.fulfill({
      status: 404,
      json: { erros: ["Rota não simulada"] },
      headers: CORS
    }));
    await page.goto("/motorista");
    await expect(page.getByText("Nenhum veículo vinculado a você.")).toBeVisible();

  });

  test("360 px em pé: sem rolagem lateral, número grande e texto no piso", async ({ page }) => {

    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/motorista");
    await expect(page.locator("#statusMotorista")).toHaveText("NORMAL");

    const medidas = await page.evaluate(() => {
      const px = (seletor, prop) => parseFloat(getComputedStyle(document.querySelector(seletor))[prop]);
      return {
        rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        temperatura: px("#tempMotorista", "fontSize"),
        corpo: px("#faixaCarga", "fontSize"),
        peso: px("#faixaCarga", "fontWeight"),
        aviso: px(".aviso-suporte", "fontSize"),
        botao: document.querySelector("#ativarAlertas").getBoundingClientRect().height
      };
    });

    expect(medidas.rolagem).toBeLessThanOrEqual(0);
    expect(medidas.temperatura).toBeGreaterThanOrEqual(72);
    expect(medidas.corpo).toBeGreaterThanOrEqual(15);
    expect(medidas.peso).toBeGreaterThanOrEqual(600);
    expect(medidas.aviso).toBeGreaterThanOrEqual(15);
    expect(medidas.botao).toBeGreaterThanOrEqual(44);
    await expect(page.getByText("Use com o celular no suporte.")).toBeVisible();
    await expect(page.locator("input, textarea")).toHaveCount(0);

  });

});


test("QA-MOTORISTA atalho Motorista no manifest", async ({ request }) => {

  const manifest = await (await request.get("/manifest.json")).json();
  expect(manifest.shortcuts).toEqual([expect.objectContaining({ name: "Motorista", url: "/motorista" })]);

});
