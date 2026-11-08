// true quando o sistema pede menos movimento (prefers-reduced-motion: reduce).
// Acompanha a troca da preferência com a página aberta.

import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";


function midia() {

  return typeof window !== "undefined" && window.matchMedia ? window.matchMedia(CONSULTA) : null;

}


function assinar(avisar) {

  const lista = midia();

  if (!lista) return () => {};

  lista.addEventListener("change", avisar);

  return () => lista.removeEventListener("change", avisar);

}


export function movimentoReduzido() {

  return midia()?.matches ?? false;

}


export function useMovimentoReduzido() {

  return useSyncExternalStore(assinar, movimentoReduzido, () => false);

}
