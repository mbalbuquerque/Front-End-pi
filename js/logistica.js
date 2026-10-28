
"use strict";

// Dados exclusivamente demonstrativos.
// Não representam telemetria real do ThingSpeak.

let idEmEdicao = null;
let operacaoPendente = null;

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
      carga.status === "Entregue" ? "entregue" :
      carga.status === "Cancelada" ? "cancelada" : "transporte"
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

  const acoes = $("acoesDetalhes");
  acoes.replaceChildren();
  if (carga.status === "Em transporte" || carga.status === "Atenção") {
    adicionarBotaoAcao(acoes, "Editar", "btn-secondary", () => {
      $("modalDetalhes").close();
      abrirEdicao(carga);
    });
    adicionarBotaoAcao(acoes, "Concluir entrega", "btn-primary", () => {
      $("modalDetalhes").close();
      pedirConfirmacao(carga, "Entregue");
    });
    adicionarBotaoAcao(acoes, "Cancelar carga", "btn-danger", () => {
      $("modalDetalhes").close();
      pedirConfirmacao(carga, "Cancelada");
    });
  }
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

  if (idEmEdicao !== null) {
    const carga = cargas.find(c => c.id === idEmEdicao);
    if (!carga || !["Em transporte", "Atenção"].includes(carga.status)) {
      $("mensagemForm").textContent = "Esta carga não pode mais ser editada.";
      return;
    }
    Object.assign(carga, { produto, origem, destino, sensor, tempMin, tempMax });
    idEmEdicao = null;
    formulario.reset();
    $("modalCarga").close();
    $("feedbackOperacao").textContent = "Carga atualizada (somente nesta sessão).";
    renderizarCargas();
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

function adicionarBotaoAcao(conteiner, texto, classe, acao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", acao);
  conteiner.appendChild(botao);
}

function abrirEdicao(carga) {
  idEmEdicao = carga.id;
  $("tituloModalCarga").textContent = `Editar carga ${carga.id}`;
  $("salvarCarga").textContent = "Salvar alterações";
  $("mensagemForm").textContent = "";
  for (const campo of ["produto", "origem", "destino", "sensor", "tempMin", "tempMax"]) {
    $(campo).value = carga[campo];
  }
  $("modalCarga").showModal();
}

function pedirConfirmacao(carga, novoStatus) {
  if (!["Em transporte", "Atenção"].includes(carga.status)) return;
  operacaoPendente = { id: carga.id, novoStatus };
  $("tituloConfirmacao").textContent = novoStatus === "Entregue" ? "Concluir entrega" : "Cancelar carga";
  $("textoConfirmacao").textContent = `Confirma alterar a carga ${carga.id} para ${novoStatus}? Nesta demonstração, a ação não poderá ser desfeita sem recarregar a página.`;
  $("confirmarOperacao").textContent = novoStatus === "Entregue" ? "Confirmar entrega" : "Confirmar cancelamento";
  $("modalConfirmacao").showModal();
}

$("cancelarConfirmacao").addEventListener("click", () => $("modalConfirmacao").close());
$("modalConfirmacao").addEventListener("close", () => { operacaoPendente = null; });
$("confirmarOperacao").addEventListener("click", () => {
  if (!operacaoPendente) return;
  const carga = cargas.find(c => c.id === operacaoPendente.id);
  if (carga && ["Em transporte", "Atenção"].includes(carga.status)) {
    carga.status = operacaoPendente.novoStatus;
    $("feedbackOperacao").textContent = `Carga ${carga.id}: ${carga.status} (somente nesta sessão).`;
  }
  operacaoPendente = null;
  $("modalConfirmacao").close();
  renderizarCargas();
});

$("btnNovaCarga").addEventListener("click", () => {
  idEmEdicao = null;
  $("formCarga").reset();
  $("tituloModalCarga").textContent = "Nova carga";
  $("salvarCarga").textContent = "Cadastrar carga demonstrativa";
  $("mensagemForm").textContent = "";
  $("modalCarga").showModal();
});

$("fecharModal").addEventListener("click", () => {
  $("modalCarga").close();
  idEmEdicao = null;
});

$("fecharDetalhes").addEventListener("click", () => {
  $("modalDetalhes").close();
});

$("formCarga").addEventListener("submit", cadastrarCarga);
$("pesquisaCarga").addEventListener("input", renderizarCargas);
$("filtroStatus").addEventListener("change", renderizarCargas);

renderizarCargas();
