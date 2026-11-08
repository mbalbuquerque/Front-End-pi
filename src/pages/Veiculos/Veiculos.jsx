// Tela de veículos: situação atual da frota e cadastro (gestor).
// Porte de legado/veiculos.html + legado/js/veiculos.js.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Carregando, ErroAzure } from "../../components/Estado.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import StatusSelo from "../../components/StatusSelo.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useSessao } from "../../hooks/useSessao.jsx";
import { api } from "../../lib/api.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { carregarPerfis, descreverNormal, faixaDoPerfil } from "../../lib/faixas.js";
import {
  formatarDataHora,
  formatarDuracao,
  formatarTemp,
  formatarUmidade
} from "../../lib/formatar.js";
import { buscarLeituras, horarioDe } from "../../lib/leituras.js";
import { ehGestor } from "../../lib/sessao.js";
import { desenharQr, enderecoEtiqueta } from "./etiqueta.js";

// Sem leitura há mais que 3 envios, o dispositivo é considerado sem sinal.
const SEM_SINAL_MS = UPDATE_INTERVAL * 3;


export default function Veiculos() {

  const { usuario } = useSessao();
  const gestor = ehGestor(usuario);

  const [conexao, setConexao] = useState(null);

  // { tipo: "carregando" | "erro" | "ok", veiculos, ultimas, livres, perfis, agora }
  const [tela, setTela] = useState({ tipo: "carregando" });

  // Código do veículo com a etiqueta aberta (null = fechada).
  const [etiqueta, setEtiqueta] = useState(null);

  // Não redesenha enquanto o gestor preenche o formulário.
  const [formularioAberto, setFormularioAberto] = useState(false);
  const formularioAbertoRef = useRef(false);

  function mudarFormulario(aberto) {
    formularioAbertoRef.current = aberto;
    setFormularioAberto(aberto);
  }

  const recarregar = usePolling(async sinal => {

    if (formularioAbertoRef.current) {
      return;
    }

    try {

      const [{ veiculos }, { dispositivos }, perfis] = await Promise.all([
        api("/veiculos"),
        api("/dispositivos"),
        carregarPerfis()
      ]);
      if (sinal.aborted) return;

      // Sensores ainda sem veículo: as opções do cadastro.
      const livres = dispositivos
        .map(d => d.id)
        .filter(id => !veiculos.some(v => v.deviceId === id))
        .sort();

      const ultimas = await Promise.all(
        veiculos.map(v =>
          buscarLeituras({ deviceId: v.deviceId, limite: 1 })
            .then(leituras => leituras[0] || null)
        )
      );
      if (sinal.aborted) return;

      setConexao(true);
      setTela({ tipo: "ok", veiculos, ultimas, livres, perfis, agora: Date.now() });

    }

    catch (erro) {

      if (sinal.aborted) return;
      console.error("Erro ao carregar veículos:", erro);
      setConexao(false);
      setTela({ tipo: "erro" });

    }

  }, UPDATE_INTERVAL, []);

  async function remover(codigo) {

    if (!confirm(`Remover o veículo ${codigo}? As leituras do sensor continuam guardadas.`)) {
      return;
    }

    try {
      await api(`/veiculos/${encodeURIComponent(codigo)}`, { metodo: "DELETE" });
      recarregar();
    } catch (falha) {
      alert(falha.message);
    }

  }

  return (
    <PainelLayout
      titulo="Veículos"
      subtitulo="Frota monitorada e situação de cada carga"
      conexao={conexao}
      dialogos={etiqueta && <Etiqueta key={etiqueta} codigo={etiqueta} aoFechar={() => setEtiqueta(null)} />}
    >
      <div id="conteudo" className="page-grid">
        {tela.tipo === "carregando" && <Carregando />}
        {tela.tipo === "erro" && <ErroAzure />}
        {tela.tipo === "ok" && (
          <>
            {gestor && (
              <FormularioVeiculo
                livres={tela.livres}
                perfis={tela.perfis}
                aberto={formularioAberto}
                aoMudarAberto={mudarFormulario}
                aoSalvar={recarregar}
              />
            )}

            {tela.veiculos.length ? (
              <section className="lista-cards">
                {tela.veiculos.map((v, i) => (
                  <CardVeiculo
                    key={v.id}
                    veiculo={v}
                    ultima={tela.ultimas[i]}
                    perfis={tela.perfis}
                    agora={tela.agora}
                    gestor={gestor}
                    aoEtiqueta={setEtiqueta}
                    aoRemover={remover}
                  />
                ))}
              </section>
            ) : (
              <div className="panel estado">
                <strong>Nenhum veículo cadastrado.</strong>
                {gestor ? "Cadastre o primeiro veículo acima." : "Peça ao gestor para cadastrar a frota."}
              </div>
            )}
          </>
        )}
      </div>
    </PainelLayout>
  );

}


function FormularioVeiculo({ livres, perfis, aberto, aoMudarAberto, aoSalvar }) {

  const [erro, setErro] = useState("");

  if (!livres.length) {
    return (
      <div className="panel estado">
        <strong>Nenhum sensor livre para um veículo novo.</strong>
        Registre o sensor em <Link to="/sensores">Sensores</Link> e volte aqui.
      </div>
    );
  }

  async function enviar(evento) {

    evento.preventDefault();
    setErro("");

    const form = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(form));

    try {
      await api("/veiculos", { metodo: "POST", corpo: dados });
      // O original redesenhava o formulário: volta fechado e vazio.
      form.reset();
      aoMudarAberto(false);
      aoSalvar();
    } catch (falha) {
      setErro(falha.message);
    }

  }

  return (
    <details className="panel" id="painelNovo" open={aberto} onToggle={e => aoMudarAberto(e.currentTarget.open)}>
      <summary><h2>Cadastrar veículo</h2></summary>

      <form id="formVeiculo" className="form-grade" noValidate onSubmit={enviar}>
        <label className="campo"><span>Código</span><input name="id" placeholder="CT-002" required /></label>
        <label className="campo"><span>Tipo</span><input name="tipo" placeholder="Caminhão baú refrigerado" required /></label>
        <label className="campo">
          <span>Sensor</span>
          <select name="deviceId">
            {livres.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label className="campo"><span>Dispositivo</span><input name="dispositivo" placeholder="ESP32-C3 + DHT11" /></label>
        <label className="campo">
          <span>Perfil da carga</span>
          <select name="perfil">
            {perfis.map(p => (
              <option key={p.id} value={p.id}>{`${p.nome} (normal ${descreverNormal(faixaDoPerfil(p))})`}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="botao">Cadastrar</button>
      </form>

      <p className="erro-form" id="erroVeiculo" role="alert" hidden={!erro}>{erro}</p>
    </details>
  );

}


function CardVeiculo({ veiculo, ultima, perfis, agora, gestor, aoEtiqueta, aoRemover }) {

  const perfil = perfis.find(p => p.id === veiculo.perfil);

  let situacao = <StatusSelo status={null} />;
  let comunicacao = "nunca enviou dados";

  if (ultima) {

    const quando = horarioDe(ultima);
    const atraso = agora - quando.getTime();

    comunicacao = atraso > SEM_SINAL_MS
      ? `sem sinal há ${formatarDuracao(atraso)}`
      : formatarDataHora(quando);

    situacao = atraso > SEM_SINAL_MS
      ? <span className="status aguardando">SEM SINAL</span>
      : <StatusSelo status={ultima.status} />;

  }

  return (
    <article className="item-card">

      <header>
        <div>
          <h3>{veiculo.id}</h3>
          <p>{veiculo.tipo}</p>
        </div>
        {situacao}
      </header>

      <div className="campos">
        <div>
          <span>Temperatura</span>
          <strong>{formatarTemp(ultima?.temperatura)}</strong>
        </div>
        <div>
          <span>Umidade</span>
          <strong>{formatarUmidade(ultima?.umidade)}</strong>
        </div>
        <div>
          <span>Última comunicação</span>
          <strong>{comunicacao}</strong>
        </div>
        <div>
          <span>Perfil da carga</span>
          <strong>{perfil ? perfil.nome : veiculo.perfil} · normal {descreverNormal(faixaDoPerfil(perfil))}</strong>
        </div>
        <div>
          <span>Dispositivo</span>
          <strong>{veiculo.dispositivo || "--"}</strong>
        </div>
        <div>
          <span>ID do sensor</span>
          <strong>{veiculo.deviceId}</strong>
        </div>
      </div>

      <div className="acoes-item">
        <Link className="botao secundario" to={`/dashboard?veiculo=${encodeURIComponent(veiculo.id)}`}>Ver no painel</Link>
        {" "}
        <button type="button" className="botao secundario" onClick={() => aoEtiqueta(veiculo.id)}>Etiqueta QR</button>
        {gestor && (
          <>
            {" "}
            <button type="button" className="botao perigo" onClick={() => aoRemover(veiculo.id)}>Remover veículo</button>
          </>
        )}
      </div>

    </article>
  );

}


// Etiqueta para colar no baú: o QR abre o painel já neste veículo.
// Quem escaneia precisa de login; a etiqueta não dá acesso sozinha.
// Vai na prop dialogos do PainelLayout (filha direta da raiz do escopo)
// para a regra de impressão esconder o resto da tela.
function Etiqueta({ codigo, aoFechar }) {

  const dialogoRef = useRef(null);
  const qr = desenharQr(enderecoEtiqueta(codigo));

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (dialogo && !dialogo.open) {
      dialogo.showModal();
    }
  }, []);

  return (
    <dialog id="etiqueta" className="etiqueta" ref={dialogoRef} onClose={aoFechar}>
      <div className="etiqueta-conteudo">
        <div className="etiqueta-qr">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${qr.tamanho} ${qr.tamanho}`}
            preserveAspectRatio="xMinYMin meet"
          >
            <rect width="100%" height="100%" fill="white" />
            <path d={qr.caminho} stroke="transparent" fill="black" />
          </svg>
        </div>
        <strong>{codigo}</strong>
        <span>ColdTrack · aponte a câmera para ver a temperatura da carga</span>
      </div>
      <div className="acoes-item etiqueta-acoes">
        <button type="button" className="botao" id="imprimirEtiqueta" onClick={() => window.print()}>Imprimir</button>
        {" "}
        <button type="button" className="botao secundario" id="fecharEtiqueta" onClick={() => dialogoRef.current.close()}>Fechar</button>
      </div>
    </dialog>
  );

}
