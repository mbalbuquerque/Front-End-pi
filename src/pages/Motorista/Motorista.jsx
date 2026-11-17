// Tela do motorista (perfil motorista, PWA no celular): a carga do veículo
// vinculado à conta, para bater o olho com o celular no suporte.
// Somente leitura: nenhum campo de digitação e nenhum toque necessário enquanto
// dirige. Atualiza sozinha a cada 20 s (GET /motorista).
//
// Alerta: quando a carga piora (normal -> atenção -> crítico) o celular vibra,
// toca um bipe (depois de "Ativar alertas") e mostra uma notificação; o aviso
// fica na tela até a carga voltar ao normal. A tela fica acesa (Wake Lock).
// Sem internet, a faixa do topo diz de que hora é a última leitura e o valor
// fica marcado como antigo.
//
// Alertas push (AlertasPushMotorista): inscrevem o celular para receber, com a
// tela fechada, só os alertas do veículo vinculado; o toque abre esta tela.

import { useEffect, useRef, useState } from "react";
import Icone from "../../components/Icone.jsx";
import ReguaFaixa from "../../components/ReguaFaixa.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useSessao } from "../../hooks/useSessao.jsx";
import { useTelaAcesa } from "../../hooks/useTelaAcesa.js";
import { useTitulo } from "../../hooks/useTitulo.js";
import { api } from "../../lib/api.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { useOnline } from "../../lib/conectividade.js";
import { formatarHora, formatarTemp, formatarUmidade } from "../../lib/formatar.js";
import { falhaDoSensor } from "../../lib/sensorFalha.js";
import { criarSom, notificar, pedirPermissaoDeNotificacao, vibrar } from "./alerta.js";
import AlertasPushMotorista from "./AlertasPushMotorista.jsx";
import {
  STATUS_MOTORISTA,
  descreverFaixa,
  deveDisparar,
  haQuanto,
  minutosDesde,
  partesTemperatura,
  proximoAlerta,
  statusDaTela
} from "./motorista.js";
import "../../styles/motorista/motorista.css";

const TELA_ACESA = {
  ativa: "Tela sempre acesa: ligada",
  recusada: "Tela sempre acesa: desligada (o celular pode apagar a tela)",
  indisponivel: "Tela sempre acesa: este navegador não permite"
};

// Status nunca só por cor: a pílula leva ícone e texto.
const ICONE_STATUS = {
  NORMAL: "ok",
  ATENCAO: "alerta",
  CRITICO: "alerta",
  SEM_SINAL: "semSinal"
};


export default function Motorista() {

  useTitulo("Motorista · ColdTrack Control");

  const { usuario, sair } = useSessao();
  const online = useOnline();
  const telaAcesa = useTelaAcesa();

  // Última resposta boa da API (fica na tela quando a conexão cai).
  const [dados, setDados] = useState(null);
  // null | { tipo: "sem-veiculo" } | { tipo: "falha" }
  const [erro, setErro] = useState(null);
  const [agora, setAgora] = useState(() => Date.now());

  const [alerta, setAlerta] = useState(null);
  const alertaAnterior = useRef(null);
  const som = useRef(null);
  const [alertasAtivos, setAlertasAtivos] = useState(false);

  usePolling(async sinal => {

    try {
      const resposta = await api("/motorista", { signal: sinal });
      if (sinal.aborted) return;
      setDados(resposta);
      setErro(null);
    } catch (falha) {
      if (sinal.aborted) return;
      // 404: veículo fora da frota (ou API ainda sem a rota). O resto: rede ou servidor.
      setErro(falha.status === 404 ? { tipo: "sem-veiculo" } : { tipo: "falha" });
    }

    setAgora(Date.now());

  }, UPDATE_INTERVAL);

  const status = dados ? statusDaTela(dados, agora) : null;

  // O aviso acompanha o status; vibra, toca e notifica só quando piora.
  useEffect(() => {

    if (!status) {
      return;
    }

    const novo = proximoAlerta(alertaAnterior.current, status);

    if (deveDisparar(alertaAnterior.current, novo)) {
      const info = STATUS_MOTORISTA[novo];
      vibrar(novo);
      som.current?.tocar(novo);
      notificar(`Carga em ${info.texto}`, info.frase);
    }

    alertaAnterior.current = novo;
    setAlerta(novo);

  }, [status]);

  async function ativarAlertas() {

    som.current = som.current || criarSom();
    som.current.ativar();
    setAlertasAtivos(true);
    await pedirPermissaoDeNotificacao();

  }

  const leitura = dados?.leitura || null;
  const minutos = leitura ? minutosDesde(leitura.medidoEm, agora) : null;
  const horaLeitura = leitura && minutos !== null ? formatarHora(new Date(leitura.medidoEm)) : null;
  const info = status ? STATUS_MOTORISTA[status] : null;
  // Sensor em falha (placa viva mandando heartbeat): a leitura na tela é a última válida.
  const falhaSensor = falhaDoSensor(dados, new Date(agora));
  // Valor que não é atual: sem sinal do sensor, sensor em falha, sem internet ou API sem responder.
  const antigo = Boolean(leitura) && (status === "SEM_SINAL" || falhaSensor !== null || !online || erro !== null);

  let faixaTopo = null;
  if (!online) {
    faixaTopo = horaLeitura ? `Sem conexão — última leitura às ${horaLeitura}` : "Sem conexão — nenhuma leitura recebida";
  } else if (erro?.tipo === "falha" && dados) {
    faixaTopo = `Sem resposta do servidor — última leitura às ${horaLeitura || "--:--"}`;
  }

  const classeTela = info ? info.classe : "neutra";
  const temperatura = partesTemperatura(formatarTemp(leitura?.temperatura));

  return (
    <div className={`escopo-motorista raiz-pagina tela-${classeTela}`}>

      {faixaTopo && (
        <div className="faixa-offline" id="faixaOffline" role="status" aria-live="polite">{faixaTopo}</div>
      )}

      <header className="topo">
        <span className="topo-veiculo">
          <Icone nome="veiculo" tamanho={24} />
          <span className="veiculo" id="veiculoMotorista">
            {dados ? `${dados.veiculo.id} · ${dados.veiculo.tipo}` : usuario?.veiculo || ""}
          </span>
        </span>
        <button type="button" className="sair" id="botaoSair" onClick={sair}>
          Sair
          <Icone nome="sair" tamanho={20} />
        </button>
      </header>

      <main className="conteudo">

        {!dados && !erro && <p className="estado" id="estadoMotorista">Carregando a leitura do veículo…</p>}

        {!dados && erro?.tipo === "sem-veiculo" && (
          <div className="estado" id="estadoMotorista">
            <strong>Nenhum veículo vinculado a você.</strong>
            Peça ao gestor para escolher o seu veículo em Configurações → Usuários.
          </div>
        )}

        {!dados && erro?.tipo === "falha" && (
          <div className="estado" id="estadoMotorista">
            <strong>Não foi possível falar com o Azure.</strong>
            A leitura volta na próxima atualização ({UPDATE_INTERVAL / 1000} s).
          </div>
        )}

        {dados && (
          <>
            {alerta && (
              <div className={`aviso aviso-${STATUS_MOTORISTA[alerta].classe}`} id="avisoMotorista" role="alert">
                <Icone nome="alerta" tamanho={28} />
                <span className="aviso-texto">
                  <strong>{STATUS_MOTORISTA[alerta].texto}</strong>
                  {status === "SEM_SINAL"
                    ? "Sensor sem sinal: o aviso continua até chegar uma leitura normal."
                    : "Este aviso fica na tela até a carga voltar ao normal."}
                </span>
              </div>
            )}

            {falhaSensor && (
              <p className="aviso aviso-falha falha-sensor" id="falhaSensorMotorista" role="status">
                <Icone nome="semSinal" tamanho={28} />
                <span className="aviso-texto">
                  <strong>{falhaSensor.texto}</strong>
                  {leitura ? "O valor abaixo é a última leitura válida." : "Nenhuma leitura válida ainda."}
                </span>
              </p>
            )}

            <section
              className={`bloco-status ${info.classe}`}
              id="blocoStatus"
              aria-label="Temperatura da carga"
            >
              <p className="pilula-status">
                <Icone nome={ICONE_STATUS[status]} tamanho={26} />
                <span className="rotulo-status" id="statusMotorista">{info.texto}</span>
              </p>

              <p className="carga">
                <span className="carga-rotulo">Carga</span>
                <span id="faixaCarga">{descreverFaixa(dados.faixa)}</span>
              </p>

              <strong className={antigo ? "temperatura antiga" : "temperatura"} id="tempMotorista">
                <span className="temp-valor">{temperatura.valor}</span>
                {temperatura.unidade && <> <span className="temp-unidade">{temperatura.unidade}</span></>}
              </strong>

              {antigo && <span className="selo-antigo" id="seloAntigo">LEITURA ANTIGA</span>}

              <ReguaFaixa variante="motorista" id="reguaMotorista" faixa={dados.faixa} temperatura={leitura?.temperatura} />

              <p className="frase">{info.frase}</p>
            </section>

            <dl className="detalhes">
              <div>
                <dt>Última leitura</dt>
                <dd id="ultimaLeitura">{horaLeitura ? `às ${horaLeitura} · ${haQuanto(minutos)}` : "nenhuma ainda"}</dd>
              </div>
              <div>
                <dt>Umidade</dt>
                <dd>{formatarUmidade(leitura?.umidade)}</dd>
              </div>
            </dl>

            <section className="viagem" id="viagemMotorista">
              <h2>Viagem</h2>
              {dados.viagem ? (
                <>
                  <p className="rota">{dados.viagem.origem} → {dados.viagem.destino}</p>
                  <p>{dados.viagem.carga}</p>
                </>
              ) : <p>Nenhuma viagem em curso.</p>}
            </section>
          </>
        )}

        {alertasAtivos ? (
          <p className="alertas-ligados" id="alertasLigados" role="status">
            <Icone nome="ok" tamanho={22} />
            Alertas com som ligados nesta tela.
          </p>
        ) : (
          <button type="button" className="ativar-alertas" id="ativarAlertas" onClick={ativarAlertas}>
            Ativar alertas (som e notificação)
          </button>
        )}

        <AlertasPushMotorista />

      </main>

      <footer className="rodape">
        <p className="aviso-suporte">Use com o celular no suporte.</p>
        <p id="telaAcesa">{TELA_ACESA[telaAcesa]}</p>
      </footer>

    </div>
  );

}
