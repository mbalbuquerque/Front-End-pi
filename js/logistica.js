
"use strict";

// Dados exclusivamente demonstrativos.
// Não representam telemetria real do ThingSpeak.

const cargas = [
  {
    id: "CT-001",
    produto: "Uva",
    origem: "Petrolina/PE",
    destino: "Recife/PE",
    sensor: "ESP32-01",
    tempMin: 2,
    tempMax: 8,
    temperatura: 6.2,
    status: "Em transporte"
  },
  {
    id: "CT-002",
    produto: "Manga",
    origem: "Juazeiro/BA",
    destino: "Salvador/BA",
    sensor: "ESP32-02",
    tempMin: 10,
    tempMax: 12,
    temperatura: 12.8,
    status: "Atenção"
  },
  {
    id: "CT-003",
    produto: "Uva",
    origem: "Petrolina/PE",
    destino: "Fortaleza/CE",
    sensor: "ESP32-03",
    tempMin: 2,
    tempMax: 8,
    temperatura: 5.7,
    status: "Em transporte"
  }
];

const $ = (id) => document.getElementById(id);

const formatarTemperatura = (valor) =>
  valor === null ? "Sem leitura" : `${valor.toFixed(1)} °C`;

function atualizarIndicadores() {
  $("totalCargas").textContent = cargas.length;

  $("cargasTransporte").textContent =
    cargas.filter(c => c.status === "Em transporte").length;

  $("cargasAtencao").textContent =
    cargas.filter(c => c.status === "Atenção").length;

  $("totalSensores").textContent =
    new Set(cargas.map(c => c.sensor)).size;
}

function criarCelula(linha, texto) {
  const celula = document.createElement("td");
  celula.textContent = texto;
  linha.appendChild(celula);
  return celula;
}

function renderizarCargas() {
  const pesquisa = $("pesquisaCarga").value.trim().toLowerCase();
  const filtro = $("filtroStatus").value;
  const tabela = $("tabelaCargas");

  tabela.replaceChildren();

  const filtradas = cargas.filter(carga => {
    const texto = [
      carga.id, carga.produto,
      carga.origem, carga.destino, carga.sensor
    ].join(" ").toLowerCase();

    return texto.includes(pesquisa) &&
      (!filtro || carga.status === filtro);
  });

  filtradas.forEach(carga => {
    const linha = document.createElement("tr");

    criarCelula(linha, carga.id);
    criarCelula(linha, carga.produto);
    criarCelula(linha, `${carga.origem} → ${carga.destino}`);
    criarCelula(linha, carga.sensor);
    criarCelula(linha, formatarTemperatura(carga.temperatura));

    const celulaStatus = criarCelula(linha, "");
    const status = document.createElement("span");

    status.className = "status " + (
      carga.status === "Atenção" ? "atencao" :
      carga.status === "Entregue" ? "entregue" : "transporte"
    );

    status.textContent = carga.status;
    celulaStatus.appendChild(status);

    const celulaAcao = criarCelula(linha, "");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "Detalhes";
    botao.addEventListener("click", () => abrirDetalhes(carga));
    celulaAcao.appendChild(botao);

    tabela.appendChild(linha);
  });

  $("semResultados").hidden = filtradas.length > 0;
  atualizarIndicadores();
}

function abrirDetalhes(carga) {
  const conteudo = $("conteudoDetalhes");
  conteudo.replaceChildren();

  const campos = {
    "Identificação": carga.id,
    "Produto": carga.produto,
    "Origem": carga.origem,
    "Destino": carga.destino,
    "Sensor": carga.sensor,
    "Faixa configurada":
      `${carga.tempMin} °C a ${carga.tempMax} °C`,
    "Temperatura demonstrativa":
      formatarTemperatura(carga.temperatura),
    "Situação": carga.status
  };

  Object.entries(campos).forEach(([titulo, valor]) => {
    const paragrafo = document.createElement("p");
    const destaque = document.createElement("strong");
    destaque.textContent = `${titulo}: `;
    paragrafo.append(destaque, document.createTextNode(valor));
    conteudo.appendChild(paragrafo);
  });

  $("modalDetalhes").showModal();
}

function cadastrarCarga(evento) {
  evento.preventDefault();

  const formulario = $("formCarga");
  const dados = new FormData(formulario);

  const produto = String(dados.get("produto")).trim();
  const origem = String(dados.get("origem")).trim();
  const destino = String(dados.get("destino")).trim();
  const sensor = String(dados.get("sensor")).trim();
  const tempMin = Number(dados.get("tempMin"));
  const tempMax = Number(dados.get("tempMax"));

  if (!produto || !origem || !destino || !sensor ||
      !Number.isFinite(tempMin) || !Number.isFinite(tempMax) ||
      tempMin >= tempMax) {
    $("mensagemForm").textContent =
      "Confira os campos e informe uma faixa de temperatura válida.";
    return;
  }

  const proximoId = Math.max(
    0,
    ...cargas.map(c => Number(c.id.replace("CT-", "")) || 0)
  ) + 1;

  cargas.push({
    id: `CT-${String(proximoId).padStart(3, "0")}`,
    produto,
    origem,
    destino,
    sensor,
    tempMin,
    tempMax,
    temperatura: null,
    status: "Em transporte"
  });

  formulario.reset();
  $("mensagemForm").textContent = "";
  $("modalCarga").close();

  renderizarCargas();
}

$("btnNovaCarga").addEventListener("click", () => {
  $("mensagemForm").textContent = "";
  $("modalCarga").showModal();
});

$("fecharModal").addEventListener("click", () => {
  $("modalCarga").close();
});

$("fecharDetalhes").addEventListener("click", () => {
  $("modalDetalhes").close();
});

$("formCarga").addEventListener("submit", cadastrarCarga);
$("pesquisaCarga").addEventListener("input", renderizarCargas);
$("filtroStatus").addEventListener("change", renderizarCargas);

renderizarCargas();
