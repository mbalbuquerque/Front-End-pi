// Gráfico de linha da tela do motorista (abas Agora e Histórico): a faixa
// segura como banda, os limites de atenção e crítico como linhas tracejadas
// com rótulo direto e a temperatura como uma linha só.
//
// O desenho (banda, linhas, curva) é um SVG que estica na largura do cartão;
// os rótulos e o ponto atual são HTML por cima, posicionados em %, para o texto
// não deformar e ficar no tamanho real (>= 12 px). Sem dica de ponteiro: a tela
// é lida de relance, sem toque. Nada anima.

import { UPDATE_INTERVAL } from "../../lib/config.js";
import { formatarHora, formatarTemp } from "../../lib/formatar.js";

const LARGURA = 100;
const ALTURA = 100;

// Intervalo sem leitura maior que 3 envios interrompe a linha.
const LACUNA_MAX = UPDATE_INTERVAL * 3;


function quando(ponto) {

  return Date.parse(ponto.medidoEm);

}


// Escala, banda, limites e caminho; null sem pontos.
function montarGrafico(pontos, faixa) {

  if (pontos.length === 0) {
    return null;
  }

  const temps = pontos.map(p => p.temperatura);

  const limites = [];
  if (faixa) {
    const { min, max, margem } = faixa;
    // Limites de cima com o rótulo acima da linha; os de baixo, abaixo.
    limites.push({ valor: max, tipo: "atencao acima", texto: `ATENÇÃO ${max} °C` });
    limites.push({ valor: max + margem, tipo: "critico acima", texto: `CRÍTICO ${max + margem} °C` });
    if (min != null) {
      limites.push({ valor: min, tipo: "atencao abaixo", texto: `ATENÇÃO ${min} °C` });
      limites.push({ valor: min - margem, tipo: "critico abaixo", texto: `CRÍTICO ${min - margem} °C` });
    }
  }

  const valores = [...temps, ...limites.map(l => l.valor)];
  const yMin = Math.floor(Math.min(...valores) - 1);
  const yMax = Math.ceil(Math.max(...valores) + 1);

  const t0 = quando(pontos[0]);
  const t1 = quando(pontos[pontos.length - 1]);

  const x = t => (t1 === t0 ? LARGURA : ((t - t0) / (t1 - t0)) * LARGURA);
  const y = v => (1 - (v - yMin) / (yMax - yMin)) * ALTURA;

  const caminho = pontos
    .map((p, i) => {
      const quebra = i === 0 || quando(p) - quando(pontos[i - 1]) > LACUNA_MAX;
      return `${quebra ? "M" : "L"}${x(quando(p)).toFixed(2)},${y(p.temperatura).toFixed(2)}`;
    })
    .join(" ");

  const banda = faixa
    ? { topo: y(faixa.max), base: y(faixa.min ?? yMin) }
    : null;

  const ultimo = pontos[pontos.length - 1];

  return {
    caminho,
    banda,
    limites: limites.map(l => ({ ...l, y: y(l.valor) })),
    atual: { x: x(t1), y: y(ultimo.temperatura) },
    inicio: new Date(t0),
    meio: new Date((t0 + t1) / 2),
    fim: new Date(t1),
    minima: Math.min(...temps),
    maxima: Math.max(...temps)
  };

}


export default function GraficoMotorista({ pontos, faixa, id, alto = false }) {

  const g = montarGrafico(pontos, faixa);

  if (!g) {
    return null;
  }

  const rotulo =
    `Temperatura de ${formatarHora(g.inicio)} a ${formatarHora(g.fim)}: ` +
    `mínima ${formatarTemp(g.minima)}, máxima ${formatarTemp(g.maxima)}, ` +
    `agora ${formatarTemp(pontos[pontos.length - 1].temperatura)}.`;

  const faixaTexto = faixa
    ? (faixa.min == null ? `FAIXA SEGURA (até ${faixa.max} °C)` : `FAIXA SEGURA (${faixa.min}–${faixa.max} °C)`)
    : null;

  return (
    <figure className={alto ? "grafico-motorista alto" : "grafico-motorista"} id={id}>

      <div className="grafico-area" role="img" aria-label={rotulo}>

        <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} preserveAspectRatio="none" aria-hidden="true">
          {g.banda && (
            <rect className="grafico-banda" x="0" y={g.banda.topo} width={LARGURA} height={Math.max(0, g.banda.base - g.banda.topo)} />
          )}
          {g.limites.map(l => (
            <line key={l.texto} className={`grafico-limite ${l.tipo}`} x1="0" x2={LARGURA} y1={l.y} y2={l.y} />
          ))}
          <path className="grafico-linha" d={g.caminho} />
        </svg>

        {faixaTexto && (
          <span className="grafico-rotulo banda" style={{ top: `${g.banda.topo}%` }} aria-hidden="true">{faixaTexto}</span>
        )}

        {g.limites.map(l => (
          <span key={l.texto} className={`grafico-rotulo ${l.tipo}`} style={{ top: `${l.y}%` }} aria-hidden="true">{l.texto}</span>
        ))}

        <span className="grafico-ponto" style={{ left: `${g.atual.x}%`, top: `${g.atual.y}%` }} aria-hidden="true" />

      </div>

      <figcaption className="grafico-eixo" aria-hidden="true">
        <span>{formatarHora(g.inicio)}</span>
        <span>{formatarHora(g.meio)}</span>
        <span>{formatarHora(g.fim)} (última)</span>
      </figcaption>

    </figure>
  );

}
