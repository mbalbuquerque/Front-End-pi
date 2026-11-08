import { describe, expect, it } from "vitest";
import { interpretar, montarGrafico, numero } from "./thingspeak.js";

const AGORA = new Date("2026-10-20T12:00:00Z").getTime();
const feed = (f1, minutosAtras = 1, f2 = "70", f3 = "-61") => ({
  created_at: new Date(AGORA - minutosAtras * 60000).toISOString(),
  field1: f1, field2: f2, field3: f3
});

describe("numero", () => {
  it("converte ou devolve null", () => {
    expect(numero("6.2")).toBe(6.2);
    expect(numero("")).toBeNull();
    expect(numero(undefined)).toBeNull();
    expect(numero("abc")).toBeNull();
  });
});

describe("interpretar", () => {
  it("classifica pelos limites", () => {
    expect(interpretar({ feeds: [feed("6.2")] }, AGORA).situacao.texto).toBe("Normal");
    expect(interpretar({ feeds: [feed("15")] }, AGORA).situacao.texto).toBe("Normal");
    expect(interpretar({ feeds: [feed("18")] }, AGORA).situacao.texto).toBe("Atenção");
    expect(interpretar({ feeds: [feed("21.1")] }, AGORA).situacao.texto).toBe("Crítico");
    expect(interpretar({ feeds: [feed("")] }, AGORA).situacao.texto).toBe("Sem temperatura");
  });
  it("marca leitura antiga e ordena cronologicamente", () => {
    const r = interpretar({ feeds: [feed("6", 1), feed("7", 60)] }, AGORA);
    expect(r.antiga).toBe(false);
    expect(r.feeds[0].field1).toBe("7");
    expect(interpretar({ feeds: [feed("6", 60)] }, AGORA).situacao.texto).toBe("Leitura antiga");
  });
  it("formata valores e rejeita canal vazio", () => {
    const r = interpretar({ feeds: [feed("6.24")] }, AGORA);
    expect([r.temperatura, r.umidade, r.rssi]).toEqual(["6.2", "70.0", "-61"]);
    expect(() => interpretar({ feeds: [] }, AGORA)).toThrow(/leituras válidas/);
    expect(() => interpretar(null, AGORA)).toThrow();
  });
});

describe("montarGrafico", () => {
  it("devolve null sem temperaturas e quebra o trecho nos buracos", () => {
    expect(montarGrafico([{ field1: "" }])).toBeNull();
    const g = montarGrafico([{ field1: "5" }, { field1: "6" }, { field1: "" }, { field1: "7" }, { field1: "8" }]);
    expect(g.trechos).toHaveLength(2);
    expect(g.circulos).toHaveLength(4);
  });
});
