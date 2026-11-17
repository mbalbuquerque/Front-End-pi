// Card "Risco térmico da saída" do dashboard: chance de a temperatura externa
// passar de 30 °C no mês atual e na hora de saída escolhida (rota GET /api/predict).
// Sem a rota na API publicada (404), o card avisa e o resto do painel segue normal.

import { useState } from "react";
import { usePolling } from "../../hooks/usePolling.js";
import {
  buscarRisco,
  estadoDoErro,
  formatarBrier,
  formatarChance,
  infoNivel,
  momentoRecife,
  nomeDoMes
} from "../../lib/predicao.js";

// O resultado só muda com o mês e a hora: atualiza a cada 30 minutos.
const INTERVALO_PREDICAO = 30 * 60 * 1000;

const HORAS = Array.from({ length: 24 }, (_, h) => h);


export default function RiscoSaida() {

  // null = acompanha a hora atual de Recife.
  const [horaEscolhida, setHoraEscolhida] = useState(null);

  // { tipo: "carregando" | "ok" | "indisponivel" | "erro", ... }
  const [estado, setEstado] = useState({ tipo: "carregando" });

  const [agora, setAgora] = useState(() => momentoRecife());

  usePolling(async sinal => {

    const momento = momentoRecife();
    const hora = horaEscolhida ?? momento.hora;

    setAgora(momento);
    setEstado(atual => (atual.tipo === "ok" && atual.dados.hora === hora ? atual : { tipo: "carregando" }));

    try {
      const dados = await buscarRisco({ mes: momento.mes, hora, signal: sinal });
      if (sinal.aborted) return;
      setEstado({ tipo: "ok", dados });
    } catch (erro) {
      if (sinal.aborted) return;
      setEstado(estadoDoErro(erro));
    }

  }, INTERVALO_PREDICAO, [horaEscolhida]);

  const hora = horaEscolhida ?? agora.hora;

  return (
    <article className="panel risco-saida" id="riscoSaida" aria-labelledby="riscoSaidaTitulo">

      <div className="risco-saida-topo">
        <h2 id="riscoSaidaTitulo">Risco térmico da saída</h2>

        <label className="risco-saida-hora">
          <span>Hora de saída</span>
          <select
            id="riscoSaidaHora"
            value={hora}
            onChange={evento => setHoraEscolhida(Number(evento.target.value))}
          >
            {HORAS.map(h => (
              <option key={h} value={h}>{`${String(h).padStart(2, "0")}h`}</option>
            ))}
          </select>
        </label>
      </div>

      <div aria-live="polite">
        {estado.tipo === "carregando" && <p className="risco-saida-msg">Carregando o risco…</p>}
        {(estado.tipo === "erro" || estado.tipo === "indisponivel") && (
          <p className={`risco-saida-msg ${estado.tipo}`} role="status">{estado.mensagem}</p>
        )}
        {estado.tipo === "ok" && <ResultadoRisco dados={estado.dados} />}
      </div>

    </article>
  );

}


function ResultadoRisco({ dados }) {

  const info = infoNivel(dados.nivel);
  const modelo = dados.modelo || {};
  const baseline = dados.baseline || {};

  return (
    <>
      <div className="risco-saida-valor">
        <strong id="riscoSaidaChance">{formatarChance(dados.probabilidade)}</strong>
        <span id="riscoSaidaNivel" className={`status ${info.classe}`}>{info.texto}</span>
      </div>

      <p className="risco-saida-texto">
        Chance de a temperatura externa passar de {dados.limiarC ?? 30}&nbsp;°C às{" "}
        <strong>{String(dados.hora).padStart(2, "0")}h</strong> em {nomeDoMes(dados.mes)}, em Petrolina.
        Média geral sem considerar mês e hora: <strong>{formatarChance(baseline.probabilidade)}</strong>.
      </p>

      <p className="risco-saida-modelo">
        Modelo {modelo.versao || "--"} · erro (Brier) {formatarBrier(modelo.brierModelo)} contra{" "}
        {formatarBrier(modelo.brierBaseline)} da média geral, em anos que o modelo não viu.
        Usa o clima da estação INMET de Petrolina, não as leituras do sensor do baú.
      </p>
    </>
  );

}
