import { HOST_API, entrarComo, expect, simularApi, test } from "./apoio.js";

// Alertas no celular (Web Push): o botão em Configurações pede a permissão, inscreve
// o aparelho e manda a inscrição para a API. O service worker fica bloqueado nos e2e
// (playwright.config.js), então Notification, PushManager e navigator.serviceWorker
// são simulados no navegador; a API também. Nada sai para o Azure nem para o FCM.

const ROTA_PUSH = /func-coldtrack-7319\.azurewebsites\.net\/api\/push\//;

// Chave pública de teste (65 bytes), não é a de produção.
const CHAVE = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";


// Navegador com Web Push simulado. `permissao` é a resposta ao pedido;
// `inicial` é a permissão já gravada no site.
async function simularNavegadorPush(page, { permissao = "granted", inicial = "default" } = {}) {

  await page.addInitScript(({ permissao, inicial }) => {

    let atual = inicial;
    let inscricao = null;
    window.__push = { opcoes: null, canceladas: 0 };

    window.Notification = {
      get permission() { return atual; },
      requestPermission: async () => { atual = permissao; return atual; }
    };
    window.PushManager = function PushManager() {};

    const pushManager = {
      getSubscription: async () => inscricao,
      subscribe: async opcoes => {
        window.__push.opcoes = { userVisibleOnly: opcoes.userVisibleOnly, tamanhoChave: opcoes.applicationServerKey.length };
        const endpoint = "https://fcm.googleapis.com/fcm/send/teste-e2e";
        inscricao = {
          endpoint,
          toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: "chave-p256dh-teste", auth: "auth-teste" } }),
          unsubscribe: async () => { inscricao = null; window.__push.canceladas += 1; return true; }
        };
        return inscricao;
      }
    };

    const registro = { pushManager };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: async () => registro,
        register: async () => registro,
        ready: Promise.resolve(registro),
        addEventListener: () => {}
      }
    });

  }, { permissao, inicial });

}


// API das rotas /push/*: `inscrever` é o status do POST /push/inscricao.
async function simularRotasPush(page, { chave = 200, inscrever = 201 } = {}) {

  const pedidos = [];

  await page.route(ROTA_PUSH, async route => {

    const pedido = route.request();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
    };

    if (pedido.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers });
    }

    const caminho = new URL(pedido.url()).pathname;
    pedidos.push({
      metodo: pedido.method(),
      caminho,
      corpo: pedido.postDataJSON(),
      autorizacao: pedido.headers().authorization || ""
    });

    if (caminho.endsWith("/push/chave")) {
      return route.fulfill(chave === 200
        ? { status: 200, json: { chave: CHAVE }, headers }
        : { status: chave, json: { erros: ["alertas push indisponíveis"] }, headers });
    }

    if (pedido.method() === "DELETE") {
      return route.fulfill({ status: 204, headers });
    }

    return route.fulfill(inscrever === 201
      ? { status: 201, json: { inscricoes: 1 }, headers }
      : { status: inscrever, json: { erros: ["endpoint: serviço de push não reconhecido"] }, headers });

  });

  return pedidos;

}


test.beforeEach(async ({ page }) => {
  await entrarComo(page, "operador");
  await simularApi(page);
});


test("QA-PUSH ativa e desativa os alertas neste aparelho", async ({ page }) => {

  await simularNavegadorPush(page);
  const pedidos = await simularRotasPush(page);

  await page.goto("/configuracoes");
  const card = page.locator("#alertasCelular");
  await expect(card.getByRole("heading", { name: "Alertas no celular" })).toBeVisible();

  const ativar = card.getByRole("button", { name: "Ativar alertas no celular" });

  // Piso visual: botão >= 15px, peso >= 600, alvo de toque >= 44px.
  const estilo = await ativar.evaluate(el => {
    const css = getComputedStyle(el);
    return { tamanho: parseFloat(css.fontSize), peso: parseInt(css.fontWeight, 10), altura: el.getBoundingClientRect().height };
  });
  expect(estilo.tamanho).toBeGreaterThanOrEqual(15);
  expect(estilo.peso).toBeGreaterThanOrEqual(600);
  expect(estilo.altura).toBeGreaterThanOrEqual(44);

  await ativar.click();
  await expect(card.locator("#pushAtivo")).toHaveText("Alertas ativos neste aparelho.");

  expect(await page.evaluate(() => window.__push.opcoes)).toEqual({ userVisibleOnly: true, tamanhoChave: 65 });

  const inscricao = pedidos.find(p => p.metodo === "POST");
  expect(inscricao.caminho).toBe("/api/push/inscricao");
  expect(inscricao.autorizacao).toMatch(/^Bearer /);
  expect(inscricao.corpo).toEqual({
    endpoint: "https://fcm.googleapis.com/fcm/send/teste-e2e",
    expirationTime: null,
    keys: { p256dh: "chave-p256dh-teste", auth: "auth-teste" }
  });

  await card.getByRole("button", { name: "Desativar" }).click();
  await expect(card.getByRole("button", { name: "Ativar alertas no celular" })).toBeVisible();

  const remocao = pedidos.find(p => p.metodo === "DELETE");
  expect(remocao.corpo).toEqual({ endpoint: "https://fcm.googleapis.com/fcm/send/teste-e2e" });
  expect(await page.evaluate(() => window.__push.canceladas)).toBe(1);

});


test("QA-PUSH API recusa a inscrição: erro na tela e inscrição local desfeita", async ({ page }) => {

  await simularNavegadorPush(page);
  await simularRotasPush(page, { inscrever: 400 });

  await page.goto("/configuracoes");
  const card = page.locator("#alertasCelular");
  await card.getByRole("button", { name: "Ativar alertas no celular" }).click();

  await expect(card.locator("#erroPush")).toHaveText("endpoint: serviço de push não reconhecido");
  await expect(card.getByRole("button", { name: "Ativar alertas no celular" })).toBeEnabled();
  expect(await page.evaluate(() => window.__push.canceladas)).toBe(1);

});


test("QA-PUSH servidor sem as chaves VAPID: aviso e nenhuma inscrição", async ({ page }) => {

  await simularNavegadorPush(page);
  const pedidos = await simularRotasPush(page, { chave: 503 });

  await page.goto("/configuracoes");
  const card = page.locator("#alertasCelular");
  await card.getByRole("button", { name: "Ativar alertas no celular" }).click();

  await expect(card.locator("#erroPush")).toHaveText("Alertas push indisponíveis no servidor. Tente mais tarde.");
  expect(await page.evaluate(() => window.__push.opcoes)).toBeNull();
  expect(pedidos.filter(p => p.metodo === "POST")).toHaveLength(0);

});


test("QA-PUSH notificações bloqueadas: explica como liberar, sem botão", async ({ page }) => {

  await simularNavegadorPush(page, { inicial: "denied" });

  await page.goto("/configuracoes");
  const card = page.locator("#alertasCelular");
  await expect(card.locator("#pushNegado")).toContainText("As notificações estão bloqueadas para este site");
  await expect(card.getByRole("button")).toHaveCount(0);

});


test("QA-PUSH navegador sem Web Push: orienta Android e iPhone", async ({ page }) => {

  // Sem a simulação: com o service worker bloqueado nos e2e, não há PushManager utilizável.
  await page.addInitScript(() => { delete window.PushManager; });
  let chamouApi = false;
  await page.route(HOST_API, async (route, pedido) => {
    if (pedido.url().includes("/api/push/")) chamouApi = true;
    return route.fallback();
  });

  await page.goto("/configuracoes");
  const nota = page.locator("#pushSemSuporte");
  await expect(nota).toContainText("Este navegador não recebe alertas push");
  await expect(nota).toContainText("iOS 16.4 ou mais novo");

  const estilo = await nota.evaluate(el => {
    const css = getComputedStyle(el);
    return { tamanho: parseFloat(css.fontSize), peso: parseInt(css.fontWeight, 10) };
  });
  expect(estilo.tamanho).toBeGreaterThanOrEqual(15);
  expect(estilo.peso).toBeGreaterThanOrEqual(600);
  expect(chamouApi).toBe(false);

});
