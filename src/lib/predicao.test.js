import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "./config.js";
import {
  buscarRisco,
  estadoDoErro,
  formatarBrier,
  formatarChance,
  infoNivel,
  momentoRecife,
  nomeDoMes
} from "./predicao.js";

afterEach(() => {
  vi.unstubAllGlobals();
});


describe("buscarRisco", () => {

  it("chama GET /predict com mês e hora e devolve o JSON", async () => {

    const resposta = { probabilidade: 0.98, nivel: "alto" };
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify(resposta), { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);

    const dados = await buscarRisco({ mes: 10, hora: 15 });

    expect(dados).toEqual(resposta);
    expect(fetchFalso.mock.calls[0][0]).toBe(`${API_URL}/predict?mes=10&hora=15`);
    expect(fetchFalso.mock.calls[0][1].method).toBe("GET");

  });

  it("repassa o sinal de cancelamento", async () => {

    const fetchFalso = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    const controle = new AbortController();

    await buscarRisco({ mes: 1, hora: 0, signal: controle.signal });

    expect(fetchFalso.mock.calls[0][1].signal).toBe(controle.signal);

  });

  it("lança com status 404 quando a rota não existe", async () => {

    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));

    await expect(buscarRisco({ mes: 1, hora: 0 })).rejects.toMatchObject({ status: 404 });

  });

});


describe("momentoRecife", () => {

  it("usa o fuso de Recife (UTC-3)", () => {
    // 01/01 01:30 UTC = 31/12 22:30 em Recife.
    expect(momentoRecife(new Date(Date.UTC(2026, 0, 1, 1, 30)))).toEqual({ mes: 12, hora: 22 });
    expect(momentoRecife(new Date(Date.UTC(2026, 9, 16, 18, 0)))).toEqual({ mes: 10, hora: 15 });
  });

  it("meia-noite vira hora 0", () => {
    expect(momentoRecife(new Date(Date.UTC(2026, 4, 10, 3, 0)))).toEqual({ mes: 5, hora: 0 });
  });

});


describe("formatação", () => {

  it("infoNivel mapeia o nível para o selo", () => {
    expect(infoNivel("baixo")).toEqual({ classe: "normal", texto: "RISCO BAIXO" });
    expect(infoNivel("moderado").classe).toBe("atencao");
    expect(infoNivel("alto").classe).toBe("critico");
    expect(infoNivel("outro")).toEqual({ classe: "aguardando", texto: "SEM NÍVEL" });
  });

  it("formatarChance arredonda para porcentagem", () => {
    expect(formatarChance(0.9839)).toBe("98%");
    expect(formatarChance(0)).toBe("0%");
    expect(formatarChance(undefined)).toBe("--");
  });

  it("formatarBrier usa três casas e vírgula", () => {
    expect(formatarBrier(0.0911)).toBe("0,091");
    expect(formatarBrier(null)).toBe("--");
  });

  it("nomeDoMes", () => {
    expect(nomeDoMes(10)).toBe("outubro");
    expect(nomeDoMes(13)).toBe("");
  });

});


describe("estadoDoErro", () => {

  it("404 é rota ainda não publicada, não erro", () => {
    const erro = Object.assign(new Error("HTTP 404"), { status: 404 });
    expect(estadoDoErro(erro).tipo).toBe("indisponivel");
  });

  it("outros erros e falha de rede viram erro", () => {
    expect(estadoDoErro(Object.assign(new Error("x"), { status: 503 })).tipo).toBe("erro");
    expect(estadoDoErro(new TypeError("Failed to fetch")).tipo).toBe("erro");
    expect(estadoDoErro(undefined).tipo).toBe("erro");
  });

});
