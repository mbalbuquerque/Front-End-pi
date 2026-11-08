// Painel "Calor na rota" do dashboard (antigo carregarRisco() de js/risco.js).
// Busca a previsão agora e a cada 30 minutos; sem previsão, mostra só o histórico.

import { useState } from "react";
import { usePolling } from "../../hooks/usePolling.js";
import {
  INTERVALO_RISCO,
  LIMIAR_CALOR,
  LIMIAR_CALOR_FORTE,
  buscarPrevisaoRota,
  faixaCalor,
  janelaFresca,
  resumoRisco,
  textoHistorico
} from "./risco.js";


export default function RiscoRota() {

  // { tipo: "carregando" | "erro" | "ok", ... }
  const [estado, setEstado] = useState({ tipo: "carregando" });

  usePolling(async sinal => {

    let previsao;

    try {
      previsao = await buscarPrevisaoRota({ signal: sinal });
    } catch (erro) {
      if (sinal.aborted) return;
      console.error("Erro ao buscar a previsão:", erro);
      setEstado({ tipo: "erro", historico: textoHistorico() });
      return;
    }

    if (sinal.aborted) return;

    setEstado({
      tipo: "ok",
      previsao,
      resumo: resumoRisco(previsao),
      janela: janelaFresca(previsao),
      historico: textoHistorico()
    });

  }, INTERVALO_RISCO, []);

  return (
    <article className="panel risco" id="risco">
      {estado.tipo === "carregando" && (
        <>
          <h2>Calor na rota hoje</h2>
          <p>Carregando a previsão…</p>
        </>
      )}
      {estado.tipo === "erro" && (
        <>
          <h2>Calor na rota</h2>
          <p>{estado.historico}</p>
          <div className="nota">A previsão do dia não carregou. Mostrando só o histórico.</div>
        </>
      )}
      {estado.tipo === "ok" && <PrevisaoRota {...estado} />}
    </article>
  );

}


function PrevisaoRota({ previsao, resumo, janela, historico }) {

  return (
    <>
      <h2>Calor na rota · próximas 24 h</h2>
      <p>{resumo} Janela mais fresca para carregar em Petrolina: <strong>{janela}</strong>.</p>

      <ol className="faixa-horas" aria-label="Temperatura máxima da rota por hora">
        {previsao.map((h, i) => {
          const f = faixaCalor(h.temp);
          return (
            <li
              key={i}
              className={`hora-risco ${f.classe}`}
              title={`${h.hora}h: ${h.temp.toFixed(1)} °C em ${h.cidade} (${f.texto})`}
            >
              <span>{h.hora}h</span>
              <strong>{h.temp.toFixed(0)}°</strong>
            </li>
          );
        })}
      </ol>

      <ul className="legenda-risco">
        <li><i className="ameno" /> até {LIMIAR_CALOR} °C</li>
        <li><i className="quente" /> acima de {LIMIAR_CALOR} °C</li>
        <li><i className="forte" /> acima de {LIMIAR_CALOR_FORTE} °C</li>
      </ul>

      <div className="nota">
        Cada hora mostra a cidade mais quente entre Petrolina e Suape (previsão Open-Meteo).
        {" "}{historico}
      </div>
    </>
  );

}
