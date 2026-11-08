// Gráfico de temperatura com a faixa segura da cadeia fria (porte de
// legado/js/grafico.js, mesmas classes e mesmo desenho).
// Uma série (temperatura); a faixa NORMAL aparece como banda e os limites de
// atenção e crítico como linhas tracejadas com rótulo direto.
//
//   <GraficoTemperatura id="graficoTemperatura" leituras={leituras} faixa={faixa} />

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { UPDATE_INTERVAL } from "../lib/config.js";
import { FAIXA_PADRAO } from "../lib/faixas.js";
import { STATUS_INFO, formatarDataHora, formatarHora, formatarTemp } from "../lib/formatar.js";
import { horarioDe, resumir } from "../lib/leituras.js";


// Desenha na largura real do painel: o texto do eixo fica em pixels de
// verdade (11px), sem encolher em painel estreito.
function medidas(largura) {

  const L = Math.max(300, Math.round(largura) || 760);
  const A = L < 500 ? 220 : 260;
  const m = { topo: 16, dir: L < 500 ? 92 : 118, base: 30, esq: 40 };

  return { L, A, m, larg: L - m.esq - m.dir, alt: A - m.topo - m.base };

}


function montar(leituras, faixa, largura) {

  // Faixa do perfil da carga: normal [min, max], atenção até `margem` °C fora.
  const normalMax = faixa.max;
  const atencaoMax = faixa.max + faixa.margem;
  const normalMin = faixa.min;
  const atencaoMin = faixa.min == null ? null : faixa.min - faixa.margem;

  const pontos = leituras
    .filter(l => typeof l.temperatura === "number")
    .map(l => ({ data: horarioDe(l), temp: l.temperatura, status: l.status }))
    .sort((a, b) => a.data - b.data);

  if (pontos.length === 0) {
    return null;
  }

  const { L, A, m, larg, alt } = medidas(largura);

  const temps = pontos.map(p => p.temp);

  const yMin = Math.floor(Math.min(...temps, normalMax, atencaoMin ?? Infinity) - 3);
  const yMax = Math.ceil(Math.max(...temps, atencaoMax) + 3);

  const t0 = pontos[0].data.getTime();
  const t1 = pontos[pontos.length - 1].data.getTime();

  const x = t => (t1 === t0
    ? m.esq + larg / 2
    : m.esq + ((t - t0) / (t1 - t0)) * larg);

  const y = v => m.topo + (1 - (v - yMin) / (yMax - yMin)) * alt;

  const resumo = resumir(pontos.map(p => ({ temperatura: p.temp, status: p.status })));

  const rotuloAria =
    `Temperatura de ${formatarDataHora(pontos[0].data)} a ${formatarDataHora(pontos[pontos.length - 1].data)}: ` +
    `mínima ${formatarTemp(resumo.minima)}, máxima ${formatarTemp(resumo.maxima)}, ` +
    `${resumo.atencao + resumo.critico} leituras fora da faixa normal.`;

  // Grade e eixo Y (4 divisões).
  const grade = [0, 1, 2, 3, 4].map(i => {
    const valor = yMin + ((yMax - yMin) * i) / 4;
    return { py: y(valor), texto: `${Math.round(valor)}°` };
  });

  // Eixo X: início e fim do período. Em painel estreito só cabe a hora.
  const eixoX = [[pontos[0].data, "start"], [pontos[pontos.length - 1].data, "end"]]
    .filter((_, i) => !(i === 1 && t1 === t0))
    .map(([data, ancora]) => ({
      x: ancora === "start" ? m.esq : m.esq + larg,
      ancora,
      texto: L < 500 ? formatarHora(data) : formatarDataHora(data)
    }));

  const limites = [
    [normalMax, "atencao", `Atenção > ${normalMax}°`],
    [atencaoMax, "critico", `Crítico > ${atencaoMax}°`],
    ...(normalMin == null ? [] : [
      [normalMin, "atencao", `Atenção < ${normalMin}°`],
      [atencaoMin, "critico", `Crítico < ${atencaoMin}°`]
    ])
  ];

  // Linha da temperatura. Um intervalo sem leitura maior que 3 envios
  // interrompe a linha: ligar os dois lados inventaria dado que não existe.
  const lacunaMax = UPDATE_INTERVAL * 3;

  const caminho = pontos
    .map((p, i) => {
      const quebra = i === 0 || p.data - pontos[i - 1].data > lacunaMax;
      return `${quebra ? "M" : "L"}${x(p.data.getTime()).toFixed(1)},${y(p.temp).toFixed(1)}`;
    })
    .join(" ");

  // Pontos fora da faixa ficam marcados quando há espaço entre eles;
  // leituras muito juntas deixariam os pontos empilhados.
  const espacoMin = pontos.slice(1).reduce(
    (menor, p, i) => Math.min(menor, x(p.data.getTime()) - x(pontos[i].data.getTime())),
    Infinity
  );

  const marcados = pontos.flatMap((p, i) => {

    const fora = p.temp > normalMax;

    // Ponto isolado (sem vizinho na linha) sempre aparece.
    const isolado =
      (i === 0 || p.data - pontos[i - 1].data > lacunaMax) &&
      (i === pontos.length - 1 || pontos[i + 1].data - p.data > lacunaMax);

    if (!isolado && (!fora || espacoMin < 12)) {
      return [];
    }

    return [{
      classe: fora && espacoMin >= 12
        ? `ponto-fora ${p.temp > atencaoMax ? "critico" : "atencao"}`
        : "marcador",
      cx: x(p.data.getTime()),
      cy: y(p.temp)
    }];

  });

  return {
    L, A, m, larg, alt, pontos, x, y, yMin, normalMax, normalMin,
    rotuloAria, grade, eixoX, limites, caminho, marcados
  };

}


export default function GraficoTemperatura({ leituras, faixa = FAIXA_PADRAO, id, className = "" }) {

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const dicaRef = useRef(null);

  // null = ainda não medido (largura 0 é válida: vira 760, como no original).
  const [largura, setLargura] = useState(null);
  const [hover, setHover] = useState(null);

  // Mede a largura e redesenha quando ela muda mais de 20px (girar o
  // celular, redimensionar), como o original.
  useLayoutEffect(() => {

    const el = containerRef.current;

    if (!el) {
      return undefined;
    }

    let anterior = el.clientWidth;
    setLargura(anterior);

    if (!("ResizeObserver" in window)) {
      return undefined;
    }

    const observador = new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - anterior) > 20) {
        anterior = el.clientWidth;
        setLargura(anterior);
      }
    });

    observador.observe(el);

    return () => observador.disconnect();

  }, []);

  const g = useMemo(
    () => (largura === null ? null : montar(leituras, faixa, largura)),
    [leituras, faixa, largura]
  );

  // Posiciona a dica acima do ponto, sem sair do painel.
  useLayoutEffect(() => {

    const dica = dicaRef.current;

    if (!hover || !dica || !svgRef.current) {
      return;
    }

    const caixa = svgRef.current.getBoundingClientRect();
    const escala = g.L / caixa.width;
    const larguraDica = dica.offsetWidth;

    let esquerda = hover.cx / escala - larguraDica / 2;
    esquerda = Math.max(0, Math.min(esquerda, caixa.width - larguraDica));

    dica.style.transform =
      `translate(${esquerda}px, ${Math.max(0, hover.cy / escala - dica.offsetHeight - 12)}px)`;

  }, [hover, g]);

  function mostrar(evento) {

    const caixa = svgRef.current.getBoundingClientRect();
    const escala = g.L / caixa.width;
    const px = (evento.clientX - caixa.left) * escala;

    let maisPerto = g.pontos[0];

    g.pontos.forEach(p => {
      if (Math.abs(g.x(p.data.getTime()) - px) < Math.abs(g.x(maisPerto.data.getTime()) - px)) {
        maisPerto = p;
      }
    });

    setHover({ ponto: maisPerto, cx: g.x(maisPerto.data.getTime()), cy: g.y(maisPerto.temp) });

  }

  const classes = `${className} grafico`.trim();

  // Ainda sem largura medida: só o container (mede no primeiro layout).
  if (largura === null) {
    return <div id={id} className={classes} ref={containerRef} />;
  }

  if (!g) {
    return (
      <div id={id} className={classes} ref={containerRef}>
        <div className="estado"><strong>Sem leituras neste período.</strong>O gráfico aparece quando o sensor enviar dados.</div>
      </div>
    );
  }

  const { L, A, m, larg, alt, y, yMin, normalMax, normalMin } = g;
  const info = hover ? STATUS_INFO[hover.ponto.status] : null;

  return (
    <div id={id} className={classes} ref={containerRef}>

      <svg ref={svgRef} viewBox={`0 0 ${L} ${A}`} role="img" aria-label={g.rotuloAria}>

        {/* Banda da faixa normal (do mínimo do perfil, ou do piso do eixo, até o máximo). */}
        <rect
          className="banda"
          x={m.esq}
          y={y(normalMax)}
          width={larg}
          height={y(normalMin ?? yMin) - y(normalMax)}
        />
        <text className="rotulo-limite banda-rotulo" x={m.esq + 8} y={y(normalMax) + 16}>Faixa normal</text>

        <g className="eixo">
          {g.grade.map(({ py, texto }, i) => (
            <g key={i}>
              <line className="grade" x1={m.esq} x2={m.esq + larg} y1={py} y2={py} />
              <text x={m.esq - 8} y={py + 4} textAnchor="end">{texto}</text>
            </g>
          ))}
          {g.eixoX.map(rot => (
            <text key={rot.ancora} x={rot.x} y={A - 8} textAnchor={rot.ancora}>{rot.texto}</text>
          ))}
        </g>

        {g.limites.map(([valor, classe, rotulo]) => (
          <g key={rotulo}>
            <line className={`limite ${classe}`} x1={m.esq} x2={m.esq + larg} y1={y(valor)} y2={y(valor)} />
            <text className={`rotulo-limite ${classe}`} x={m.esq + larg + 8} y={y(valor) + 4}>{rotulo}</text>
          </g>
        ))}

        {g.pontos.length > 1 && <path className="linha" d={g.caminho} />}

        {g.marcados.map((p, i) => (
          <circle key={i} className={p.classe} cx={p.cx} cy={p.cy} r={4.5} />
        ))}

        {/* Camada de hover: cruz + marcador + dica. */}
        <line
          className="cruz"
          x1={hover?.cx}
          x2={hover?.cx}
          y1={m.topo}
          y2={m.topo + alt}
          visibility={hover ? "visible" : "hidden"}
        />
        <circle
          className="marcador"
          r={5}
          cx={hover?.cx}
          cy={hover?.cy}
          visibility={hover ? "visible" : "hidden"}
        />
        <rect
          className="alvo"
          x={m.esq}
          y={m.topo}
          width={larg}
          height={alt}
          onPointerMove={mostrar}
          onPointerDown={mostrar}
          onPointerLeave={() => setHover(null)}
        />

      </svg>

      <div className="tooltip" ref={dicaRef} hidden={!hover}>
        {hover && (
          <>
            {formatarTemp(hover.ponto.temp)}{info ? ` · ${info.texto}` : ""}
            <span>{formatarDataHora(hover.ponto.data)}</span>
          </>
        )}
      </div>

    </div>
  );

}
