// Regras puras da tela de Sensores.

import { describe, expect, it } from "vitest";
import {
  SEM_SINAL_MS,
  descreverSinal,
  mensagemDeErro,
  situacaoDaPlaca,
  seloConexao,
  situacaoDoSensor,
  textoUltimoContato,
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


describe("seloConexao", () => {

  it("online true e false viram selo com texto", () => {
    expect(seloConexao({ online: true })).toEqual({ classe: "online", texto: "Online" });
    expect(seloConexao({ online: false })).toEqual({ classe: "offline", texto: "Offline" });
  });

  it("API antiga sem o campo: null, sem quebrar", () => {
    expect(seloConexao({ id: "x" })).toBeNull();
    expect(seloConexao(undefined)).toBeNull();
  });

});


describe("textoUltimoContato", () => {

  it("formata dd/mm HH:MM no horário local", () => {
    const iso = "2026-11-16T19:40:12+00:00";
    const local = new Date(iso);
    const dd = String(local.getDate()).padStart(2, "0");
    const mm = String(local.getMonth() + 1).padStart(2, "0");
    const hh = String(local.getHours()).padStart(2, "0");
    const mi = String(local.getMinutes()).padStart(2, "0");
    expect(textoUltimoContato({ ultimoContato: iso })).toBe(`Último contato: ${dd}/${mm} ${hh}:${mi}`);
  });

  it("null ou data inválida: Sem contato", () => {
    expect(textoUltimoContato({ ultimoContato: null })).toBe("Sem contato");
    expect(textoUltimoContato({ ultimoContato: "lixo" })).toBe("Sem contato");
  });

  it("campo ausente (API antiga): null", () => {
    expect(textoUltimoContato({ id: "x" })).toBeNull();
    expect(textoUltimoContato(undefined)).toBeNull();
  });

});
