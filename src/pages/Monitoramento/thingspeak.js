// Consulta ao canal público ThingSpeak e regras de leitura (sem React, testável).
// Fonte única de dados; não associa o dispositivo a cargas.

export const CHANNEL_ID = "3515173";

export const API_URL = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=20`;

export const NORMAL_MAX = 15;
export const WARNING_MAX = 20;

// Ajustar ao intervalo real de transmissão do sensor.
export const STALE_MINUTES = 10;

export const numero = value =>
  value === null || value === undefined || String(value).trim() === ""
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;

export const formatar = (value, digits = 1) =>
  value === null ? "—" : value.toFixed(digits);

export const dataLegivel = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
};

// Transforma a resposta do canal no modelo exibido. Lança se não há leitura válida.
export function interpretar(dados, agora = Date.now()) {

  const feeds = Array.isArray(dados?.feeds)
    ? dados.feeds.filter(f => f && f.created_at && !Number.isNaN(new Date(f.created_at).getTime()))
    : [];

  if (!feeds.length) {
    throw new Error("O canal não retornou leituras válidas.");
  }

  feeds.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const ultima = feeds[feeds.length - 1];
  const temp = numero(ultima.field1);

  const idadeMin = (agora - new Date(ultima.created_at).getTime()) / 60000;
  const antiga = idadeMin > STALE_MINUTES || idadeMin < -2;

  let situacao;
  if (antiga) situacao = { texto: "Leitura antiga", classe: "warning" };
  else if (temp === null) situacao = { texto: "Sem temperatura", classe: "" };
  else if (temp <= NORMAL_MAX) situacao = { texto: "Normal", classe: "ok" };
  else if (temp <= WARNING_MAX) situacao = { texto: "Atenção", classe: "warning" };
  else situacao = { texto: "Crítico", classe: "danger" };

  return {
    feeds,
    antiga,
    situacao,
    temperatura: formatar(temp),
    umidade: formatar(numero(ultima.field2)),
    rssi: formatar(numero(ultima.field3), 0),
    ultimaLeitura: `Última leitura: ${dataLegivel(ultima.created_at)}`
  };

}

// Geometria do gráfico: pontos (com buracos onde falta temperatura) e linhas-limite.
export function montarGrafico(amostras) {

  const valores = amostras.map(a => numero(a.field1)).filter(v => v !== null);

  if (!valores.length) return null;

  const min = Math.min(...valores, NORMAL_MAX) - 2;
  const max = Math.max(...valores, WARNING_MAX) + 2;

  const x = i => 46 + (i / Math.max(amostras.length - 1, 1)) * 676;
  const y = v => 196 - ((v - min) / (max - min)) * 158;

  const limites = [NORMAL_MAX, WARNING_MAX].map(lim => ({ valor: lim, y: y(lim) }));

  const trechos = [];
  const circulos = [];
  let atual = [];

  amostras.forEach((amostra, i) => {
    const v = numero(amostra.field1);
    if (v === null) {
      if (atual.length > 1) trechos.push(atual.join(" "));
      atual = [];
      return;
    }
    atual.push(`${x(i)},${y(v)}`);
    circulos.push({ cx: x(i), cy: y(v) });
  });

  if (atual.length > 1) trechos.push(atual.join(" "));

  return { limites, trechos, circulos };

}

export async function consultarCanal(sinal) {

  const resposta = await fetch(API_URL, {
    cache: "no-store",
    signal: AbortSignal.any([sinal, AbortSignal.timeout(12000)])
  });

  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status}`);
  }

  return resposta.json();

}
