import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, definirAoExpirar, getPublico, postPublico, sairNoServidor } from "./api.js";
import { API_URL } from "./config.js";
import { CHAVE_SESSAO } from "./sessao.js";


function resposta(status, corpo) {

  return {
    status,
    ok: status >= 200 && status < 300,
    json: corpo === undefined
      ? () => Promise.reject(new SyntaxError("sem corpo"))
      : () => Promise.resolve(corpo)
  };

}

let restaurar;

beforeEach(() => {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
    token: "tok123",
    usuario: { nome: "Ana" },
    expiraEm: Date.now() + 3600_000
  }));
  restaurar = definirAoExpirar(vi.fn());
});

afterEach(() => {
  restaurar();
  localStorage.clear();
  vi.unstubAllGlobals();
});


describe("api()", () => {

  it("manda o token e o corpo em JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { ok: 1 }));
    vi.stubGlobal("fetch", fetch);

    await expect(api("/veiculos", { metodo: "POST", corpo: { id: "V1" } })).resolves.toEqual({ ok: 1 });

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/veiculos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok123" },
      body: '{"id":"V1"}'
    });
  });

  it("GET sem corpo não manda Content-Type nem body", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, {}));
    vi.stubGlobal("fetch", fetch);

    await api("/perfis");

    expect(fetch.mock.calls[0][1]).toEqual({
      method: "GET",
      headers: { Authorization: "Bearer tok123" },
      body: undefined
    });
  });

  it("204 devolve objeto vazio sem ler o corpo", async () => {
    const json = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 204, ok: true, json }));

    await expect(api("/veiculos/V1", { metodo: "DELETE" })).resolves.toEqual({});
    expect(json).not.toHaveBeenCalled();
  });

  it("erro HTTP junta dados.erros com ' · ' e guarda o status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(400, { erros: ["Placa inválida.", "Perfil inválido."] })));

    const erro = await api("/veiculos").catch(e => e);

    expect(erro.message).toBe("Placa inválida. · Perfil inválido.");
    expect(erro.status).toBe(400);
  });

  it("erro HTTP sem corpo vira 'HTTP <status>'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(500)));

    await expect(api("/veiculos")).rejects.toThrow("HTTP 500");
  });

  it("401 limpa a sessão, avisa quem redireciona e lança", async () => {
    const aoExpirar = vi.fn();
    const desfazer = definirAoExpirar(aoExpirar);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erros: ["Token vencido."] })));

    await expect(api("/veiculos")).rejects.toThrow("Sessão encerrada.");

    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
    expect(aoExpirar).toHaveBeenCalledTimes(1);
    desfazer();
  });

  it("sem sessão não manda Authorization", async () => {
    localStorage.clear();
    const fetch = vi.fn().mockResolvedValue(resposta(200, {}));
    vi.stubGlobal("fetch", fetch);

    await api("/perfis");

    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

});


describe("postPublico() e getPublico()", () => {

  it("postPublico não lança em 401 e não mexe na sessão", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(401, { erros: ["E-mail ou senha incorretos."] }));
    vi.stubGlobal("fetch", fetch);

    await expect(postPublico("/login", { email: "a@b.c", senha: "x" })).resolves.toEqual({
      ok: false,
      status: 401,
      dados: { erros: ["E-mail ou senha incorretos."] }
    });

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"email":"a@b.c","senha":"x"}'
    });
    expect(localStorage.getItem(CHAVE_SESSAO)).not.toBeNull();
  });

  it("postPublico com corpo inválido devolve dados vazios", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(502)));

    await expect(postPublico("/empresas", {})).resolves.toEqual({ ok: false, status: 502, dados: {} });
  });

  it("postPublico lança em falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(postPublico("/login", {})).rejects.toThrow("Failed to fetch");
  });

  it("getPublico faz GET sem token", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { perfis: [] }));
    vi.stubGlobal("fetch", fetch);

    await expect(getPublico("/perfis")).resolves.toEqual({ perfis: [] });
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/perfis`);
  });

});


describe("sairNoServidor()", () => {

  it("faz POST /sair com o Bearer e devolve true no 204", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(204));
    vi.stubGlobal("fetch", fetch);

    await expect(sairNoServidor("tok123")).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(`${API_URL}/sair`);
    expect(fetch.mock.calls[0][1].method).toBe("POST");
    expect(fetch.mock.calls[0][1].headers).toEqual({ Authorization: "Bearer tok123" });
  });

  it("ignora 404 (rota ainda não publicada), 401 e falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(404, {})));
    await expect(sairNoServidor("tok123")).resolves.toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, {})));
    await expect(sairNoServidor("tok123")).resolves.toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(sairNoServidor("tok123")).resolves.toBe(false);
  });

  it("não chama a API sem token", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(sairNoServidor(null)).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("desiste depois do tempo limite (aborta o pedido)", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("fetch", vi.fn((_url, opcoes) => new Promise((_ok, falhar) => {
        opcoes.signal.addEventListener("abort", () => falhar(new DOMException("abortado", "AbortError")));
      })));

      const espera = sairNoServidor("tok123", 5000);
      await vi.advanceTimersByTimeAsync(5000);

      await expect(espera).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

});
