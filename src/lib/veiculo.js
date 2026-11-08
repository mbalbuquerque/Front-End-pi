// Veículo da tela: ?veiculo= na URL (etiqueta QR), o último escolhido ou o primeiro.

import { api } from "./api.js";
import { gravar, ler } from "./armazenamento.js";
import { carregarPerfis, faixaDoPerfil } from "./faixas.js";

export const CHAVE_VEICULO = "coldtrack.veiculo";


// Regra pura: ordena por id e escolhe pedido (URL) > salvo > primeiro > null.
export function decidirVeiculo(veiculos, pedido, salvo) {

  const ordenados = [...veiculos].sort((a, b) => a.id.localeCompare(b.id));

  const veiculo =
    ordenados.find(v => v.id === pedido) ||
    ordenados.find(v => v.id === salvo) ||
    ordenados[0] ||
    null;

  return { veiculos: ordenados, veiculo };

}


// search: o location.search da rota (ex.: "?veiculo=VAN-01").
// Devolve { veiculos, veiculo, perfil, faixa }; veiculo é null sem cadastro.
export async function escolherVeiculo(search = window.location.search) {

  const [{ veiculos }, perfis] = await Promise.all([api("/veiculos"), carregarPerfis()]);

  const pedido = new URLSearchParams(search).get("veiculo");

  const escolha = decidirVeiculo(veiculos, pedido, ler(CHAVE_VEICULO));

  const perfil = perfis.find(p => p.id === (escolha.veiculo?.perfil || "demonstrativo"));

  return { ...escolha, perfil, faixa: faixaDoPerfil(perfil) };

}


// Guarda a escolha do seletor para as próximas telas.
export function lembrarVeiculo(id) {

  gravar(CHAVE_VEICULO, id);

}
