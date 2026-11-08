import { afterEach, describe, expect, it, vi } from "vitest";
import { perguntarChat, TEMPO_LIMITE_CHAT } from "./chat.js";
import { API_URL } from "./config.js";


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


afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});


describe("perguntarChat()", () => {

  it("200: POST em /chat sem token, devolve resposta e fontes", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, {
      resposta: "  O ColdTrack monitora a cadeia fria.  ",
      fontes: ["README", "", 3, "faq"],
      origem: "ia"
    }));
    vi.stubGlobal("fetch", fetch);

    await expect(perguntarChat("O que é?")).resolves.toEqual({
      resposta: "O ColdTrack monitora a cadeia fria.",
      fontes: ["README", "faq"]
    });

    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/chat`);
    expect(opcoes.method).toBe("POST");
    expect(opcoes.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(opcoes.body)).toEqual({ pergunta: "O que é?" });
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
  });

  it("manda só as últimas 6 mensagens do histórico, com texto até 1000", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { resposta: "ok", fontes: [] }));
    vi.stubGlobal("fetch", fetch);

    const historico = Array.from({ length: 8 }, (_, i) => ({
      papel: i % 2 ? "assistente" : "usuario",
      texto: i === 7 ? "x".repeat(1500) : `m${i}`,
      extra: "não vai"
    }));

    await perguntarChat("p".repeat(600), historico);

    const corpo = JSON.parse(fetch.mock.calls[0][1].body);
    expect(corpo.pergunta).toHaveLength(500);
    expect(corpo.historico).toHaveLength(6);
    expect(corpo.historico[0]).toEqual({ papel: "usuario", texto: "m2" });
    expect(corpo.historico[5].texto).toHaveLength(1000);
  });

  it.each([
    [400, ["pergunta: obrigatória."]],
    [429, ["muitas perguntas seguidas. Tente de novo em 1 min."]],
    [503, ["chat indisponível"]]
  ])("%i: lança com a mensagem da API e o status", async (status, erros) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(status, { erros })));

    const erro = await perguntarChat("oi").catch(e => e);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(status);
    expect(erro.message).toBe(erros[0]);
  });

  it("erro sem corpo vira 'HTTP <status>'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(502)));

    await expect(perguntarChat("oi")).rejects.toMatchObject({ message: "HTTP 502", status: 502 });
  });

  it("200 sem resposta é tratado como falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, { resposta: "   ", fontes: [] })));

    await expect(perguntarChat("oi")).rejects.toThrow("Resposta vazia");
  });

  it("falha de rede é repassada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(perguntarChat("oi")).rejects.toThrow("Failed to fetch");
  });

  it("passa do tempo limite (15 s): aborta e lança com tempoEsgotado", async () => {
    vi.useFakeTimers();
    const fetch = fetchParado();
    vi.stubGlobal("fetch", fetch);

    const promessa = perguntarChat("oi").catch(e => e);

    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_CHAT - 1);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const erro = await promessa;

    expect(TEMPO_LIMITE_CHAT).toBe(15000);
    expect(erro.tempoEsgotado).toBe(true);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("sinal de fora abortado cancela o pedido (sem tempoEsgotado)", async () => {
    vi.stubGlobal("fetch", fetchParado());
    const controle = new AbortController();

    const promessa = perguntarChat("oi", [], { signal: controle.signal }).catch(e => e);
    controle.abort();
    const erro = await promessa;

    expect(erro.name).toBe("AbortError");
    expect(erro.tempoEsgotado).toBeUndefined();
  });

});
