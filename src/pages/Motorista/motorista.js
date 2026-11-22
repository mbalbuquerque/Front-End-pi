// Regras da tela do motorista (sem React): status mostrado, "há X min",
// faixa da carga e quando o celular deve alertar.
//
// A API (GET /motorista) manda a última leitura do veículo vinculado. O status
// da tela é recalculado aqui a cada rodada pela hora da medição, para a tela
// passar a SEM SINAL mesmo sem internet (quando a API não responde mais).

import { descreverNormal } from "../../lib/faixas.js";

// O sensor envia a cada 20 s: mais de 5 min sem leitura é sensor sem sinal.
export const LIMITE_SEM_SINAL_MIN = 5;

export const STATUS_MOTORISTA = {
  NORMAL: {
    texto: "NORMAL",
    classe: "normal",
    frase: "Carga dentro da faixa."
  },
  ATENCAO: {
    texto: "ATENÇÃO",
    classe: "atencao",
    frase: "Temperatura perto do limite. Confira o baú na próxima parada."
  },
  CRITICO: {
    texto: "CRÍTICO",
    classe: "critico",
    frase: "Carga fora da faixa. Pare em local seguro e confira o baú e o equipamento de frio."
  },
  SEM_SINAL: {
    texto: "SEM SINAL",
    classe: "sem-sinal",
    frase: `O sensor não envia leitura há mais de ${LIMITE_SEM_SINAL_MIN} min.`
  }
};

// Ordem de gravidade dos alertas: só piorar dispara vibração e som.
const GRAVIDADE = { ATENCAO: 1, CRITICO: 2 };


// Minutos inteiros entre a medição (ISO 8601) e `agora` (ms); null sem horário válido.
export function minutosDesde(medidoEm, agora = Date.now()) {

  const quando = Date.parse(medidoEm);

  if (Number.isNaN(quando)) {
    return null;
  }

  return Math.max(0, Math.floor((agora - quando) / 60000));

}


// "NORMAL" | "ATENCAO" | "CRITICO" | "SEM_SINAL" para a resposta da API.
export function statusDaTela(dados, agora = Date.now()) {

  const leitura = dados?.leitura;
  const minutos = leitura ? minutosDesde(leitura.medidoEm, agora) : null;

  if (minutos === null || minutos > LIMITE_SEM_SINAL_MIN || !STATUS_MOTORISTA[leitura.status]) {
    return "SEM_SINAL";
  }

  return leitura.status;

}


// "agora há pouco", "há 1 min", "há 12 min", "há 2 h 5 min"
export function haQuanto(minutos) {

  if (minutos === null || minutos === undefined) {
    return "";
  }

  if (minutos < 1) {
    return "agora há pouco";
  }

  if (minutos < 60) {
    return `há ${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto ? `há ${horas} h ${resto} min` : `há ${horas} h`;

}


// "Manga: de 10 a 13 °C"
export function descreverFaixa(faixa) {

  if (!faixa) {
    return "";
  }

  return `${faixa.nome}: ${descreverNormal(faixa)}`;

}


// Alerta que fica na tela: some só quando a carga volta ao NORMAL. Sem sinal
// não apaga o alerta (não dá para saber se a carga voltou à faixa).
export function proximoAlerta(atual, status) {

  if (status === "NORMAL") {
    return null;
  }

  if (GRAVIDADE[status]) {
    return status;
  }

  return atual;

}


// Vibra e toca só quando o alerta piora (normal -> atenção -> crítico),
// não a cada atualização de 20 s com a carga ainda fora da faixa.
export function deveDisparar(anterior, novo) {

  return (GRAVIDADE[novo] || 0) > (GRAVIDADE[anterior] || 0);

}


// "17.5 °C" -> { valor: "17.5", unidade: "°C" }; sem leitura -> { valor: "--", unidade: "" }.
// O número e a unidade têm tamanhos diferentes na tela; o texto do elemento continua "17.5 °C".
export function partesTemperatura(texto) {

  const espaco = texto.lastIndexOf(" ");

  if (espaco < 0) {
    return { valor: texto, unidade: "" };
  }

  return { valor: texto.slice(0, espaco), unidade: texto.slice(espaco + 1) };

}


// ---------------------------------------------------------
// HISTÓRICO DA ÚLTIMA HORA (GET /motorista, campo `historico`)
// ---------------------------------------------------------
// A API manda as leituras da última hora, da mais antiga para a mais nova.
// Campo novo: API antiga não manda nada, e cada função abaixo devolve um
// resultado vazio para a tela esconder o gráfico ou mostrar uma frase.

// Variação abaixo disto (em °C) é "estável": o DHT11 oscila 0,1 a 0,2 °C.
export const LIMIAR_TENDENCIA = 0.3;

// Janela da tendência e menor intervalo que vale medir.
const JANELA_TENDENCIA_MIN = 10;
const TENDENCIA_MINIMA_MIN = 2;


function quando(ponto) {

  return Date.parse(ponto?.medidoEm);

}


// Pontos válidos (temperatura numérica e horário), do mais antigo ao mais novo.
export function pontosDoHistorico(historico) {

  if (!Array.isArray(historico)) {
    return [];
  }

  return historico
    .filter(p => typeof p?.temperatura === "number" && !Number.isNaN(quando(p)))
    .sort((a, b) => quando(a) - quando(b));

}


// Últimos `minutos` antes do ponto mais novo (não do relógio: sem sinal, o
// gráfico continua mostrando o que chegou por último).
export function ultimosMinutos(historico, minutos) {

  const pontos = pontosDoHistorico(historico);

  if (pontos.length === 0) {
    return [];
  }

  const limite = quando(pontos[pontos.length - 1]) - minutos * 60000;

  return pontos.filter(p => quando(p) >= limite);

}


function decimal(valor) {

  return Math.abs(valor).toFixed(1);

}


// { direcao: "subindo" | "caindo" | "estavel", delta, minutos, texto } comparando
// o ponto mais novo com o de ~10 min antes; null com menos de 2 min de dados.
export function tendencia(historico) {

  const pontos = pontosDoHistorico(historico);

  if (pontos.length < 2) {
    return null;
  }

  const ultimo = pontos[pontos.length - 1];
  const alvo = quando(ultimo) - JANELA_TENDENCIA_MIN * 60000;

  // O ponto mais antigo dentro da janela (ou o primeiro, se a janela for maior que o histórico).
  const base = pontos.find(p => quando(p) >= alvo) || pontos[0];
  const minutos = Math.round((quando(ultimo) - quando(base)) / 60000);

  if (minutos < TENDENCIA_MINIMA_MIN) {
    return null;
  }

  const delta = Math.round((ultimo.temperatura - base.temperatura) * 10) / 10;

  if (Math.abs(delta) < LIMIAR_TENDENCIA) {
    return { direcao: "estavel", delta, minutos, texto: `estável em ${minutos} min` };
  }

  return delta > 0
    ? { direcao: "subindo", delta, minutos, texto: `subindo +${decimal(delta)} °C em ${minutos} min` }
    : { direcao: "caindo", delta, minutos, texto: `caindo −${decimal(delta)} °C em ${minutos} min` };

}


// Frase curta de cada mudança de status na lista "Alertas da viagem".
export const FRASE_MUDANCA = {
  NORMAL: "Voltou para a faixa",
  ATENCAO: "Perto do limite",
  CRITICO: "Fora da faixa"
};


// Mudanças de status no histórico, a mais nova primeiro:
// [{ status, temperatura, medidoEm }]. O primeiro ponto entra só se já
// começou fora do normal. Com `desde` (início da viagem), ignora o que veio antes.
export function alertasDoHistorico(historico, desde = null) {

  const inicio = Date.parse(desde);

  const pontos = pontosDoHistorico(historico)
    .filter(p => STATUS_MOTORISTA[p.status] && p.status !== "SEM_SINAL")
    .filter(p => Number.isNaN(inicio) || quando(p) >= inicio);

  const mudancas = [];

  pontos.forEach((p, i) => {
    const anterior = i === 0 ? "NORMAL" : pontos[i - 1].status;
    if (p.status !== anterior) {
      mudancas.push({ status: p.status, temperatura: p.temperatura, medidoEm: p.medidoEm });
    }
  });

  return mudancas.reverse();

}


// { minima, maxima, media, total } das temperaturas; null sem pontos.
export function resumoDoHistorico(historico) {

  const temps = pontosDoHistorico(historico).map(p => p.temperatura);

  if (temps.length === 0) {
    return null;
  }

  return {
    minima: Math.min(...temps),
    maxima: Math.max(...temps),
    media: temps.reduce((a, b) => a + b, 0) / temps.length,
    total: temps.length
  };

}


// "3 h 40 min" desde o início da viagem; null sem início válido ou no futuro.
export function tempoDeViagem(inicio, agora = Date.now()) {

  const minutos = minutosDesde(inicio, agora);

  if (minutos === null || Date.parse(inicio) > agora) {
    return null;
  }

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto ? `${horas} h ${resto} min` : `${horas} h`;

}


// "há 20 s" no chip do status (segundos até 1 min; depois, como haQuanto).
export function haQuantoCurto(medidoEm, agora = Date.now()) {

  const instante = Date.parse(medidoEm);

  if (Number.isNaN(instante)) {
    return "";
  }

  const segundos = Math.max(0, Math.round((agora - instante) / 1000));

  return segundos < 60 ? `há ${segundos} s` : haQuanto(Math.floor(segundos / 60));

}


// "Ideal entre 10 e 13 °C" ou "Ideal até 15 °C".
export function frasePerfil(faixa) {

  if (!faixa) {
    return "";
  }

  return faixa.min == null
    ? `Ideal até ${faixa.max} °C`
    : `Ideal entre ${faixa.min} e ${faixa.max} °C`;

}


// "João Silva" -> "JS"; "mario" -> "M"; vazio -> "".
export function iniciais(nome) {

  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return "";
  }

  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

  return `${primeira}${ultima}`.toUpperCase();

}
