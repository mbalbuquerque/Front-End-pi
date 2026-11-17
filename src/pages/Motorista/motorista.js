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


// Régua da faixa da carga (forma do design system): zonas crítica / atenção /
// segura / atenção / crítica em % da largura e a posição do marcador.
// Faixa só com máximo (min null): segura de `inicio` até max, atenção até
// max + margem, crítica depois. A escala vai uma margem além do último limite
// e sempre inclui 0 °C e a temperatura atual; o marcador nunca sai da régua.
export function reguaDaFaixa(faixa, temperatura) {

  if (!faixa || typeof faixa.max !== "number" || typeof faixa.margem !== "number") {
    return null;
  }

  const { min, max, margem } = faixa;
  const temMin = typeof min === "number";
  const temValor = typeof temperatura === "number";

  const fimLimites = max + 2 * margem;
  const inicioLimites = temMin ? min - 2 * margem : Math.min(0, max - 3 * margem);

  const inicio = temValor ? Math.min(inicioLimites, Math.floor(temperatura)) : inicioLimites;
  const fim = temValor ? Math.max(fimLimites, Math.ceil(temperatura)) : fimLimites;
  const total = fim - inicio;
  const pos = valor => ((valor - inicio) / total) * 100;

  const cortes = temMin
    ? [["critico", min - margem], ["atencao", min], ["normal", max], ["atencao", max + margem], ["critico", fim]]
    : [["normal", max], ["atencao", max + margem], ["critico", fim]];

  let anterior = inicio;
  const zonas = cortes.map(([tipo, ate]) => {
    const zona = { tipo, largura: pos(ate) - pos(anterior) };
    anterior = ate;
    return zona;
  });

  const limites = (temMin ? [min - margem, min, max, max + margem] : [max, max + margem])
    .map(valor => ({ valor, posicao: pos(valor) }));

  const marcador = temValor ? Math.min(100, Math.max(0, pos(temperatura))) : null;

  return { inicio, fim, zonas, limites, marcador };

}
