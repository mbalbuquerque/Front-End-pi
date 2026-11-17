// Service worker (public/sw.js): eventos "push", "notificationclick", "activate" e "fetch".
// O arquivo roda num escopo falso de service worker; nada de rede ou cache real.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const CODIGO = readFileSync(resolve(__dirname, "../../public/sw.js"), "utf-8");
const ORIGEM = "https://painel.exemplo.test";

let escopo;
let ouvintes;

function carregarSw({ janelas = [], cachesFalso = {}, fetchFalso = vi.fn() } = {}) {

  ouvintes = {};
  escopo = {
    location: new URL(`${ORIGEM}/sw.js`),
    addEventListener: (tipo, funcao) => { ouvintes[tipo] = funcao; },
    skipWaiting: vi.fn(),
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    clients: {
      matchAll: vi.fn().mockResolvedValue(janelas),
      openWindow: vi.fn().mockResolvedValue({}),
      claim: vi.fn()
    }
  };

  new Function("self", "caches", "fetch", CODIGO)(escopo, cachesFalso, fetchFalso);

}

function disparar(tipo, evento) {

  let espera;
  ouvintes[tipo]({ ...evento, waitUntil: promessa => { espera = promessa; } });

  return espera;

}

function dadosJson(objeto) {

  return { json: () => objeto, text: () => JSON.stringify(objeto) };

}

function clique(url) {

  const notification = { close: vi.fn(), data: url === undefined ? undefined : { url } };

  return { notification, espera: disparar("notificationclick", { notification }) };

}

beforeEach(() => {
  carregarSw();
});


describe("evento push", () => {

  it("mostra a notificação com título, corpo, ícone, tag do sensor e url", async () => {
    await disparar("push", {
      data: dadosJson({
        titulo: "Crítico: VAN-01",
        corpo: "19.5 °C às 14:32 (faixa até 15 °C)",
        url: "/alertas?veiculo=VAN-01",
        tag: "coldtrack-esp32-01",
        status: "CRITICO",
        deviceId: "esp32-01"
      })
    });

    expect(escopo.registration.showNotification).toHaveBeenCalledWith("Crítico: VAN-01", {
      body: "19.5 °C às 14:32 (faixa até 15 °C)",
      icon: "/assets/icons/icon-192.png",
      badge: "/assets/icons/icon-192.png",
      tag: "coldtrack-esp32-01",
      renotify: true,
      requireInteraction: true,
      data: { url: "/alertas?veiculo=VAN-01" }
    });
  });

  it("atenção não exige interação", async () => {
    await disparar("push", { data: dadosJson({ titulo: "Atenção", status: "ATENCAO", url: "/alertas" }) });
    expect(escopo.registration.showNotification.mock.calls[0][1].requireInteraction).toBe(false);
  });

  it("push sem corpo vira notificação genérica", async () => {
    await disparar("push", { data: null });
    const [titulo, opcoes] = escopo.registration.showNotification.mock.calls[0];
    expect(titulo).toBe("ColdTrack: alerta de temperatura");
    expect(opcoes).toMatchObject({ body: "", tag: "coldtrack-alerta", data: { url: "/alertas" } });
  });

  it("corpo que não é JSON vira o texto da notificação", async () => {
    await disparar("push", {
      data: { json: () => { throw new SyntaxError("x"); }, text: () => "texto solto" }
    });
    expect(escopo.registration.showNotification.mock.calls[0][1].body).toBe("texto solto");
  });

  it("JSON null e campos de tipo errado usam os padrões", async () => {
    await disparar("push", { data: { json: () => null, text: () => "null" } });
    await disparar("push", { data: dadosJson({ titulo: 5, corpo: {}, tag: "", url: 7 }) });
    for (const [titulo, opcoes] of escopo.registration.showNotification.mock.calls) {
      expect(titulo).toBe("ColdTrack: alerta de temperatura");
      expect(opcoes.body).toBe("");
      expect(opcoes.tag).toBe("coldtrack-alerta");
    }
  });

  it("url externa no corpo do push é trocada pela tela de alertas", async () => {
    for (const url of ["https://malicioso.test/x", "//malicioso.test/x", "/\\malicioso.test", "javascript:alert(1)", "alertas"]) {
      escopo.registration.showNotification.mockClear();
      await disparar("push", { data: dadosJson({ url }) });
      expect(escopo.registration.showNotification.mock.calls[0][1].data.url).toBe("/alertas");
    }
  });

});


describe("clique na notificação", () => {

  it("sem janela aberta, abre uma nova na url do alerta", async () => {
    const { notification, espera } = clique("/alertas?veiculo=VAN-01");
    await espera;
    expect(notification.close).toHaveBeenCalled();
    expect(escopo.clients.openWindow).toHaveBeenCalledWith(`${ORIGEM}/alertas?veiculo=VAN-01`);
  });

  it("com o painel aberto, foca e navega na mesma janela", async () => {
    const janela = { url: `${ORIGEM}/dashboard`, focus: vi.fn().mockResolvedValue(), navigate: vi.fn().mockResolvedValue({}) };
    const outra = { url: "https://outro.test/", focus: vi.fn() };
    carregarSw({ janelas: [outra, janela] });

    await clique("/alertas?veiculo=VAN-01").espera;

    expect(outra.focus).not.toHaveBeenCalled();
    expect(janela.focus).toHaveBeenCalled();
    expect(janela.navigate).toHaveBeenCalledWith(`${ORIGEM}/alertas?veiculo=VAN-01`);
    expect(escopo.clients.openWindow).not.toHaveBeenCalled();
  });

  it("janela sem navigate (ou que recusa) só recebe o foco", async () => {
    const semNavigate = { url: `${ORIGEM}/`, focus: vi.fn().mockResolvedValue() };
    carregarSw({ janelas: [semNavigate] });
    await expect(clique("/alertas").espera).resolves.toBe(semNavigate);

    const recusa = { url: `${ORIGEM}/`, focus: vi.fn().mockResolvedValue(), navigate: vi.fn().mockRejectedValue(new TypeError("não controlada")) };
    carregarSw({ janelas: [recusa] });
    await expect(clique("/alertas").espera).resolves.toBe(recusa);
  });

  it("notificação sem dados ou com url externa abre a tela de alertas", async () => {
    await clique(undefined).espera;
    await clique("https://malicioso.test/").espera;
    expect(escopo.clients.openWindow.mock.calls).toEqual([[`${ORIGEM}/alertas`], [`${ORIGEM}/alertas`]]);
  });

});


describe("cache", () => {

  it("a versão do cache subiu com os handlers de push", () => {
    expect(CODIGO).toMatch(/const CACHE_NAME = "coldtrack-v15";/);
  });

  it("activate apaga os caches das versões anteriores e assume as abas abertas", async () => {
    const cachesFalso = {
      keys: vi.fn().mockResolvedValue(["coldtrack-v14", "coldtrack-v15", "coldtrack-v9"]),
      delete: vi.fn().mockResolvedValue(true)
    };
    carregarSw({ cachesFalso });
    await disparar("activate", {});
    expect(cachesFalso.delete.mock.calls).toEqual([["coldtrack-v14"], ["coldtrack-v9"]]);
    expect(escopo.clients.claim).toHaveBeenCalled();
  });

  it("install assume na hora (skipWaiting)", () => {
    const cachesFalso = { open: vi.fn().mockReturnValue(new Promise(() => {})) };
    carregarSw({ cachesFalso });
    disparar("install", {});
    expect(escopo.skipWaiting).toHaveBeenCalled();
  });

});


describe("fetch", () => {

  function pedir(url, { mode = "no-cors", method = "GET" } = {}) {
    let resposta;
    ouvintes.fetch({ request: { url, mode, method }, respondWith: promessa => { resposta = promessa; } });
    return resposta;
  }

  function cachesCom(guardada) {
    const cache = { put: vi.fn() };
    return { cache, falso: { open: vi.fn().mockResolvedValue(cache), match: vi.fn().mockResolvedValue(guardada) } };
  }

  it("navegação vai à rede primeiro e guarda a resposta nova", async () => {
    const nova = { ok: true, clone: () => "copia" };
    const { cache, falso } = cachesCom(undefined);
    const fetchFalso = vi.fn().mockResolvedValue(nova);
    carregarSw({ cachesFalso: falso, fetchFalso });
    await expect(pedir(`${ORIGEM}/viagens`, { mode: "navigate" })).resolves.toBe(nova);
    expect(fetchFalso).toHaveBeenCalled();
    await vi.waitFor(() => expect(cache.put).toHaveBeenCalledWith(expect.objectContaining({ url: `${ORIGEM}/viagens` }), "copia"));
  });

  it("pedaço com hash que sumiu (404) sai da cópia guardada", async () => {
    const guardada = { origem: "cache" };
    const { falso } = cachesCom(guardada);
    carregarSw({ cachesFalso: falso, fetchFalso: vi.fn().mockResolvedValue({ ok: false, status: 404 }) });
    await expect(pedir(`${ORIGEM}/assets/Viagens-abc.js`)).resolves.toBe(guardada);
  });

  it("404 sem cópia guardada, ou fora de /assets, volta como veio", async () => {
    const naoEncontrado = { ok: false, status: 404 };
    carregarSw({ cachesFalso: cachesCom(undefined).falso, fetchFalso: vi.fn().mockResolvedValue(naoEncontrado) });
    await expect(pedir(`${ORIGEM}/assets/Viagens-abc.js`)).resolves.toBe(naoEncontrado);
    const cacheCheio = cachesCom({ origem: "cache" });
    carregarSw({ cachesFalso: cacheCheio.falso, fetchFalso: vi.fn().mockResolvedValue(naoEncontrado) });
    await expect(pedir(`${ORIGEM}/manifest.json`)).resolves.toBe(naoEncontrado);
    expect(cacheCheio.falso.match).not.toHaveBeenCalled();
  });

  it("sem rede: cópia guardada, ou o index.html na navegação", async () => {
    const indice = { origem: "index" };
    const falso = { match: vi.fn(async (pedido) => (pedido === "/index.html" ? indice : undefined)) };
    carregarSw({ cachesFalso: falso, fetchFalso: vi.fn().mockRejectedValue(new TypeError("offline")) });
    await expect(pedir(`${ORIGEM}/viagens`, { mode: "navigate" })).resolves.toBe(indice);
  });

  it("API, outra origem e POST passam direto", () => {
    carregarSw();
    expect(pedir("https://func-coldtrack-7319.azurewebsites.net/api/leituras")).toBeUndefined();
    expect(pedir("https://outro.test/x.js")).toBeUndefined();
    expect(pedir(`${ORIGEM}/x`, { method: "POST" })).toBeUndefined();
  });

});
