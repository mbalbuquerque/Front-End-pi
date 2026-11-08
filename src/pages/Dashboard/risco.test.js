import { describe, expect, it } from "vitest";
import {
  CIDADES_ROTA,
  faixaCalor,
  faixasDeHoras,
  horaRecife,
  janelaFresca,
  montarPrevisao,
  resumoRisco,
  textoHistorico
} from "./risco.js";


// Resposta falsa da Open-Meteo: 48 horas a partir de 08/11 00h, uma entrada por cidade.
function respostaFalsa(tempPorHora) {

  const time = Array.from({ length: 48 }, (_, i) =>
    `2026-11-${String(8 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`);

  return CIDADES_ROTA.map((_, c) => ({
    hourly: { time, temperature_2m: time.map((_, i) => tempPorHora(i % 24, c)) }
  }));

}


describe("montarPrevisao", () => {

  it("começa na hora atual, pega 24 horas e a cidade mais quente de cada hora", () => {

    const dados = respostaFalsa((hora, cidade) => 20 + hora / 2 + (cidade === 3 ? 1 : 0));
    const previsao = montarPrevisao(dados, "2026-11-08T10");

    expect(previsao).toHaveLength(24);
    expect(previsao[0]).toEqual({ hora: 10, temp: 26, cidade: "Serra Talhada", origem: 25 });
    expect(previsao[23].hora).toBe(9);

  });

  it("sem a hora atual na lista, começa do início", () => {

    const previsao = montarPrevisao(respostaFalsa(() => 25), "2030-01-01T00");
    expect(previsao[0].hora).toBe(0);

  });

});


describe("horaRecife", () => {

  it("converte para o horário de Recife (UTC-3)", () => {
    expect(horaRecife(new Date("2026-11-08T13:45:00Z"))).toBe("2026-11-08T10");
  });

});


describe("faixasDeHoras", () => {

  it("junta horas seguidas, inclusive virando a meia-noite", () => {

    const horas = [13, 14, 15, 18, 23, 0].map(hora => ({ hora }));
    expect(faixasDeHoras(horas)).toEqual(["13h às 16h", "18h", "23h às 1h"]);

  });

});


describe("janelaFresca", () => {

  it("acha as 3 horas mais frescas na origem", () => {

    const previsao = [20, 21, 22, 23, 0, 1, 2, 3, 4].map((hora, i) => ({ hora, origem: [30, 28, 26, 24, 22, 21, 22, 25, 27][i] }));
    expect(janelaFresca(previsao)).toBe("0h às 3h");

  });

});


describe("faixaCalor", () => {

  it("separa ameno, quente e forte nos limiares", () => {

    expect(faixaCalor(30).classe).toBe("ameno");
    expect(faixaCalor(30.1)).toEqual({ classe: "quente", texto: "acima de 30 °C" });
    expect(faixaCalor(35.5).classe).toBe("forte");

  });

});


describe("textoHistorico", () => {

  it("usa o pico de chance do mês", () => {

    expect(textoHistorico(9)).toBe(
      "No histórico de outubro (INMET, Petrolina), a chance de passar de 30 °C às 15h é de 99%.");

  });

});


describe("resumoRisco", () => {

  it("descreve as faixas quentes e o pico", () => {

    const previsao = [
      { hora: 13, temp: 29, cidade: "Suape" },
      { hora: 14, temp: 33.4, cidade: "Cabrobó" },
      { hora: 15, temp: 31, cidade: "Petrolina" }
    ];

    expect(resumoRisco(previsao)).toBe(
      "A rota passa de 30 °C 14h às 16h, com pico de 33 °C em Cabrobó às 14h.");

  });

  it("avisa quando a rota fica abaixo do limiar", () => {

    expect(resumoRisco([{ hora: 3, temp: 22, cidade: "Caruaru" }])).toBe(
      "A rota fica abaixo de 30 °C nas próximas 24 horas (máxima de 22 °C em Caruaru).");

  });

});
