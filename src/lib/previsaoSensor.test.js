import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("./api.js", () => api);

import { buscarPrevisaoSensor, formatarMae, resumirPrevisao } from "./previsaoSensor.js";

const ponto = (temperatura, status = "NORMAL") => ({ para: "2026-11-17T06:27:05+00:00", temperatura, status });

const resposta = (extra = {}) => ({
  deviceId: "coldtrack-01",
  horizonteMin: 10,
  ultimaLeitura: { medidoEm: "2026-11-17T06:17:05+00:00", perfil: "frutas", temperatura: 11.5, status: "NORMAL" },
  previsao: ponto(11.9),
  baseline: ponto(11.5),
  recomendada: "baseline",
  antecipaExcursao: false,
  motivo: null,
  modelo: { versao: "v1", maeModelo: 0.342, maeBaseline: 0.3128, superaBaseline: false },
  ...extra
});


describe("buscarPrevisaoSensor", () => {

  beforeEach(() => api.api.mockReset().mockResolvedValue({}));

  it("operador e gestor mandam o deviceId (codificado)", async () => {
    await buscarPrevisaoSensor({ deviceId: "esp 32/01" });
    expect(api.api).toHaveBeenCalledWith("/predict/sensor?deviceId=esp%2032%2F01", {});
  });

  it("motorista chama sem parâmetro; o sinal é repassado", async () => {
    const sinal = new AbortController().signal;
    await buscarPrevisaoSensor({ signal: sinal });
    expect(api.api).toHaveBeenCalledWith("/predict/sensor", { signal: sinal });
    await buscarPrevisaoSensor();
    expect(api.api).toHaveBeenLastCalledWith("/predict/sensor", {});
  });

});


describe("formatarMae", () => {

  it("três casas com vírgula; sem número, traço", () => {
    expect(formatarMae(0.3128)).toBe("0,313");
    expect(formatarMae(undefined)).toBe("--");
  });

});


describe("resumirPrevisao", () => {

  it("mostra a recomendada: baseline vira persistência e o valor do modelo não é usado", () => {
    const r = resumirPrevisao(resposta());
    expect(r).toMatchObject({ tipo: "previsao", temperatura: 11.5, horizonte: 10, metodo: "persistência", antecipa: false, superaBaseline: false });
    expect(r.mae).toEqual({ modelo: 0.342, baseline: 0.3128 });
  });

  it("recomendada modelo: mostra o valor do modelo, rotulado modelo", () => {
    const r = resumirPrevisao(resposta({ recomendada: "modelo", modelo: { maeModelo: 0.2, maeBaseline: 0.3, superaBaseline: true } }));
    expect(r).toMatchObject({ temperatura: 11.9, metodo: "modelo", superaBaseline: true });
  });

  it("antecipaExcursao com o status previsto", () => {
    const r = resumirPrevisao(resposta({ baseline: ponto(14.2, "ATENCAO"), antecipaExcursao: true }));
    expect(r.antecipa).toBe(true);
    expect(r.status).toEqual({ texto: "ATENÇÃO", classe: "atencao" });
  });

  it("antecipaExcursao sem status conhecido não acende o aviso", () => {
    const r = resumirPrevisao(resposta({ baseline: ponto(14.2, "???"), antecipaExcursao: true }));
    expect(r.antecipa).toBe(false);
    expect(r.status).toBeNull();
  });

  it("sem previsão: cada motivo tem texto e nenhum número", () => {
    const sem = motivo => resumirPrevisao(resposta({ previsao: null, baseline: null, motivo }));
    expect(sem("sem_leituras")).toEqual({ tipo: "sem-previsao", horizonte: 10, motivo: "O sensor não enviou leituras nos últimos 20 min." });
    expect(sem("sem_leitura_recente").motivo).toContain("mais de 5 min");
    expect(sem("historico_insuficiente").motivo).toContain("10 min contínuos");
    expect(sem("outro").motivo).toBe("Não há dados suficientes agora.");
    expect(sem(null).tipo).toBe("sem-previsao");
  });

  it("recomendada sem número (histórico curto e recomendada modelo): não troca por outra", () => {
    const r = resumirPrevisao(resposta({ recomendada: "modelo", previsao: null, motivo: "historico_insuficiente" }));
    expect(r.tipo).toBe("sem-previsao");
    expect(r.temperatura).toBeUndefined();
  });

  it("sem dados do modelo e sem horizonte na resposta: sem erros, horizonte 10", () => {
    const r = resumirPrevisao(resposta({ modelo: undefined, horizonteMin: undefined }));
    expect(r.mae).toBeNull();
    expect(r.horizonte).toBe(10);
  });

  it("resposta que a tela não entende: null", () => {
    expect(resumirPrevisao(null)).toBeNull();
    expect(resumirPrevisao("x")).toBeNull();
    expect(resumirPrevisao({})).toBeNull();
    expect(resumirPrevisao(resposta({ recomendada: "magia" }))).toBeNull();
  });

});
