// Tela de relatórios: resumo da temperatura por período, gráfico,
// tabela de leituras e exportação em CSV.
// Porte do site antigo: relatorios.html + js/relatorios.js.

import { useState } from "react";
import Estado, { Carregando, ErroAzure, SemVeiculo } from "../../components/Estado.jsx";
import FiltroPeriodo from "../../components/FiltroPeriodo.jsx";
import GraficoTemperatura from "../../components/GraficoTemperatura.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import SeletorVeiculo from "../../components/SeletorVeiculo.jsx";
import StatusSelo from "../../components/StatusSelo.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useVeiculoEscolhido } from "../../hooks/useVeiculoEscolhido.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { descreverCritico, descreverNormal } from "../../lib/faixas.js";
import { formatarDataHora, formatarTemp, formatarUmidade } from "../../lib/formatar.js";
import { buscarLeituras, horarioDe, resumir } from "../../lib/leituras.js";
import { baixarCsv } from "./csv.js";

const LIMITE_RELATORIO = 500;


export default function Relatorios() {

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
        limite: LIMITE_RELATORIO
      });
      if (sinal.aborted) return;

      setConexao(true);
      setTela({ tipo: "ok", leituras, veiculo: nova.veiculo, faixa: nova.faixa, horas });

    }

    catch (erro) {

      if (sinal.aborted) return;
      console.error("Erro ao carregar relatório:", erro);
      setConexao(false);
      setTela({ tipo: "erro" });

    }

  }, UPDATE_INTERVAL, [chave, horas]);

  return (
    <PainelLayout
      titulo="Relatórios"
      subtitulo="Resumo da temperatura por período"
      conexao={conexao}
      extraTopo={escolha && (
        <SeletorVeiculo veiculos={escolha.veiculos} veiculo={escolha.veiculo} aoTrocar={trocarVeiculo} />
      )}
    >
      <div id="conteudo" className="page-grid">
        {tela.tipo === "carregando" && <Carregando />}
        {tela.tipo === "erro" && <ErroAzure />}
        {tela.tipo === "sem-veiculo" && <SemVeiculo />}
        {tela.tipo === "ok" && <ConteudoRelatorio {...tela} horasFiltro={horas} aoMudarHoras={setHoras} />}
      </div>
    </PainelLayout>
  );

}


// horas: período dos dados mostrados; horasFiltro: botão marcado (muda no
// clique, antes de os dados novos chegarem, como no original).
function ConteudoRelatorio({ leituras, veiculo, faixa, horas, horasFiltro, aoMudarHoras }) {

  const periodo = horas === 24 ? "últimas 24 h" : "últimos 7 dias";
  const r = resumir(leituras);

  if (!r) {
    return (
      <>
        <div className="acoes"><FiltroPeriodo horas={horasFiltro} aoMudar={aoMudarHoras} /></div>
        <Estado painel titulo={`Nenhuma leitura nas ${periodo}.`}>
          Confira se o sensor está ligado e conectado.
        </Estado>
      </>
    );
  }

  const fora = r.atencao + r.critico;
  const percentual = (fora / r.total) * 100;

  return (
    <>
      <div className="acoes">
        <FiltroPeriodo horas={horasFiltro} aoMudar={aoMudarHoras} />
        <button type="button" className="botao" id="baixarCsv" onClick={() => baixarCsv(leituras, veiculo.id, horas)}>
          Baixar CSV
        </button>
      </div>

      <section className="resumo">
        <article className="card">
          <span>Leituras</span>
          <strong>{r.total}</strong>
          <small>{periodo}</small>
        </article>

        <article className="card">
          <span>Temperatura média</span>
          <strong>{formatarTemp(r.media)}</strong>
          <small>mín. {formatarTemp(r.minima)} · máx. {formatarTemp(r.maxima)}</small>
        </article>

        <article className="card">
          <span>Fora da faixa normal</span>
          <strong className={r.critico ? "critico" : fora ? "atencao" : ""}>{percentual.toFixed(0)} %</strong>
          <small>{fora} de {r.total} leituras</small>
        </article>

        <article className="card">
          <span>Críticas</span>
          <strong className={r.critico ? "critico" : ""}>{r.critico}</strong>
          <small>{descreverCritico(faixa)}</small>
        </article>
      </section>

      <article className="panel">
        <h2>Temperatura no período · {veiculo.id}</h2>
        <p>A faixa azul é a faixa normal da carga ({descreverNormal(faixa)}).</p>
        <GraficoTemperatura id="graficoRelatorio" leituras={leituras} faixa={faixa} />
      </article>

      <article className="panel">
        <h2>Leituras</h2>
        <p>{r.total === LIMITE_RELATORIO
          ? `Mostrando as ${LIMITE_RELATORIO} leituras mais recentes do período.`
          : "Da mais recente para a mais antiga."}</p>
        <TabelaLeituras leituras={leituras} />
      </article>
    </>
  );

}


function TabelaLeituras({ leituras }) {

  return (
    <div className="tabela-wrap">
      <table className="tabela">
        <thead>
          <tr>
            <th>Medido em</th>
            <th className="num">Temperatura</th>
            <th className="num">Umidade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leituras.map((l, i) => (
            <tr key={`${l.id ?? horarioDe(l).getTime()}-${i}`}>
              <td>{formatarDataHora(horarioDe(l))}</td>
              <td className="num">{formatarTemp(l.temperatura)}</td>
              <td className="num">{formatarUmidade(l.umidade)}</td>
              <td><StatusSelo status={l.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

}
