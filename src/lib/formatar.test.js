import { describe, expect, it } from "vitest";
import { descreverCritico, descreverNormal, faixaDoPerfil, FAIXA_PADRAO } from "./faixas.js";
import {
  formatarDataHora,
  formatarDuracao,
  formatarHora,
  formatarTemp,
  formatarUmidade,
  infoStatus
} from "./formatar.js";


describe("formatar", () => {

  it("temperatura e umidade com 1 casa; não número vira --", () => {
    expect(formatarTemp(4)).toBe("4.0 °C");
    expect(formatarTemp(-2.345)).toBe("-2.3 °C");
    expect(formatarTemp(null)).toBe("--");
    expect(formatarUmidade(55.55)).toBe("55.5 %");
    expect(formatarUmidade(undefined)).toBe("--");
  });

  it("duração em min, h e h + min", () => {
    expect(formatarDuracao(20_000)).toBe("0 min");
    expect(formatarDuracao(45 * 60_000)).toBe("45 min");
    expect(formatarDuracao(60 * 60_000)).toBe("1 h");
    expect(formatarDuracao(135 * 60_000)).toBe("2 h 15 min");
  });

  it("data e hora no padrão pt-BR", () => {
    const data = new Date(2026, 10, 8, 9, 5, 7);
    expect(formatarDataHora(data)).toBe("08/11, 09:05:07");
    expect(formatarHora(data)).toBe("09:05");
  });

  it("status conhecido e desconhecido", () => {
    expect(infoStatus("CRITICO")).toEqual({ texto: "CRÍTICO", classe: "critico" });
    expect(infoStatus("ATENCAO")).toEqual({ texto: "ATENÇÃO", classe: "atencao" });
    expect(infoStatus(undefined)).toEqual({ texto: "SEM DADOS", classe: "aguardando" });
  });

});


describe("faixas", () => {

  it("faixa do perfil ou a padrão", () => {
    expect(faixaDoPerfil({ id: "x", min: 2, max: 8, margem: 2, nome: "Vacina" })).toEqual({ min: 2, max: 8, margem: 2 });
    expect(faixaDoPerfil(undefined)).toBe(FAIXA_PADRAO);
  });

  it("descreve faixa normal e crítica com e sem mínimo", () => {
    expect(descreverNormal({ min: null, max: 15, margem: 5 })).toBe("até 15 °C");
    expect(descreverNormal({ min: 10, max: 13, margem: 3 })).toBe("de 10 a 13 °C");
    expect(descreverCritico({ min: null, max: 15, margem: 5 })).toBe("acima de 20 °C");
    expect(descreverCritico({ min: 10, max: 13, margem: 3 })).toBe("abaixo de 7 °C ou acima de 16 °C");
  });

});
