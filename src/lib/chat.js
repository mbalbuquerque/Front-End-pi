// Chat da página inicial com Azure OpenAI: POST {API_URL}/chat, rota pública
// (sem token). Lança erro com .status em resposta não 2xx, com
// .tempoEsgotado quando passa do tempo limite e repassa a falha de rede;
// quem chama decide o plano B (o FAQ local do ChatWidget).

import { API_URL } from "./config.js";

// Tempo máximo de espera pela resposta (a IA costuma levar de 2 a 6 s).
export const TEMPO_LIMITE_CHAT = 15000;

// Limites da rota: pergunta até 500 caracteres, histórico até 6 mensagens de até 1000.
export const MAX_PERGUNTA = 500;
export const MAX_HISTORICO = 6;
export const MAX_TEXTO_HISTORICO = 1000;


export async function perguntarChat(pergunta, historico = [], { signal, tempoLimite = TEMPO_LIMITE_CHAT } = {}) {

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

  const corpo = { pergunta: String(pergunta).slice(0, MAX_PERGUNTA) };

  if (historico.length) {
    corpo.historico = historico.slice(-MAX_HISTORICO).map(({ papel, texto }) => ({
      papel,
      texto: String(texto).slice(0, MAX_TEXTO_HISTORICO)
    }));
  }

  try {

    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: controle.signal
    });

    const dados = await response.json().catch(() => ({}));

    if (!response.ok) {
      const erro = new Error((dados.erros || [`HTTP ${response.status}`]).join(" · "));
      erro.status = response.status;
      throw erro;
    }

    const resposta = typeof dados.resposta === "string" ? dados.resposta.trim() : "";

    if (!resposta) {
      const erro = new Error("Resposta vazia do chat.");
      erro.status = response.status;
      throw erro;
    }

    const fontes = Array.isArray(dados.fontes)
      ? dados.fontes.filter(fonte => typeof fonte === "string" && fonte.trim()).map(fonte => fonte.trim())
      : [];

    return { resposta, fontes };

  } catch (erro) {

    if (esgotou) {
      const atraso = new Error("O chat demorou demais para responder.");
      atraso.tempoEsgotado = true;
      throw atraso;
    }

    throw erro;

  } finally {

    clearTimeout(timer);
    signal?.removeEventListener("abort", repassar);

  }

}
