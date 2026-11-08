// Regras puras da tela de Sensores.

import { describe, expect, it } from "vitest";
import {
  SEM_SINAL_MS,
  descreverSinal,
  mensagemDeErro,
  situacaoDaPlaca,
  situacaoDoSensor,
  trechoSecrets
} from "./sensores.js";


describe("situacaoDoSensor", () => {

  const agora = Date.parse("2026-11-08T12:00:00Z");

  it("sem leitura: NUNCA ENVIOU", () => {
    expect(situacaoDoSensor(null, agora)).toEqual({ classe: "aguardando", texto: "NUNCA ENVIOU" });
  });

  it("leitura recente: ONLINE", () => {
    const ultima = { medidoEm: new Date(agora - SEM_SINAL_MS).toISOString() };
    expect(situacaoDoSensor(ultima, agora)).toEqual({ classe: "normal", texto: "ONLINE" });
  });

  it("leitura velha: SEM SINAL HÁ ... em maiúsculas", () => {
    const ultima = { recebidoEm: new Date(agora - 90 * 60000).toISOString() };
    expect(situacaoDoSensor(ultima, agora)).toEqual({ classe: "aguardando", texto: "SEM SINAL HÁ 1 H 30 MIN" });
  });

});


describe("descreverSinal", () => {

  it("usa a escala do dashboard", () => {
    expect(descreverSinal(-55)).toBe("Excelente (-55 dBm)");
    expect(descreverSinal(-70)).toBe("Bom (-70 dBm)");
    expect(descreverSinal(-80)).toBe("Regular (-80 dBm)");
    expect(descreverSinal(-81)).toBe("Fraco (-81 dBm)");
    expect(descreverSinal(undefined)).toBe("não informado");
  });

});


describe("situacaoDaPlaca", () => {

  const dispositivos = [{ id: "coldtrack-ab12" }];

  it("chave pendente vence tudo", () => {
    expect(situacaoDaPlaca({ chavePendente: "k", dispositivos, info: { id: "X" } })).toBe("registrado-agora");
  });

  it("compara o id em minúsculas", () => {
    expect(situacaoDaPlaca({ chavePendente: null, dispositivos, info: { id: "COLDTRACK-AB12", configurado: true } })).toBe("trocar-rede");
    expect(situacaoDaPlaca({ chavePendente: null, dispositivos, info: { id: "COLDTRACK-AB12", configurado: false } })).toBe("nova-chave");
    expect(situacaoDaPlaca({ chavePendente: null, dispositivos, info: { id: "COLDTRACK-ZZ99" } })).toBe("novo");
  });

});


describe("mensagemDeErro", () => {

  it("liga o código da placa ao item de ajuda", () => {
    expect(mensagemDeErro("senha", "Casa")).toEqual({
      texto: "Senha errada para a rede “Casa”. Confira e tente de novo.",
      ajuda: "senha"
    });
    expect(mensagemDeErro("tempo", "Casa").ajuda).toBe("rede");
    expect(mensagemDeErro("rede_invalida", "Casa").ajuda).toBeNull();
  });

  it("código desconhecido ou ausente", () => {
    expect(mensagemDeErro("xyz", "Casa").texto).toBe("O sensor recusou a configuração (xyz). Tente de novo.");
    expect(mensagemDeErro(undefined, "Casa").texto).toBe("O sensor recusou a configuração (sem motivo). Tente de novo.");
  });

});


it("trechoSecrets monta as linhas do secrets.h", () => {
  expect(trechoSecrets("coldtrack-02", "abc")).toBe('#define DEVICE_ID  "coldtrack-02"\n#define DEVICE_KEY "abc"');
});
