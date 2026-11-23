// Aba "Viagem": a viagem em curso (origem -> destino como linha do tempo de
// dois pontos, carga, há quanto tempo está na estrada) e a lista de alertas da
// viagem, montada das mudanças de status no histórico da última hora (a mais
// nova primeiro). API sem o histórico: a lista diz isso em uma frase.

import { formatarHora, formatarTemp } from "../../lib/formatar.js";
import { FRASE_MUDANCA, STATUS_MOTORISTA, alertasDoHistorico, tempoDeViagem } from "./motorista.js";


export default function AbaViagem({ dados, agora }) {

  const viagem = dados.viagem;
  const duracao = viagem ? tempoDeViagem(viagem.inicio, agora) : null;
  const temHistorico = Array.isArray(dados.historico);
  const alertas = temHistorico ? alertasDoHistorico(dados.historico, viagem?.inicio) : [];

  return (
    <>
      <section className="cartao viagem" id="viagemMotorista" aria-labelledby="tituloViagem">
        <div className="cartao-topo">
          <h2 className="rotulo-cartao" id="tituloViagem">{viagem ? "Viagem ativa" : "Viagem"}</h2>
          {duracao && <span className="chip-neutro" id="tempoViagem">em viagem há {duracao}</span>}
        </div>

        {viagem ? (
          <>
            <ol className="rota" aria-label={`De ${viagem.origem} para ${viagem.destino}`}>
              <li className="rota-ponto origem">
                <strong>{viagem.origem}</strong> <span className="rota-papel">(origem)</span>
              </li>
              <li className="rota-ponto destino">
                <strong>{viagem.destino}</strong> <span className="rota-papel">(destino)</span>
              </li>
            </ol>
            {viagem.carga && <p className="carga-viagem" id="cargaViagem">Carga: {viagem.carga}</p>}
          </>
        ) : <p className="vazio">Nenhuma viagem em curso.</p>}
      </section>

      <section className="cartao" id="alertasViagem" aria-labelledby="tituloAlertasViagem">
        <div className="cartao-topo">
          <h2 className="rotulo-cartao" id="tituloAlertasViagem">Alertas da viagem</h2>
          {alertas.length > 0 && (
            <span className="contagem">{alertas.length === 1 ? "1 registro" : `${alertas.length} registros`}</span>
          )}
        </div>

        {!temHistorico && <p className="vazio">A lista aparece quando o servidor enviar o histórico da última hora.</p>}
        {temHistorico && alertas.length === 0 && <p className="vazio">Nenhuma mudança de status na última hora.</p>}

        {alertas.length > 0 && (
          <ul className="lista-alertas">
            {alertas.map(a => {
              const info = STATUS_MOTORISTA[a.status];
              return (
                <li key={a.medidoEm} className={`alerta-item ${info.classe}`}>
                  <span className="alerta-ponto" aria-hidden="true" />
                  <span className="alerta-texto">
                    <strong className="alerta-status">{info.texto}</strong>
                    {FRASE_MUDANCA[a.status]}
                  </span>
                  <span className="alerta-valor">
                    <strong>{formatarTemp(a.temperatura)}</strong>
                    {formatarHora(new Date(a.medidoEm))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {temHistorico && <p className="nota-cartao">Mudanças de status na última hora, a mais nova primeiro.</p>}
      </section>
    </>
  );

}
