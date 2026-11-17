// Service worker (public/sw.js): eventos "push" e "notificationclick".
// O arquivo roda num escopo falso de service worker; nada de rede ou cache real.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const CODIGO = readFileSync(resolve(__dirname, "../../public/sw.js"), "utf-8");
const ORIGEM = "https://painel.exemplo.test";

let escopo;
let ouvintes;

function carregarSw({ janelas = [] } = {}) {

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

  new Function("self", "caches", "fetch", CODIGO)(escopo, {}, vi.fn());

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
    expect(CODIGO).toMatch(/const CACHE_NAME = "coldtrack-v14";/);
  });

});
