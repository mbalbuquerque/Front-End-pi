// Monitoramento de sensores: leituras do canal público ThingSpeak.
// Porte do site antigo: monitoramento.html + js/monitoramento.js.

import { useCallback, useEffect, useRef, useState } from "react";
import Icone from "../../components/Icone.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import "../../styles/gestao/gestao.css";
import {
  CHANNEL_ID, NORMAL_MAX, WARNING_MAX, consultarCanal, dataLegivel, formatar,
  interpretar, montarGrafico, numero
} from "./thingspeak.js";


const ORIGEM_INICIAL = "Aguardando consulta ao ThingSpeak. Nenhuma leitura foi confirmada.";
const SEM_LEITURA = { texto: "Sem leitura", classe: "" };


export default function Monitoramento() {

  const [consultando, setConsultando] = useState(false);
  const [conexao, setConexao] = useState("Não verificado");
  const [origem, setOrigem] = useState({ texto: ORIGEM_INICIAL, erro: false });
  const [leitura, setLeitura] = useState(null);
  const [inicial, setInicial] = useState(true);

  const controle = useRef(null);

  const carregar = useCallback(async () => {

    controle.current?.abort();
    const abortar = new AbortController();
    controle.current = abortar;

    setConsultando(true);
    setConexao("Consultando canal…");

    try {
      const dados = await consultarCanal(abortar.signal);
      const modelo = interpretar(dados);
      if (abortar.signal.aborted) return;

      setLeitura(modelo);
      setInicial(false);
      setConexao(modelo.antiga ? "Sem comunicação recente" : "Leitura recente recebida");
      setOrigem({
        texto: `Dados reais consultados no ThingSpeak · canal ${CHANNEL_ID}. `
          + "Não há associação validada a uma carga. "
          + (modelo.antiga ? "A última leitura está fora da janela de atualização configurada." : ""),
        erro: false
      });
    } catch (erro) {
      if (abortar.signal.aborted) return;
      setLeitura(null);
      setInicial(false);
      setConexao("Indisponível");
      setOrigem({
        texto: "Não foi possível obter leituras do ThingSpeak "
          + `(${erro.message}). `
          + "Nenhum valor anterior foi mantido como atual.",
        erro: true
      });
    } finally {
      if (!abortar.signal.aborted) setConsultando(false);
    }

  }, []);

  // Consulta ao abrir a tela; ao sair cancela a requisição em andamento.
  useEffect(() => {
    carregar();
    return () => controle.current?.abort();
  }, [carregar]);

  const situacao = leitura?.situacao ?? SEM_LEITURA;
  const grafico = leitura ? montarGrafico(leitura.feeds) : null;

  return (
    <PainelLayout
      titulo="Monitoramento de sensores"
      subtitulo={`Canal público ThingSpeak ${CHANNEL_ID}, sem vínculo presumido com as cargas`}
      tituloDocumento="Monitoramento · ColdTrack Control"
      familia="gestao"
      extraTopo={
        <button type="button" id="atualizar" className="botao-g primario" disabled={consultando} onClick={carregar}>
          <Icone nome="atualizar" tamanho={20} />
          Atualizar leituras
        </button>
      }
    >

      <div className="gestao">

        <div className={origem.erro ? "aviso-demo error erro" : "aviso-demo"} id="origemDados">
          <Icone nome={origem.erro ? "alerta" : "sensor"} />
          <span>{origem.texto}</span>
        </div>

        <section className="leituras" aria-label="Leituras atuais">
          <article className={`leitura heroi ${leitura ? situacao.classe : ""}`}>
            <div className="leitura-topo"><span className="kpi-rotulo">Temperatura</span><Icone nome="termometro" /></div>
            <div className="leitura-valor"><strong id="temperatura">{leitura ? leitura.temperatura : "—"}</strong><small>°C</small></div>
          </article>
          <article className="leitura">
            <div className="leitura-topo"><span className="kpi-rotulo">Umidade relativa</span><Icone nome="leituras" /></div>
            <div className="leitura-valor"><strong id="umidade">{leitura ? leitura.umidade : "—"}</strong><small>%</small></div>
          </article>
          <article className="leitura">
            <div className="leitura-topo"><span className="kpi-rotulo">Sinal Wi-Fi</span><Icone nome="wifi" /></div>
            <div className="leitura-valor"><strong id="rssi">{leitura ? leitura.rssi : "—"}</strong><small>dBm</small></div>
          </article>
          <article className="leitura">
            <div className="leitura-topo"><span className="kpi-rotulo">Situação térmica</span><Icone nome="alerta" /></div>
            <strong id="situacao" className={situacao.classe ? `estado-termico state ${situacao.classe}` : "estado-termico state"}>{situacao.texto}</strong>
            <small id="criterio" className="leitura-apoio">Limites: normal até 15 °C; atenção até 20 °C</small>
          </article>
        </section>

        <section className="cartao" aria-labelledby="tituloHistorico">
          <div className="cartao-topo">
            <div>
              <h2 id="tituloHistorico">Histórico recente</h2>
              <p>Últimas 20 amostras do canal público, quando disponíveis.</p>
            </div>
            <div className="monitor-meta">
              <span id="conexao" role="status">{conexao}</span>
              <span id="ultimaLeitura">{leitura ? leitura.ultimaLeitura : "Última leitura: —"}</span>
            </div>
          </div>

          <div className="cartao-topo sem-borda">
            <ul className="legenda" aria-label="Legenda do gráfico">
              <li><i aria-hidden="true" />Temperatura</li>
              <li><i className="normal" aria-hidden="true" />Limite normal ({NORMAL_MAX} °C)</li>
              <li><i className="atencao" aria-hidden="true" />Limite de atenção ({WARNING_MAX} °C)</li>
            </ul>
          </div>

          <div className="grafico-caixa">
            {leitura && !grafico && <p className="grafico-vazio">Sem temperaturas disponíveis</p>}
            {!leitura && <p className="grafico-vazio">Sem dados para exibir</p>}
            <svg id="grafico" viewBox="0 0 760 230" role="img" aria-label="Gráfico de temperatura das últimas leituras">
              {grafico && (
                <>
                  {grafico.limites.map(lim => {
                    const tipo = lim.valor === NORMAL_MAX ? "normal" : "atencao";
                    return (
                      <g key={lim.valor}>
                        <line className={`limite ${tipo}`} x1={46} y1={lim.y} x2={722} y2={lim.y} />
                        <text className={`limite-rotulo ${tipo}`} x={0} y={lim.y + 4}>{`${lim.valor} °C`}</text>
                      </g>
                    );
                  })}
                  {grafico.trechos.map(pontos => (
                    <polyline key={pontos} className="linha" points={pontos} />
                  ))}
                  {grafico.circulos.map(c => (
                    <circle key={`${c.cx}-${c.cy}`} className="ponto" cx={c.cx} cy={c.cy} r={3.5} />
                  ))}
                  <text className="eixo-legenda" x={46} y={224}>Temperatura (°C) · ordem cronológica</text>
                </>
              )}
            </svg>
          </div>

          <div className="tabela-rolagem">
            <table className="tabela-g tabela-historico">
              <thead>
                <tr><th>Data / hora</th><th className="num">Temperatura</th><th className="num">Umidade</th><th className="num">RSSI</th></tr>
              </thead>
              <tbody id="historico">
                {leitura
                  ? leitura.feeds.slice().reverse().map(feed => (
                    <tr key={feed.created_at}>
                      <td>{dataLegivel(feed.created_at)}</td>
                      <td className="num">{numero(feed.field1) === null ? "—" : `${formatar(numero(feed.field1))} °C`}</td>
                      <td className="num">{numero(feed.field2) === null ? "—" : `${formatar(numero(feed.field2))} %`}</td>
                      <td className="num">{numero(feed.field3) === null ? "—" : `${formatar(numero(feed.field3), 0)} dBm`}</td>
                    </tr>
                  ))
                  : <tr><td colSpan={4} className="vazio">{inicial ? "Aguardando dados." : "Sem dados disponíveis."}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <p className="nota-rodape">
          O canal ThingSpeak pode ser público, mas o acesso depende da conexão e das permissões configuradas. A ausência de leituras não é interpretada como temperatura normal. Esta tela não autentica usuários nem substitui alertas operacionais do Back-End.
        </p>
      </div>

    </PainelLayout>
  );

}
