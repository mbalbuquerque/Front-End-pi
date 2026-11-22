// Tela do motorista (perfil motorista, PWA no celular): um app pequeno com
// quatro abas na barra de baixo. "Agora" (a carga do veículo vinculado, para
// bater o olho com o celular no suporte), "Viagem", "Histórico" e "Perfil".
// Nenhum campo de digitação nem toque necessário enquanto dirige: a tela abre
// em "Agora" e atualiza sozinha a cada 20 s (GET /motorista). A aba escolhida
// continua a mesma quando os dados chegam.
//
// Alerta: quando a carga piora (normal -> atenção -> crítico) o aviso aparece e
// fica na tela, em qualquer aba, até a carga voltar ao normal. Com os alertas
// ligados (um botão só, "Ativar alertas", na aba Perfil, useAlertasMotorista) o
// celular também vibra, toca um bipe e mostra uma notificação. A tela fica
// acesa (Wake Lock).
// Sem internet, a faixa do topo diz de que hora é a última leitura e o valor
// fica marcado como antigo.
//
// O mesmo botão inscreve o celular no Web Push: com a tela fechada chegam só os
// alertas do veículo vinculado, e o toque abre esta tela.

import { useEffect, useRef, useState } from "react";
import Icone from "../../components/Icone.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useSessao } from "../../hooks/useSessao.jsx";
import { useTelaAcesa } from "../../hooks/useTelaAcesa.js";
import { useTitulo } from "../../hooks/useTitulo.js";
import { api } from "../../lib/api.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { useOnline } from "../../lib/conectividade.js";
import { formatarHora } from "../../lib/formatar.js";
import { falhaDoSensor } from "../../lib/sensorFalha.js";
import AbaAgora from "./AbaAgora.jsx";
import AbaHistorico from "./AbaHistorico.jsx";
import AbaPerfil from "./AbaPerfil.jsx";
import AbaViagem from "./AbaViagem.jsx";
import { DicaSom } from "./AlertasMotorista.jsx";
import {
  STATUS_MOTORISTA,
  deveDisparar,
  minutosDesde,
  proximoAlerta,
  statusDaTela
} from "./motorista.js";
import { useAlertasMotorista } from "./useAlertasMotorista.js";
import "../../styles/motorista/motorista.css";

// Abas da barra de baixo (ícone + texto, sempre os dois).
const ABAS = [
  { id: "agora", texto: "Agora", icone: "termometro" },
  { id: "viagem", texto: "Viagem", icone: "veiculo" },
  { id: "historico", texto: "Histórico", icone: "monitoramento" },
  { id: "perfil", texto: "Perfil", icone: "usuario" }
];


export default function Motorista() {

  useTitulo("Motorista · ColdTrack Control");

  const { usuario } = useSessao();
  const online = useOnline();
  const telaAcesa = useTelaAcesa();

  // Última resposta boa da API (fica na tela quando a conexão cai).
  const [dados, setDados] = useState(null);
  // null | { tipo: "sem-veiculo" } | { tipo: "falha" }
  const [erro, setErro] = useState(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [aba, setAba] = useState("agora");

  const [alerta, setAlerta] = useState(null);
  const alertaAnterior = useRef(null);
  const alertas = useAlertasMotorista();
  const { disparar } = alertas;

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
      disparar(novo, `Carga em ${info.texto}`, info.frase);
    }

    alertaAnterior.current = novo;
    setAlerta(novo);

  }, [status, disparar]);

  function trocarAba(id) {

    setAba(id);
    // A aba nova abre do começo (pulo seco, sem rolagem animada).
    window.scrollTo(0, 0);

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
  const abaAtual = ABAS.find(a => a.id === aba);

  return (
    <div className={`escopo-motorista raiz-pagina tela-${classeTela}`}>

      {faixaTopo && (
        <div className="faixa-offline" id="faixaOffline" role="status" aria-live="polite">{faixaTopo}</div>
      )}

      <header className="topo">
        <Icone nome="marca" tamanho={26} />
        <span className="topo-textos">
          <span className="veiculo" id="veiculoMotorista">
            {dados ? `${dados.veiculo.id} · ${dados.veiculo.tipo}` : usuario?.veiculo || ""}
          </span>
          <h1 className="topo-titulo" id="tituloAba">{abaAtual.texto}</h1>
        </span>
      </header>

      <DicaSom alertas={alertas} />

      <main className="conteudo">

        {dados && alerta && (
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

        {!dados && aba !== "perfil" && <EstadoSemDados erro={erro} />}

        {dados && (
          <>
            <div className="painel-aba painel-agora" id="painelAgora" hidden={aba !== "agora"}>
              <AbaAgora
                dados={dados}
                status={status}
                agora={agora}
                antigo={antigo}
                falhaSensor={falhaSensor}
                horaLeitura={horaLeitura}
                minutos={minutos}
              />
            </div>
            <div className="painel-aba" id="painelViagem" hidden={aba !== "viagem"}>
              <AbaViagem dados={dados} agora={agora} />
            </div>
            <div className="painel-aba" id="painelHistorico" hidden={aba !== "historico"}>
              <AbaHistorico dados={dados} />
            </div>
          </>
        )}

        <div className="painel-aba" id="painelPerfil" hidden={aba !== "perfil"}>
          <AbaPerfil dados={dados} alertas={alertas} telaAcesa={telaAcesa} />
        </div>

      </main>

      <nav className="abas" aria-label="Seções da tela do motorista">
        {ABAS.map(item => (
          <button
            key={item.id}
            type="button"
            className="aba"
            id={`aba-${item.id}`}
            aria-current={item.id === aba ? "page" : undefined}
            onClick={() => trocarAba(item.id)}
          >
            <Icone nome={item.icone} tamanho={24} />
            {item.texto}
          </button>
        ))}
      </nav>

    </div>
  );

}


// Antes da primeira resposta: carregando, sem veículo vinculado ou API fora.
function EstadoSemDados({ erro }) {

  if (erro?.tipo === "sem-veiculo") {
    return (
      <div className="estado" id="estadoMotorista">
        <strong>Nenhum veículo vinculado a você.</strong>
        Peça ao gestor para escolher o seu veículo em Configurações → Usuários.
      </div>
    );
  }

  if (erro?.tipo === "falha") {
    return (
      <div className="estado" id="estadoMotorista">
        <strong>Não foi possível falar com o Azure.</strong>
        A leitura volta na próxima atualização ({UPDATE_INTERVAL / 1000} s).
      </div>
    );
  }

  return <p className="estado" id="estadoMotorista">Carregando a leitura do veículo…</p>;

}
