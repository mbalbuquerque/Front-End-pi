// Regra sem tela do campo livre do chat: tenta a rota /chat (Azure OpenAI)
// e, se ela falhar, responde pelo FAQ local (respostas.js), para o chat
// nunca ficar sem resposta. Os botões de pergunta rápida não passam por aqui.

import { MAX_HISTORICO, perguntarChat } from "../../lib/chat.js";
import { responder } from "./respostas.js";


// Turnos de pergunta e resposta que vão como histórico: só os últimos 6,
// no formato da rota ({ papel: "usuario" | "assistente", texto }).
export function montarHistorico(turnos) {

  return turnos
    .filter(turno => (turno.papel === "usuario" || turno.papel === "assistente") && turno.texto)
    .slice(-MAX_HISTORICO)
    .map(({ papel, texto }) => ({ papel, texto }));

}


// { origem, encontrada, texto, fontes }
// origem: "ia" (resposta da rota), "faq" (plano B local) ou "limite" (429).
// encontrada: false só quando nem o FAQ tem resposta (mostra o aviso do WhatsApp).
export async function responderPergunta(pergunta, historico, { perguntar = perguntarChat, signal } = {}) {

  try {

    const { resposta, fontes } = await perguntar(pergunta, historico, { signal });

    return { origem: "ia", encontrada: true, texto: resposta, fontes };

  } catch (erro) {

    // Muitas perguntas seguidas: mostra o aviso da própria API.
    if (erro?.status === 429) {
      return {
        origem: "limite",
        encontrada: true,
        texto: erro.message || "Muitas perguntas seguidas. Tente de novo em 1 min.",
        fontes: []
      };
    }

    const local = responder(pergunta);

    return { origem: "faq", encontrada: local.encontrada, texto: local.texto, fontes: [] };

  }

}


// Conta para o histórico: resposta da IA ou do FAQ que achou algo.
// Aviso de limite e "não tenho resposta cadastrada" ficam de fora.
export function entraNoHistorico(resultado) {

  return resultado.origem !== "limite" && resultado.encontrada;

}
