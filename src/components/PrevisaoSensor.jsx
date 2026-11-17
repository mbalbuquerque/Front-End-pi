// Previsão da temperatura do sensor 10 min à frente (GET /api/predict/sensor, #60).
// Um componente, duas variantes:
// - "painel": cartão herói da Visão Geral; recebe o deviceId do veículo escolhido
//   e mostra também o erro médio (MAE) de cada método no teste;
// - "motorista": tela do celular; sem deviceId (a API usa o sensor do veículo
//   vinculado), texto grande e sem animação.
// Mostra a previsão recomendada pela API, com o método dito em texto. Rota ainda
// não publicada (404), limite de chamadas (429) ou qualquer falha: não mostra
// nada e o resto da tela segue como estava.

import { useState } from "react";
import { usePolling } from "../hooks/usePolling.js";
import { UPDATE_INTERVAL } from "../lib/config.js";
import { formatarTemp } from "../lib/formatar.js";
import { buscarPrevisaoSensor, formatarMae, resumirPrevisao } from "../lib/previsaoSensor.js";
import Icone from "./Icone.jsx";


export default function PrevisaoSensor({ variante = "painel", deviceId }) {

  const [resumo, setResumo] = useState(null);

  const precisaDoSensor = variante !== "motorista";

  usePolling(async sinal => {

    if (precisaDoSensor && !deviceId) {
      setResumo(null);
      return;
    }

    try {
      const resposta = await buscarPrevisaoSensor({ deviceId: precisaDoSensor ? deviceId : undefined, signal: sinal });
      if (sinal.aborted) return;
      setResumo(resumirPrevisao(resposta));
    } catch {
      if (sinal.aborted) return;
      setResumo(null);
    }

  }, UPDATE_INTERVAL, [deviceId, variante]);

  if (!resumo) {
    return null;
  }

  return (
    <section
      className={`previsao previsao--${variante}`}
      id="previsaoSensor"
      aria-label={`Previsão de temperatura em ${resumo.horizonte} minutos`}
    >
      {resumo.tipo === "sem-previsao" ? <SemPrevisao resumo={resumo} /> : <ComPrevisao resumo={resumo} variante={variante} />}
    </section>
  );

}


function SemPrevisao({ resumo }) {

  return (
    <p className="previsao-linha" id="previsaoTexto">
      <strong>Sem previsão para {resumo.horizonte} min.</strong> {resumo.motivo}
    </p>
  );

}


function ComPrevisao({ resumo, variante }) {

  return (
    <>
      <p className="previsao-linha" id="previsaoTexto">
        Previsão {resumo.horizonte} min: <strong className="previsao-valor">{formatarTemp(resumo.temperatura)}</strong>
        {" "}— método: {resumo.metodo}
      </p>

      {resumo.antecipa && (
        <p className={`previsao-aviso previsao-aviso--${resumo.status.classe}`} id="previsaoAviso" role="status">
          <Icone nome={resumo.status.classe === "critico" ? "critico" : "alerta"} tamanho={variante === "motorista" ? 28 : 20} />
          <span>
            <strong>Previsto: {resumo.status.texto}</strong> em {resumo.horizonte} min, antes de acontecer.
          </span>
        </p>
      )}

      {variante === "painel" && resumo.mae && (
        <p className="previsao-apoio" id="previsaoErros">
          Erro médio no teste: modelo {formatarMae(resumo.mae.modelo)} °C · persistência {formatarMae(resumo.mae.baseline)} °C.
          {!resumo.superaBaseline && " O modelo ainda não supera a persistência."}
        </p>
      )}
    </>
  );

}
