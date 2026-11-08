// Exportação das leituras do relatório em CSV (porte de baixarCsv() do
// antigo js/relatorios.js): mesmo cabeçalho, separador ";" e nome de arquivo.

import { horarioDe } from "../../lib/leituras.js";

export const CABECALHO_CSV = "medido_em;temperatura_c;umidade_pct;rssi_dbm;status";


// Texto do arquivo, com BOM para o Excel abrir com acentos corretos.
export function gerarCsv(leituras) {

  const linhas = leituras.map(l => [
    horarioDe(l).toISOString(),
    l.temperatura,
    l.umidade,
    l.rssi ?? "",
    l.status
  ].join(";"));

  return "﻿" + [CABECALHO_CSV, ...linhas].join("\n");

}


// "coldtrack-VAN-01-24h.csv"
export function nomeArquivoCsv(veiculoId, horas) {

  return `coldtrack-${veiculoId}-${horas}h.csv`;

}


// Dispara o download no navegador.
export function baixarCsv(leituras, veiculoId, horas) {

  const arquivo = new Blob([gerarCsv(leituras)], { type: "text/csv;charset=utf-8" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = nomeArquivoCsv(veiculoId, horas);
  link.click();

  URL.revokeObjectURL(link.href);

}
