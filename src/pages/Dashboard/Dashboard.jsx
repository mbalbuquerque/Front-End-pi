// Visão geral: última telemetria do veículo, histórico dos últimos 30 min
// e o calor previsto na rota. Porte do site antigo: dashboard.html + js/app.js + js/risco.js.

import { useRef, useState } from "react";
import Estado, { SemVeiculo } from "../../components/Estado.jsx";
import GraficoTemperatura from "../../components/GraficoTemperatura.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import SeletorVeiculo from "../../components/SeletorVeiculo.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useVeiculoEscolhido } from "../../hooks/useVeiculoEscolhido.js";
import { HISTORY_SIZE, UPDATE_INTERVAL } from "../../lib/config.js";
import { descreverNormal } from "../../lib/faixas.js";
import { STATUS_INFO, formatarTemp } from "../../lib/formatar.js";
import { buscarLeituras, resumir } from "../../lib/leituras.js";
import RiscoRota from "./RiscoRota.jsx";
import { TEXTOS_STATUS, leiturasDoHistorico, ordenarLeituras, resumoUltima } from "./telemetria.js";


export default function Dashboard() {

  const [conexao, setConexao] = useState(null);
  const [escolha, setEscolha] = useState(null);

  // Valores da leitura mais recente (null = "Aguardando dados").
  const [ultima, setUltima] = useState(null);

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

      <section className="cards">

        <article className="card">
          <span>Temperatura atual</span>
          <strong id="temperatura">{ultima ? ultima.temperatura : "-- °C"}</strong>
          <small id="tempStatus">
            {ultima ? TEXTOS_STATUS[ultima.situacao] || TEXTOS_STATUS.NORMAL : "Aguardando dados"}
          </small>
        </article>

        <article className="card">
          <span>Umidade relativa</span>
          <strong id="umidade">{ultima ? ultima.umidade : "-- %"}</strong>
          <small>Compartimento de carga</small>
        </article>

        <article className="card">
          <span>Sinal Wi-Fi</span>
          <strong id="rssi">{ultima ? ultima.rssi : "-- dBm"}</strong>
          <small id="rssiStatus">{ultima ? ultima.sinal : "Aguardando dados"}</small>
        </article>

        <article className="card status-card">
          <span>Status da carga</span>
          <div id="statusCarga" className={`status ${info ? info.classe : "aguardando"}`}>
            {info ? info.texto : "AGUARDANDO"}
          </div>
          <small>Processamento Edge</small>
        </article>

      </section>

      <section className="content-grid">

        <article className="panel principal">

          <div className="panel-header">
            <div>
              <h2>Monitoramento em tempo real</h2>
              <p id="subtituloVeiculo">{veiculo ? `${veiculo.tipo} • ${veiculo.id}` : "ColdTrack Edge"}</p>
            </div>
            <span className="badge">Transporte Refrigerado</span>
          </div>

          <div className="vehicle">
            <div className="truck">🚚</div>
            <div>
              <span>VEÍCULO</span>
              <strong id="veiculoCodigo">{veiculo ? veiculo.id : "--"}</strong>
            </div>
            <div>
              <span>CARGA</span>
              <strong id="veiculoCarga">
                {veiculo
                  ? `${escolha.perfil ? escolha.perfil.nome : veiculo.perfil} · normal ${descreverNormal(escolha.faixa)}`
                  : "--"}
              </strong>
            </div>
            <div>
              <span>SENSOR</span>
              <strong id="veiculoSensor">{veiculo ? veiculo.deviceId : "--"}</strong>
            </div>
          </div>

          <div className="chart-placeholder">
            <div className="chart-title">Histórico de temperatura</div>
            <div id="historico" className={comGrafico ? "com-grafico" : undefined}>
              <Historico {...historico} />
            </div>
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
            <strong>⚠ Alerta de temperatura</strong>{" "}
            <p>A temperatura da carga está fora da condição normal.</p>
          </div>

        </article>

      </section>

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
