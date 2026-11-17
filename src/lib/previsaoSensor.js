// Previsão da temperatura do sensor 10 min à frente: rota GET /api/predict/sensor.
// A tela mostra SEMPRE a previsão `recomendada` pela API (a de menor erro no teste
// temporal; hoje é a persistência, a última leitura repetida). O modelo nunca é
// apresentado como melhor que a persistência: a API é quem diz qual vale.
// Ficha do modelo: docs/model-card.md no repositório da API.

import { api } from "./api.js";
import { STATUS_INFO } from "./formatar.js";


// recomendada (da API) -> campo da resposta com o valor e nome do método na tela.
// Atenção: `recomendada: "modelo"` aponta para o campo `previsao`; o campo `modelo`
// da resposta é a ficha do modelo (erros do teste), não uma previsão.
const METODOS = {
  baseline: { campo: "baseline", nome: "persistência" },
  modelo: { campo: "previsao", nome: "modelo" }
};

// motivo (da API) -> por que não há número na tela.
const MOTIVOS = {
  sem_leituras: "O sensor não enviou leituras nos últimos 20 min.",
  sem_leitura_recente: "A última leitura tem mais de 5 min.",
  historico_insuficiente: "Ainda não há 10 min contínuos de leituras."
};

const MOTIVO_GENERICO = "Não há dados suficientes agora.";


// Operador e gestor passam o sensor; o motorista chama sem deviceId (a API usa o do veículo).
export async function buscarPrevisaoSensor({ deviceId, signal } = {}) {

  const consulta = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : "";

  return api(`/predict/sensor${consulta}`, signal ? { signal } : {});

}


// "0,342" (MAE com três casas, vírgula decimal).
export function formatarMae(valor) {

  return typeof valor === "number" ? valor.toFixed(3).replace(".", ",") : "--";

}


// Resposta da API -> o que a tela mostra. null = resposta que a tela não entende (fica em silêncio).
//   { tipo: "previsao", temperatura, horizonte, metodo, status, antecipa, mae, superaBaseline }
//   { tipo: "sem-previsao", horizonte, motivo }
export function resumirPrevisao(resposta) {

  if (!resposta || typeof resposta !== "object") {
    return null;
  }

  const metodo = METODOS[resposta.recomendada];

  if (!metodo) {
    return null;
  }

  const horizonte = typeof resposta.horizonteMin === "number" ? resposta.horizonteMin : 10;
  const escolhida = resposta[metodo.campo];

  // Sem número da recomendada: diz o porquê e não mostra valor nenhum.
  if (!escolhida || typeof escolhida.temperatura !== "number") {
    return {
      tipo: "sem-previsao",
      horizonte,
      motivo: MOTIVOS[resposta.motivo] || MOTIVO_GENERICO
    };
  }

  const modelo = resposta.modelo || {};
  const temErros = typeof modelo.maeModelo === "number" && typeof modelo.maeBaseline === "number";

  return {
    tipo: "previsao",
    temperatura: escolhida.temperatura,
    horizonte,
    metodo: metodo.nome,
    status: STATUS_INFO[escolhida.status] || null,
    antecipa: resposta.antecipaExcursao === true && Boolean(STATUS_INFO[escolhida.status]),
    mae: temErros ? { modelo: modelo.maeModelo, baseline: modelo.maeBaseline } : null,
    superaBaseline: modelo.superaBaseline === true
  };

}
