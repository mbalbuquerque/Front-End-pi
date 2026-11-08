import { beforeEach, describe, expect, it, vi } from "vitest";
import { MENSAGEM_INDISPONIVEL } from "../../lib/assistente.js";
import {
  assinar,
  enviarPergunta,
  garantirDono,
  lerConversa,
  limparConversa,
  montarHistorico,
  primeiroNome
} from "./conversa.js";


function erroHttp(status, mensagem) {

  const erro = new Error(mensagem);
  erro.status = status;
  return erro;

}


beforeEach(() => {
  limparConversa("tok-a");
});


describe("conversa do assistente", () => {

  it("pergunta e resposta entram na conversa; esperando liga e desliga", async () => {
    const perguntar = vi.fn().mockResolvedValue({ resposta: "Tudo normal.", fontes: ["leituras"] });

    const promessa = enviarPergunta("  Como estão? ", { perguntar });

    expect(lerConversa().esperando).toBe(true);
    expect(lerConversa().mensagens.map(m => [m.tipo, m.texto])).toEqual([["usuario", "Como estão?"]]);

    await promessa;

    const { mensagens, esperando } = lerConversa();
    expect(esperando).toBe(false);
    expect(mensagens[1]).toMatchObject({ tipo: "assistente", texto: "Tudo normal.", fontes: ["leituras"] });
    expect(perguntar).toHaveBeenCalledWith("Como estão?", [], expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("histórico leva só as perguntas respondidas, até 6 mensagens", async () => {
    const perguntar = vi.fn(async texto => {
      if (texto === "falha") throw erroHttp(503, "assistente indisponível");
      return { resposta: `r-${texto}`, fontes: [] };
    });

    for (const texto of ["a", "falha", "b", "c", "d"]) {
      await enviarPergunta(texto, { perguntar });
    }

    // Antes de "d": a, b, c respondidas = 6 mensagens; "falha" ficou de fora.
    expect(perguntar.mock.calls[4][1]).toEqual([
      { papel: "usuario", texto: "a" }, { papel: "assistente", texto: "r-a" },
      { papel: "usuario", texto: "b" }, { papel: "assistente", texto: "r-b" },
      { papel: "usuario", texto: "c" }, { papel: "assistente", texto: "r-c" }
    ]);
    expect(montarHistorico()[0]).toEqual({ papel: "usuario", texto: "b" });
  });

  it("erro vira mensagem: 429 com o texto da API, 503 com o aviso de indisponível", async () => {
    await enviarPergunta("x", { perguntar: vi.fn().mockRejectedValue(erroHttp(429, "muitas perguntas seguidas. Tente de novo em 1 min.")) });
    await enviarPergunta("y", { perguntar: vi.fn().mockRejectedValue(erroHttp(503, "assistente indisponível")) });

    const erros = lerConversa().mensagens.filter(m => m.tipo === "erro").map(m => m.texto);
    expect(erros).toEqual(["muitas perguntas seguidas. Tente de novo em 1 min.", MENSAGEM_INDISPONIVEL]);
  });

  it("ignora pergunta vazia e pergunta nova enquanto espera", async () => {
    let terminar;
    const perguntar = vi.fn(() => new Promise(resolver => { terminar = resolver; }));

    enviarPergunta("   ", { perguntar });
    const primeira = enviarPergunta("um", { perguntar });
    enviarPergunta("dois", { perguntar });

    expect(perguntar).toHaveBeenCalledTimes(1);
    terminar({ resposta: "ok", fontes: [] });
    await primeira;
  });

  it("outro dono (sair, outro login) zera a conversa e descarta a resposta pendente", async () => {
    let terminar;
    const perguntar = vi.fn((_t, _h, { signal }) => new Promise(resolver => {
      terminar = resolver;
      signal.addEventListener("abort", () => resolver({ resposta: "tarde", fontes: [] }));
    }));
    const avisar = vi.fn();
    const desfazer = assinar(avisar);

    const promessa = enviarPergunta("pergunta", { perguntar });
    garantirDono("tok-a");
    expect(lerConversa().mensagens).toHaveLength(1);

    garantirDono(null);
    terminar({ resposta: "tarde", fontes: [] });
    await promessa;

    expect(lerConversa()).toEqual({ dono: null, mensagens: [], esperando: false });
    expect(avisar).toHaveBeenCalled();
    desfazer();
  });

  it("primeiroNome pega a primeira palavra", () => {
    expect(primeiroNome("  Gestora Teste ")).toBe("Gestora");
    expect(primeiroNome(undefined)).toBe("");
  });

});
