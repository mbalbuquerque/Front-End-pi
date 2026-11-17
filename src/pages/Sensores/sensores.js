// Regras da tela de Sensores sem React (situação, sinal, etapa do cabo, mensagens).
// Porte das funções puras do antigo js/sensores.js.

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


// Selo Online/Offline com o que a API informa em GET /dispositivos (`online`: leitura
// há até 120 s). API antiga não manda o campo: devolve null e a tela cai no cálculo local.
export function seloConexao(dispositivo) {

  if (!dispositivo || typeof dispositivo.online !== "boolean") {
    return null;
  }

  return dispositivo.online
    ? { classe: "online", texto: "Online" }
    : { classe: "offline", texto: "Offline" };

}


// "Último contato: 16/11 19:40" (horário local) ou "Sem contato". null = API sem o campo.
export function textoUltimoContato(dispositivo) {

  if (!dispositivo || dispositivo.ultimoContato === undefined) {
    return null;
  }

  const data = dispositivo.ultimoContato ? new Date(dispositivo.ultimoContato) : null;

  if (!data || Number.isNaN(data.getTime())) {
    return "Sem contato";
  }

  const dia = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

  return `Último contato: ${dia} ${hora}`;

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
// detalhes é a resposta inteira da placa: rssi e canal do AP visto no scan e
// o motivo numérico do driver Wi-Fi (vai entre parênteses, para o suporte).
export function mensagemDeErro(codigo, ssid, detalhes = {}) {

  const rede = `“${ssid}”`;

  const base = {
    senha: { texto: `Senha errada para a rede ${rede}. Confira maiúsculas e minúsculas e tente de novo.`, ajuda: "senha" },
    rede_nao_encontrada: { texto: `O sensor não achou a rede ${rede}. Confira o nome exato. O sensor só enxerga redes de 2.4 GHz: rede só de 5 GHz não aparece para ele.`, ajuda: "rede" },
    rede_corporativa: { texto: `A rede ${rede} pede login com usuário (WPA-Enterprise, comum em faculdade e empresa). O sensor só entra em rede com senha simples: use o hotspot do celular ou uma rede de visitantes.`, ajuda: "corporativa" },
    seguranca_incompativel: { texto: `A rede ${rede} usa uma segurança que o sensor não aceita (WEP ou WPA antigo). Use uma rede WPA2 ou WPA3, ou o hotspot do celular.`, ajuda: "rede" },
    sinal_fraco: { texto: `O sinal da rede ${rede} chega fraco no sensor e a conexão não fechou. Aproxime o sensor do roteador ou do hotspot e tente de novo.`, ajuda: "sinal" },
    sem_ip: { texto: `O sensor entrou na rede ${rede}, mas o roteador não entregou um endereço (DHCP) a tempo. Acontece em rede cheia ou que exige cadastro do aparelho: tente de novo ou use o hotspot do celular.`, ajuda: "rede" },
    tempo: { texto: `O sensor não conseguiu entrar na rede ${rede} a tempo. Confira o nome, a senha, se a rede é de 2.4 GHz e se está perto do sensor.`, ajuda: "rede" },
    rede_invalida: { texto: "O nome da rede aceita até 32 caracteres e a senha até 63.", ajuda: null }
  }[codigo] || { texto: `O sensor recusou a configuração (${codigo || "sem motivo"}). Tente de novo.`, ajuda: null };

  const extras = [];

  if (typeof detalhes.rssi === "number") {
    const canal = typeof detalhes.canal === "number" ? `, canal ${detalhes.canal}` : "";
    extras.push(`Sinal no sensor: ${descreverSinal(detalhes.rssi)}${canal}.`);
  }

  if (typeof detalhes.motivo === "number" && detalhes.motivo > 0) {
    extras.push(`(motivo ${detalhes.motivo})`);
  }

  return extras.length ? { ...base, texto: `${base.texto} ${extras.join(" ")}` } : base;

}


const SEGURANCA = {
  aberta: "Aberta",
  owe: "Aberta (OWE)",
  wep: "WEP",
  wpa: "WPA",
  wpa2: "WPA2",
  wpa_wpa2: "WPA/WPA2",
  wpa3: "WPA3",
  wpa2_wpa3: "WPA2/WPA3",
  enterprise: "Login (Enterprise)"
};

// Segurança que a placa não consegue usar (resposta do comando "redes").
const SEM_SUPORTE = new Set(["enterprise", "wep", "wpa"]);


// Uma linha da lista "Ver redes que o sensor enxerga": { seguranca, compativel }.
export function descreverRede(rede) {

  return {
    seguranca: SEGURANCA[rede.seguranca] || "Outra",
    compativel: !SEM_SUPORTE.has(rede.seguranca)
  };

}


// Linhas para o secrets.h do firmware.
export function trechoSecrets(id, chave) {

  return `#define DEVICE_ID  "${id}"\n#define DEVICE_KEY "${chave}"`;

}
