// Alertas no celular (Web Push, padrão VAPID, sem serviço pago).
//
// O navegador gera a inscrição com a chave pública da API (GET /push/chave) e a
// inscrição vai para a API (POST /push/inscricao), presa ao usuário logado. Quando
// um sensor da empresa sai da faixa normal, a API manda o push e o service worker
// (public/sw.js) mostra a notificação.
//
// Estados de um aparelho:
//   "sem-suporte"  navegador sem service worker, PushManager ou Notification
//                  (ex.: iPhone fora do app instalado na tela de início)
//   "negado"       o usuário bloqueou as notificações do site
//   "inativo"      pode ativar
//   "ativo"        este aparelho já recebe os alertas

import { api } from "./api.js";
import { API_URL } from "./config.js";


export const MSG_SEM_SERVIDOR = "Alertas push indisponíveis no servidor. Tente mais tarde.";
export const MSG_SEM_SERVICE_WORKER =
  "Alertas no celular só funcionam no site publicado (service worker não registrado).";


export function suportaPush(janela = globalThis) {

  return Boolean(
    janela.navigator && "serviceWorker" in janela.navigator &&
    "PushManager" in janela &&
    "Notification" in janela
  );

}


// Chave VAPID em base64url (sem "=") para os bytes que o PushManager pede.
export function base64UrlParaBytes(texto) {

  const base64 = (texto + "=".repeat((4 - (texto.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binario = atob(base64);

  return Uint8Array.from(binario, letra => letra.charCodeAt(0));

}


// Registro do service worker. No build publicado o main.jsx registra no "load";
// se o clique chegar antes, registra aqui. No dev (vite) não há service worker.
async function obterRegistro() {

  const sw = navigator.serviceWorker;
  const registro = await sw.getRegistration();

  if (registro) {
    return registro;
  }

  if (!import.meta.env.PROD) {
    throw new Error(MSG_SEM_SERVICE_WORKER);
  }

  await sw.register("/sw.js");

  return sw.ready;

}


async function inscricaoAtual() {

  const registro = await navigator.serviceWorker.getRegistration();

  return registro ? registro.pushManager.getSubscription() : null;

}


async function chavePublica() {

  let resposta;

  try {
    resposta = await fetch(`${API_URL}/push/chave`);
  } catch {
    throw new Error(MSG_SEM_SERVIDOR);
  }

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok || typeof dados.chave !== "string" || !dados.chave) {
    throw new Error(MSG_SEM_SERVIDOR);
  }

  return dados.chave;

}


export async function estadoPush() {

  if (!suportaPush()) {
    return "sem-suporte";
  }

  if (Notification.permission === "denied") {
    return "negado";
  }

  const inscricao = await inscricaoAtual();

  return inscricao && Notification.permission === "granted" ? "ativo" : "inativo";

}


// Pede a permissão, inscreve o aparelho e manda a inscrição para a API.
// Se a API recusar, desfaz a inscrição local (senão o aparelho pareceria ativo).
export async function ativarPush() {

  if (!suportaPush()) {
    return "sem-suporte";
  }

  const permissao = await Notification.requestPermission();

  if (permissao === "denied") {
    return "negado";
  }

  if (permissao !== "granted") {
    return "inativo";
  }

  const chave = await chavePublica();
  const registro = await obterRegistro();

  const inscricao = (await registro.pushManager.getSubscription()) ||
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaBytes(chave)
    }));

  try {

    await api("/push/inscricao", { metodo: "POST", corpo: inscricao.toJSON() });

  }

  catch (erro) {

    await inscricao.unsubscribe().catch(() => {});
    throw erro;

  }

  return "ativo";

}


// Tira o aparelho da lista da API e cancela a inscrição no navegador. A API é
// melhor esforço: se falhar, a inscrição cancelada responde 410 ao próximo push
// e a própria API a remove.
export async function desativarPush() {

  if (!suportaPush()) {
    return "sem-suporte";
  }

  const inscricao = await inscricaoAtual();

  if (!inscricao) {
    return "inativo";
  }

  try {
    await api("/push/inscricao", { metodo: "DELETE", corpo: { endpoint: inscricao.endpoint } });
  } catch (erro) {
    console.warn("Não foi possível remover a inscrição na API:", erro);
  }

  await inscricao.unsubscribe();

  return "inativo";

}
