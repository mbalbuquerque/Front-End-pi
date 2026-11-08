import { describe, expect, it } from "vitest";
import { agoraLocal, filtrarLeiturasDaViagem, horasDaViagem, ordenarViagens } from "./viagens.js";


describe("ordenarViagens", () => {

  it("põe as em andamento primeiro e depois as mais recentes", () => {

    const viagens = [
      { id: "A", inicio: "2026-11-01T10:00:00Z", fim: "2026-11-01T12:00:00Z" },
      { id: "B", inicio: "2026-11-02T10:00:00Z" },
      { id: "C", inicio: "2026-11-03T10:00:00Z", fim: "2026-11-03T12:00:00Z" },
      { id: "D", inicio: "2026-11-01T08:00:00Z" }
    ];

    expect(ordenarViagens(viagens).map(v => v.id)).toEqual(["B", "D", "C", "A"]);
    expect(viagens[0].id).toBe("A");

  });

});


describe("horasDaViagem", () => {

  const agora = Date.parse("2026-11-08T12:00:00Z");

  it("arredonda para cima e tem mínimo de 1 h", () => {
    expect(horasDaViagem({ inicio: "2026-11-08T10:30:00Z" }, agora)).toBe(2);
    expect(horasDaViagem({ inicio: "2026-11-08T12:00:00Z" }, agora)).toBe(1);
  });

  it("não passa de 7 dias", () => {
    expect(horasDaViagem({ inicio: "2026-10-01T00:00:00Z" }, agora)).toBe(168);
  });

});


describe("filtrarLeiturasDaViagem", () => {

  const leituras = [
    { medidoEm: "2026-11-08T09:00:00Z" },
    { medidoEm: "2026-11-08T10:00:00Z" },
    { medidoEm: "2026-11-08T11:00:00Z" },
    { medidoEm: "2026-11-08T13:00:00Z" }
  ];

  it("usa início e fim da viagem encerrada", () => {
    const viagem = { inicio: "2026-11-08T10:00:00Z", fim: "2026-11-08T11:00:00Z" };
    expect(filtrarLeiturasDaViagem(leituras, viagem)).toHaveLength(2);
  });

  it("usa agora como fim da viagem em andamento", () => {
    const viagem = { inicio: "2026-11-08T10:00:00Z" };
    expect(filtrarLeiturasDaViagem(leituras, viagem, Date.parse("2026-11-08T12:00:00Z"))).toHaveLength(2);
  });

});


describe("agoraLocal", () => {

  it("formata para datetime-local sem segundos", () => {
    expect(agoraLocal(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

});
