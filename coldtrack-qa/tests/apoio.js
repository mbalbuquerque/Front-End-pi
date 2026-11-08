// Apoio comum dos testes e2e: nenhum teste fala com serviço de verdade.
//
// - `test` (no lugar do @playwright/test) já intercepta a API do ColdTrack
//   (Azure Function), a Open-Meteo, o ThingSpeak e as fontes do Google.
//   Sem `simularApi`, a API responde 503 (como se estivesse fora do ar).
// - `simularApi(page)` liga a API simulada com uma empresa de exemplo.
// - `entrarComo(page, "gestor" | "operador")` grava uma sessão falsa no
//   localStorage (chave coldtrack.sessao) antes de a página abrir.
// - `errosDoConsole(page)` junta console.error e exceções da página.
//
// Rotas registradas depois (page.route dentro do teste) têm prioridade.

import { test as base, expect } from "@playwright/test";

export { expect };

export const HOST_API = /func-coldtrack-7319\.azurewebsites\.net/;

const HORA = 3600 * 1000;


// ---------------------------------------------------------
// DADOS DE EXEMPLO
// ---------------------------------------------------------

export const USUARIOS = {
  gestor: { id: "u-gestor", nome: "Gestora Teste", email: "gestora@teste.com", perfil: "gestor" },
  operador: { id: "u-operador", nome: "Operador Teste", email: "operador@teste.com", perfil: "operador" }
};

const PERFIS = [
  { id: "demonstrativo", nome: "Demonstrativo", min: null, max: 15, margem: 5 },
  { id: "frutas", nome: "Frutas", min: 10, max: 13, margem: 3 }
];

const DISPOSITIVOS = [
  { id: "esp32-teste-01", descricao: "Baú da van" },
  { id: "esp32-teste-02", descricao: "Reserva" }
];

const VEICULOS = [
  { id: "VAN-01", deviceId: "esp32-teste-01", perfil: "demonstrativo", tipo: "Van refrigerada" }
];


// Leituras a cada 20 s, da mais recente para a mais antiga (como a API).
function leituras(deviceId, quantidade = 30) {

  const agora = Date.now();

  return Array.from({ length: quantidade }, (_, i) => {
    const temperatura = i === 5 ? 17.5 : 6 + (i % 4) * 0.5;
    const quando = new Date(agora - i * 20000).toISOString();
    return {
      deviceId,
      temperatura,
      umidade: 70,
      rssi: -61,
      status: temperatura > 15 ? "ATENCAO" : "NORMAL",
      medidoEm: quando,
      recebidoEm: quando
    };
  });

}


function viagens() {

  return [
    {
      id: "VIA-01",
      veiculo: "VAN-01",
      origem: "Petrolina/PE",
      destino: "Suape/PE",
      carga: "Uva",
      inicio: new Date(Date.now() - 2 * HORA).toISOString(),
      fim: null
    }
  ];

}


// Open-Meteo: 48 horas para cada uma das 7 cidades da rota.
function previsao() {

  const inicio = new Date();
  inicio.setUTCMinutes(0, 0, 0);
  inicio.setTime(inicio.getTime() - 6 * HORA);

  const time = Array.from({ length: 48 }, (_, i) => {
    const hora = new Date(inicio.getTime() + i * HORA - 3 * HORA);   // America/Recife (UTC-3)
    return hora.toISOString().slice(0, 13) + ":00";
  });

  const temperature_2m = time.map((_, i) => 24 + (i % 24 > 10 && i % 24 < 17 ? 8 : 0));

  return Array.from({ length: 7 }, () => ({ hourly: { time, temperature_2m } }));

}


// ---------------------------------------------------------
// API SIMULADA
// ---------------------------------------------------------

export async function simularApi(page) {

  await page.route(HOST_API, async route => {

    const pedido = route.request();
    const url = new URL(pedido.url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = pedido.method();

    if (metodo === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors() });
    }

    const responder = (json, status = 200) => route.fulfill({ status, json, headers: cors() });

    if (metodo === "POST" && caminho === "/login") {
      return responder({ erros: ["E-mail ou senha incorretos."] }, 401);
    }

    if (metodo !== "GET") {
      return responder({});
    }

    switch (caminho) {
      case "/perfis": return responder({ perfis: PERFIS });
      case "/veiculos": return responder({ veiculos: VEICULOS });
      case "/dispositivos": return responder({ dispositivos: DISPOSITIVOS });
      case "/viagens": return responder({ viagens: viagens() });
      case "/usuarios": return responder({ usuarios: Object.values(USUARIOS) });
      case "/leituras": return responder({ leituras: leituras(url.searchParams.get("deviceId")) });
      default: return responder({ erros: ["Rota não simulada"] }, 404);
    }

  });

}


function cors() {

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
  };

}


// ---------------------------------------------------------
// SESSÃO FALSA
// ---------------------------------------------------------

function tokenFalso(usuario) {

  const base64url = objeto => Buffer.from(JSON.stringify(objeto)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 8 * 3600;

  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({ sub: usuario.id, exp })}.assinatura-de-teste`;

}


export async function entrarComo(page, perfil) {

  const usuario = USUARIOS[perfil];
  const sessao = { token: tokenFalso(usuario), usuario, expiraEm: Date.now() + 8 * 3600 * 1000 };

  await page.addInitScript(valor => {
    localStorage.setItem("coldtrack.sessao", valor);
  }, JSON.stringify(sessao));

}


// ---------------------------------------------------------
// CONSOLE
// ---------------------------------------------------------

export function errosDoConsole(page) {

  const erros = [];

  page.on("console", mensagem => {
    if (mensagem.type() === "error") {
      erros.push(mensagem.text());
    }
  });

  page.on("pageerror", erro => erros.push(erro.message));

  return erros;

}


// ---------------------------------------------------------
// FIXTURE
// ---------------------------------------------------------

export const test = base.extend({

  page: async ({ page }, use) => {

    // API do ColdTrack fora do ar, a não ser que o teste chame simularApi().
    await page.route(HOST_API, route => route.fulfill({
      status: 503,
      json: { erros: ["API indisponível no teste"] },
      headers: cors()
    }));

    await page.route("**/api.open-meteo.com/**", route => route.fulfill({ json: previsao() }));
    await page.route("**/api.thingspeak.com/**", route => route.fulfill({ json: { feeds: [] } }));

    // Fonte Inter: CSS vazio (o teste não depende da internet).
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({
      status: 200,
      contentType: "text/css",
      body: ""
    }));

    await use(page);

  }

});
