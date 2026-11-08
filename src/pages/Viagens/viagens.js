// Regras da tela de viagens sem React (ordem, janela de leituras, data do
// formulário), para poder testar sozinho.

import { horarioDe } from "../../lib/leituras.js";


// Em andamento primeiro; depois as mais recentes. Não altera a lista recebida.
export function ordenarViagens(viagens) {

  return [...viagens].sort(
    (a, b) => (!!a.fim - !!b.fim) || (new Date(b.inicio) - new Date(a.inicio))
  );

}


// Horas pedidas à API para cobrir a viagem.
// A API aceita até 7 dias para trás a partir de agora.
export function horasDaViagem(viagem, agora = Date.now()) {

  const inicio = new Date(viagem.inicio);

  return Math.min(168, Math.max(1, Math.ceil((agora - inicio) / 3600000)));

}


// Só as leituras entre o início e o fim (ou agora, se em andamento).
export function filtrarLeiturasDaViagem(leituras, viagem, agora = Date.now()) {

  const inicio = new Date(viagem.inicio);
  const fim = viagem.fim ? new Date(viagem.fim) : new Date(agora);

  return leituras.filter(l => {
    const quando = horarioDe(l);
    return quando >= inicio && quando <= fim;
  });

}


// datetime-local no horário do navegador, sem segundos.
export function agoraLocal(agora = new Date()) {

  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

}
