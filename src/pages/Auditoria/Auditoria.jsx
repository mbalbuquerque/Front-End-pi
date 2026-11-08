// Auditoria e logs (demonstrativa, registros fictícios).
// Porte do site antigo: auditoria.html + js/auditoria.js.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTitulo } from "../../hooks/useTitulo.js";
import "../../styles/auditoria/auditoria.css";
import { LABELS_TIPO, LOGS, baixarCsv, dataFormatada, filtrarLogs } from "./auditoria.js";


const FILTROS_VAZIOS = { termo: "", tipo: "", resultado: "", dataInicial: "", dataFinal: "" };


export default function Auditoria() {

  useTitulo("Auditoria e Logs | ColdTrack Control");

  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [detalhe, setDetalhe] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (detalhe && !dialog.open) dialog.showModal();
  }, [detalhe]);

  const { logs: filtrados, erro } = filtrarLogs(LOGS, filtros);

  function mudar(campo) {
    return evento => setFiltros(atual => ({ ...atual, [campo]: evento.target.value }));
  }

  const linhasDetalhe = detalhe && [
    ["Identificador", detalhe.id],
    ["Data e hora", dataFormatada(detalhe.data)],
    ["Responsável", detalhe.usuario],
    ["Tipo", LABELS_TIPO[detalhe.tipo]],
    ["Evento", detalhe.acao],
    ["Recurso", detalhe.recurso],
    ["Resultado", detalhe.resultado === "sucesso" ? "Sucesso" : "Negado"],
    ["Valor anterior", detalhe.antes],
    ["Valor novo", detalhe.depois],
    ["Observação", detalhe.observacao]
  ];

  return (
    <div className="escopo-auditoria raiz-pagina">

      <div className="app-layout">
        <aside className="sidebar">
          <Link className="brand" to="/" aria-label="ColdTrack - início">
            <span className="brand-symbol" aria-hidden="true">❄</span>
            <span>ColdTrack<strong>.</strong></span>
          </Link>
          <p className="sidebar-label">ADMINISTRAÇÃO</p>
          <nav aria-label="Menu administrativo">
            <Link to="/">⌂ Início</Link>
            <Link to="/dashboard">◫ Dashboard</Link>
            <Link to="/logistica">▣ Gestão Logística</Link>
            <Link to="/usuarios">♙ Usuários</Link>
            <Link to="/cadastro-usuario">＋ Novo usuário</Link>
            <Link to="/auditoria" className="active" aria-current="page">▤ Auditoria</Link>
            <Link to="/monitoramento">◉ Monitoramento</Link>
          </nav>
          <div className="sidebar-footer">
            <span>ColdTrack Control</span>
            <small>Interface demonstrativa</small>
          </div>
        </aside>

        <main className="main-content">
          <header className="page-header">
            <div>
              <p className="eyebrow">CYBER SECURITY · RASTREABILIDADE</p>
              <h1>Auditoria e Logs</h1>
              <p>Consulte eventos de acesso, cadastros e alterações realizadas na plataforma.</p>
            </div>
            <button id="exportarCsv" className="btn-primary" type="button" onClick={() => baixarCsv(filtrados)}>↓ Exportar CSV</button>
          </header>

          <div className="demo-notice" role="note">
            <strong>Ambiente demonstrativo.</strong> Os registros abaixo são fictícios e não representam eventos reais.
            A consulta administrativa e a integridade dos logs dependerão da API e das permissões do servidor.
          </div>

          <section className="stats" aria-label="Indicadores de auditoria">
            <article className="stat-card"><span>Total de eventos</span><strong id="totalEventos">{LOGS.length}</strong></article>
            <article className="stat-card"><span>Alterações</span><strong id="totalAlteracoes">{LOGS.filter(l => l.tipo === "alteracao").length}</strong></article>
            <article className="stat-card"><span>Alertas</span><strong id="totalAlertas">{LOGS.filter(l => l.tipo === "alerta").length}</strong></article>
          </section>

          <section className="table-card" aria-labelledby="historicoTitulo">
            <div className="table-heading">
              <div>
                <h2 id="historicoTitulo">Histórico de eventos</h2>
                <p>Pesquise e filtre os registros demonstrativos.</p>
              </div>
              <span className="demo-label">SOMENTE LEITURA</span>
            </div>

            <div className="filters">
              <label className="search-field">Pesquisar
                <input id="pesquisa" type="search" placeholder="Usuário, evento ou recurso" autoComplete="off"
                  value={filtros.termo} onChange={mudar("termo")} />
              </label>
              <label>Tipo de evento
                <select id="filtroTipo" value={filtros.tipo} onChange={mudar("tipo")}>
                  <option value="">Todos</option>
                  <option value="acesso">Acesso</option>
                  <option value="cadastro">Cadastro</option>
                  <option value="alteracao">Alteração</option>
                  <option value="alerta">Alerta</option>
                </select>
              </label>
              <label>Resultado
                <select id="filtroResultado" value={filtros.resultado} onChange={mudar("resultado")}>
                  <option value="">Todos</option>
                  <option value="sucesso">Sucesso</option>
                  <option value="negado">Negado</option>
                </select>
              </label>
              <label>Data inicial
                <input id="dataInicial" type="date" value={filtros.dataInicial} onChange={mudar("dataInicial")} />
              </label>
              <label>Data final
                <input id="dataFinal" type="date" value={filtros.dataFinal} onChange={mudar("dataFinal")} />
              </label>
              <button id="limparFiltros" type="button" className="btn-secondary" onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar filtros</button>
            </div>

            <p id="filtroMensagem" className="feedback" role="status" aria-live="polite">{erro}</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Data e hora</th><th>Responsável</th><th>Evento</th>
                    <th>Recurso</th><th>Resultado</th><th>Detalhes</th>
                  </tr>
                </thead>
                <tbody id="logsTabela">
                  {filtrados.map(log => (
                    <tr key={log.id}>
                      <td>{dataFormatada(log.data)}</td>
                      <td>{log.usuario}</td>
                      <td className="event-name">
                        {log.acao}
                        <span className="event-id">{`${log.id} · ${LABELS_TIPO[log.tipo]}`}</span>
                      </td>
                      <td>{log.recurso}</td>
                      <td>
                        <span className={`status ${log.resultado}`}>
                          {log.resultado === "sucesso" ? "Sucesso" : "Negado"}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="action-button" aria-label={`Visualizar evento ${log.id}`}
                          onClick={() => setDetalhe(log)}>Visualizar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p id="semResultados" className="empty-state" hidden={filtrados.length > 0}>Nenhum evento encontrado para os filtros informados.</p>
            <p id="contadorResultados" className="results-count">{`${filtrados.length} de ${LOGS.length} eventos demonstrativos exibidos`}</p>
          </section>
        </main>
      </div>

      <dialog id="detalhesDialog" ref={dialogRef} aria-labelledby="dialogTitulo" onClose={() => setDetalhe(null)}>
        <div className="dialog-content">
          <div className="dialog-heading">
            <h2 id="dialogTitulo">Detalhes do evento</h2>
            <button id="fecharDialogIcone" className="icon-button" type="button" aria-label="Fechar detalhes"
              onClick={() => dialogRef.current.close()}>×</button>
          </div>
          <div id="detalhesConteudo">
            {linhasDetalhe && linhasDetalhe.map(([rotulo, valor]) => (
              <div className="detail-row" key={rotulo}>
                <strong>{rotulo}</strong>
                <span>{valor ?? "Não se aplica"}</span>
              </div>
            ))}
          </div>
          <button id="fecharDialog" type="button" className="btn-primary close-button"
            onClick={() => dialogRef.current.close()}>Fechar</button>
        </div>
      </dialog>

    </div>
  );

}
