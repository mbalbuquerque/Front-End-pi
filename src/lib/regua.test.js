import { describe, expect, it } from "vitest";
import { descreverAtencao, montarRegua, reguaDaFaixa } from "./regua.js";

describe("montarRegua", () => {

  it("faixa só com máximo (até 15 °C, margem 5): segura de 0 a 15, atenção até 20, crítica até 25", () => {
    const regua = montarRegua({ min: null, max: 15, margem: 5 }, 6);
    expect(regua.inicio).toBe(0);
    expect(regua.fim).toBe(25);
    expect(regua.zonas.map(z => [z.tipo, z.de, z.ate])).toEqual([
      ["normal", 0, 15], ["atencao", 15, 20], ["critico", 20, 25]
    ]);
    expect(regua.zonas.map(z => z.largura)).toEqual([60, 20, 20]);
    expect(regua.marcador).toBe(24);
  });

  it("faixa com mínimo e máximo: crítica, atenção, segura, atenção, crítica", () => {
    const regua = montarRegua({ min: 10, max: 13, margem: 3 }, 11.5);
    expect(regua.zonas.map(z => z.tipo)).toEqual(["critico", "atencao", "normal", "atencao", "critico"]);
    expect(regua.inicio).toBe(4);
    expect(regua.fim).toBe(19);
    expect(regua.marcador).toBe(50);
  });

  it("leitura fora da escala estica a régua para o marcador caber", () => {
    const acima = montarRegua({ min: null, max: 15, margem: 5 }, 31);
    expect(acima.fim).toBe(31);
    expect(acima.marcador).toBe(100);
    const abaixo = montarRegua({ min: null, max: 15, margem: 5 }, -4);
    expect(abaixo.inicio).toBe(-4);
    expect(abaixo.marcador).toBe(0);
    const frio = montarRegua({ min: 10, max: 13, margem: 3 }, 1);
    expect(frio.inicio).toBe(1);
    expect(frio.marcador).toBe(0);
  });

  it("sem leitura: zonas sem marcador", () => {
    expect(montarRegua({ min: null, max: 15, margem: 5 }, null).marcador).toBeNull();
    expect(montarRegua({ min: null, max: 15, margem: 5 }, Number.NaN).marcador).toBeNull();
    expect(montarRegua({ min: 10, max: 13, margem: 3 }, undefined).zonas).toHaveLength(5);
  });

  it("máximo baixo (até 4 °C): a zona segura ainda começa abaixo de zero", () => {
    const regua = montarRegua({ min: null, max: 4, margem: 3 }, 2);
    expect(regua.inicio).toBe(-2);
    expect(regua.zonas[0]).toMatchObject({ tipo: "normal", de: -2, ate: 4 });
  });

  it("descreve a zona de atenção para a legenda", () => {
    expect(descreverAtencao({ min: null, max: 15, margem: 5 })).toBe("15 a 20 °C");
    expect(descreverAtencao({ min: 10, max: 13, margem: 3 })).toBe("7 a 10 °C ou 13 a 16 °C");
  });

});


describe("reguaDaFaixa (tela do motorista)", () => {

  const larguras = regua => regua.zonas.map(z => [z.tipo, Math.round(z.largura)]);

  it("faixa só com máximo: segura de 0 até o máximo, atenção, crítica", () => {
    const regua = reguaDaFaixa({ min: null, max: 15, margem: 5 }, 6);
    expect(regua.inicio).toBe(0);
    expect(regua.fim).toBe(25);
    expect(larguras(regua)).toEqual([["normal", 60], ["atencao", 20], ["critico", 20]]);
    expect(regua.limites).toEqual([{ valor: 15, posicao: 60 }, { valor: 20, posicao: 80 }]);
    expect(regua.marcador).toBe(24);
  });

  it("faixa com mínimo e máximo: cinco zonas simétricas", () => {
    const regua = reguaDaFaixa({ nome: "Frutas", min: 10, max: 13, margem: 3 }, 11.5);
    expect(regua.inicio).toBe(4);
    expect(regua.fim).toBe(19);
    expect(larguras(regua)).toEqual([
      ["critico", 20], ["atencao", 20], ["normal", 20], ["atencao", 20], ["critico", 20]
    ]);
    expect(regua.limites.map(l => l.valor)).toEqual([7, 10, 13, 16]);
    expect(regua.marcador).toBe(50);
  });

  it("temperatura fora da escala: a escala cresce e o marcador fica na régua", () => {
    const quente = reguaDaFaixa({ min: 10, max: 13, margem: 3 }, 26.2);
    expect(quente.fim).toBe(27);
    expect(quente.marcador).toBeLessThanOrEqual(100);
    expect(quente.zonas.reduce((soma, z) => soma + z.largura, 0)).toBeCloseTo(100);

    const frio = reguaDaFaixa({ min: null, max: 15, margem: 5 }, -3.4);
    expect(frio.inicio).toBe(-4);
    expect(frio.marcador).toBeGreaterThanOrEqual(0);
  });

  it("sem leitura: régua sem marcador; faixa inválida: sem régua", () => {
    expect(reguaDaFaixa({ min: null, max: 15, margem: 5 }, null).marcador).toBeNull();
    expect(reguaDaFaixa(null, 5)).toBeNull();
    expect(reguaDaFaixa({ min: null, max: 15 }, 5)).toBeNull();
  });

});
