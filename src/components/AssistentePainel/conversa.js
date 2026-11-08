// Conversa do assistente do painel, só em memória. Fica fora do componente
// porque cada tela logada monta o seu PainelLayout: trocar de tela não apaga
// a conversa e uma resposta pedida numa tela chega na outra. Pertence à
// sessão (token): sair, sessão vencida ou outro login começam do zero.
// Nada vai para o localStorage.

import { MAX_HISTORICO, mensagemDeErro, perguntarAssistente } from "../../lib/assistente.js";

// Perguntas prontas mostradas antes da primeira pergunta.
export const SUGESTOES = [
  "Como estão meus veículos agora?",
  "Teve alerta nas últimas 24 h?",
  "Como cadastro um sensor?",
  "O que o operador pode fazer?"
];

const VAZIA = { dono: null, mensagens: [], esperando: false };

let estado = VAZIA;
let proximoId = 0;
let pedido = null;

// Perguntas respondidas e respostas, na ordem, para o histórico da rota.
let turnos = [];

const ouvintes = new Set();


function mudar(novo) {

  estado = { ...estado, ...novo };
  ouvintes.forEach(avisar => avisar());

}


export function assinar(avisar) {

  ouvintes.add(avisar);

  return () => ouvintes.delete(avisar);

}


export function lerConversa() {

  return estado;

}


// Zera tudo e cancela o pedido em andamento (a resposta não aparece mais).
export function limparConversa(dono = null) {

  pedido?.abort();
  pedido = null;
  turnos = [];
  mudar({ ...VAZIA, dono });

}


// Chamado a cada render do assistente com o token da sessão de agora.
export function garantirDono(dono) {

  if (estado.dono !== dono) {
    limparConversa(dono);
  }

}


// Só as últimas mensagens que deram certo: { papel: "usuario" | "assistente", texto }.
export function montarHistorico(lista = turnos) {

  return lista.slice(-MAX_HISTORICO).map(({ papel, texto }) => ({ papel, texto }));

}


function nova(tipo, texto, extra = {}) {

  return { id: proximoId++, tipo, texto, ...extra };

}


// Manda a pergunta e põe a resposta (ou o aviso de erro) na conversa.
// Devolve a promessa do pedido (útil em teste); ignora se já está esperando.
export function enviarPergunta(textoPergunta, { perguntar = perguntarAssistente } = {}) {

  const texto = String(textoPergunta).trim();

  if (!texto || estado.esperando) {
    return Promise.resolve();
  }

  const controle = new AbortController();
  const historico = montarHistorico();

  pedido = controle;

  mudar({
    mensagens: [...estado.mensagens, nova("usuario", texto)],
    esperando: true
  });

  return perguntar(texto, historico, { signal: controle.signal })
    .then(({ resposta, fontes }) => {
      if (controle.signal.aborted) return;
      turnos = [...turnos, { papel: "usuario", texto }, { papel: "assistente", texto: resposta }];
      mudar({ mensagens: [...estado.mensagens, nova("assistente", resposta, { fontes })] });
    })
    .catch(erro => {
      if (controle.signal.aborted) return;
      mudar({ mensagens: [...estado.mensagens, nova("erro", mensagemDeErro(erro))] });
    })
    .finally(() => {
      if (controle.signal.aborted) return;
      pedido = null;
      mudar({ esperando: false });
    });

}


// Primeiro nome do usuário para a saudação ("Gestora Teste" -> "Gestora").
export function primeiroNome(nome) {

  return String(nome || "").trim().split(/\s+/)[0] || "";

}
