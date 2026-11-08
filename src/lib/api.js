// Toda chamada autenticada à API do ColdTrack passa por api():
// leva o token, trata sessão vencida (401) e junta as mensagens de erro.

import { API_URL } from "./config.js";
import { lerSessao, limparSessao } from "./sessao.js";


// Quem reage ao 401. O AuthProvider registra aqui: zera o usuário e vai
// para /login pelo React Router. Sem ninguém registrado, recarrega no /login.
let aoExpirar = () => {
  window.location.replace("/login");
};


export function definirAoExpirar(funcao) {

  const anterior = aoExpirar;
  aoExpirar = funcao;

  return () => {
    aoExpirar = anterior;
  };

}


export async function api(caminho, { metodo = "GET", corpo, signal } = {}) {

  const sessao = lerSessao();

  const response = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {})
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    ...(signal ? { signal } : {})
  });

  if (response.status === 401) {
    limparSessao();
    aoExpirar();
    throw new Error("Sessão encerrada.");
  }

  const dados = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    const erro = new Error((dados.erros || [`HTTP ${response.status}`]).join(" · "));
    erro.status = response.status;
    throw erro;
  }

  return dados;

}


// POST sem token e sem tratar 401 como sessão vencida (login, cadastro de
// empresa): aqui 401 é senha errada. Não lança em erro HTTP, devolve
// { ok, status, dados }; só lança em falha de rede.
export async function postPublico(caminho, corpo) {

  const response = await fetch(`${API_URL}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo)
  });

  const dados = await response.json().catch(() => ({}));

  return { ok: response.ok, status: response.status, dados };

}


// GET sem token (ex.: /perfis). Devolve o JSON, sem checar status (como o original).
export async function getPublico(caminho) {

  const response = await fetch(`${API_URL}${caminho}`);

  return response.json();

}


// Logout no servidor: POST /sair invalida os tokens do usuário. Melhor esforço:
// tempo limite de 5 s e qualquer erro (rede, 404 enquanto a rota não existe,
// 401) é ignorado, porque a sessão local é limpa de qualquer jeito.
// Não passa por api(): um 401 aqui não pode disparar o "sessão vencida".
export async function sairNoServidor(token, limiteMs = 5000) {

  if (!token) {
    return false;
  }

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), limiteMs);

  try {

    const response = await fetch(`${API_URL}/sair`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
      signal: controle.signal
    });

    return response.ok;

  }

  catch {

    return false;

  }

  finally {

    clearTimeout(relogio);

  }

}
