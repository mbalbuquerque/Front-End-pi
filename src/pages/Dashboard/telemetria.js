// Regras do dashboard sem React (porte das funções de legado/js/app.js).

import { FAIXA_PADRAO } from "../../lib/faixas.js";

// "Tempo real": últimos 30 min a partir da leitura mais recente.
export const JANELA_HISTORICO_MS = 30 * 60 * 1000;

export const TEXTOS_STATUS = {
  NORMAL: "Temperatura dentro da faixa da carga",
  ATENCAO: "Temperatura em atenção",
  CRITICO: "Temperatura crítica"
};


// Leituras da API (mais recente primeiro) -> do mais antigo para o mais
// recente, com o horário da medição (leituras guardadas offline chegam depois).
export function ordenarLeituras(leituras) {

  return leituras
    .slice()
    .reverse()
    .map(leitura => ({
      criadoEm: leitura.medidoEm || leitura.recebidoEm,
      temperatura: leitura.temperatura,
      umidade: leitura.umidade,
      rssi: leitura.rssi,
      status: leitura.status
    }));

}


// Leitura antiga, gravada antes da faixa por carga, não traz status.
export function classificarTemperatura(temperatura, faixa = FAIXA_PADRAO) {

  const minimo = faixa.min == null ? -Infinity : faixa.min;

  if (temperatura >= minimo && temperatura <= faixa.max) {
    return "NORMAL";
  }

  if (temperatura >= minimo - faixa.margem && temperatura <= faixa.max + faixa.margem) {
    return "ATENCAO";
  }

  return "CRITICO";

}


// rssi já convertido com parseInt (NaN quando o sensor não informa).
export function textoSinal(rssi) {

  if (Number.isNaN(rssi)) {
    return "Sinal não informado";
  }

  if (rssi >= -60) {
    return "Sinal excelente";
  }

  if (rssi >= -70) {
    return "Sinal bom";
  }

  if (rssi >= -80) {
    return "Sinal regular";
  }

  return "Sinal fraco";

}


// Valores dos cards e da última telemetria a partir da leitura mais recente.
export function resumoUltima(leitura, faixa) {

  const temperatura = parseFloat(leitura.temperatura);
  const umidade = parseFloat(leitura.umidade);

  // RSSI pode vir vazio (o simulador Wokwi não informa um valor real).
  const rssi = parseInt(leitura.rssi);

  return {
    temperatura: `${temperatura.toFixed(1)} °C`,
    umidade: `${umidade.toFixed(1)} %`,
    rssi: Number.isNaN(rssi) ? "--" : `${rssi} dBm`,
    sinal: textoSinal(rssi),
    atualizacao: new Date(leitura.criadoEm).toLocaleString("pt-BR"),
    situacao: leitura.status || classificarTemperatura(temperatura, faixa)
  };

}


// Leituras dos últimos 30 min (a partir da mais recente) no formato do gráfico.
export function leiturasDoHistorico(ordenadas, faixa) {

  const maisRecente = new Date(ordenadas[ordenadas.length - 1].criadoEm);

  return ordenadas
    .filter(l => maisRecente - new Date(l.criadoEm) <= JANELA_HISTORICO_MS)
    .map(l => {

      const temperatura = parseFloat(l.temperatura);

      return {
        temperatura,
        medidoEm: l.criadoEm,
        status: l.status || classificarTemperatura(temperatura, faixa)
      };

    })
    .filter(l => !Number.isNaN(l.temperatura));

}
