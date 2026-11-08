import { describe, expect, it } from "vitest";
import { LOGS, campoCsv, dataFormatada, filtrarLogs, montarCsv } from "./auditoria.js";

describe("filtrarLogs", () => {
  it("sem filtro devolve todos", () => {
    expect(filtrarLogs(LOGS, {}).logs).toHaveLength(6);
  });
  it("filtra por tipo, resultado e pesquisa", () => {
    expect(filtrarLogs(LOGS, { tipo: "alteracao" }).logs).toHaveLength(2);
    expect(filtrarLogs(LOGS, { resultado: "negado" }).logs).toHaveLength(1);
    expect(filtrarLogs(LOGS, { termo: "mariana" }).logs).toHaveLength(2);
  });
  it("filtra por intervalo de datas", () => {
    expect(filtrarLogs(LOGS, { dataInicial: "2026-10-19", dataFinal: "2026-10-19" }).logs).toHaveLength(2);
  });
  it("intervalo invertido devolve vazio e erro", () => {
    const r = filtrarLogs(LOGS, { dataInicial: "2026-10-20", dataFinal: "2026-10-01" });
    expect(r.logs).toHaveLength(0);
    expect(r.erro).toMatch(/data inicial/);
  });
});

describe("csv", () => {
  it("formata data", () => {
    expect(dataFormatada("2026-10-20T08:42:00")).toBe("20/10/2026 08:42");
  });
  it("neutraliza fórmulas e escapa aspas", () => {
    expect(campoCsv("=1+1")).toBe('"\'=1+1"');
    expect(campoCsv('a"b')).toBe('"a""b"');
    expect(campoCsv(null)).toBe('""');
  });
  it("monta com BOM, separador ; e CRLF", () => {
    const csv = montarCsv(LOGS.slice(0, 1));
    expect(csv.startsWith("﻿\"ID\";")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
