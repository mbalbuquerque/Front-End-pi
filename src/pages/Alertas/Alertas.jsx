// Tela de alertas: leituras fora da faixa normal, agrupadas em ocorrências.
// Porte de legado/alertas.html + legado/js/alertas.js (página de referência).

import { useState } from "react";
import { Carregando, ErroAzure, SemVeiculo } from "../../components/Estado.jsx";
import FiltroPeriodo from "../../components/FiltroPeriodo.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import SeletorVeiculo from "../../components/SeletorVeiculo.jsx";
import StatusSelo from "../../components/StatusSelo.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useVeiculoEscolhido } from "../../hooks/useVeiculoEscolhido.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { descreverCritico, descreverNormal } from "../../lib/faixas.js";
import {
  STATUS_INFO,
  formatarDataHora,
  formatarDuracao,
  formatarHora,
  formatarTemp
} from "../../lib/formatar.js";
import { agruparOcorrencias, buscarLeituras } from "../../lib/leituras.js";


export default function Alertas() {

  const [horas, setHoras] = useState(24);
  const [conexao, setConexao] = useState(null);
  const [escolha, setEscolha] = useState(null);

  // { tipo: "carregando" | "erro" | "sem-veiculo" | "ok", ... }
  const [tela, setTela] = useState({ tipo: "carregando" });

  const { escolher, chave, trocarVeiculo } = useVeiculoEscolhido();

  usePolling(async sinal => {

    try {

      const nova = await escolher();
      if (sinal.aborted) return;
      setEscolha(nova);

      if (!nova.veiculo) {
        setConexao(true);
        setTela({ tipo: "sem-veiculo" });
        return;
      }

      const leituras = await buscarLeituras({
        deviceId: nova.veiculo.deviceId,
        horas,
        status: ["ATENCAO", "CRITICO"],
        limite: 500
      });
      if (sinal.aborted) return;

      setConexao(true);
      setTela({ tipo: "ok", leituras, veiculo: nova.veiculo, faixa: nova.faixa, horas });

    }

    catch (erro) {

      if (sinal.aborted) return;
      console.error("Erro ao carregar alertas:", erro);
      setConexao(false);
      setTela({ tipo: "erro" });

    }

  }, UPDATE_INTERVAL, [chave, horas]);

  return (
    <PainelLayout
      titulo="Alertas"
      subtitulo="Leituras fora da faixa normal da carga"
      conexao={conexao}
      extraTopo={escolha && (
        <SeletorVeiculo veiculos={escolha.veiculos} veiculo={escolha.veiculo} aoTrocar={trocarVeiculo} />
      )}
    >
      <div id="conteudo" className="page-grid">
        {tela.tipo === "carregando" && <Carregando />}
        {tela.tipo === "erro" && <ErroAzure />}
        {tela.tipo === "sem-veiculo" && <SemVeiculo />}
        {tela.tipo === "ok" && <ConteudoAlertas {...tela} horasFiltro={horas} aoMudarHoras={setHoras} />}
      </div>
    </PainelLayout>
  );

}


// horas: período dos dados mostrados; horasFiltro: botão marcado (muda no clique,
// antes de os dados novos chegarem, como no original).
function ConteudoAlertas({ leituras, veiculo, faixa, horas, horasFiltro, aoMudarHoras }) {

  const ocorrencias = agruparOcorrencias(leituras);
  const criticas = ocorrencias.filter(o => o.status === "CRITICO").length;
  const periodo = horas === 24 ? "nas últimas 24 h" : "nos últimos 7 dias";

  // Pico = a leitura mais distante da faixa normal (calor ou frio demais).
  const distancia = l => faixa.min != null && l.temperatura < faixa.min
    ? faixa.min - l.temperatura
    : l.temperatura - faixa.max;

  const leituraPico = leituras.reduce(
    (maior, l) => (!maior || distancia(l) > distancia(maior) ? l : maior), null);

  const pico = leituraPico ? leituraPico.temperatura : null;

  const ultima = ocorrencias[0];

  return (
    <>
      <div className="acoes"><FiltroPeriodo horas={horasFiltro} aoMudar={aoMudarHoras} /></div>

      <section className="resumo">
        <article className="card">
          <span>Ocorrências</span>
          <strong>{ocorrencias.length}</strong>
          <small>{periodo}</small>
        </article>

        <article className="card">
          <span>Críticas</span>
          <strong className={criticas ? "critico" : ""}>{criticas}</strong>
          <small>{descreverCritico(faixa)}</small>
        </article>

        <article className="card">
          <span>Pico registrado</span>
          <strong className={leituraPico ? STATUS_INFO[leituraPico.status].classe : ""}>{formatarTemp(pico)}</strong>
          <small>maior temperatura fora da faixa</small>
        </article>

        <article className="card">
          <span>Última ocorrência</span>
          <strong>{ultima ? formatarDataHora(ultima.inicio).slice(0, 5) : "--"}</strong>
          <small>{ultima ? "às " + formatarHora(ultima.inicio) : "nenhuma " + periodo}</small>
        </article>
      </section>

      <article className="panel">
        <h2>Ocorrências de temperatura · {veiculo.id}</h2>
        <p>Leituras seguidas fora da faixa normal viram uma ocorrência. Faixa normal da carga: {descreverNormal(faixa)}.</p>
        {ocorrencias.length ? <TabelaOcorrencias ocorrencias={ocorrencias} /> : (
          <div className="estado">
            <strong>Nenhum alerta {periodo}.</strong>
            A carga ficou dentro da faixa normal ({descreverNormal(faixa)}).
          </div>
        )}
      </article>
    </>
  );

}


function TabelaOcorrencias({ ocorrencias }) {

  return (
    <div className="tabela-wrap">
      <table className="tabela">
        <thead>
          <tr>
            <th>Nível</th>
            <th>Início</th>
            <th className="num">Duração</th>
            <th className="num">Pico</th>
            <th className="num">Leituras</th>
          </tr>
        </thead>
        <tbody>
          {ocorrencias.map(o => (
            <tr key={o.inicio.getTime()}>
              <td><StatusSelo status={o.status} /></td>
              <td>{formatarDataHora(o.inicio)}</td>
              <td className="num">{formatarDuracao(o.duracao)}</td>
              <td className="num">{formatarTemp(o.pico)}</td>
              <td className="num">{o.leituras.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

}
