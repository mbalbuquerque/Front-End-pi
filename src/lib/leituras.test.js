import { afterEach, describe, expect, it, vi } from "vitest";
import { agruparOcorrencias, buscarLeituras, horarioDe, resumir } from "./leituras.js";
import { API_URL } from "./config.js";

const T0 = Date.UTC(2026, 10, 8, 12, 0, 0);
const SEG = 1000;

function leitura(segundos, temperatura, status) {

  return { medidoEm: new Date(T0 + segundos * SEG).toISOString(), temperatura, status };

}

afterEach(() => {
  vi.unstubAllGlobals();
});


describe("horarioDe", () => {

  it("usa medidoEm e cai para recebidoEm", () => {
    expect(horarioDe({ medidoEm: "2026-11-08T12:00:00Z" }).getTime()).toBe(T0);
    expect(horarioDe({ recebidoEm: "2026-11-08T12:00:00Z" }).getTime()).toBe(T0);
  });

});


describe("resumir", () => {

  it("devolve null sem temperatura numérica", () => {
    expect(resumir([])).toBeNull();
    expect(resumir([{ temperatura: null }, { temperatura: "10" }])).toBeNull();
  });

  it("calcula total, média, mínima, máxima e contagens por status", () => {
    const r = resumir([
      { temperatura: 4, status: "NORMAL" },
      { temperatura: 16, status: "ATENCAO" },
      { temperatura: 22, status: "CRITICO" },
      { temperatura: null, status: "CRITICO" }
    ]);

    expect(r).toEqual({ total: 3, media: 14, minima: 4, maxima: 22, atencao: 1, critico: 2 });
  });

});


describe("agruparOcorrencias", () => {

  it("ignora leituras normais", () => {
    expect(agruparOcorrencias([leitura(0, 5, "NORMAL")])).toEqual([]);
  });

  it("junta leituras seguidas (até 60 s de lacuna) e separa as distantes", () => {
    const leituras = [
      // a API manda da mais recente para a mais antiga
      leitura(200, 17, "ATENCAO"),
      leitura(40, 18, "ATENCAO"),
      leitura(20, 21, "CRITICO"),
      leitura(0, 16, "ATENCAO"),
      leitura(30, 4, "NORMAL")
    ];

    const [recente, antiga] = agruparOcorrencias(leituras);

    // Mais recente primeiro.
    expect(recente.inicio.getTime()).toBe(T0 + 200 * SEG);
    expect(recente.leituras).toHaveLength(1);
    expect(recente.duracao).toBe(20 * SEG);
    expect(recente.status).toBe("ATENCAO");

    expect(antiga.inicio.getTime()).toBe(T0);
    expect(antiga.fim.getTime()).toBe(T0 + 40 * SEG);
    expect(antiga.leituras).toHaveLength(3);
    expect(antiga.pico).toBe(21);
    expect(antiga.status).toBe("CRITICO");
    // fim - início + um intervalo de envio (20 s)
    expect(antiga.duracao).toBe(60 * SEG);
  });

  it("lacuna de exatamente 3 envios ainda junta; acima disso separa", () => {
    expect(agruparOcorrencias([leitura(0, 16, "ATENCAO"), leitura(60, 16, "ATENCAO")])).toHaveLength(1);
    expect(agruparOcorrencias([leitura(0, 16, "ATENCAO"), leitura(61, 16, "ATENCAO")])).toHaveLength(2);
  });

});


describe("buscarLeituras", () => {

  it("monta a query e devolve data.leituras", async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ leituras: [1, 2] }) });
    vi.stubGlobal("fetch", fetch);

    await expect(buscarLeituras({ deviceId: "esp-01", horas: 24, status: ["ATENCAO", "CRITICO"], limite: 500 }))
      .resolves.toEqual([1, 2]);

    expect(fetch.mock.calls[0][0]).toBe(`${API_URL}/leituras?deviceId=esp-01&limite=500&horas=24&status=ATENCAO%2CCRITICO`);
  });

  it("sem leituras no JSON devolve lista vazia; limite padrão 50", async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetch);

    await expect(buscarLeituras({ deviceId: "x" })).resolves.toEqual([]);
    expect(fetch.mock.calls[0][0]).toBe(`${API_URL}/leituras?deviceId=x&limite=50`);
  });

});
