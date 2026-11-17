// Regras da linha do tempo de Alertas: grupos por dia e linha da ocorrência.

import { describe, expect, it } from "vitest";
import { agruparPorDia, linhaDaOcorrencia } from "./linhaDoTempo.js";

const ocorrencia = (inicio, temps) => ({
  inicio,
  leituras: temps.map((temperatura, i) => ({ temperatura, data: new Date(inicio.getTime() + i * 20000) }))
});


describe("agruparPorDia", () => {

  const hoje = new Date(2026, 10, 17, 9, 0);

  it("separa hoje, ontem e dias antigos, mantendo a ordem", () => {
    const grupos = agruparPorDia([
      { inicio: new Date(2026, 10, 17, 8, 30) },
      { inicio: new Date(2026, 10, 17, 1, 10) },
      { inicio: new Date(2026, 10, 16, 22, 41) },
      { inicio: new Date(2026, 10, 12, 14, 0) }
    ], hoje);
    expect(grupos.map(g => g.rotulo)).toEqual(["Hoje, 17/11", "Ontem, 16/11", "12/11"]);
    expect(grupos[0].ocorrencias).toHaveLength(2);
  });

  it("sem ocorrências: nenhum grupo", () => {
    expect(agruparPorDia([], hoje)).toEqual([]);
  });

  it("usa a data de agora quando não recebe o dia", () => {
    const [grupo] = agruparPorDia([{ inicio: new Date() }]);
    expect(grupo.rotulo).toMatch(/^Hoje, \d{2}\/\d{2}$/);
  });

});


describe("linhaDaOcorrencia", () => {

  it("calor: limite máximo, pontos de ponta a ponta e o pico no alto", () => {
    const g = linhaDaOcorrencia(ocorrencia(new Date(2026, 10, 17, 12, 0), [16, 22, 17]), { min: null, max: 15, margem: 5 });
    const pontos = g.pontos.split(" ").map(p => p.split(",").map(Number));
    expect(pontos).toHaveLength(3);
    expect(pontos[0][0]).toBe(0);
    expect(pontos[2][0]).toBe(600);
    expect(Math.min(...pontos.map(p => p[1]))).toBe(pontos[1][1]);   // pico é o ponto mais alto
    expect(g.yLimite).toBeGreaterThan(pontos[0][1]);  // limite abaixo da linha
    expect(g.rotuloLimite).toBe("limite máximo 15.0 °C");
    expect(g.descricao).toBe("3 leituras fora da faixa, de 16.0 °C a 22.0 °C; limite 15.0 °C.");
  });

  it("frio: limite mínimo da faixa", () => {
    const g = linhaDaOcorrencia(ocorrencia(new Date(2026, 10, 17, 3, 0), [8, 7]), { min: 10, max: 13, margem: 3 });
    expect(g.rotuloLimite).toBe("limite mínimo 10.0 °C");
    const ys = g.pontos.split(" ").map(p => Number(p.split(",")[1]));
    expect(g.yLimite).toBeLessThan(Math.min(...ys));   // limite acima das leituras
  });

  it("leituras no mesmo instante ficam no meio", () => {
    const inicio = new Date(2026, 10, 17, 3, 0);
    const g = linhaDaOcorrencia({ inicio, leituras: [{ temperatura: 18, data: inicio }, { temperatura: 19, data: inicio }] }, { min: null, max: 15, margem: 5 });
    expect(g.pontos.split(" ").every(p => p.startsWith("300,"))).toBe(true);
  });

});
