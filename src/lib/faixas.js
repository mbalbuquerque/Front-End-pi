// Perfis de carga e faixas de temperatura. Vêm da API (GET /perfis, sem
// token): a mesma regra do sensor e da nuvem.

import { getPublico } from "./api.js";

// Faixa do perfil demonstrativo: vale enquanto o perfil não carrega.
export const FAIXA_PADRAO = { min: null, max: 15, margem: 5 };

let perfisCarga = null;


// Busca uma vez e guarda em memória até recarregar a página.
export async function carregarPerfis() {

  if (!perfisCarga) {
    perfisCarga = (await getPublico("/perfis")).perfis;
  }

  return perfisCarga;

}


// Só para testes.
export function limparCachePerfis() {

  perfisCarga = null;

}


export function faixaDoPerfil(perfil) {

  return perfil ? { min: perfil.min, max: perfil.max, margem: perfil.margem } : FAIXA_PADRAO;

}


// "de 10 a 13 °C" ou "até 15 °C"
export function descreverNormal(faixa) {

  return faixa.min == null
    ? `até ${faixa.max} °C`
    : `de ${faixa.min} a ${faixa.max} °C`;

}


// "acima de 20 °C" ou "abaixo de 7 °C ou acima de 16 °C"
export function descreverCritico(faixa) {

  const acima = `acima de ${faixa.max + faixa.margem} °C`;

  return faixa.min == null
    ? acima
    : `abaixo de ${faixa.min - faixa.margem} °C ou ${acima}`;

}
