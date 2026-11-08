import { describe, expect, it, vi } from "vitest";
import { entraNoHistorico, montarHistorico, responderPergunta } from "./conversa.js";
import { SEM_RESPOSTA } from "./respostas.js";


function erroHttp(status, mensagem) {

  const erro = new Error(mensagem);
  erro.status = status;
  return erro;

}


describe("montarHistorico", () => {

  it("fica com as últimas 6 mensagens de usuário e assistente, sem campos extras", () => {
    const turnos = [
      { papel: "sistema", texto: "manual" },
      ...Array.from({ length: 8 }, (_, i) => ({ papel: i % 2 ? "assistente" : "usuario", texto: `t${i}`, id: i })),
      { papel: "assistente", texto: "" }
    ];

    const historico = montarHistorico(turnos);

    expect(historico).toHaveLength(6);
    expect(historico[0]).toEqual({ papel: "usuario", texto: "t2" });
    expect(historico.at(-1)).toEqual({ papel: "assistente", texto: "t7" });
  });

  it("sem conversa, histórico vazio", () => {
    expect(montarHistorico([])).toEqual([]);
  });

});


describe("responderPergunta", () => {

  it("200: usa a resposta e as fontes da IA e repassa histórico e sinal", async () => {
    const perguntar = vi.fn().mockResolvedValue({ resposta: "Resposta da IA", fontes: ["README"] });
    const historico = [{ papel: "usuario", texto: "a" }, { papel: "assistente", texto: "b" }];
    const signal = new AbortController().signal;

    const resultado = await responderPergunta("Como funciona?", historico, { perguntar, signal });

    expect(resultado).toEqual({ origem: "ia", encontrada: true, texto: "Resposta da IA", fontes: ["README"] });
    expect(perguntar).toHaveBeenCalledWith("Como funciona?", historico, { signal });
  });

  it.each([
    ["503", erroHttp(503, "chat indisponível")],
    ["500", erroHttp(500, "HTTP 500")],
    ["400", erroHttp(400, "pergunta: obrigatória.")],
    ["rede", new TypeError("Failed to fetch")],
    ["tempo esgotado", Object.assign(new Error("demorou"), { tempoEsgotado: true })]
  ])("falha (%s): responde pelo FAQ com o mesmo texto de hoje", async (_nome, erro) => {
    const perguntar = vi.fn().mockRejectedValue(erro);

    const resultado = await responderPergunta("Quais sensores são utilizados?", [], { perguntar });

    expect(resultado.origem).toBe("faq");
    expect(resultado.encontrada).toBe(true);
    expect(resultado.texto).toContain("ESP32");
    expect(resultado.fontes).toEqual([]);
  });

  it("falha e o FAQ também não sabe: mensagem padrão, encontrada = false", async () => {
    const perguntar = vi.fn().mockRejectedValue(erroHttp(503, "chat indisponível"));

    const resultado = await responderPergunta("Qual é a cor do caminhão lunar?", [], { perguntar });

    expect(resultado).toMatchObject({ origem: "faq", encontrada: false, texto: SEM_RESPOSTA });
  });

  it("429: mostra a mensagem da API, sem cair no FAQ", async () => {
    const mensagem = "muitas perguntas seguidas. Tente de novo em 1 min.";
    const perguntar = vi.fn().mockRejectedValue(erroHttp(429, mensagem));

    const resultado = await responderPergunta("Quais sensores são utilizados?", [], { perguntar });

    expect(resultado).toEqual({ origem: "limite", encontrada: true, texto: mensagem, fontes: [] });
  });

  it("429 do limite diário (\"o chat atingiu o limite de perguntas de hoje\"): cai no FAQ como o 503", async () => {
    const perguntar = vi.fn().mockRejectedValue(
      erroHttp(429, "o chat atingiu o limite de perguntas de hoje. Tente amanhã ou fale pelo WhatsApp.")
    );

    const resultado = await responderPergunta("Quais sensores são utilizados?", [], { perguntar });

    expect(resultado.origem).toBe("faq");
    expect(resultado.encontrada).toBe(true);
    expect(resultado.texto).toContain("ESP32");
  });

});


describe("entraNoHistorico", () => {

  it("IA e FAQ com resposta entram; limite e sem resposta ficam de fora", () => {
    expect(entraNoHistorico({ origem: "ia", encontrada: true })).toBe(true);
    expect(entraNoHistorico({ origem: "faq", encontrada: true })).toBe(true);
    expect(entraNoHistorico({ origem: "faq", encontrada: false })).toBe(false);
    expect(entraNoHistorico({ origem: "limite", encontrada: true })).toBe(false);
  });

});
