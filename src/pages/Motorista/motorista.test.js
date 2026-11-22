// Regras da tela do motorista: status, "há X min", faixa e quando alertar.

import { describe, expect, it } from "vitest";
import {
  LIMITE_SEM_SINAL_MIN,
  STATUS_MOTORISTA,
  alertasDoHistorico,
  descreverFaixa,
  deveDisparar,
  frasePerfil,
  haQuanto,
  haQuantoCurto,
  iniciais,
  minutosDesde,
  partesTemperatura,
  pontosDoHistorico,
  proximoAlerta,
  resumoDoHistorico,
  statusDaTela,
  tempoDeViagem,
  tendencia,
  ultimosMinutos
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


// Histórico: pontos a cada `passo` min terminando em AGORA, com as temperaturas dadas.
function historico(temps, passo = 1, status = () => "NORMAL") {
  return temps.map((temperatura, i) => ({
    temperatura,
    status: status(temperatura, i),
    medidoEm: ha((temps.length - 1 - i) * passo)
  }));
}


describe("pontosDoHistorico e ultimosMinutos", () => {

  it("API antiga (sem historico) ou lixo: lista vazia", () => {
    expect(pontosDoHistorico(undefined)).toEqual([]);
    expect(pontosDoHistorico(null)).toEqual([]);
    expect(ultimosMinutos(undefined, 30)).toEqual([]);
  });

  it("descarta ponto sem número ou sem horário e ordena do mais antigo ao mais novo", () => {
    const lista = [
      { temperatura: 12, medidoEm: ha(1) },
      { temperatura: null, medidoEm: ha(2) },
      { temperatura: 11, medidoEm: "quebrado" },
      { temperatura: 10, medidoEm: ha(5) },
      null
    ];
    expect(pontosDoHistorico(lista).map(p => p.temperatura)).toEqual([10, 12]);
  });

  it("janela conta a partir do ponto mais novo, não do relógio", () => {
    const lista = historico([1, 2, 3, 4, 5, 6], 10);
    expect(ultimosMinutos(lista, 30).map(p => p.temperatura)).toEqual([3, 4, 5, 6]);
  });

});


describe("tendencia", () => {

  it("subindo: compara com ~10 min antes", () => {
    const t = tendencia(historico([11, 11.2, 11.6, 12, 12.4], 2.5));
    expect(t).toEqual({ direcao: "subindo", delta: 1.4, minutos: 10, texto: "subindo +1.4 °C em 10 min" });
  });

  it("caindo e estável", () => {
    expect(tendencia(historico([14, 13.5, 13], 5)).direcao).toBe("caindo");
    expect(tendencia(historico([14, 13.5, 13], 5)).texto).toBe("caindo −1.0 °C em 10 min");
    expect(tendencia(historico([12, 12.1, 12.2], 5))).toMatchObject({ direcao: "estavel", texto: "estável em 10 min" });
  });

  it("histórico curto usa o primeiro ponto; menos de 2 min ou 1 ponto: null", () => {
    expect(tendencia(historico([11, 12], 4))).toMatchObject({ minutos: 4, direcao: "subindo" });
    expect(tendencia(historico([11, 12], 1))).toBeNull();
    expect(tendencia(historico([11]))).toBeNull();
    expect(tendencia(undefined)).toBeNull();
  });

});


describe("alertasDoHistorico", () => {

  const status = t => (t > 16 ? "CRITICO" : t > 13 ? "ATENCAO" : "NORMAL");

  it("só as mudanças de status, a mais nova primeiro", () => {
    const lista = historico([12, 12.5, 14, 14.5, 17, 17.2, 12.8], 5, status);
    expect(alertasDoHistorico(lista).map(a => [a.status, a.temperatura])).toEqual([
      ["NORMAL", 12.8],
      ["CRITICO", 17],
      ["ATENCAO", 14]
    ]);
  });

  it("começou fora do normal: o primeiro ponto entra", () => {
    expect(alertasDoHistorico(historico([14, 14.2], 5, status)).map(a => a.status)).toEqual(["ATENCAO"]);
  });

  it("sem mudanças, sem histórico ou status desconhecido: vazio", () => {
    expect(alertasDoHistorico(historico([11, 12], 5, status))).toEqual([]);
    expect(alertasDoHistorico(undefined)).toEqual([]);
    expect(alertasDoHistorico(historico([20], 5, () => "SEM_LEITURA"))).toEqual([]);
  });

  it("com o início da viagem, ignora o que veio antes", () => {
    const lista = historico([14, 12, 14], 10, status);
    expect(alertasDoHistorico(lista, ha(15)).map(a => a.temperatura)).toEqual([14]);
    expect(alertasDoHistorico(lista, "invalido")).toHaveLength(3);
  });

});


describe("resumoDoHistorico", () => {

  it("mínima, máxima, média e total", () => {
    expect(resumoDoHistorico(historico([10, 12, 14]))).toEqual({ minima: 10, maxima: 14, media: 12, total: 3 });
  });

  it("sem pontos: null", () => {
    expect(resumoDoHistorico([])).toBeNull();
    expect(resumoDoHistorico(undefined)).toBeNull();
  });

});


describe("tempoDeViagem, haQuantoCurto, frasePerfil, iniciais", () => {

  it("tempo de viagem em h e min", () => {
    expect(tempoDeViagem(ha(220), AGORA)).toBe("3 h 40 min");
    expect(tempoDeViagem(ha(120), AGORA)).toBe("2 h");
    expect(tempoDeViagem(ha(25), AGORA)).toBe("25 min");
    expect(tempoDeViagem(new Date(AGORA + 60000).toISOString(), AGORA)).toBeNull();
    expect(tempoDeViagem(null, AGORA)).toBeNull();
  });

  it("há X s até 1 min, depois minutos", () => {
    expect(haQuantoCurto(new Date(AGORA - 20000).toISOString(), AGORA)).toBe("há 20 s");
    expect(haQuantoCurto(ha(3), AGORA)).toBe("há 3 min");
    expect(haQuantoCurto(new Date(AGORA + 5000).toISOString(), AGORA)).toBe("há 0 s");
    expect(haQuantoCurto(undefined, AGORA)).toBe("");
  });

  it("faixa ideal em uma frase", () => {
    expect(frasePerfil({ min: 10, max: 13, margem: 3 })).toBe("Ideal entre 10 e 13 °C");
    expect(frasePerfil({ min: null, max: 15, margem: 5 })).toBe("Ideal até 15 °C");
    expect(frasePerfil(null)).toBe("");
  });

  it("iniciais do nome", () => {
    expect(iniciais("João da Silva")).toBe("JS");
    expect(iniciais(" mario ")).toBe("M");
    expect(iniciais("")).toBe("");
    expect(iniciais(undefined)).toBe("");
  });

});
