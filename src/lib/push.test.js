// Alertas no celular: suporte, permissão, inscrição no service worker e na API.
// Navegador simulado: Notification, PushManager e navigator.serviceWorker falsos.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "./config.js";
import {
  MSG_SEM_SERVICE_WORKER,
  MSG_SEM_SERVIDOR,
  ativarPush,
  base64UrlParaBytes,
  desativarPush,
  estadoPush,
  suportaPush
} from "./push.js";

const api = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("./api.js", () => api);

// Chave pública de teste (65 bytes, P-256 sem compressão), não é de produção.
const CHAVE = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

function inscricaoFalsa(endpoint = "https://fcm.googleapis.com/fcm/send/abc") {

  return {
    endpoint,
    toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: "p", auth: "a" } }),
    unsubscribe: vi.fn().mockResolvedValue(true)
  };

}

let navegador;

function montarNavegador({ permissao = "default", pedir = "granted", registro = true, inscricao = null } = {}) {

  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(inscricao),
    subscribe: vi.fn().mockImplementation(async () => inscricaoFalsa())
  };
  const reg = registro ? { pushManager } : undefined;

  const Notification = { permission: permissao, requestPermission: vi.fn().mockResolvedValue(pedir) };
  const serviceWorker = {
    getRegistration: vi.fn().mockResolvedValue(reg),
    register: vi.fn().mockResolvedValue({}),
    ready: Promise.resolve({ pushManager })
  };

  vi.stubGlobal("Notification", Notification);
  vi.stubGlobal("PushManager", function PushManager() {});
  Object.defineProperty(navigator, "serviceWorker", { value: serviceWorker, configurable: true });

  navegador = { Notification, serviceWorker, pushManager };

  return navegador;

}

function respostaChave(status = 200, corpo = { chave: CHAVE }) {

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(corpo)
  }));

}

beforeEach(() => {
  api.api.mockReset().mockResolvedValue({ inscricoes: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete navigator.serviceWorker;
});


describe("suportaPush e base64UrlParaBytes", () => {

  it("sem PushManager ou Notification, não há suporte", () => {
    expect(suportaPush()).toBe(false);
    expect(suportaPush({})).toBe(false);
    expect(suportaPush({ navigator: { serviceWorker: {} }, PushManager: 1 })).toBe(false);
  });

  it("com os três, há suporte", () => {
    montarNavegador();
    expect(suportaPush()).toBe(true);
  });

  it("converte base64url (sem =) para os 65 bytes da chave", () => {
    const bytes = base64UrlParaBytes(CHAVE);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
    expect([...base64UrlParaBytes("-_8")]).toEqual([251, 255]);
    expect([...base64UrlParaBytes("AQID")]).toEqual([1, 2, 3]);
  });

});


describe("estadoPush", () => {

  it("navegador sem suporte", async () => {
    expect(await estadoPush()).toBe("sem-suporte");
  });

  it("permissão bloqueada", async () => {
    montarNavegador({ permissao: "denied" });
    expect(await estadoPush()).toBe("negado");
  });

  it("sem service worker registrado (dev): inativo", async () => {
    montarNavegador({ registro: false });
    expect(await estadoPush()).toBe("inativo");
  });

  it("com inscrição e permissão: ativo", async () => {
    montarNavegador({ permissao: "granted", inscricao: inscricaoFalsa() });
    expect(await estadoPush()).toBe("ativo");
  });

  it("inscrição sobrando sem permissão concedida: inativo", async () => {
    montarNavegador({ permissao: "default", inscricao: inscricaoFalsa() });
    expect(await estadoPush()).toBe("inativo");
  });

});


describe("ativarPush", () => {

  it("sem suporte não pede nada", async () => {
    expect(await ativarPush()).toBe("sem-suporte");
    expect(api.api).not.toHaveBeenCalled();
  });

  it("permissão negada no pedido", async () => {
    montarNavegador({ pedir: "denied" });
    expect(await ativarPush()).toBe("negado");
    expect(api.api).not.toHaveBeenCalled();
  });

  it("pedido de permissão fechado sem resposta: continua inativo", async () => {
    montarNavegador({ pedir: "default" });
    expect(await ativarPush()).toBe("inativo");
    expect(api.api).not.toHaveBeenCalled();
  });

  it("inscreve com a chave da API e manda a inscrição", async () => {
    montarNavegador();
    respostaChave();

    expect(await ativarPush()).toBe("ativo");

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/push/chave`);
    const opcoes = navegador.pushManager.subscribe.mock.calls[0][0];
    expect(opcoes.userVisibleOnly).toBe(true);
    expect(opcoes.applicationServerKey.length).toBe(65);
    expect(api.api).toHaveBeenCalledWith("/push/inscricao", {
      metodo: "POST",
      corpo: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", expirationTime: null, keys: { p256dh: "p", auth: "a" } }
    });
  });

  it("reaproveita a inscrição que o navegador já tem", async () => {
    const existente = inscricaoFalsa("https://updates.push.services.mozilla.com/wpush/v2/x");
    montarNavegador({ inscricao: existente });
    respostaChave();

    expect(await ativarPush()).toBe("ativo");
    expect(navegador.pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.api.mock.calls[0][1].corpo.endpoint).toBe(existente.endpoint);
  });

  it("API recusa: desfaz a inscrição local e repassa o erro", async () => {
    const inscricao = inscricaoFalsa();
    montarNavegador();
    navegador.pushManager.subscribe.mockResolvedValue(inscricao);
    respostaChave();
    api.api.mockRejectedValue(new Error("endpoint: serviço de push não reconhecido"));

    await expect(ativarPush()).rejects.toThrow("endpoint: serviço de push não reconhecido");
    expect(inscricao.unsubscribe).toHaveBeenCalled();
  });

  it("falha ao desfazer a inscrição não esconde o erro da API", async () => {
    const inscricao = inscricaoFalsa();
    inscricao.unsubscribe.mockRejectedValue(new Error("já cancelada"));
    montarNavegador();
    navegador.pushManager.subscribe.mockResolvedValue(inscricao);
    respostaChave();
    api.api.mockRejectedValue(new Error("HTTP 500"));

    await expect(ativarPush()).rejects.toThrow("HTTP 500");
  });

  it("API sem a rota /push/chave (404) ou sem chaves (503)", async () => {
    montarNavegador();
    respostaChave(404, { erros: ["não encontrado"] });
    await expect(ativarPush()).rejects.toThrow(MSG_SEM_SERVIDOR);

    respostaChave(503, { erros: ["alertas push indisponíveis"] });
    await expect(ativarPush()).rejects.toThrow(MSG_SEM_SERVIDOR);
  });

  it("chave vazia ou corpo inválido", async () => {
    montarNavegador();
    respostaChave(200, { chave: "" });
    await expect(ativarPush()).rejects.toThrow(MSG_SEM_SERVIDOR);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("x")) }));
    await expect(ativarPush()).rejects.toThrow(MSG_SEM_SERVIDOR);
  });

  it("sem rede ao buscar a chave", async () => {
    montarNavegador();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(ativarPush()).rejects.toThrow(MSG_SEM_SERVIDOR);
  });

  it("no dev, sem service worker registrado, avisa em vez de travar", async () => {
    montarNavegador({ registro: false });
    respostaChave();
    await expect(ativarPush()).rejects.toThrow(MSG_SEM_SERVICE_WORKER);
    expect(navegador.serviceWorker.register).not.toHaveBeenCalled();
  });

  it("no build publicado, registra o service worker se o clique chegar antes", async () => {
    vi.stubEnv("PROD", true);
    montarNavegador({ registro: false });
    respostaChave();

    expect(await ativarPush()).toBe("ativo");
    expect(navegador.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
    expect(navegador.pushManager.subscribe).toHaveBeenCalled();
  });

});


describe("desativarPush", () => {

  it("sem suporte", async () => {
    expect(await desativarPush()).toBe("sem-suporte");
  });

  it("sem inscrição: nada a fazer", async () => {
    montarNavegador({ permissao: "granted" });
    expect(await desativarPush()).toBe("inativo");
    expect(api.api).not.toHaveBeenCalled();
  });

  it("sem service worker: nada a fazer", async () => {
    montarNavegador({ registro: false });
    expect(await desativarPush()).toBe("inativo");
  });

  it("remove na API e cancela no navegador", async () => {
    const inscricao = inscricaoFalsa();
    montarNavegador({ permissao: "granted", inscricao });

    expect(await desativarPush()).toBe("inativo");
    expect(api.api).toHaveBeenCalledWith("/push/inscricao", {
      metodo: "DELETE",
      corpo: { endpoint: inscricao.endpoint }
    });
    expect(inscricao.unsubscribe).toHaveBeenCalled();
  });

  it("API fora do ar: cancela no navegador mesmo assim", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const inscricao = inscricaoFalsa();
    montarNavegador({ permissao: "granted", inscricao });
    api.api.mockRejectedValue(new Error("HTTP 503"));

    expect(await desativarPush()).toBe("inativo");
    expect(inscricao.unsubscribe).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

});
