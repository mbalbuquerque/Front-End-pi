// Auditoria e logs (demonstrativa, registros fictícios): linha do tempo de
// eventos agrupada por dia (design system, seção 7).
// Porte do site antigo: auditoria.html + js/auditoria.js.

import { useEffect, useRef, useState } from "react";
import Icone from "../../components/Icone.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import "../../styles/gestao/gestao.css";
import { LABELS_TIPO, LOGS, agruparPorDia, baixarCsv, dataFormatada, filtrarLogs } from "./auditoria.js";


const FILTROS_VAZIOS = { termo: "", tipo: "", resultado: "", dataInicial: "", dataFinal: "" };

const ICONE_TIPO = { acesso: "entrar", cadastro: "usuarios", alteracao: "editar", alerta: "auditoria" };


export default function Auditoria() {

  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [detalhe, setDetalhe] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (detalhe && !dialog.open) dialog.showModal();
  }, [detalhe]);

  const { logs: filtrados, erro } = filtrarLogs(LOGS, filtros);
  const dias = agruparPorDia(filtrados);

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
    <PainelLayout
      titulo="Auditoria e Logs"
      subtitulo="Acessos, cadastros e alterações feitos na plataforma"
      familia="gestao"
    >

      <div className="gestao">

        <div className="aviso-demo" role="note">
          <Icone nome="info" />
          <p>
            <strong>Ambiente demonstrativo.</strong> Os registros abaixo são fictícios e não representam eventos reais.
            A consulta administrativa e a integridade dos logs dependerão da API e das permissões do servidor.
          </p>
        </div>

        <section className="kpis" aria-label="Indicadores de auditoria">
          <article className="kpi">
            <div><span className="kpi-rotulo">Total de eventos</span><strong id="totalEventos">{LOGS.length}</strong></div>
            <span className="kpi-icone"><Icone nome="relogio" /></span>
          </article>
          <article className="kpi">
            <div><span className="kpi-rotulo">Alterações</span><strong id="totalAlteracoes">{LOGS.filter(l => l.tipo === "alteracao").length}</strong></div>
            <span className="kpi-icone"><Icone nome="editar" /></span>
          </article>
          <article className="kpi">
            <div><span className="kpi-rotulo">Alertas</span><strong id="totalAlertas">{LOGS.filter(l => l.tipo === "alerta").length}</strong></div>
            <span className="kpi-icone"><Icone nome="alerta" /></span>
          </article>
        </section>

        <section className="cartao filtros" aria-label="Filtros">
          <label className="filtro-campo busca">Pesquisar
            <input id="pesquisa" type="search" placeholder="Usuário, evento ou recurso" autoComplete="off"
              value={filtros.termo} onChange={mudar("termo")} />
          </label>
          <label className="filtro-campo">Tipo de evento
            <select id="filtroTipo" value={filtros.tipo} onChange={mudar("tipo")}>
              <option value="">Todos</option>
              <option value="acesso">Acesso</option>
              <option value="cadastro">Cadastro</option>
              <option value="alteracao">Alteração</option>
              <option value="alerta">Alerta</option>
            </select>
          </label>
          <label className="filtro-campo">Resultado
            <select id="filtroResultado" value={filtros.resultado} onChange={mudar("resultado")}>
              <option value="">Todos</option>
              <option value="sucesso">Sucesso</option>
              <option value="negado">Negado</option>
            </select>
          </label>
          <label className="filtro-campo">Data inicial
            <input id="dataInicial" type="date" value={filtros.dataInicial} onChange={mudar("dataInicial")} />
          </label>
          <label className="filtro-campo">Data final
            <input id="dataFinal" type="date" value={filtros.dataFinal} onChange={mudar("dataFinal")} />
          </label>
          <div className="filtros-acoes">
            <button id="limparFiltros" type="button" className="botao-g secundario" onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar filtros</button>
            <button id="exportarCsv" className="botao-g primario" type="button" onClick={() => baixarCsv(filtrados)}>
              <Icone nome="baixar" tamanho={20} />
              Exportar CSV
            </button>
          </div>
        </section>

        <section className="cartao" aria-labelledby="historicoTitulo">
          <div className="cartao-topo">
            <div>
              <h2 id="historicoTitulo">Histórico de eventos</h2>
              <p>Pesquise e filtre os registros demonstrativos.</p>
            </div>
            <span className="selo-demo">SOMENTE LEITURA</span>
          </div>

          <p id="filtroMensagem" className="retorno erro" role="status" aria-live="polite">{erro}</p>

          <div id="logsTabela" className="feed">
            {dias.map(({ dia, logs }) => (
              <section className="feed-dia" key={dia} aria-label={`Eventos de ${dia}`}>
                <h3><Icone nome="calendario" tamanho={20} />{dia}</h3>
                <ol className="feed-lista">
                  {logs.map(log => (
                    <li key={log.id} className={`evento ${log.resultado}`}>
                      <span className={`evento-icone ${log.tipo}`}><Icone nome={ICONE_TIPO[log.tipo]} /></span>
                      <div className="evento-texto">
                        <strong>{`${log.acao} · ${log.usuario} · ${log.recurso}`}</strong>
                        <span>{`${log.data.slice(11, 16)} · ${log.id} · ${LABELS_TIPO[log.tipo]}`}</span>
                      </div>
                      <span className={`pilula ${log.resultado === "sucesso" ? "normal" : "critico"}`}>
                        {log.resultado === "sucesso" ? "Sucesso" : "Negado"}
                      </span>
                      <button type="button" className="botao-g texto" aria-label={`Visualizar evento ${log.id}`}
                        onClick={() => setDetalhe(log)}>Visualizar</button>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          <p id="semResultados" className="vazio" hidden={filtrados.length > 0}>
            Nenhum evento encontrado para os filtros informados. Use “Limpar filtros” para ver todos.
          </p>

          <div className="cartao-rodape">
            <span id="contadorResultados">{`${filtrados.length} de ${LOGS.length} eventos demonstrativos exibidos`}</span>
          </div>
        </section>
      </div>

      <dialog id="detalhesDialog" className="dialogo" ref={dialogRef} aria-labelledby="dialogTitulo" onClose={() => setDetalhe(null)}>
        <div className="dialogo-topo">
          <h2 id="dialogTitulo">Detalhes do evento</h2>
          <button id="fecharDialogIcone" className="dialogo-fechar" type="button" aria-label="Fechar detalhes"
            onClick={() => dialogRef.current.close()}><Icone nome="fechar" /></button>
        </div>
        <div className="dialogo-corpo">
          <dl id="detalhesConteudo" className="detalhes">
            {linhasDetalhe && linhasDetalhe.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor ?? "Não se aplica"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="dialogo-rodape">
          <button id="fecharDialog" type="button" className="botao-g primario"
            onClick={() => dialogRef.current.close()}>Fechar</button>
        </div>
      </dialog>

    </PainelLayout>
  );

}
