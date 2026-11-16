// Estado de conexão do navegador e hora da última resposta recebida da API.
// api() chama registrarRecepcao() a cada resposta; a faixa "Sem conexão" lê
// daqui para dizer de que hora são os dados que ainda estão na tela.
// Só fica em memória: nada de leitura é guardado em disco ou em cache.

import { useSyncExternalStore } from "react";

let ultimaRecepcao = null;
const ouvintes = new Set();


function avisar() {

  ouvintes.forEach(ouvinte => ouvinte());

}


export function registrarRecepcao(quando = new Date()) {

  ultimaRecepcao = quando;
  avisar();

}


export function lerUltimaRecepcao() {

  return ultimaRecepcao;

}


// Só para os testes e para o logout: zera a lembrança da sessão anterior.
export function esquecerRecepcao() {

  ultimaRecepcao = null;
  avisar();

}


function assinar(ouvinte) {

  ouvintes.add(ouvinte);
  window.addEventListener("online", ouvinte);
  window.addEventListener("offline", ouvinte);

  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("online", ouvinte);
    window.removeEventListener("offline", ouvinte);
  };

}


function estaOnline() {

  return navigator.onLine !== false;

}


export function useOnline() {

  return useSyncExternalStore(assinar, estaOnline, () => true);

}


export function useUltimaRecepcao() {

  return useSyncExternalStore(assinar, lerUltimaRecepcao, () => null);

}
