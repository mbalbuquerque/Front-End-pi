import { describe, expect, it } from "vitest";
import { CABECALHO_CSV, gerarCsv, nomeArquivoCsv } from "./csv.js";

describe("gerarCsv", () => {

  it("começa com BOM e cabeçalho, uma linha por leitura com ';'", () => {

    const csv = gerarCsv([
      { medidoEm: "2026-11-08T14:05:09.000Z", temperatura: 12.5, umidade: 80, rssi: -60, status: "NORMAL" },
      { recebidoEm: "2026-11-08T14:04:49.000Z", temperatura: 21, umidade: 75.5, status: "CRITICO" }
    ]);

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).split("\n")).toEqual([
      CABECALHO_CSV,
      "2026-11-08T14:05:09.000Z;12.5;80;-60;NORMAL",
      "2026-11-08T14:04:49.000Z;21;75.5;;CRITICO"
    ]);

  });

  it("sem leituras sai só o cabeçalho", () => {

    expect(gerarCsv([])).toBe("﻿" + CABECALHO_CSV);

  });

});

describe("nomeArquivoCsv", () => {

  it("usa o id do veículo e as horas do período", () => {

    expect(nomeArquivoCsv("VAN-01", 24)).toBe("coldtrack-VAN-01-24h.csv");
    expect(nomeArquivoCsv("VAN-01", 168)).toBe("coldtrack-VAN-01-168h.csv");

  });

});
