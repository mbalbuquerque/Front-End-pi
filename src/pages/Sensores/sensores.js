// Regras da tela de Sensores sem React (situação, sinal, etapa do cabo, mensagens).
// Porte das funções puras de legado/js/sensores.js.

import { UPDATE_INTERVAL } from "../../lib/config.js";
import { formatarDuracao } from "../../lib/formatar.js";
import { horarioDe } from "../../lib/leituras.js";

// Sem leitura há mais que 3 envios (60 s), o sensor está sem sinal.
export const SEM_SINAL_MS = UPDATE_INTERVAL * 3;


// Selo da coluna Situação: { classe, texto }.
export function situacaoDoSensor(ultima, agora = Date.now()) {

  if (!ultima) {
    return { classe: "aguardando", texto: "NUNCA ENVIOU" };
  }

  const atraso = agora - horarioDe(ultima).getTime();

  if (atraso <= SEM_SINAL_MS) {
    return { classe: "normal", texto: "ONLINE" };
  }

  return { classe: "aguardando", texto: `SEM SINAL HÁ ${formatarDuracao(atraso).toUpperCase()}` };

}


// Mesma escala do dashboard (app.js).
export function descreverSinal(rssi) {

  if (typeof rssi !== "number") {
    return "não informado";
  }

  const nivel =
    rssi >= -60 ? "Excelente" :
    rssi >= -70 ? "Bom" :
    rssi >= -80 ? "Regular" : "Fraco";

  return `${nivel} (${rssi} dBm)`;

}


// Decide o que falta para este sensor: "registrado-agora" | "trocar-rede" | "nova-chave" | "novo".
export function situacaoDaPlaca({ chavePendente, dispositivos, info }) {

  // Já registrado nesta tentativa; falta só acertar a rede.
  if (chavePendente) {
    return "registrado-agora";
  }

  const registrado = dispositivos.some(d => d.id === info.id.toLowerCase());

  if (registrado && info.configurado) {
    return "trocar-rede";
  }

  if (registrado) {
    return "nova-chave";
  }

  return "novo";

}


export const EXPLICACAO = {
  "trocar-rede": "Este sensor já é da sua empresa e continua com a mesma chave. Informe só a rede nova.",
  "nova-chave": "Este sensor já está registrado, mas não tem a chave gravada. Uma chave nova será gerada, e a anterior para de valer.",
  "novo": "Sensor novo: ele será registrado na sua empresa com este ID.",
  "registrado-agora": "Sensor registrado na sua empresa. Falta só o sensor entrar na rede."
};


// Erro devolvido pela placa ao testar a rede. { texto, ajuda }: ajuda é o
// item da seção "Como conectar um sensor" ligado no "Ver ajuda" (ou null).
export function mensagemDeErro(codigo, ssid) {

  const rede = `“${ssid}”`;

  return {
    senha: { texto: `Senha errada para a rede ${rede}. Confira e tente de novo.`, ajuda: "senha" },
    rede_nao_encontrada: { texto: `O sensor não achou a rede ${rede}. Confira o nome e se o hotspot está ligado em 2.4 GHz.`, ajuda: "rede" },
    tempo: { texto: `O sensor não conseguiu entrar na rede ${rede} em 15 s. Confira o nome, a senha, se o hotspot está em 2.4 GHz e perto do sensor.`, ajuda: "rede" },
    rede_invalida: { texto: "O nome da rede aceita até 32 caracteres e a senha até 63.", ajuda: null }
  }[codigo] || { texto: `O sensor recusou a configuração (${codigo || "sem motivo"}). Tente de novo.`, ajuda: null };

}


// Linhas para o secrets.h do firmware.
export function trechoSecrets(id, chave) {

  return `#define DEVICE_ID  "${id}"\n#define DEVICE_KEY "${chave}"`;

}
