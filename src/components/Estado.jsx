// Caixas de estado (carregando, vazio, erro) com as classes antigas .estado / .panel.estado.
//
//   <Estado>Carregando leituras…</Estado>
//   <Estado painel titulo="Nenhum veículo cadastrado.">Registre o sensor...</Estado>
//   <ErroAzure />   <SemVeiculo />   <Carregando />

import { UPDATE_INTERVAL } from "../lib/config.js";

export default function Estado({ titulo, painel = false, children }) {

  return (
    <div className={painel ? "panel estado" : "estado"}>
      {titulo && <strong>{titulo}</strong>}
      {children}
    </div>
  );

}


// Texto do antigo carregamento inicial de #conteudo.
export function Carregando({ children = "Carregando leituras…" }) {

  return <Estado>{children}</Estado>;

}


// Antigo ERRO_AZURE.
export function ErroAzure() {

  return (
    <Estado painel titulo="Não foi possível falar com o Azure.">
      Os dados voltam na próxima atualização ({UPDATE_INTERVAL / 1000} s).
    </Estado>
  );

}


// Antigo SEM_VEICULO.
export function SemVeiculo() {

  return (
    <Estado painel titulo="Nenhum veículo cadastrado.">
      Registre o sensor em Sensores e depois cadastre o veículo em Veículos.
    </Estado>
  );

}
