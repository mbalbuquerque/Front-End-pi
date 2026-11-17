// Tela de alertas: leituras fora da faixa normal, agrupadas em ocorrências e
// mostradas como linha do tempo por dia (design system, seção 7).
// Porte do site antigo: alertas.html + js/alertas.js (página de referência).

import { useState } from "react";
import { Carregando, ErroAzure, SemVeiculo } from "../../components/Estado.jsx";
import FiltroPeriodo from "../../components/FiltroPeriodo.jsx";
import Icone from "../../components/Icone.jsx";
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
import { agruparPorDia, linhaDaOcorrencia } from "./linhaDoTempo.js";


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
      <div id="conteudo" className="page-grid tela-alertas">
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
  const classePico = leituraPico ? STATUS_INFO[leituraPico.status].classe : "";

  const ultima = ocorrencias[0];

  return (
    <>
      <div className="acoes"><FiltroPeriodo horas={horasFiltro} aoMudar={aoMudarHoras} /></div>

      <section className="resumo" aria-label="Resumo do período">
        <article className="card">
          <span>Ocorrências</span>
          <strong>{ocorrencias.length}</strong>
          <small>{periodo}</small>
        </article>

        <article className={criticas ? "card destaque critico" : "card"}>
          <span>Críticas</span>
          <strong className={criticas ? "critico" : ""}>{criticas}</strong>
          <small>{descreverCritico(faixa)}</small>
        </article>

        <article className={classePico ? `card destaque ${classePico}` : "card"}>
          <span>Pico registrado</span>
          <strong className={classePico}>{formatarTemp(pico)}</strong>
          <small>maior temperatura fora da faixa</small>
        </article>

        <article className="card">
          <span>Última ocorrência</span>
          <strong>{ultima ? formatarDataHora(ultima.inicio).slice(0, 5) : "--"}</strong>
          <small>{ultima ? "às " + formatarHora(ultima.inicio) : "nenhuma " + periodo}</small>
        </article>
      </section>

      <article className="panel ocorrencias">
        <h2>Ocorrências de temperatura · {veiculo.id}</h2>
        {ocorrencias.length ? <LinhaDoTempo ocorrencias={ocorrencias} faixa={faixa} /> : (
          <div className="estado estado-vazio">
            <span className="estado-icone"><Icone nome="ok" tamanho={24} /></span>
            <strong>Nenhum alerta {periodo}.</strong>
            A carga ficou dentro da faixa normal ({descreverNormal(faixa)}).
          </div>
        )}
      </article>

      <p className="nota-rodape">
        Leituras seguidas fora da faixa normal viram uma ocorrência. Faixa normal da carga: {descreverNormal(faixa)}.
      </p>
    </>
  );

}


function LinhaDoTempo({ ocorrencias, faixa }) {

  return (
    <div className="linha-tempo">
      {agruparPorDia(ocorrencias).map(dia => (
        <section className="linha-tempo-dia" key={dia.chave} aria-label={`Ocorrências de ${dia.rotulo}`}>
          <h3>{dia.rotulo}</h3>
          <ol>
            {dia.ocorrencias.map(o => <Ocorrencia key={o.inicio.getTime()} ocorrencia={o} faixa={faixa} />)}
          </ol>
        </section>
      ))}
    </div>
  );

}


function Ocorrencia({ ocorrencia: o, faixa }) {

  const classe = STATUS_INFO[o.status].classe;
  const n = o.leituras.length;

  return (
    <li className={`ocorrencia ${classe}`}>
      <span className="ocorrencia-ponto" aria-hidden="true" />
      <div className="ocorrencia-cartao">
        <header>
          <StatusSelo status={o.status} />
          <time dateTime={o.inicio.toISOString()}>{formatarHora(o.inicio)}</time>
        </header>
        <ul className="ocorrencia-dados">
          <li><Icone nome="relogio" tamanho={18} />duração {formatarDuracao(o.duracao)}</li>
          <li className={`pico ${classe}`}><Icone nome="termometro" tamanho={18} />pico {formatarTemp(o.pico)}</li>
          <li><Icone nome="leituras" tamanho={18} />{n} {n === 1 ? "leitura" : "leituras"}</li>
        </ul>
        {n > 1 && <MiniGrafico ocorrencia={o} faixa={faixa} classe={classe} />}
      </div>
    </li>
  );

}


// Só as leituras fora da faixa que formam a ocorrência (é o que a tela busca),
// contra a linha tracejada do limite que elas passaram.
function MiniGrafico({ ocorrencia, faixa, classe }) {

  const g = linhaDaOcorrencia(ocorrencia, faixa);

  return (
    <figure className="mini-grafico">
      <figcaption>
        <span>{g.rotuloLimite}</span>
        <span className={classe}>pico {formatarTemp(ocorrencia.pico)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${g.largura} ${g.altura}`} role="img" aria-label={g.descricao} preserveAspectRatio="none">
        <line className="mini-limite" x1="0" x2={g.largura} y1={g.yLimite} y2={g.yLimite} vectorEffect="non-scaling-stroke" />
        <polyline className={`mini-linha ${classe}`} points={g.pontos} vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );

}
