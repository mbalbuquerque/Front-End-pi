
"use strict";

// Fonte única: canal público ThingSpeak.
// Não associa automaticamente o dispositivo a cargas.

const CHANNEL_ID = "3496439";

const API_URL =
  `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=20`;

const NORMAL_MAX = 15;
const WARNING_MAX = 20;

// Ajustar ao intervalo real de transmissão do sensor.
const STALE_MINUTES = 10;

const $ = id => document.getElementById(id);

const numero = value =>
  value === null ||
  value === undefined ||
  String(value).trim() === ""
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;

const formatar = (value, digits = 1) =>
  value === null ? "—" : value.toFixed(digits);

const dataLegivel = value => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("pt-BR");
};

function limparLeituras() {
  $("temperatura").textContent = "—";
  $("umidade").textContent = "—";
  $("rssi").textContent = "—";

  $("situacao").textContent = "Sem leitura";
  $("situacao").className = "state";

  $("ultimaLeitura").textContent = "Última leitura: —";

  $("historico").replaceChildren();

  const tr = document.createElement("tr");
  const td = document.createElement("td");

  td.colSpan = 4;
  td.textContent = "Sem dados disponíveis.";

  tr.append(td);
  $("historico").append(tr);

  $("grafico").replaceChildren();

  const txt = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );

  txt.setAttribute("x", "24");
  txt.setAttribute("y", "110");
  txt.setAttribute("fill", "#6a8190");
  txt.textContent = "Sem dados para exibir";

  $("grafico").append(txt);
}

function criarGrafico(amostras) {
  const svg = $("grafico");
  svg.replaceChildren();

  const valores = amostras
    .map(x => numero(x.field1))
    .filter(x => x !== null);

  if (!valores.length) {
    const texto = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );

    texto.setAttribute("x", "24");
    texto.setAttribute("y", "110");
    texto.textContent = "Sem temperaturas disponíveis";

    svg.append(texto);
    return;
  }

  const min = Math.min(...valores, NORMAL_MAX) - 2;
  const max = Math.max(...valores, WARNING_MAX) + 2;

  const x = i =>
    46 + (i / Math.max(amostras.length - 1, 1)) * 676;

  const y = v =>
    196 - ((v - min) / (max - min)) * 158;

  function elemento(tipo, attrs) {
    const e = document.createElementNS(
      "http://www.w3.org/2000/svg",
      tipo
    );

    for (const [k, v] of Object.entries(attrs)) {
      e.setAttribute(k, String(v));
    }

    svg.append(e);
    return e;
  }

  for (const lim of [NORMAL_MAX, WARNING_MAX]) {
    elemento("line", {
      x1: 46,
      y1: y(lim),
      x2: 722,
      y2: y(lim),
      stroke: lim === NORMAL_MAX ? "#0b90a1" : "#bd8836",
      "stroke-dasharray": "5 5"
    });

    const t = elemento("text", {
      x: 8,
      y: y(lim) - 5,
      fill: "#647e8d",
      "font-size": 11
    });

    t.textContent = String(lim);
  }

  let pontos = [];

  function desenharTrecho() {
    if (pontos.length > 1) {
      elemento("polyline", {
        points: pontos.join(" "),
        fill: "none",
        stroke: "#087f92",
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      });
    }

    pontos = [];
  }

  amostras.forEach((amostra, i) => {
    const v = numero(amostra.field1);

    if (v === null) {
      desenharTrecho();
      return;
    }

    pontos.push(`${x(i)},${y(v)}`);

    elemento("circle", {
      cx: x(i),
      cy: y(v),
      r: 3,
      fill: "#087f92"
    });
  });

  desenharTrecho();

  const legenda = elemento("text", {
    x: 46,
    y: 222,
    fill: "#647e8d",
    "font-size": 12
  });

  legenda.textContent =
    "Temperatura (°C) · ordem cronológica";
}

function renderizar(dados) {
  const feeds = Array.isArray(dados?.feeds)
    ? dados.feeds.filter(
        f =>
          f &&
          f.created_at &&
          !Number.isNaN(new Date(f.created_at).getTime())
      )
    : [];

  if (!feeds.length) {
    throw new Error("O canal não retornou leituras válidas.");
  }

  feeds.sort(
    (a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
  );

  const ultima = feeds[feeds.length - 1];

  const temp = numero(ultima.field1);
  const umidade = numero(ultima.field2);
  const rssi = numero(ultima.field3);

  const idadeMin =
    (Date.now() - new Date(ultima.created_at).getTime()) / 60000;

  const antiga =
    idadeMin > STALE_MINUTES || idadeMin < -2;

  $("temperatura").textContent = formatar(temp);
  $("umidade").textContent = formatar(umidade);
  $("rssi").textContent = formatar(rssi, 0);

  $("ultimaLeitura").textContent =
    `Última leitura: ${dataLegivel(ultima.created_at)}`;

  const status = $("situacao");
  status.className = "state";

  if (antiga) {
    status.textContent = "Leitura antiga";
    status.classList.add("warning");
  } else if (temp === null) {
    status.textContent = "Sem temperatura";
  } else if (temp <= NORMAL_MAX) {
    status.textContent = "Normal";
    status.classList.add("ok");
  } else if (temp <= WARNING_MAX) {
    status.textContent = "Atenção";
    status.classList.add("warning");
  } else {
    status.textContent = "Crítico";
    status.classList.add("danger");
  }

  $("conexao").textContent = antiga
    ? "Sem comunicação recente"
    : "Leitura recente recebida";

  $("origemDados").classList.remove("error");

  $("origemDados").textContent =
    `Dados reais consultados no ThingSpeak · canal ${CHANNEL_ID}. ` +
    `Não há associação validada a uma carga. ` +
    (
      antiga
        ? "A última leitura está fora da janela de atualização configurada."
        : ""
    );

  const corpo = $("historico");
  corpo.replaceChildren();

  feeds.slice().reverse().forEach(feed => {
    const tr = document.createElement("tr");

    const valores = [
      dataLegivel(feed.created_at),
      numero(feed.field1) === null
        ? "—"
        : `${formatar(numero(feed.field1))} °C`,
      numero(feed.field2) === null
        ? "—"
        : `${formatar(numero(feed.field2))} %`,
      numero(feed.field3) === null
        ? "—"
        : `${formatar(numero(feed.field3), 0)} dBm`
    ];

    valores.forEach(valor => {
      const td = document.createElement("td");
      td.textContent = valor;
      tr.append(td);
    });

    corpo.append(tr);
  });

  criarGrafico(feeds);
}

async function carregar() {
  $("atualizar").disabled = true;
  $("conexao").textContent = "Consultando canal…";

  try {
    const resposta = await fetch(API_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    renderizar(dados);

  } catch (erro) {
    limparLeituras();

    $("conexao").textContent = "Indisponível";

    $("origemDados").textContent =
      `Não foi possível obter leituras do ThingSpeak ` +
      `(${erro.message}). ` +
      `Nenhum valor anterior foi mantido como atual.`;

    $("origemDados").classList.add("error");

  } finally {
    $("atualizar").disabled = false;
  }
}

$("atualizar").addEventListener("click", () => {
  carregar();
});

carregar();
