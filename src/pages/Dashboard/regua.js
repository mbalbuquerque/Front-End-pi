// Régua de faixa do cartão herói: zonas segura / atenção / crítica da carga
// numa escala horizontal e a posição da temperatura atual (design system,
// seção 7). Só cálculo; o desenho fica no ReguaFaixa.jsx.

// Folga da escala além da última zona, em múltiplos da margem.
const FOLGA = 1;


// faixa: { min (null = sem mínimo), max, margem }; temperatura: número ou NaN/null.
// Devolve { inicio, fim, zonas: [{ tipo, de, ate, largura }], marcador } com
// largura e marcador em % da régua (marcador null sem leitura).
export function montarRegua(faixa, temperatura) {

  const { min, max, margem } = faixa;
  const valor = typeof temperatura === "number" && !Number.isNaN(temperatura) ? temperatura : null;

  const limites = [];

  if (min == null) {
    // Sem mínimo: a zona segura começa em 0 °C ou abaixo, se a faixa ou a leitura pedir.
    limites.push(Math.min(0, max - 2 * margem, valor ?? 0));
  }
  else {
    limites.push(Math.min(min - margem * (1 + FOLGA), valor ?? Infinity));
  }

  let inicio = limites[0];
  let fim = Math.max(max + margem * (1 + FOLGA), valor ?? -Infinity);

  const cortes = min == null
    ? [
      { tipo: "normal", de: inicio, ate: max },
      { tipo: "atencao", de: max, ate: max + margem },
      { tipo: "critico", de: max + margem, ate: fim }
    ]
    : [
      { tipo: "critico", de: inicio, ate: min - margem },
      { tipo: "atencao", de: min - margem, ate: min },
      { tipo: "normal", de: min, ate: max },
      { tipo: "atencao", de: max, ate: max + margem },
      { tipo: "critico", de: max + margem, ate: fim }
    ];

  const total = fim - inicio;
  const porcento = v => Math.round(((v - inicio) / total) * 1000) / 10;

  return {
    inicio,
    fim,
    zonas: cortes
      .filter(zona => zona.ate > zona.de)
      .map(zona => ({ ...zona, largura: porcento(zona.ate) - porcento(zona.de) })),
    marcador: valor == null ? null : porcento(valor)
  };

}


// "15 a 20 °C" ou "7 a 10 °C ou 13 a 16 °C" (zona de atenção, para a legenda).
export function descreverAtencao(faixa) {

  const { min, max, margem } = faixa;
  const acima = `${max} a ${max + margem} °C`;

  return min == null ? acima : `${min - margem} a ${min} °C ou ${acima}`;

}
