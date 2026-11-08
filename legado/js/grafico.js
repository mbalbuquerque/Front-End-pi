// Gráfico de temperatura com a faixa segura da cadeia fria.
// Uma série (temperatura); a faixa NORMAL aparece como banda e os
// limites de atenção e crítico como linhas tracejadas com rótulo direto.

const SVG_NS = "http://www.w3.org/2000/svg";


function elementoSvg(tag, atributos = {}) {

  const el = document.createElementNS(SVG_NS, tag);

  Object.entries(atributos).forEach(([nome, valor]) => {
    el.setAttribute(nome, valor);
  });

  return el;

}


function desenharGrafico(container, leituras, opcoes = {}) {

  // Faixa do perfil da carga: normal [min, max], atenção até `margem` °C fora.
  const faixa = opcoes.faixa || FAIXA_PADRAO;
  const normalMax = faixa.max;
  const atencaoMax = faixa.max + faixa.margem;
  const normalMin = faixa.min;
  const atencaoMin = faixa.min == null ? null : faixa.min - faixa.margem;

  const pontos = leituras
    .filter(l => typeof l.temperatura === "number")
    .map(l => ({ data: horarioDe(l), temp: l.temperatura, status: l.status }))
    .sort((a, b) => a.data - b.data);

  container.innerHTML = "";
  container.classList.add("grafico");

  if (pontos.length === 0) {
    container.innerHTML =
      '<div class="estado"><strong>Sem leituras neste período.</strong>O gráfico aparece quando o sensor enviar dados.</div>';
    return;
  }

  // Desenha na largura real do painel: texto do eixo fica em pixels de
  // verdade (11px), sem encolher em painel estreito.
  const L = Math.max(300, Math.round(container.clientWidth) || 760);
  const A = L < 500 ? 220 : 260;
  const m = { topo: 16, dir: L < 500 ? 92 : 118, base: 30, esq: 40 };

  const larg = L - m.esq - m.dir;
  const alt = A - m.topo - m.base;

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

  const svg = elementoSvg("svg", {
    viewBox: `0 0 ${L} ${A}`,
    role: "img",
    "aria-label":
      `Temperatura de ${formatarDataHora(pontos[0].data)} a ${formatarDataHora(pontos[pontos.length - 1].data)}: ` +
      `mínima ${formatarTemp(resumo.minima)}, máxima ${formatarTemp(resumo.maxima)}, ` +
      `${resumo.atencao + resumo.critico} leituras fora da faixa normal.`
  });


  // Banda da faixa normal (do mínimo do perfil, ou do piso do eixo, até o máximo).
  svg.appendChild(elementoSvg("rect", {
    class: "banda",
    x: m.esq,
    y: y(normalMax),
    width: larg,
    height: y(normalMin ?? yMin) - y(normalMax)
  }));

  const rotuloBanda = elementoSvg("text", {
    class: "rotulo-limite banda-rotulo",
    x: m.esq + 8,
    y: y(normalMax) + 16
  });
  rotuloBanda.textContent = "Faixa normal";
  svg.appendChild(rotuloBanda);


  // Grade e eixo Y (4 divisões).
  const eixo = elementoSvg("g", { class: "eixo" });

  for (let i = 0; i <= 4; i++) {

    const valor = yMin + ((yMax - yMin) * i) / 4;
    const py = y(valor);

    eixo.appendChild(elementoSvg("line", {
      class: "grade", x1: m.esq, x2: m.esq + larg, y1: py, y2: py
    }));

    const rot = elementoSvg("text", {
      x: m.esq - 8, y: py + 4, "text-anchor": "end"
    });
    rot.textContent = `${Math.round(valor)}°`;
    eixo.appendChild(rot);

  }

  // Eixo X: início e fim do período.
  [[pontos[0].data, "start"], [pontos[pontos.length - 1].data, "end"]]
    .forEach(([data, ancora], i) => {

      if (i === 1 && t1 === t0) {
        return;
      }

      const rot = elementoSvg("text", {
        x: ancora === "start" ? m.esq : m.esq + larg,
        y: A - 8,
        "text-anchor": ancora
      });
      // Em painel estreito só cabe a hora.
      rot.textContent = L < 500
        ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : formatarDataHora(data);
      eixo.appendChild(rot);

    });

  svg.appendChild(eixo);


  // Linhas de limite com rótulo direto à direita.
  [
    [normalMax, "atencao", `Atenção > ${normalMax}°`],
    [atencaoMax, "critico", `Crítico > ${atencaoMax}°`],
    ...(normalMin == null ? [] : [
      [normalMin, "atencao", `Atenção < ${normalMin}°`],
      [atencaoMin, "critico", `Crítico < ${atencaoMin}°`]
    ])
  ].forEach(([valor, classe, rotulo]) => {

    svg.appendChild(elementoSvg("line", {
      class: `limite ${classe}`,
      x1: m.esq, x2: m.esq + larg, y1: y(valor), y2: y(valor)
    }));

    const rot = elementoSvg("text", {
      class: `rotulo-limite ${classe}`,
      x: m.esq + larg + 8,
      y: y(valor) + 4
    });
    rot.textContent = rotulo;
    svg.appendChild(rot);

  });


  // Linha da temperatura. Um intervalo sem leitura maior que 3 envios
  // interrompe a linha: ligar os dois lados inventaria dado que não existe.
  const lacunaMax = CONFIG.UPDATE_INTERVAL * 3;

  const caminho = pontos
    .map((p, i) => {
      const quebra = i === 0 || p.data - pontos[i - 1].data > lacunaMax;
      return `${quebra ? "M" : "L"}${x(p.data.getTime()).toFixed(1)},${y(p.temp).toFixed(1)}`;
    })
    .join(" ");

  if (pontos.length > 1) {
    svg.appendChild(elementoSvg("path", { class: "linha", d: caminho }));
  }

  // Pontos fora da faixa ficam marcados quando há espaço entre eles;
  // leituras muito juntas deixariam os pontos empilhados.
  const espacoMin = pontos.slice(1).reduce(
    (menor, p, i) => Math.min(menor, x(p.data.getTime()) - x(pontos[i].data.getTime())),
    Infinity
  );

  pontos.forEach((p, i) => {

    const fora = p.temp > normalMax;

    // Ponto isolado (sem vizinho na linha) sempre aparece.
    const isolado =
      (i === 0 || p.data - pontos[i - 1].data > lacunaMax) &&
      (i === pontos.length - 1 || pontos[i + 1].data - p.data > lacunaMax);

    if (!isolado && (!fora || espacoMin < 12)) {
      return;
    }

    svg.appendChild(elementoSvg("circle", {
      class: fora && espacoMin >= 12
        ? `ponto-fora ${p.temp > atencaoMax ? "critico" : "atencao"}`
        : "marcador",
      cx: x(p.data.getTime()),
      cy: y(p.temp),
      r: 4.5
    }));

  });


  // Camada de hover: cruz + marcador + dica.
  const cruz = elementoSvg("line", {
    class: "cruz", y1: m.topo, y2: m.topo + alt, visibility: "hidden"
  });

  const marcador = elementoSvg("circle", {
    class: "marcador", r: 5, visibility: "hidden"
  });

  const alvo = elementoSvg("rect", {
    class: "alvo", x: m.esq, y: m.topo, width: larg, height: alt
  });

  svg.append(cruz, marcador, alvo);
  container.appendChild(svg);

  const dica = document.createElement("div");
  dica.className = "tooltip";
  dica.hidden = true;
  container.appendChild(dica);

  function mostrar(evento) {

    const caixa = svg.getBoundingClientRect();
    const escala = L / caixa.width;
    const px = (evento.clientX - caixa.left) * escala;

    let maisPerto = pontos[0];

    pontos.forEach(p => {
      if (Math.abs(x(p.data.getTime()) - px) < Math.abs(x(maisPerto.data.getTime()) - px)) {
        maisPerto = p;
      }
    });

    const cx = x(maisPerto.data.getTime());
    const cy = y(maisPerto.temp);

    cruz.setAttribute("x1", cx);
    cruz.setAttribute("x2", cx);
    cruz.setAttribute("visibility", "visible");

    marcador.setAttribute("cx", cx);
    marcador.setAttribute("cy", cy);
    marcador.setAttribute("visibility", "visible");

    const info = STATUS_INFO[maisPerto.status];

    dica.innerHTML =
      `${formatarTemp(maisPerto.temp)}${info ? " · " + info.texto : ""}` +
      `<span>${formatarDataHora(maisPerto.data)}</span>`;
    dica.hidden = false;

    // Posiciona a dica acima do ponto, sem sair do painel.
    const larguraDica = dica.offsetWidth;
    let esquerda = cx / escala - larguraDica / 2;
    esquerda = Math.max(0, Math.min(esquerda, caixa.width - larguraDica));

    dica.style.transform =
      `translate(${esquerda}px, ${Math.max(0, cy / escala - dica.offsetHeight - 12)}px)`;

  }

  function esconder() {
    cruz.setAttribute("visibility", "hidden");
    marcador.setAttribute("visibility", "hidden");
    dica.hidden = true;
  }

  alvo.addEventListener("pointermove", mostrar);
  alvo.addEventListener("pointerdown", mostrar);
  alvo.addEventListener("pointerleave", esconder);

  // Redesenha quando a largura do painel muda (girar o celular, redimensionar),
  // sempre com os dados da última atualização.
  container.ultimoDesenho = { leituras, opcoes };

  if (!container.dataset.observado && "ResizeObserver" in window) {

    container.dataset.observado = "1";

    let larguraAnterior = container.clientWidth;

    new ResizeObserver(() => {

      if (Math.abs(container.clientWidth - larguraAnterior) > 20) {
        larguraAnterior = container.clientWidth;
        desenharGrafico(
          container,
          container.ultimoDesenho.leituras,
          container.ultimoDesenho.opcoes
        );
      }

    }).observe(container);

  }

}
