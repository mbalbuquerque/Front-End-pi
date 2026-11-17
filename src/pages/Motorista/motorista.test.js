// Regras da tela do motorista: status, "há X min", faixa e quando alertar.

import { describe, expect, it } from "vitest";
import {
  LIMITE_SEM_SINAL_MIN,
  STATUS_MOTORISTA,
  descreverFaixa,
  deveDisparar,
  haQuanto,
  minutosDesde,
  partesTemperatura,
  proximoAlerta,
  statusDaTela
} from "./motorista.js";

const AGORA = Date.parse("2026-11-16T22:00:00Z");
const ha = minutos => new Date(AGORA - minutos * 60000).toISOString();


describe("minutosDesde", () => {

  it("minutos inteiros, nunca negativo", () => {
    expect(minutosDesde(ha(0.5), AGORA)).toBe(0);
    expect(minutosDesde(ha(3.9), AGORA)).toBe(3);
    expect(minutosDesde(new Date(AGORA + 60000).toISOString(), AGORA)).toBe(0);
  });

  it("horário inválido: null", () => {
    expect(minutosDesde("quebrado", AGORA)).toBeNull();
    expect(minutosDesde(undefined, AGORA)).toBeNull();
  });

  it("sem agora usa o relógio", () => {
    expect(minutosDesde(new Date().toISOString())).toBe(0);
  });

});


describe("statusDaTela", () => {

  const dados = (status, minutos) => ({ leitura: { temperatura: 11, status, medidoEm: ha(minutos) } });

  it("leitura recente: o status dela", () => {
    expect(statusDaTela(dados("NORMAL", 1), AGORA)).toBe("NORMAL");
    expect(statusDaTela(dados("ATENCAO", 0), AGORA)).toBe("ATENCAO");
    expect(statusDaTela(dados("CRITICO", LIMITE_SEM_SINAL_MIN), AGORA)).toBe("CRITICO");
  });

  it("mais de 5 min sem leitura: SEM_SINAL", () => {
    expect(statusDaTela(dados("CRITICO", LIMITE_SEM_SINAL_MIN + 1), AGORA)).toBe("SEM_SINAL");
  });

  it("sem leitura, horário quebrado ou status desconhecido: SEM_SINAL", () => {
    expect(statusDaTela({ leitura: null }, AGORA)).toBe("SEM_SINAL");
    expect(statusDaTela(null, AGORA)).toBe("SEM_SINAL");
    expect(statusDaTela({ leitura: { status: "NORMAL", medidoEm: "x" } }, AGORA)).toBe("SEM_SINAL");
    expect(statusDaTela(dados("OUTRO", 0), AGORA)).toBe("SEM_SINAL");
  });

  it("sem agora usa o relógio", () => {
    expect(statusDaTela({ leitura: { status: "NORMAL", medidoEm: new Date().toISOString() } })).toBe("NORMAL");
  });

  it("os quatro estados têm texto (não só cor)", () => {
    expect(Object.values(STATUS_MOTORISTA).map(s => s.texto)).toEqual(["NORMAL", "ATENÇÃO", "CRÍTICO", "SEM SINAL"]);
  });

});


describe("haQuanto", () => {

  it.each([
    [null, ""],
    [undefined, ""],
    [0, "agora há pouco"],
    [1, "há 1 min"],
    [59, "há 59 min"],
    [60, "há 1 h"],
    [125, "há 2 h 5 min"]
  ])("%s -> %s", (minutos, texto) => {
    expect(haQuanto(minutos)).toBe(texto);
  });

});


describe("descreverFaixa", () => {

  it("nome do perfil e a faixa normal", () => {
    expect(descreverFaixa({ nome: "Manga", min: 10, max: 13, margem: 3 })).toBe("Manga: de 10 a 13 °C");
    expect(descreverFaixa({ nome: "Demonstrativo (protótipo)", min: null, max: 15, margem: 5 }))
      .toBe("Demonstrativo (protótipo): até 15 °C");
    expect(descreverFaixa(undefined)).toBe("");
  });

});


describe("alerta", () => {

  it("proximoAlerta: some no NORMAL, segue o status fora da faixa, fica no SEM_SINAL", () => {
    expect(proximoAlerta(null, "NORMAL")).toBeNull();
    expect(proximoAlerta("CRITICO", "NORMAL")).toBeNull();
    expect(proximoAlerta(null, "ATENCAO")).toBe("ATENCAO");
    expect(proximoAlerta("ATENCAO", "CRITICO")).toBe("CRITICO");
    expect(proximoAlerta("CRITICO", "ATENCAO")).toBe("ATENCAO");
    expect(proximoAlerta("CRITICO", "SEM_SINAL")).toBe("CRITICO");
    expect(proximoAlerta(null, "SEM_SINAL")).toBeNull();
  });

  it("deveDisparar: só quando piora", () => {
    expect(deveDisparar(null, "ATENCAO")).toBe(true);
    expect(deveDisparar(null, "CRITICO")).toBe(true);
    expect(deveDisparar("ATENCAO", "CRITICO")).toBe(true);
    expect(deveDisparar("CRITICO", "CRITICO")).toBe(false);
    expect(deveDisparar("CRITICO", "ATENCAO")).toBe(false);
    expect(deveDisparar("CRITICO", null)).toBe(false);
    expect(deveDisparar(null, null)).toBe(false);
  });

});


describe("partesTemperatura", () => {

  it("número e unidade separados", () => {
    expect(partesTemperatura("17.5 °C")).toEqual({ valor: "17.5", unidade: "°C" });
    expect(partesTemperatura("--")).toEqual({ valor: "--", unidade: "" });
  });

});
