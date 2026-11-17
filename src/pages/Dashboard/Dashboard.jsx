// Visão geral: última telemetria do veículo, histórico dos últimos 30 min
// e o calor previsto na rota. Porte do site antigo: dashboard.html + js/app.js + js/risco.js.

import { useRef, useState } from "react";
import Estado, { SemVeiculo } from "../../components/Estado.jsx";
import GraficoTemperatura from "../../components/GraficoTemperatura.jsx";
import Icone from "../../components/Icone.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import SeletorVeiculo from "../../components/SeletorVeiculo.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useVeiculoEscolhido } from "../../hooks/useVeiculoEscolhido.js";
import { HISTORY_SIZE, UPDATE_INTERVAL } from "../../lib/config.js";
import { descreverNormal } from "../../lib/faixas.js";
import { STATUS_INFO, formatarTemp } from "../../lib/formatar.js";
import { buscarLeituras, resumir } from "../../lib/leituras.js";
import AvisoFalhaSensor from "./AvisoFalhaSensor.jsx";
import ReguaFaixa from "./ReguaFaixa.jsx";
import RiscoRota from "./RiscoRota.jsx";
import RiscoSaida from "./RiscoSaida.jsx";
import {
  TEXTOS_STATUS,
  contatoDaLeitura,
  leiturasDoHistorico,
  ordenarLeituras,
  resumoUltima
} from "./telemetria.js";


// Ícone da pílula de status (o texto vem junto: a cor nunca é a única pista).
const ICONE_STATUS = { normal: "ok", atencao: "alerta", critico: "critico", aguardando: "aguardando" };


export default function Dashboard() {

  const [conexao, setConexao] = useState(null);
  const [escolha, setEscolha] = useState(null);

  // Valores da leitura mais recente (null = "Aguardando dados").
  const [ultima, setUltima] = useState(null);

  // Horário da leitura mais recente, para avisar quando o valor deixa de ser atual.
  const [ultimaEm, setUltimaEm] = useState(null);

  // Conteúdo de #historico:
  // { tipo: "carregando" | "sem-veiculo" | "sem-leituras" | "erro" | "grafico", ... }
  const [historico, setHistorico] = useState({ tipo: "carregando" });

  // Como no original, a classe com-grafico fica depois do primeiro gráfico.
  const [comGrafico, setComGrafico] = useState(false);

  const { escolher, chave, trocarVeiculo } = useVeiculoEscolhido();

  // O veículo é escolhido uma vez por rota (o original carregava uma vez por página).
  const escolhaDaChave = useRef(null);

  usePolling(async sinal => {

    try {

      let atual = escolhaDaChave.current?.chave === chave ? escolhaDaChave.current.escolha : null;

      if (!atual) {

        atual = await escolher();
        if (sinal.aborted) return;

        escolhaDaChave.current = { chave, escolha: atual };
        setEscolha(atual);
        setUltima(null);
        setUltimaEm(null);
        setHistorico({ tipo: "carregando" });
        setComGrafico(false);

      }

      if (!atual.veiculo) {
        setConexao(true);
        setHistorico({ tipo: "sem-veiculo" });
        return;
      }

      const leituras = await buscarLeituras({
        deviceId: atual.veiculo.deviceId,
        limite: HISTORY_SIZE
      });
      if (sinal.aborted) return;

      // Sensor que ainda não enviou nada não é falha de conexão.
      if (leituras.length === 0) {
        setConexao(true);
        setHistorico({ tipo: "sem-leituras", deviceId: atual.veiculo.deviceId });
        return;
      }

      const ordenadas = ordenarLeituras(leituras);

      setUltima(resumoUltima(ordenadas[ordenadas.length - 1], atual.faixa));
      setUltimaEm(ordenadas[ordenadas.length - 1].criadoEm);

      const doGrafico = leiturasDoHistorico(ordenadas, atual.faixa);

      // Sem temperatura válida na janela: o histórico fica como estava.
      if (doGrafico.length > 0) {
        setHistorico({ tipo: "grafico", leituras: doGrafico, resumo: resumir(doGrafico), faixa: atual.faixa });
        setComGrafico(true);
      }

      setConexao(true);

    }

    catch (erro) {

      if (sinal.aborted) return;
      console.error("Erro ao consultar o Azure:", erro);
      setHistorico({ tipo: "erro" });
      setConexao(false);

    }

  }, UPDATE_INTERVAL, [chave]);

  const veiculo = escolha?.veiculo;
  const info = ultima ? STATUS_INFO[ultima.situacao] || STATUS_INFO.NORMAL : null;
  const contato = contatoDaLeitura(ultimaEm, Date.now(), conexao === false);
  const online = Boolean(ultimaEm) && !contato.semDados;
  const nomeCarga = veiculo ? (escolha.perfil ? escolha.perfil.nome : veiculo.perfil) : "";

  // "7.3 °C" -> número grande e unidade menor (o texto do elemento continua "7.3 °C").
  const textoTemp = ultima ? ultima.temperatura : "-- °C";
  const corte = textoTemp.lastIndexOf(" ");
  const numero = textoTemp.slice(0, corte);
  const unidade = textoTemp.slice(corte + 1);

  return (
    <PainelLayout
      titulo="Visão Geral"
      subtitulo="Monitoramento da cadeia fria"
      tituloDocumento="ColdTrack Control"
      conexao={conexao}
      extraTopo={escolha && (
        <SeletorVeiculo veiculos={escolha.veiculos} veiculo={escolha.veiculo} aoTrocar={trocarVeiculo} />
      )}
    >

      <AvisoFalhaSensor deviceId={veiculo?.deviceId} />

      {contato.semDados && (
        <div id="semDadosAviso" className="alert" role="status">
          <strong>{contato.desde ? `Sem dados desde ${contato.desde}` : "Sem conexão com a API"}</strong>{" "}
          <p>
            {ultima
              ? "Os valores abaixo são os últimos recebidos, não os atuais."
              : "Não foi possível consultar as leituras agora."}
          </p>
        </div>
      )}

      <section className="visao-topo" aria-label="Situação atual da carga">

        <article className="heroi">

          <header className="heroi-topo">
            <div>
              <p className="heroi-rotulo">
                {veiculo ? `Carga atual: ${nomeCarga}` : "Carga atual"}
              </p>
              <h2>Temperatura da carga</h2>
            </div>
            <div id="statusCarga" className={`status ${info ? info.classe : "aguardando"}`}>
              <Icone nome={ICONE_STATUS[info ? info.classe : "aguardando"]} tamanho={18} />
              {info ? info.texto : "AGUARDANDO"}
            </div>
          </header>

          <div className="heroi-leitura">
            <strong id="temperatura" className="heroi-numero">
              <span>{numero}</span> <span className="heroi-unidade">{unidade}</span>
            </strong>
            <div className="heroi-apoio">
              <small id="tempStatus">
                {ultima ? TEXTOS_STATUS[ultima.situacao] || TEXTOS_STATUS.NORMAL : "Aguardando dados"}
              </small>
              {veiculo && <span>Faixa segura: {descreverNormal(escolha.faixa)}</span>}
            </div>
          </div>

          {veiculo && (
            <ReguaFaixa faixa={escolha.faixa} temperatura={ultima ? parseFloat(ultima.temperatura) : null} />
          )}

          <dl className="heroi-veiculo">
            <div>
              <dt>Veículo</dt>
              <dd id="veiculoCodigo">{veiculo ? veiculo.id : "--"}</dd>
            </div>
            <div>
              <dt>Carga</dt>
              <dd id="veiculoCarga">
                {veiculo ? `${nomeCarga} · normal ${descreverNormal(escolha.faixa)}` : "--"}
              </dd>
            </div>
          </dl>

        </article>

        <div className="visao-tiles">

          <article className="tile">
            <span className="tile-rotulo"><Icone nome="umidade" tamanho={18} /> Umidade relativa</span>
            <strong id="umidade">{ultima ? ultima.umidade : "-- %"}</strong>
            <small>Compartimento de carga</small>
          </article>

          <article className="tile">
            <span className="tile-rotulo"><Icone nome="wifi" tamanho={18} /> Sinal Wi-Fi</span>
            <strong id="rssi">{ultima ? ultima.rssi : "-- dBm"}</strong>
            <small id="rssiStatus">{ultima ? ultima.sinal : "Aguardando dados"}</small>
          </article>

          <article className="tile">
            <span className="tile-rotulo"><Icone nome="sensor" tamanho={18} /> Sensor</span>
            <strong id="veiculoSensor" className="tile-sensor">{veiculo ? veiculo.deviceId : "--"}</strong>
            <small id="contatoSensor" className={`selo-contato selo-contato--${online ? "online" : "offline"}`}>
              {online ? "Online" : "Sem contato"}
              {contato.desde ? ` · último contato ${contato.desde}` : ""}
            </small>
          </article>

        </div>

      </section>

      <section className="content-grid">

        <article className="panel principal">

          <div className="panel-header">
            <div>
              <h2>Temperatura · últimos 30 min</h2>
              <p id="subtituloVeiculo">{veiculo ? `${veiculo.tipo} • ${veiculo.id}` : "ColdTrack Edge"}</p>
            </div>
          </div>

          <div id="historico" className={comGrafico ? "com-grafico" : undefined}>
            <Historico {...historico} />
          </div>

        </article>

        <article className="panel">

          <h2>Última telemetria</h2>

          <div className="telemetry">
            <div>
              <span>Temperatura</span>
              <strong id="tempDetalhe">{ultima ? ultima.temperatura : "--"}</strong>
            </div>
            <div>
              <span>Umidade</span>
              <strong id="umidadeDetalhe">{ultima ? ultima.umidade : "--"}</strong>
            </div>
            <div>
              <span>RSSI</span>
              <strong id="rssiDetalhe">{ultima ? ultima.rssi : "--"}</strong>
            </div>
            <div>
              <span>Atualização</span>
              <strong id="ultimaAtualizacao">{ultima ? ultima.atualizacao : "--"}</strong>
            </div>
          </div>

          <div id="alerta" className={`alert${!ultima || ultima.situacao === "NORMAL" ? " hidden" : ""}`}>
            <strong>Alerta de temperatura</strong>{" "}
            <p>A temperatura da carga está fora da condição normal.</p>
          </div>

        </article>

      </section>

      <RiscoSaida />

      <RiscoRota />

    </PainelLayout>
  );

}


function Historico({ tipo, deviceId, leituras, resumo, faixa }) {

  if (tipo === "carregando") {
    return "Carregando leituras…";
  }

  if (tipo === "erro") {
    return "Não foi possível carregar a telemetria.";
  }

  if (tipo === "sem-veiculo") {
    return <SemVeiculo />;
  }

  if (tipo === "sem-leituras") {
    return (
      <Estado titulo={`O sensor ${deviceId} ainda não enviou leituras.`}>
        Ligue o sensor e confira o Wi-Fi: a primeira leitura aparece em até 20 s.
      </Estado>
    );
  }

  return (
    <>
      <p className="historico-resumo">
        <strong>{resumo.total} leituras nos últimos 30 min</strong>
        {` · mínima ${formatarTemp(resumo.minima)} · máxima ${formatarTemp(resumo.maxima)}`}
      </p>
      <GraficoTemperatura id="graficoTemperatura" leituras={leituras} faixa={faixa} />
    </>
  );

}
