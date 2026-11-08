// Gestão logística (demonstrativa, dados de exemplo em memória).
// Porte de legado/logistica.html + legado/js/logistica.js.

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTitulo } from "../../hooks/useTitulo.js";
import "../../styles/logistica/logistica.css";
import {
  CARGAS_INICIAIS, STATUS_EDITAVEIS, classeStatus, filtrarCargas,
  formatarTemperatura, proximoId, resumir, validarCarga
} from "./logistica.js";


const FORM_VAZIO = { produto: "", origem: "", destino: "", sensor: "", tempMin: "", tempMax: "" };


export default function Logistica() {

  useTitulo("Gestão Logística | ColdTrack Control");

  const [cargas, setCargas] = useState(CARGAS_INICIAIS);
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("");
  const [feedback, setFeedback] = useState("");

  const [form, setForm] = useState(FORM_VAZIO);
  const [idEmEdicao, setIdEmEdicao] = useState(null);
  const [mensagemForm, setMensagemForm] = useState("");

  const [idDetalhes, setIdDetalhes] = useState(null);
  const [pendente, setPendente] = useState(null);

  const modalCarga = useRef(null);
  const modalDetalhes = useRef(null);
  const modalConfirmacao = useRef(null);

  const filtradas = filtrarCargas(cargas, pesquisa, filtro);
  const indicadores = resumir(cargas);
  const detalhe = cargas.find(c => c.id === idDetalhes) ?? null;
  const alvoPendente = pendente && cargas.find(c => c.id === pendente.id);

  function campo(nome) {
    return {
      id: nome,
      name: nome,
      value: form[nome],
      onChange: e => setForm(atual => ({ ...atual, [nome]: e.target.value }))
    };
  }

  function novaCarga() {
    setIdEmEdicao(null);
    setForm(FORM_VAZIO);
    setMensagemForm("");
    modalCarga.current.showModal();
  }

  function fecharModalCarga() {
    modalCarga.current.close();
    setIdEmEdicao(null);
  }

  function abrirDetalhes(carga) {
    setIdDetalhes(carga.id);
    modalDetalhes.current.showModal();
  }

  function abrirEdicao(carga) {
    modalDetalhes.current.close();
    setIdEmEdicao(carga.id);
    setMensagemForm("");
    setForm({
      produto: carga.produto, origem: carga.origem, destino: carga.destino, sensor: carga.sensor,
      tempMin: String(carga.tempMin), tempMax: String(carga.tempMax)
    });
    modalCarga.current.showModal();
  }

  function pedirConfirmacao(carga, novoStatus) {
    modalDetalhes.current.close();
    if (!STATUS_EDITAVEIS.includes(carga.status)) return;
    setPendente({ id: carga.id, novoStatus });
    modalConfirmacao.current.showModal();
  }

  function confirmarOperacao() {
    if (!pendente) return;
    const carga = cargas.find(c => c.id === pendente.id);
    if (carga && STATUS_EDITAVEIS.includes(carga.status)) {
      setCargas(lista => lista.map(c => c.id === carga.id ? { ...c, status: pendente.novoStatus } : c));
      setFeedback(`Carga ${carga.id}: ${pendente.novoStatus} (somente nesta sessão).`);
    }
    setPendente(null);
    modalConfirmacao.current.close();
  }

  function salvarCarga(evento) {

    evento.preventDefault();

    const dados = validarCarga(form);

    if (!dados) {
      setMensagemForm("Confira os campos e informe uma faixa de temperatura válida.");
      return;
    }

    if (idEmEdicao !== null) {
      const carga = cargas.find(c => c.id === idEmEdicao);
      if (!carga || !STATUS_EDITAVEIS.includes(carga.status)) {
        setMensagemForm("Esta carga não pode mais ser editada.");
        return;
      }
      setCargas(lista => lista.map(c => c.id === idEmEdicao ? { ...c, ...dados } : c));
      setIdEmEdicao(null);
      setForm(FORM_VAZIO);
      modalCarga.current.close();
      setFeedback("Carga atualizada (somente nesta sessão).");
      return;
    }

    setCargas(lista => [...lista, { id: proximoId(lista), ...dados, temperatura: null, status: "Em transporte" }]);
    setForm(FORM_VAZIO);
    setMensagemForm("");
    modalCarga.current.close();

  }

  const camposDetalhe = detalhe && [
    ["Identificação", detalhe.id],
    ["Produto", detalhe.produto],
    ["Origem", detalhe.origem],
    ["Destino", detalhe.destino],
    ["Sensor", detalhe.sensor],
    ["Faixa configurada", `${detalhe.tempMin} °C a ${detalhe.tempMax} °C`],
    ["Temperatura demonstrativa", formatarTemperatura(detalhe.temperatura)],
    ["Situação", detalhe.status]
  ];

  return (
    <div className="escopo-logistica raiz-pagina">

      <div className="layout">
        <aside className="sidebar">
          <h2>❄ ColdTrack</h2>
          <p>CONTROL</p>

          <nav aria-label="Menu principal">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/logistica" className="active" aria-current="page">
              Gestão Logística
            </Link>
            <Link to="/monitoramento">Monitoramento</Link>
            <Link to="/usuarios">Usuários</Link>
            <Link to="/auditoria">Auditoria</Link>
            <Link to="/">Página inicial</Link>
          </nav>

          <small>Projeto Integrador · 2026</small>
        </aside>

        <main className="main">
          <header className="header">
            <div>
              <span className="eyebrow">CONTROLE OPERACIONAL</span>
              <h1>Gestão Logística</h1>
              <p>Gerenciamento de cargas, rotas e sensores.</p>
            </div>
            <button id="btnNovaCarga" className="btn-primary" onClick={novaCarga}>
              + Nova carga
            </button>
          </header>

          <div className="notice">
            Ambiente demonstrativo. Os dados não são enviados à API
            e não representam operações reais.
          </div>

          <section className="metrics" aria-label="Indicadores">
            <article className="metric">
              <span>Total de cargas</span>
              <strong id="totalCargas">{indicadores.total}</strong>
            </article>
            <article className="metric">
              <span>Em transporte</span>
              <strong id="cargasTransporte">{indicadores.transporte}</strong>
            </article>
            <article className="metric">
              <span>Em atenção</span>
              <strong id="cargasAtencao">{indicadores.atencao}</strong>
            </article>
            <article className="metric">
              <span>Sensores vinculados</span>
              <strong id="totalSensores">{indicadores.sensores}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Cargas cadastradas</h2>
              <div className="filters">
                <input id="pesquisaCarga" type="search"
                  placeholder="Pesquisar carga, produto ou rota"
                  aria-label="Pesquisar cargas"
                  value={pesquisa} onChange={e => setPesquisa(e.target.value)} />

                <select id="filtroStatus" aria-label="Filtrar por status"
                  value={filtro} onChange={e => setFiltro(e.target.value)}>
                  <option value="">Todos os status</option>
                  <option value="Em transporte">Em transporte</option>
                  <option value="Atenção">Atenção</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Carga</th>
                    <th>Produto</th>
                    <th>Origem / Destino</th>
                    <th>Sensor</th>
                    <th>Temperatura</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="tabelaCargas">
                  {filtradas.map(carga => (
                    <tr key={carga.id}>
                      <td>{carga.id}</td>
                      <td>{carga.produto}</td>
                      <td>{`${carga.origem} → ${carga.destino}`}</td>
                      <td>{carga.sensor}</td>
                      <td>{formatarTemperatura(carga.temperatura)}</td>
                      <td><span className={`status ${classeStatus(carga.status)}`}>{carga.status}</span></td>
                      <td><button type="button" onClick={() => abrirDetalhes(carga)}>Detalhes</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p id="semResultados" className="empty" hidden={filtradas.length > 0}>
              Nenhuma carga encontrada.
            </p>
          </section>

          <dialog id="modalCarga" ref={modalCarga}>
            <form id="formCarga" onSubmit={salvarCarga}>
              <div className="modal-heading">
                <h2 id="tituloModalCarga">{idEmEdicao !== null ? `Editar carga ${idEmEdicao}` : "Nova carga"}</h2>
                <button type="button" id="fecharModal" className="btn-secondary" onClick={fecharModalCarga}>Fechar</button>
              </div>

              <label htmlFor="produto">Produto</label>
              <input {...campo("produto")} required maxLength={80} />

              <label htmlFor="origem">Origem</label>
              <input {...campo("origem")} required maxLength={100} />

              <label htmlFor="destino">Destino</label>
              <input {...campo("destino")} required maxLength={100} />

              <label htmlFor="sensor">Identificação do sensor</label>
              <input {...campo("sensor")} required maxLength={50} />

              <div className="form-grid">
                <div>
                  <label htmlFor="tempMin">Temperatura mínima (°C)</label>
                  <input {...campo("tempMin")} type="number" step="0.1" required />
                </div>
                <div>
                  <label htmlFor="tempMax">Temperatura máxima (°C)</label>
                  <input {...campo("tempMax")} type="number" step="0.1" required />
                </div>
              </div>

              <p id="mensagemForm" role="status">{mensagemForm}</p>

              <button type="submit" id="salvarCarga" className="btn-primary">
                {idEmEdicao !== null ? "Salvar alterações" : "Cadastrar carga demonstrativa"}
              </button>
            </form>
          </dialog>

          <dialog id="modalDetalhes" ref={modalDetalhes}>
            <div className="modal-heading">
              <h2>Detalhes da carga</h2>
              <button type="button" id="fecharDetalhes" className="btn-secondary"
                onClick={() => modalDetalhes.current.close()}>Fechar</button>
            </div>
            <div id="conteudoDetalhes">
              {camposDetalhe && camposDetalhe.map(([titulo, valor]) => (
                <p key={titulo}><strong>{`${titulo}: `}</strong>{valor}</p>
              ))}
            </div>
            <div id="acoesDetalhes" className="detail-actions">
              {detalhe && STATUS_EDITAVEIS.includes(detalhe.status) && (
                <>
                  <button type="button" className="btn-secondary" onClick={() => abrirEdicao(detalhe)}>Editar</button>
                  <button type="button" className="btn-primary" onClick={() => pedirConfirmacao(detalhe, "Entregue")}>Concluir entrega</button>
                  <button type="button" className="btn-danger" onClick={() => pedirConfirmacao(detalhe, "Cancelada")}>Cancelar carga</button>
                </>
              )}
            </div>
          </dialog>

          <dialog id="modalConfirmacao" ref={modalConfirmacao} aria-labelledby="tituloConfirmacao"
            onClose={() => setPendente(null)}>
            <h2 id="tituloConfirmacao">
              {pendente?.novoStatus === "Cancelada" ? "Cancelar carga" : "Concluir entrega"}
            </h2>
            <p id="textoConfirmacao">
              {pendente && alvoPendente
                ? `Confirma alterar a carga ${alvoPendente.id} para ${pendente.novoStatus}? Nesta demonstração, a ação não poderá ser desfeita sem recarregar a página.`
                : ""}
            </p>
            <div className="detail-actions">
              <button type="button" id="cancelarConfirmacao" className="btn-secondary"
                onClick={() => modalConfirmacao.current.close()}>Voltar</button>
              <button type="button" id="confirmarOperacao" className="btn-primary" onClick={confirmarOperacao}>
                {pendente?.novoStatus === "Cancelada" ? "Confirmar cancelamento" : "Confirmar entrega"}
              </button>
            </div>
          </dialog>

          <p id="feedbackOperacao" className="feedback" role="status" aria-live="polite">{feedback}</p>
        </main>
      </div>

    </div>
  );

}
