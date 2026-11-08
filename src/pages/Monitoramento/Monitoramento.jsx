// Monitoramento de sensores: leituras do canal público ThingSpeak.
// Porte de legado/monitoramento.html + legado/js/monitoramento.js.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTitulo } from "../../hooks/useTitulo.js";
import "../../styles/monitoramento/monitoramento.css";
import {
  CHANNEL_ID, NORMAL_MAX, consultarCanal, dataLegivel, formatar,
  interpretar, montarGrafico, numero
} from "./thingspeak.js";


const ORIGEM_INICIAL = "Aguardando consulta ao ThingSpeak. Nenhuma leitura foi confirmada.";
const SEM_LEITURA = { texto: "Sem leitura", classe: "" };


export default function Monitoramento() {

  useTitulo("Monitoramento | ColdTrack Control");

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
    <div className="escopo-monitoramento raiz-pagina">

      <div className="layout">
        <aside className="sidebar">
          <h2>❄ ColdTrack</h2>
          <p>CONTROL</p>
          <nav aria-label="Menu principal">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/logistica">Gestão Logística</Link>
            <Link to="/monitoramento" aria-current="page">Monitoramento</Link>
            <Link to="/usuarios">Usuários</Link>
            <Link to="/auditoria">Auditoria</Link>
            <Link to="/">Página inicial</Link>
          </nav>
          <small>Projeto Integrador · 2026</small>
        </aside>

        <main className="main">
          <header className="header">
            <div>
              <span className="eyebrow">TELEMETRIA DO DISPOSITIVO</span>
              <h1>Monitoramento de sensores</h1>
              <p>Leituras do canal ThingSpeak configurado, sem vinculação presumida às cargas.</p>
            </div>
            <button type="button" id="atualizar" className="primary" disabled={consultando} onClick={carregar}>
              Atualizar leituras
            </button>
          </header>

          <div className={origem.erro ? "notice error" : "notice"} id="origemDados">{origem.texto}</div>

          <section className="metrics" aria-label="Leituras atuais">
            <article className="metric"><span>Temperatura</span><strong id="temperatura">{leitura ? leitura.temperatura : "—"}</strong><small>°C</small></article>
            <article className="metric"><span>Umidade relativa</span><strong id="umidade">{leitura ? leitura.umidade : "—"}</strong><small>%</small></article>
            <article className="metric"><span>Sinal Wi-Fi</span><strong id="rssi">{leitura ? leitura.rssi : "—"}</strong><small>dBm</small></article>
            <article className="metric">
              <span>Situação térmica</span>
              <strong id="situacao" className={situacao.classe ? `state ${situacao.classe}` : "state"}>{situacao.texto}</strong>
              <small id="criterio">Limites: normal até 15 °C; atenção até 20 °C</small>
            </article>
          </section>

          <section className="panel">
            <div className="panelhead">
              <div>
                <h2>Histórico recente</h2>
                <p>Últimas 20 amostras do canal público, quando disponíveis.</p>
              </div>
              <div className="meta">
                <span id="conexao" role="status">{conexao}</span>
                <span id="ultimaLeitura">{leitura ? leitura.ultimaLeitura : "Última leitura: —"}</span>
              </div>
            </div>

            <div className="chartbox">
              <svg id="grafico" viewBox="0 0 760 230" role="img" aria-label="Gráfico de temperatura das últimas leituras">
                {leitura && !grafico && <text x="24" y="110">Sem temperaturas disponíveis</text>}
                {!leitura && <text x="24" y="110" fill="#6a8190">Sem dados para exibir</text>}
                {grafico && (
                  <>
                    {grafico.limites.map(lim => (
                      <g key={lim.valor}>
                        <line x1={46} y1={lim.y} x2={722} y2={lim.y}
                          stroke={lim.valor === NORMAL_MAX ? "#0b90a1" : "#bd8836"} strokeDasharray="5 5" />
                        <text x={8} y={lim.y - 5} fill="#647e8d" fontSize={11}>{String(lim.valor)}</text>
                      </g>
                    ))}
                    {grafico.trechos.map(pontos => (
                      <polyline key={pontos} points={pontos} fill="none" stroke="#087f92" strokeWidth={3}
                        strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                    {grafico.circulos.map(c => (
                      <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={3} fill="#087f92" />
                    ))}
                    <text x={46} y={222} fill="#647e8d" fontSize={12}>Temperatura (°C) · ordem cronológica</text>
                  </>
                )}
              </svg>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>Data / hora</th><th>Temperatura</th><th>Umidade</th><th>RSSI</th></tr>
                </thead>
                <tbody id="historico">
                  {leitura
                    ? leitura.feeds.slice().reverse().map(feed => (
                      <tr key={feed.created_at}>
                        <td>{dataLegivel(feed.created_at)}</td>
                        <td>{numero(feed.field1) === null ? "—" : `${formatar(numero(feed.field1))} °C`}</td>
                        <td>{numero(feed.field2) === null ? "—" : `${formatar(numero(feed.field2))} %`}</td>
                        <td>{numero(feed.field3) === null ? "—" : `${formatar(numero(feed.field3), 0)} dBm`}</td>
                      </tr>
                    ))
                    : <tr><td colSpan={4}>{inicial ? "Aguardando dados." : "Sem dados disponíveis."}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <p className="footnote">
            O canal ThingSpeak pode ser público, mas o acesso depende da conexão e das permissões configuradas. A ausência de leituras não é interpretada como temperatura normal. Esta tela não autentica usuários nem substitui alertas operacionais do Back-End.
          </p>
        </main>
      </div>

    </div>
  );

}
