import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definirAoExpirar } from "./api.js";
import {
  MENSAGEM_INDISPONIVEL,
  mensagemDeErro,
  perguntarAssistente,
  TEMPO_LIMITE_ASSISTENTE
} from "./assistente.js";
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


// fetch que só termina quando o sinal é abortado (servidor que não responde).
function fetchParado() {

  return vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  }));

}


let aoExpirar;
let restaurar;

beforeEach(() => {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
    token: "tok123",
    usuario: { nome: "Ana Souza" },
    expiraEm: Date.now() + 3600_000
  }));
  aoExpirar = vi.fn();
  restaurar = definirAoExpirar(aoExpirar);
});

afterEach(() => {
  restaurar();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});


describe("perguntarAssistente()", () => {

  it("200: POST em /assistente com token, devolve resposta e fontes", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, {
      resposta: "  Você tem 2 veículos.\nVAN-01 e VAN-02.  ",
      fontes: ["veiculos", "", 3, " guia-de-uso "],
      origem: "ia"
    }));
    vi.stubGlobal("fetch", fetch);

    await expect(perguntarAssistente("Quantos veículos?")).resolves.toEqual({
      resposta: "Você tem 2 veículos.\nVAN-01 e VAN-02.",
      fontes: ["veiculos", "guia-de-uso"]
    });

    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/assistente`);
    expect(opcoes.method).toBe("POST");
    expect(opcoes.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok123" });
    expect(JSON.parse(opcoes.body)).toEqual({ pergunta: "Quantos veículos?" });
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
  });

  it("manda só as 6 últimas mensagens válidas do histórico, com texto até 1000", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { resposta: "ok", fontes: [] }));
    vi.stubGlobal("fetch", fetch);

    const historico = [
      ...Array.from({ length: 8 }, (_, i) => ({ papel: i % 2 ? "assistente" : "usuario", texto: `m${i}` })),
      { papel: "sistema", texto: "ignorar" },
      { papel: "assistente", texto: "x".repeat(1500), extra: 1 }
    ];

    await perguntarAssistente("p".repeat(600), historico);

    const corpo = JSON.parse(fetch.mock.calls[0][1].body);
    expect(corpo.pergunta).toHaveLength(500);
    expect(corpo.historico).toHaveLength(6);
    expect(corpo.historico[0]).toEqual({ papel: "assistente", texto: "m3" });
    expect(corpo.historico.map(m => m.texto.slice(0, 2))).toEqual(["m3", "m4", "m5", "m6", "m7", "xx"]);
    expect(corpo.historico[5]).toEqual({ papel: "assistente", texto: "x".repeat(1000) });
  });

  it("400: lança com a mensagem da API e o status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(400, { erros: ["pergunta: obrigatória"] })));

    const erro = await perguntarAssistente("?").catch(e => e);

    expect(erro.status).toBe(400);
    expect(erro.message).toBe("pergunta: obrigatória");
    expect(mensagemDeErro(erro)).toBe("pergunta: obrigatória");
  });

  it("429: lança com o aviso da API, que vai para a conversa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      resposta(429, { erros: ["muitas perguntas seguidas. Tente de novo em 1 min."] })
    ));

    const erro = await perguntarAssistente("oi").catch(e => e);

    expect(erro.status).toBe(429);
    expect(mensagemDeErro(erro)).toBe("muitas perguntas seguidas. Tente de novo em 1 min.");
  });

  it("503: lança com status 503 e a conversa mostra o aviso de indisponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(503, { erros: ["assistente indisponível"] })));

    const erro = await perguntarAssistente("oi").catch(e => e);

    expect(erro.status).toBe(503);
    expect(mensagemDeErro(erro)).toBe(MENSAGEM_INDISPONIVEL);
  });

  it("401: limpa a sessão e avisa quem redireciona, como api()", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erros: ["Token vencido."] })));

    const erro = await perguntarAssistente("oi").catch(e => e);

    expect(erro.message).toBe("Sessão encerrada.");
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
    expect(aoExpirar).toHaveBeenCalledTimes(1);
    expect(mensagemDeErro(erro)).toBe("Sua sessão terminou. Entre de novo para continuar.");
  });

  it("200 sem resposta vira erro (aviso de indisponível)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { resposta: "   ", fontes: [] })));

    const erro = await perguntarAssistente("oi").catch(e => e);

    expect(erro.message).toBe("Resposta vazia do assistente.");
    expect(mensagemDeErro(erro)).toBe(MENSAGEM_INDISPONIVEL);
  });

  it("falha de rede é repassada e vira o aviso de indisponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const erro = await perguntarAssistente("oi").catch(e => e);

    expect(erro).toBeInstanceOf(TypeError);
    expect(mensagemDeErro(erro)).toBe(MENSAGEM_INDISPONIVEL);
  });

  it(`desiste em ${TEMPO_LIMITE_ASSISTENTE / 1000} s com .tempoEsgotado`, async () => {
    vi.useFakeTimers();
    const fetch = fetchParado();
    vi.stubGlobal("fetch", fetch);

    const promessa = perguntarAssistente("oi").catch(e => e);

    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_ASSISTENTE - 1);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const erro = await promessa;

    expect(erro.tempoEsgotado).toBe(true);
    expect(mensagemDeErro(erro)).toBe(MENSAGEM_INDISPONIVEL);
  });

  it("sinal de quem chama cancela o pedido, sem marcar tempo esgotado", async () => {
    const fetch = fetchParado();
    vi.stubGlobal("fetch", fetch);
    const controle = new AbortController();

    const promessa = perguntarAssistente("oi", [], { signal: controle.signal }).catch(e => e);
    controle.abort();
    const erro = await promessa;

    expect(erro.name).toBe("AbortError");
    expect(erro.tempoEsgotado).toBeUndefined();
  });

});
