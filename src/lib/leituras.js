// Leituras do sensor (Azure Function) e estatísticas sobre elas.

import { api } from "./api.js";
import { UPDATE_INTERVAL } from "./config.js";


export async function buscarLeituras({ deviceId, limite = 50, horas, status } = {}) {

  const params = new URLSearchParams({
    deviceId,
    limite: String(limite)
  });

  if (horas) {
    params.set("horas", String(horas));
  }

  if (status) {
    params.set("status", status.join(","));
  }

  const data = await api(`/leituras?${params}`);

  // A API devolve da mais recente para a mais antiga.
  return data.leituras || [];

}


export function horarioDe(leitura) {

  return new Date(leitura.medidoEm || leitura.recebidoEm);

}


export function resumir(leituras) {

  const temps = leituras
    .map(l => l.temperatura)
    .filter(v => typeof v === "number");

  if (temps.length === 0) {
    return null;
  }

  const soma = temps.reduce((a, b) => a + b, 0);

  return {
    total: temps.length,
    media: soma / temps.length,
    minima: Math.min(...temps),
    maxima: Math.max(...temps),
    atencao: leituras.filter(l => l.status === "ATENCAO").length,
    critico: leituras.filter(l => l.status === "CRITICO").length
  };

}


// Agrupa leituras seguidas fora da faixa normal em ocorrências.
// Um intervalo maior que 3 envios sem leitura encerra a ocorrência.
// Devolve da mais recente para a mais antiga.
export function agruparOcorrencias(leituras) {

  const lacunaMax = UPDATE_INTERVAL * 3;

  const ordenadas = leituras
    .filter(l => l.status === "ATENCAO" || l.status === "CRITICO")
    .map(l => ({ ...l, data: horarioDe(l) }))
    .sort((a, b) => a.data - b.data);

  const ocorrencias = [];

  ordenadas.forEach(leitura => {

    const atual = ocorrencias[ocorrencias.length - 1];

    if (atual && leitura.data - atual.fim <= lacunaMax) {

      atual.fim = leitura.data;
      atual.leituras.push(leitura);

      if (leitura.temperatura > atual.pico) {
        atual.pico = leitura.temperatura;
      }

      if (leitura.status === "CRITICO") {
        atual.status = "CRITICO";
      }

    } else {

      ocorrencias.push({
        inicio: leitura.data,
        fim: leitura.data,
        pico: leitura.temperatura,
        status: leitura.status,
        leituras: [leitura]
      });

    }

  });

  // Duração: do início até o fim, contando o intervalo da última leitura.
  ocorrencias.forEach(o => {
    o.duracao = o.fim - o.inicio + UPDATE_INTERVAL;
  });

  return ocorrencias.reverse();

}
