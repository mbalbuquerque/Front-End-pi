// Tela de viagens: condição da carga do início ao fim de cada trajeto,
// com cadastro, encerramento e remoção (gestor).
// Porte de legado/viagens.html + legado/js/viagens.js.

import { useRef, useState } from "react";
import { Carregando, ErroAzure } from "../../components/Estado.jsx";
import GraficoTemperatura from "../../components/GraficoTemperatura.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useSessao } from "../../hooks/useSessao.jsx";
import { api } from "../../lib/api.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { carregarPerfis, faixaDoPerfil } from "../../lib/faixas.js";
import { formatarDataHora, formatarDuracao, formatarTemp } from "../../lib/formatar.js";
import { agruparOcorrencias, buscarLeituras, resumir } from "../../lib/leituras.js";
import { ehGestor } from "../../lib/sessao.js";
import { agoraLocal, filtrarLeiturasDaViagem, horasDaViagem, ordenarViagens } from "./viagens.js";


async function leiturasDaViagem(viagem, veiculos) {

  const veiculo = veiculos.find(v => v.id === viagem.veiculo);

  if (!veiculo) {
    return null;
  }

  const leituras = await buscarLeituras({
    deviceId: veiculo.deviceId,
    horas: horasDaViagem(viagem),
    limite: 500
  });

  return filtrarLeiturasDaViagem(leituras, viagem);

}


export default function Viagens() {

  const { usuario } = useSessao();
  const gestor = ehGestor(usuario);

  const [conexao, setConexao] = useState(null);

  // { tipo: "carregando" | "erro" | "ok", viagens, veiculos, perfis, dados, agora }
  const [tela, setTela] = useState({ tipo: "carregando" });

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

      const [{ viagens: lista }, { veiculos }, perfis] = await Promise.all([
        api("/viagens"),
        api("/veiculos"),
        carregarPerfis()
      ]);
      if (sinal.aborted) return;

      const viagens = ordenarViagens(lista);

      const dados = await Promise.all(
        viagens.map(viagem => leiturasDaViagem(viagem, veiculos))
      );
      if (sinal.aborted) return;

      setConexao(true);
      setTela({ tipo: "ok", viagens, veiculos, perfis, dados, agora: Date.now() });

    }

    catch (erro) {

      if (sinal.aborted) return;
      console.error("Erro ao carregar viagens:", erro);
      setConexao(false);
      setTela({ tipo: "erro" });

    }

  }, UPDATE_INTERVAL, []);

  async function encerrar(id) {

    try {

      // Busca a viagem de novo: o PUT manda o registro inteiro com o fim.
      const { viagens } = await api("/viagens");
      const viagem = viagens.find(v => v.id === id);

      if (!viagem || !confirm(`Encerrar a viagem ${viagem.id} agora?`)) {
        return;
      }

      await api(`/viagens/${encodeURIComponent(viagem.id)}`, {
        metodo: "PUT",
        corpo: { ...viagem, fim: new Date().toISOString() }
      });
      recarregar();

    } catch (falha) {
      alert(falha.message);
    }

  }

  async function remover(id) {

    if (!confirm(`Remover a viagem ${id}? As leituras do sensor continuam guardadas.`)) {
      return;
    }

    try {
      await api(`/viagens/${encodeURIComponent(id)}`, { metodo: "DELETE" });
      recarregar();
    } catch (falha) {
      alert(falha.message);
    }

  }

  return (
    <PainelLayout titulo="Viagens" subtitulo="Condição da carga em cada trajeto" conexao={conexao}>
      <div id="conteudo" className="page-grid">
        {tela.tipo === "carregando" && <Carregando />}
        {tela.tipo === "erro" && <ErroAzure />}
        {tela.tipo === "ok" && (
          <>
            {gestor && (
              <FormularioViagem
                veiculos={tela.veiculos}
                aberto={formularioAberto}
                aoMudarAberto={mudarFormulario}
                aoSalvar={recarregar}
              />
            )}

            {tela.viagens.length ? tela.viagens.map((viagem, i) => {
              const veiculo = tela.veiculos.find(v => v.id === viagem.veiculo);
              const perfil = tela.perfis.find(p => p.id === veiculo?.perfil);
              return (
                <PainelViagem
                  key={viagem.id}
                  viagem={viagem}
                  leituras={tela.dados[i]}
                  indice={i}
                  faixa={faixaDoPerfil(perfil)}
                  agora={tela.agora}
                  gestor={gestor}
                  aoEncerrar={encerrar}
                  aoRemover={remover}
                />
              );
            }) : (
              <div className="panel estado">
                <strong>Nenhuma viagem registrada.</strong>
                {gestor ? "Registre a primeira viagem acima." : "Peça ao gestor para registrar as viagens."}
              </div>
            )}

            <div className="nota">
              <span className="planejado">PLANEJADO</span>
              {" "}
              <strong>Rota real no mapa.</strong>
              {" "}
              Chega com o módulo 4G com GPS no caminhão.
            </div>
          </>
        )}
      </div>
    </PainelLayout>
  );

}


function FormularioViagem({ veiculos, aberto, aoMudarAberto, aoSalvar }) {

  const [erro, setErro] = useState("");

  async function enviar(evento) {

    evento.preventDefault();
    setErro("");

    const form = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(form));

    // datetime-local vem sem fuso; convertemos para ISO com fuso (UTC).
    dados.inicio = dados.inicio ? new Date(dados.inicio).toISOString() : "";

    try {
      await api("/viagens", { metodo: "POST", corpo: dados });
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
      <summary><h2>Registrar viagem</h2></summary>

      {veiculos.length ? (
        <>
          <form id="formViagem" className="form-grade" noValidate onSubmit={enviar}>
            <label className="campo">
              <span>Veículo</span>
              <select name="veiculo" required>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.id} · {v.tipo}</option>)}
              </select>
            </label>
            <label className="campo"><span>Origem</span><input name="origem" placeholder="Petrolina/PE" required /></label>
            <label className="campo"><span>Destino</span><input name="destino" placeholder="Porto de Suape/PE" required /></label>
            <label className="campo"><span>Carga</span><input name="carga" placeholder="Manga Tommy Atkins" required /></label>
            <label className="campo"><span>Início</span><input name="inicio" type="datetime-local" defaultValue={agoraLocal()} required /></label>
            <button type="submit" className="botao">Registrar</button>
          </form>
          <p className="erro-form" id="erroViagem" role="alert" hidden={!erro}>{erro}</p>
        </>
      ) : (
        <p className="estado">Cadastre um veículo antes de registrar viagens.</p>
      )}
    </details>
  );

}


function PainelViagem({ viagem, leituras, indice, faixa, agora, gestor, aoEncerrar, aoRemover }) {

  const r = leituras ? resumir(leituras) : null;
  const ocorrencias = leituras ? agruparOcorrencias(leituras) : [];

  const inicio = new Date(viagem.inicio);
  const fim = viagem.fim ? new Date(viagem.fim) : null;
  const duracao = (fim ? fim.getTime() : agora) - inicio.getTime();

  const tempoFora = ocorrencias.reduce((total, o) => total + o.duracao, 0);

  return (
    <article className="panel">

      <div className="panel-header">
        <div>
          <h2>{viagem.id} · {viagem.veiculo}</h2>
          <p>{viagem.carga}</p>
        </div>
        {fim
          ? <span className="status aguardando">CONCLUÍDA</span>
          : <span className="status normal">EM ANDAMENTO</span>}
      </div>

      <div className="rota section-gap">
        <span>{viagem.origem}</span>
        <span className="seta" aria-hidden="true">→</span>
        <span>{viagem.destino}</span>
      </div>

      <div className="campos">
        <div>
          <span>Início</span>
          <strong>{formatarDataHora(inicio)}</strong>
        </div>
        <div>
          <span>{fim ? "Duração" : "Em viagem há"}</span>
          <strong>{formatarDuracao(duracao)}</strong>
        </div>
        <div>
          <span>Faixa registrada</span>
          <strong>{r ? `${formatarTemp(r.minima)} a ${formatarTemp(r.maxima)}` : "--"}</strong>
        </div>
        <div>
          <span>Tempo fora da faixa</span>
          <strong>{ocorrencias.length
            ? `${formatarDuracao(tempoFora)} em ${ocorrencias.length} ocorrência${ocorrencias.length > 1 ? "s" : ""}`
            : "nenhum"}</strong>
        </div>
      </div>

      {leituras
        ? <GraficoTemperatura id={`graficoViagem${indice}`} className="section-gap" leituras={leituras} faixa={faixa} />
        : <p className="nota">O veículo {viagem.veiculo} não está mais cadastrado.</p>}

      {gestor && (
        <div className="acoes-item">
          {!fim && (
            <>
              <button type="button" className="botao secundario" onClick={() => aoEncerrar(viagem.id)}>Encerrar viagem</button>
              {" "}
            </>
          )}
          <button type="button" className="botao perigo" onClick={() => aoRemover(viagem.id)}>Remover</button>
        </div>
      )}

    </article>
  );

}
