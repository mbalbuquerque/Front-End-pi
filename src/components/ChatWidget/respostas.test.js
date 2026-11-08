import { describe, expect, it } from "vitest";
import { linkWhatsApp, normalizar, responder, SEM_RESPOSTA } from "./respostas.js";

describe("normalizar", () => {

  it("tira acento, pontuação e espaço sobrando", () => {
    expect(normalizar("  Olá, Logística!  ")).toBe("ola logistica");
  });

});


describe("responder", () => {

  it("cumprimenta", () => {
    expect(responder("Bom dia").texto).toContain("assistente virtual ColdTrack");
  });

  it("acha a resposta do monitoramento", () => {
    const resultado = responder("Como funciona o monitoramento?");
    expect(resultado.encontrada).toBe(true);
    expect(resultado.texto).toContain("ThingSpeak");
  });

  it("termo composto vence palavra solta", () => {
    // "carga" (logística, 1 ponto) perde para "cadastrar carga" (10 pontos).
    expect(responder("como cadastrar carga").texto).toContain("Para cadastrar uma carga");
  });

  it("pergunta desconhecida devolve a mensagem padrão", () => {
    const resultado = responder("Qual é a cor do caminhão lunar?");
    expect(resultado.encontrada).toBe(false);
    expect(resultado.texto).toBe(SEM_RESPOSTA);
  });

});


describe("linkWhatsApp", () => {

  it("leva o número e a dúvida no texto", () => {
    const url = new URL(linkWhatsApp("Preciso de ajuda com o sensor"));
    expect(url.href).toMatch(/^https:\/\/wa\.me\/558196878213\?text=/);
    expect(url.searchParams.get("text")).toContain("Minha dúvida: Preciso de ajuda com o sensor");
  });

  it("sem dúvida, só a saudação", () => {
    const texto = new URL(linkWhatsApp()).searchParams.get("text");
    expect(texto).toBe("Olá! Vim pelo assistente virtual do ColdTrack Control. Preciso de ajuda com o projeto.");
  });

});
