// Assistente do painel (Azure OpenAI): POST {API_URL}/assistente, rota
// autenticada. Passa por api(): leva o token e, em 401, limpa a sessão e
// volta ao login como qualquer outra tela. Lança erro com .status em
// resposta não 2xx e com .tempoEsgotado quando passa do tempo limite;
// falha de rede é repassada. Quem chama escolhe a mensagem (mensagemDeErro).

import { api } from "./api.js";

// A rota costuma levar de 2 a 8 s; depois de 20 s o painel desiste.
export const TEMPO_LIMITE_ASSISTENTE = 20000;

// Limites da rota: pergunta de 1 a 500 caracteres, histórico de até 6
// mensagens de até 1000 caracteres cada.
export const MAX_PERGUNTA = 500;
export const MAX_HISTORICO = 6;
export const MAX_TEXTO_HISTORICO = 1000;

export const MENSAGEM_INDISPONIVEL = "O assistente está indisponível agora. Tente de novo em instantes.";


export async function perguntarAssistente(
  pergunta,
  historico = [],
  { signal, tempoLimite = TEMPO_LIMITE_ASSISTENTE } = {}
) {

  const controle = new AbortController();
  let esgotou = false;

  const timer = setTimeout(() => {
    esgotou = true;
    controle.abort();
  }, tempoLimite);

  const repassar = () => controle.abort();

  if (signal?.aborted) {
    controle.abort();
  } else {
    signal?.addEventListener("abort", repassar);
  }

  const corpo = { pergunta: String(pergunta).trim().slice(0, MAX_PERGUNTA) };

  const anteriores = historico
    .filter(item => (item?.papel === "usuario" || item?.papel === "assistente") && item.texto)
    .slice(-MAX_HISTORICO)
    .map(({ papel, texto }) => ({ papel, texto: String(texto).slice(0, MAX_TEXTO_HISTORICO) }));

  if (anteriores.length) {
    corpo.historico = anteriores;
  }

  try {

    const dados = await api("/assistente", { metodo: "POST", corpo, signal: controle.signal });

    const resposta = typeof dados.resposta === "string" ? dados.resposta.trim() : "";

    if (!resposta) {
      const erro = new Error("Resposta vazia do assistente.");
      erro.status = 502;
      throw erro;
    }

    const fontes = Array.isArray(dados.fontes)
      ? dados.fontes.filter(fonte => typeof fonte === "string" && fonte.trim()).map(fonte => fonte.trim())
      : [];

    return { resposta, fontes };

  } catch (erro) {

    if (esgotou) {
      const atraso = new Error("O assistente demorou demais para responder.");
      atraso.tempoEsgotado = true;
      throw atraso;
    }

    throw erro;

  } finally {

    clearTimeout(timer);
    signal?.removeEventListener("abort", repassar);

  }

}


// Texto mostrado na conversa quando a pergunta falha.
// 400 e 429: a mensagem da própria API (ex.: "muitas perguntas seguidas...").
// 401: a sessão acabou e o painel já está indo ao login.
// O resto (503, tempo esgotado, rede, resposta vazia): aviso genérico.
export function mensagemDeErro(erro) {

  if ((erro?.status === 400 || erro?.status === 429) && erro.message && !/^HTTP \d+$/.test(erro.message)) {
    return erro.message;
  }

  if (erro?.status === 429) {
    return "Muitas perguntas seguidas. Tente de novo em 1 min.";
  }

  if (erro?.message === "Sessão encerrada.") {
    return "Sua sessão terminou. Entre de novo para continuar.";
  }

  return MENSAGEM_INDISPONIVEL;

}
