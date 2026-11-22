// Aba "Histórico": gráfico da última hora com a faixa segura e os limites, e a
// mínima, a máxima e a média do período. API sem o histórico: uma frase.

import { formatarTemp } from "../../lib/formatar.js";
import GraficoMotorista from "./GraficoMotorista.jsx";
import { resumoDoHistorico, ultimosMinutos } from "./motorista.js";


export default function AbaHistorico({ dados }) {

  const pontos = ultimosMinutos(dados.historico, 60);
  const resumo = resumoDoHistorico(pontos);

  return (
    <section className="cartao" id="historicoMotorista" aria-labelledby="tituloHistorico">
      <div className="cartao-topo">
        <h2 className="rotulo-cartao" id="tituloHistorico">Última hora</h2>
        {resumo && <span className="contagem">{resumo.total === 1 ? "1 leitura" : `${resumo.total} leituras`}</span>}
      </div>

      {resumo ? (
        <>
          <GraficoMotorista pontos={pontos} faixa={dados.faixa} id="graficoHistorico" alto />
          <dl className="resumo-hora" id="resumoHora">
            <div>
              <dt>Mínima</dt>
              <dd>{formatarTemp(resumo.minima)}</dd>
            </div>
            <div>
              <dt>Máxima</dt>
              <dd>{formatarTemp(resumo.maxima)}</dd>
            </div>
            <div>
              <dt>Média</dt>
              <dd>{formatarTemp(resumo.media)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="vazio">O histórico aparece quando o servidor enviar as leituras da última hora.</p>
      )}
    </section>
  );

}
