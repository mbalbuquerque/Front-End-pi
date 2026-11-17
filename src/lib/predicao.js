// Risco térmico da saída: rota GET /api/predict da Azure Function.
// O modelo é climatológico (estação INMET A307, Petrolina): chance de a
// temperatura externa passar de 30 °C no mês e na hora da saída. Não usa as
// leituras do sensor do baú. Ficha do modelo: docs/model-card.md no repositório da API.

import { api } from "./api.js";


const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Nível do modelo -> classe do selo (.status.*) e texto.
export const NIVEIS_RISCO = {
  baixo: { classe: "normal", texto: "RISCO BAIXO" },
  moderado: { classe: "atencao", texto: "RISCO MODERADO" },
  alto: { classe: "critico", texto: "RISCO ALTO" }
};

const NIVEL_DESCONHECIDO = { classe: "aguardando", texto: "SEM NÍVEL" };


export async function buscarRisco({ mes, hora, signal } = {}) {

  const params = new URLSearchParams({ mes: String(mes), hora: String(hora) });

  return api(`/predict?${params}`, signal ? { signal } : {});

}


// Mês (1 a 12) e hora (0 a 23) em Recife, o fuso do modelo (horário de Brasília).
export function momentoRecife(data = new Date()) {

  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Recife",
    month: "numeric",
    hour: "numeric",
    hourCycle: "h23"
  }).formatToParts(data);

  const valor = tipo => Number(partes.find(p => p.type === tipo).value);

  return { mes: valor("month"), hora: valor("hour") };

}


export function infoNivel(nivel) {

  return NIVEIS_RISCO[nivel] || NIVEL_DESCONHECIDO;

}


export function formatarChance(probabilidade) {

  return typeof probabilidade === "number" ? `${Math.round(probabilidade * 100)}%` : "--";

}


export function nomeDoMes(mes) {

  return MESES[mes - 1] || "";

}


// "0,091" (Brier com três casas, vírgula decimal).
export function formatarBrier(valor) {

  return typeof valor === "number" ? valor.toFixed(3).replace(".", ",") : "--";

}


// Erro da busca -> estado do card. 404: a API publicada ainda não tem a rota.
export function estadoDoErro(erro) {

  if (erro && erro.status === 404) {
    return {
      tipo: "indisponivel",
      mensagem: "O modelo de risco ainda não está publicado nesta versão da API."
    };
  }

  return {
    tipo: "erro",
    mensagem: "Não foi possível consultar o risco agora. Tente de novo em instantes."
  };

}
