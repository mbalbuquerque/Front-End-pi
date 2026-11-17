// Sessão do usuário (login com perfis), guardada em localStorage.
// Formato: { token, usuario, expiraEm } — expiraEm em ms, tirado do exp do JWT.
// Em componente, prefira useSessao() (re-renderiza ao entrar/sair).

import { gravarJSON, lerJSON, remover } from "./armazenamento.js";

export const CHAVE_SESSAO = "coldtrack.sessao";


export function lerSessao() {

  const sessao = lerJSON(CHAVE_SESSAO);

  // O token vence em 8 h; sessão vencida é descartada antes de usar.
  if (!sessao || !sessao.token || sessao.expiraEm <= Date.now()) {
    return null;
  }

  return sessao;

}


// exp do token (segundos) vira milissegundos para comparar com Date.now().
export function expiracaoDoToken(token) {

  const carga = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));

  return carga.exp * 1000;

}


export function salvarSessao(token, usuario) {

  const sessao = { token, usuario, expiraEm: expiracaoDoToken(token) };

  gravarJSON(CHAVE_SESSAO, sessao);

  return sessao;

}


export function limparSessao() {

  remover(CHAVE_SESSAO);

}


export function usuarioAtual() {

  const sessao = lerSessao();
  return sessao ? sessao.usuario : null;

}


export function ehGestor(usuario = usuarioAtual()) {

  return usuario?.perfil === "gestor";

}


// Motorista: perfil que só vê a tela /motorista, com o veículo vinculado à conta.
export function ehMotorista(usuario = usuarioAtual()) {

  return usuario?.perfil === "motorista";

}


// Para onde o usuário vai depois do login (e quando cai numa rota que não é dele).
export function rotaInicial(usuario = usuarioAtual()) {

  return ehMotorista(usuario) ? "/motorista" : "/dashboard";

}


// Nome do perfil para a tela.
export function nomeDoPerfil(perfil) {

  return { gestor: "Gestor", motorista: "Motorista" }[perfil] || "Operador logístico";

}
