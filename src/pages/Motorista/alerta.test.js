// Alerta local do celular: vibração, som e notificação, todos melhor esforço.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarSom, notificar, pedirPermissaoDeNotificacao, vibrar } from "./alerta.js";

afterEach(() => {
  vi.unstubAllGlobals();
  delete navigator.vibrate;
  delete window.AudioContext;
  delete window.webkitAudioContext;
});


describe("vibrar", () => {

  it("padrão por nível", () => {
    navigator.vibrate = vi.fn(() => true);
    expect(vibrar("CRITICO")).toBe(true);
    expect(navigator.vibrate).toHaveBeenCalledWith([600, 200, 600, 200, 600]);
    vibrar("ATENCAO");
    expect(navigator.vibrate).toHaveBeenLastCalledWith([300, 150, 300]);
    vibrar("OUTRO");
    expect(navigator.vibrate).toHaveBeenLastCalledWith(200);
  });

  it("sem suporte ou com erro: false", () => {
    expect(vibrar("CRITICO")).toBe(false);
    navigator.vibrate = () => {
      throw new Error("bloqueado");
    };
    expect(vibrar("CRITICO")).toBe(false);
  });

});


describe("criarSom", () => {

  function contextoFalso() {
    const osciladores = [];
    class Contexto {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.resume = vi.fn();
      }
      createOscillator() {
        const o = { frequency: {}, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        osciladores.push(o);
        return o;
      }
      createGain() {
        return { gain: {}, connect: vi.fn() };
      }
    }
    return { Contexto, osciladores };
  }

  it("não toca antes de ativar", () => {
    expect(criarSom().tocar("CRITICO")).toBe(false);
  });

  it("sem AudioContext: ativar devolve false", () => {
    expect(criarSom().ativar()).toBe(false);
  });

  it("ativado: crítico toca 3 bipes agudos, atenção 1, nível desconhecido 1", () => {
    const { Contexto, osciladores } = contextoFalso();
    window.AudioContext = Contexto;
    const som = criarSom();
    expect(som.ativar()).toBe(true);
    expect(som.ativar()).toBe(true); // segunda vez reaproveita o contexto
    expect(som.tocar("CRITICO")).toBe(true);
    expect(osciladores).toHaveLength(3);
    expect(osciladores[0].frequency.value).toBe(880);
    expect(osciladores[1].start).toHaveBeenCalledWith(0.4);
    som.tocar("ATENCAO");
    expect(osciladores).toHaveLength(4);
    expect(osciladores[3].frequency.value).toBe(660);
    som.tocar("OUTRO");
    expect(osciladores).toHaveLength(5);
  });

  it("aceita o webkitAudioContext (Safari antigo)", () => {
    window.webkitAudioContext = contextoFalso().Contexto;
    expect(criarSom().ativar()).toBe(true);
  });

});


describe("notificações", () => {

  let permissao;
  let Construtor;

  beforeEach(() => {
    permissao = "granted";
    Construtor = vi.fn();
    Construtor.requestPermission = vi.fn(async () => "granted");
    Object.defineProperty(Construtor, "permission", { get: () => permissao });
    vi.stubGlobal("Notification", Construtor);
  });

  it("pedirPermissao: pede só quando ainda não decidiu", async () => {
    permissao = "default";
    expect(await pedirPermissaoDeNotificacao()).toBe("granted");
    expect(Construtor.requestPermission).toHaveBeenCalledTimes(1);

    permissao = "denied";
    expect(await pedirPermissaoDeNotificacao()).toBe("denied");
    expect(Construtor.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("pedirPermissao: erro do navegador vira default", async () => {
    permissao = "default";
    Construtor.requestPermission = vi.fn(async () => {
      throw new Error("não");
    });
    expect(await pedirPermissaoDeNotificacao()).toBe("default");
  });

  it("pedirPermissao: sem a API, indisponivel", async () => {
    vi.stubGlobal("Notification", undefined);
    expect(await pedirPermissaoDeNotificacao()).toBe("indisponivel");
  });

  it("notificar pelo service worker quando há registro", async () => {
    const showNotification = vi.fn(async () => {});
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => ({ showNotification }) } });
    expect(await notificar("Carga em CRÍTICO", "Pare")).toBe(true);
    expect(showNotification).toHaveBeenCalledWith("Carga em CRÍTICO", expect.objectContaining({
      body: "Pare",
      tag: "coldtrack-motorista",
      data: { url: "/motorista" }
    }));
  });

  it("notificar direto sem service worker", async () => {
    vi.stubGlobal("navigator", {});
    expect(await notificar("t", "c")).toBe(true);
    expect(Construtor).toHaveBeenCalledWith("t", expect.objectContaining({ body: "c" }));
  });

  it("sem permissão, sem API ou com erro: false", async () => {
    permissao = "denied";
    expect(await notificar("t", "c")).toBe(false);

    permissao = "granted";
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => { throw new Error("x"); } } });
    expect(await notificar("t", "c")).toBe(false);

    vi.stubGlobal("Notification", undefined);
    expect(await notificar("t", "c")).toBe(false);
  });

});
