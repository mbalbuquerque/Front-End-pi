import { describe, expect, it } from "vitest";
import {
  classificarTemperatura,
  leiturasDoHistorico,
  ordenarLeituras,
  resumoUltima,
  textoSinal
} from "./telemetria.js";

const FAIXA = { min: null, max: 15, margem: 5 };
const FAIXA_FRUTA = { min: 10, max: 13, margem: 3 };


describe("classificarTemperatura", () => {

  it("usa a faixa da carga (só máximo)", () => {

    expect(classificarTemperatura(15, FAIXA)).toBe("NORMAL");
    expect(classificarTemperatura(20, FAIXA)).toBe("ATENCAO");
    expect(classificarTemperatura(20.1, FAIXA)).toBe("CRITICO");

  });

  it("usa a faixa da carga (com mínimo)", () => {

    expect(classificarTemperatura(9, FAIXA_FRUTA)).toBe("ATENCAO");
    expect(classificarTemperatura(6.9, FAIXA_FRUTA)).toBe("CRITICO");

  });

});


describe("textoSinal", () => {

  it("classifica o RSSI", () => {

    expect(textoSinal(NaN)).toBe("Sinal não informado");
    expect(textoSinal(-60)).toBe("Sinal excelente");
    expect(textoSinal(-70)).toBe("Sinal bom");
    expect(textoSinal(-80)).toBe("Sinal regular");
    expect(textoSinal(-81)).toBe("Sinal fraco");

  });

});


describe("ordenarLeituras + resumoUltima", () => {

  it("inverte para o mais antigo primeiro e formata a mais recente", () => {

    const ordenadas = ordenarLeituras([
      { medidoEm: "2026-11-08T13:01:00Z", temperatura: 18.25, umidade: 60, rssi: null },
      { recebidoEm: "2026-11-08T13:00:00Z", temperatura: 4, umidade: 55, rssi: -67, status: "NORMAL" }
    ]);

    expect(ordenadas[0].criadoEm).toBe("2026-11-08T13:00:00Z");

    const ultima = resumoUltima(ordenadas[1], FAIXA);

    expect(ultima.temperatura).toBe("18.3 °C");
    expect(ultima.umidade).toBe("60.0 %");
    expect(ultima.rssi).toBe("--");
    expect(ultima.sinal).toBe("Sinal não informado");
    expect(ultima.situacao).toBe("ATENCAO");

  });

});


describe("leiturasDoHistorico", () => {

  it("fica com os últimos 30 min e descarta temperatura inválida", () => {

    const ordenadas = [
      { criadoEm: "2026-11-08T12:00:00Z", temperatura: 5 },
      { criadoEm: "2026-11-08T12:31:00Z", temperatura: null },
      { criadoEm: "2026-11-08T12:40:00Z", temperatura: 30, status: "CRITICO" },
      { criadoEm: "2026-11-08T13:00:00Z", temperatura: 4 }
    ];

    expect(leiturasDoHistorico(ordenadas, FAIXA)).toEqual([
      { temperatura: 30, medidoEm: "2026-11-08T12:40:00Z", status: "CRITICO" },
      { temperatura: 4, medidoEm: "2026-11-08T13:00:00Z", status: "NORMAL" }
    ]);

  });

});
