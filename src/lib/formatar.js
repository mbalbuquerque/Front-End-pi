// Formatação de valores para exibição (pt-BR).

export const STATUS_INFO = {
  NORMAL: { texto: "NORMAL", classe: "normal" },
  ATENCAO: { texto: "ATENÇÃO", classe: "atencao" },
  CRITICO: { texto: "CRÍTICO", classe: "critico" }
};

// Status ausente ou desconhecido (selo cinza).
export const STATUS_SEM_DADOS = { texto: "SEM DADOS", classe: "aguardando" };


export function infoStatus(status) {

  return STATUS_INFO[status] || STATUS_SEM_DADOS;

}


export function formatarTemp(valor) {

  return typeof valor === "number" ? `${valor.toFixed(1)} °C` : "--";

}


export function formatarUmidade(valor) {

  return typeof valor === "number" ? `${valor.toFixed(1)} %` : "--";

}


// "08/11, 14:05:09"
export function formatarDataHora(data) {

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

}


// "14:05"
export function formatarHora(data) {

  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

}


export function formatarDuracao(ms) {

  const minutos = Math.round(ms / 60000);

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto ? `${horas} h ${resto} min` : `${horas} h`;

}
