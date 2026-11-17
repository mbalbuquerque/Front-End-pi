// Gestão logística (demonstrativa, dados de exemplo em memória): quadro de
// cargas por situação (design system, seção 7).
// Porte do site antigo: logistica.html + js/logistica.js.

import { useRef, useState } from "react";
import Icone from "../../components/Icone.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import "../../styles/gestao/gestao.css";
import {
  CARGAS_INICIAIS, COLUNAS, STATUS_EDITAVEIS, classeStatus, filtrarCargas,
  formatarTemperatura, proximoId, resumir, validarCarga
} from "./logistica.js";


// Cor da pílula de status (o texto da situação sempre aparece junto).
const PILULA_STATUS = { transporte: "normal", atencao: "atencao", entregue: "info", cancelada: "offline" };

const FORM_VAZIO = { produto: "", origem: "", destino: "", sensor: "", tempMin: "", tempMax: "" };


export default function Logistica() {

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

  // Quadro por situação: uma coluna por status, já com a pesquisa e o filtro aplicados.
  const colunas = COLUNAS.map(coluna => ({ ...coluna, cargas: filtradas.filter(c => c.status === coluna.status) }));

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
    <PainelLayout
      titulo="Gestão Logística"
      subtitulo="Cargas, rotas e sensores por situação"
      familia="gestao"
    >

      <div className="gestao">

        <p className="aviso-demo" role="note">
          <Icone nome="info" />
          <span>
            Ambiente demonstrativo. Os dados não são enviados à API
            e não representam operações reais.
          </span>
        </p>

        <section className="cartao filtros" aria-label="Pesquisa e filtro">
          <div className="busca-sozinha">
            <Icone nome="busca" tamanho={20} />
            <input id="pesquisaCarga" type="search"
              placeholder="Pesquisar carga, produto ou rota"
              aria-label="Pesquisar cargas"
              value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
          </div>

          <select id="filtroStatus" aria-label="Filtrar por status"
            value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="Em transporte">Em transporte</option>
            <option value="Atenção">Atenção</option>
            <option value="Entregue">Entregue</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          <div className="filtros-acoes">
            <button type="button" id="btnNovaCarga" className="botao-g primario" onClick={novaCarga}>
              <Icone nome="adicionar" tamanho={20} />
              Nova carga
            </button>
          </div>
        </section>

        <section className="kpis" aria-label="Indicadores">
          <article className="kpi">
            <div><span className="kpi-rotulo">Total de cargas</span><strong id="totalCargas">{indicadores.total}</strong></div>
            <span className="kpi-icone"><Icone nome="logistica" /></span>
          </article>
          <article className="kpi normal">
            <div><span className="kpi-rotulo">Em transporte</span><strong id="cargasTransporte">{indicadores.transporte}</strong></div>
            <span className="kpi-icone"><Icone nome="veiculo" /></span>
          </article>
          <article className={indicadores.atencao > 0 ? "kpi atencao" : "kpi"}>
            <div><span className="kpi-rotulo">Em atenção</span><strong id="cargasAtencao">{indicadores.atencao}</strong></div>
            <span className="kpi-icone"><Icone nome="alerta" /></span>
          </article>
          <article className="kpi">
            <div><span className="kpi-rotulo">Sensores vinculados</span><strong id="totalSensores">{indicadores.sensores}</strong></div>
            <span className="kpi-icone"><Icone nome="sensor" /></span>
          </article>
        </section>

        <section id="tabelaCargas" className="quadro" aria-label="Cargas por situação">
          {colunas.map(coluna => (
            <div key={coluna.status} className={`coluna ${classeStatus(coluna.status)}`}>
              <div className="coluna-topo">
                <span className="coluna-ponto" aria-hidden="true" />
                <h2>{coluna.titulo}</h2>
                <span className="coluna-contagem">
                  {coluna.cargas.length}
                  <span className="so-leitor"> {coluna.cargas.length === 1 ? "carga" : "cargas"}</span>
                </span>
              </div>
              {coluna.cargas.length ? (
                <ul className="coluna-lista">
                  {coluna.cargas.map(carga => (
                    <li key={carga.id} className={`carga ${classeStatus(carga.status)}`}>
                      <div className="carga-topo">
                        <h3>{carga.id}</h3>
                        <span className="pilula info sem-ponto">{carga.produto}</span>
                      </div>
                      <p className="carga-rota">
                        <Icone nome="viagem" tamanho={18} />
                        <span>{`${carga.origem} → ${carga.destino}`}</span>
                      </p>
                      <div className="carga-sensor">
                        <span><Icone nome="sensor" tamanho={18} />{carga.sensor}</span>
                        <span className="carga-temp">{formatarTemperatura(carga.temperatura)}</span>
                      </div>
                      <div className="carga-topo">
                        <span className={`pilula ${PILULA_STATUS[classeStatus(carga.status)]}`}>{carga.status}</span>
                        <button type="button" className="botao-g texto" onClick={() => abrirDetalhes(carga)}>Detalhes</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="coluna-vazia">Nenhuma carga nesta situação.</p>
              )}
            </div>
          ))}
        </section>

        <p id="semResultados" className="vazio" hidden={filtradas.length > 0}>
          Nenhuma carga encontrada. Limpe a pesquisa ou escolha outro status.
        </p>

        <p id="feedbackOperacao" className="retorno" role="status" aria-live="polite">{feedback}</p>
      </div>

      <dialog id="modalCarga" className="dialogo" ref={modalCarga} aria-labelledby="tituloModalCarga">
        <form id="formCarga" onSubmit={salvarCarga}>
          <div className="dialogo-topo">
            <h2 id="tituloModalCarga">{idEmEdicao !== null ? `Editar carga ${idEmEdicao}` : "Nova carga"}</h2>
            <button type="button" id="fecharModal" className="dialogo-fechar" aria-label="Fechar" onClick={fecharModalCarga}>
              <Icone nome="fechar" />
            </button>
          </div>

          <div className="dialogo-corpo">
            <div className="form-campo">
              <label htmlFor="produto">Produto</label>
              <input {...campo("produto")} required maxLength={80} />
            </div>

            <div className="form-duplo">
              <div className="form-campo">
                <label htmlFor="origem">Origem</label>
                <input {...campo("origem")} required maxLength={100} />
              </div>
              <div className="form-campo">
                <label htmlFor="destino">Destino</label>
                <input {...campo("destino")} required maxLength={100} />
              </div>
            </div>

            <div className="form-campo">
              <label htmlFor="sensor">Identificação do sensor</label>
              <input {...campo("sensor")} required maxLength={50} />
            </div>

            <div className="form-duplo">
              <div className="form-campo">
                <label htmlFor="tempMin">Temperatura mínima (°C)</label>
                <input {...campo("tempMin")} type="number" step="0.1" required />
              </div>
              <div className="form-campo">
                <label htmlFor="tempMax">Temperatura máxima (°C)</label>
                <input {...campo("tempMax")} type="number" step="0.1" required />
              </div>
            </div>

            <p id="mensagemForm" className="mensagem-form" role="status">{mensagemForm}</p>
          </div>

          <div className="dialogo-rodape">
            <button type="submit" id="salvarCarga" className="botao-g primario">
              {idEmEdicao !== null ? "Salvar alterações" : "Cadastrar carga demonstrativa"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog id="modalDetalhes" className="dialogo" ref={modalDetalhes} aria-labelledby="tituloDetalhesCarga">
        <div className="dialogo-topo">
          <h2 id="tituloDetalhesCarga">Detalhes da carga</h2>
          <button type="button" id="fecharDetalhes" className="dialogo-fechar" aria-label="Fechar"
            onClick={() => modalDetalhes.current.close()}><Icone nome="fechar" /></button>
        </div>
        <div className="dialogo-corpo">
          <dl id="conteudoDetalhes" className="detalhes">
            {camposDetalhe && camposDetalhe.map(([titulo, valor]) => (
              <div key={titulo}><dt>{titulo}</dt><dd>{valor}</dd></div>
            ))}
          </dl>
        </div>
        <div id="acoesDetalhes" className="dialogo-rodape">
          {detalhe && STATUS_EDITAVEIS.includes(detalhe.status) && (
            <>
              <button type="button" className="botao-g perigo" onClick={() => pedirConfirmacao(detalhe, "Cancelada")}>Cancelar carga</button>
              <button type="button" className="botao-g secundario" onClick={() => abrirEdicao(detalhe)}>Editar</button>
              <button type="button" className="botao-g primario" onClick={() => pedirConfirmacao(detalhe, "Entregue")}>Concluir entrega</button>
            </>
          )}
        </div>
      </dialog>

      <dialog id="modalConfirmacao" className="dialogo" ref={modalConfirmacao} aria-labelledby="tituloConfirmacao"
        onClose={() => setPendente(null)}>
        <div className="dialogo-topo">
          <h2 id="tituloConfirmacao">
            {pendente?.novoStatus === "Cancelada" ? "Cancelar carga" : "Concluir entrega"}
          </h2>
        </div>
        <div className="dialogo-corpo">
          <p id="textoConfirmacao">
            {pendente && alvoPendente
              ? `Confirma alterar a carga ${alvoPendente.id} para ${pendente.novoStatus}? Nesta demonstração, a ação não poderá ser desfeita sem recarregar a página.`
              : ""}
          </p>
        </div>
        <div className="dialogo-rodape">
          <button type="button" id="cancelarConfirmacao" className="botao-g secundario"
            onClick={() => modalConfirmacao.current.close()}>Voltar</button>
          <button type="button" id="confirmarOperacao"
            className={pendente?.novoStatus === "Cancelada" ? "botao-g perigo" : "botao-g primario"}
            onClick={confirmarOperacao}>
            {pendente?.novoStatus === "Cancelada" ? "Confirmar cancelamento" : "Confirmar entrega"}
          </button>
        </div>
      </dialog>

    </PainelLayout>
  );

}
