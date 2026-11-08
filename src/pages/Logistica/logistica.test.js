import { describe, expect, it } from "vitest";
import { CARGAS_INICIAIS, filtrarCargas, formatarTemperatura, proximoId, resumir, validarCarga } from "./logistica.js";

describe("logistica", () => {
  it("resume os indicadores iniciais", () => {
    expect(resumir(CARGAS_INICIAIS)).toEqual({ total: 3, transporte: 2, atencao: 1, sensores: 3 });
  });
  it("filtra por pesquisa e status", () => {
    expect(filtrarCargas(CARGAS_INICIAIS, "Manga", "").map(c => c.id)).toEqual(["CT-002"]);
    expect(filtrarCargas(CARGAS_INICIAIS, "", "Atenção").map(c => c.id)).toEqual(["CT-002"]);
    expect(filtrarCargas(CARGAS_INICIAIS, "esp32-03", "Em transporte")).toHaveLength(1);
  });
  it("valida a faixa de temperatura", () => {
    const base = { produto: "Uva", origem: "A", destino: "B", sensor: "S" };
    expect(validarCarga({ ...base, tempMin: "15", tempMax: "5" })).toBeNull();
    expect(validarCarga({ ...base, tempMin: "5", tempMax: "5" })).toBeNull();
    expect(validarCarga({ ...base, produto: "  ", tempMin: "1", tempMax: "5" })).toBeNull();
    expect(validarCarga({ ...base, tempMin: "2", tempMax: "6" })).toMatchObject({ tempMin: 2, tempMax: 6 });
  });
  it("gera o próximo id e formata temperatura", () => {
    expect(proximoId(CARGAS_INICIAIS)).toBe("CT-004");
    expect(proximoId([])).toBe("CT-001");
    expect(formatarTemperatura(null)).toBe("Sem leitura");
    expect(formatarTemperatura(6.2)).toBe("6.2 °C");
  });
});
