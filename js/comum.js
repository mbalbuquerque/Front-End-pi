// Funções compartilhadas pelas telas do ColdTrack Control.


// ---------------------------------------------------------
// MENU LATERAL
// ---------------------------------------------------------

const PAGINAS = [
  { href: "dashboard.html", icone: "▦", nome: "Dashboard" },
  { href: "veiculos.html", icone: "🚚", nome: "Veículos" },
  { href: "viagens.html", icone: "↗", nome: "Viagens" },
  { href: "alertas.html", icone: "⚠", nome: "Alertas" },
  { href: "relatorios.html", icone: "▤", nome: "Relatórios" },
  { href: "configuracoes.html", icone: "⚙", nome: "Configurações" }
];


function montarMenu() {

  const sidebar = document.getElementById("sidebar");

  if (!sidebar) {
    return;
  }

  const atual =
    location.pathname.split("/").pop() || "dashboard.html";

  const links = PAGINAS.map(pagina => {

    const ativo = pagina.href === atual;

    return `<a href="${pagina.href}"${ativo ? ' class="active" aria-current="page"' : ""}>${pagina.icone} ${pagina.nome}</a>`;

  }).join("");

  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand-icon">❄</div>
      <div>
        <strong>ColdTrack</strong>
        <span>CONTROL</span>
      </div>
    </div>

    <nav aria-label="Menu principal">${links}</nav>

    <div class="sidebar-footer">
      <span class="online-dot"></span>
      Sistema Online
    </div>
  `;

}


// ---------------------------------------------------------
// DADOS (Azure Function)
// ---------------------------------------------------------

async function buscarLeituras({ deviceId = CONFIG.DEVICE_ID, limite = 50, horas, status } = {}) {

  const params = new URLSearchParams({
    deviceId,
    limite: String(limite)
  });

  if (horas) {
    params.set("horas", String(horas));
  }

  if (status) {
    params.set("status", status.join(","));
  }

  const response = await fetch(`${CONFIG.AZURE_API_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  // A API devolve da mais recente para a mais antiga.
  return data.leituras || [];

}


function horarioDe(leitura) {

  return new Date(leitura.medidoEm || leitura.recebidoEm);

}


function marcarConexao(ok) {

  const selo = document.getElementById("fonteDados");

  if (selo) {
    selo.textContent = ok ? "Azure conectado" : "Sem conexão com Azure";
  }

  const ponto = document.querySelector(".connection .online-dot");

  if (ponto) {
    ponto.style.background = ok ? "" : "var(--red)";
  }

}


// ---------------------------------------------------------
// FORMATAÇÃO
// ---------------------------------------------------------

const STATUS_INFO = {
  NORMAL: { texto: "NORMAL", classe: "normal" },
  ATENCAO: { texto: "ATENÇÃO", classe: "atencao" },
  CRITICO: { texto: "CRÍTICO", classe: "critico" }
};


function seloStatus(status) {

  const info = STATUS_INFO[status] || { texto: "SEM DADOS", classe: "aguardando" };

  return `<span class="status ${info.classe}">${info.texto}</span>`;

}


function formatarTemp(valor) {

  return typeof valor === "number" ? `${valor.toFixed(1)} °C` : "--";

}


function formatarUmidade(valor) {

  return typeof valor === "number" ? `${valor.toFixed(1)} %` : "--";

}


function formatarDataHora(data) {

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

}


function formatarDuracao(ms) {

  const minutos = Math.round(ms / 60000);

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto ? `${horas} h ${resto} min` : `${horas} h`;

}


// Escapa texto vindo de dados antes de ir para innerHTML.
function texto(valor) {

  const div = document.createElement("div");
  div.textContent = valor == null ? "" : String(valor);

  return div.innerHTML;

}


// ---------------------------------------------------------
// ESTATÍSTICAS
// ---------------------------------------------------------

function resumir(leituras) {

  const temps = leituras
    .map(l => l.temperatura)
    .filter(v => typeof v === "number");

  if (temps.length === 0) {
    return null;
  }

  const soma = temps.reduce((a, b) => a + b, 0);

  return {
    total: temps.length,
    media: soma / temps.length,
    minima: Math.min(...temps),
    maxima: Math.max(...temps),
    atencao: leituras.filter(l => l.status === "ATENCAO").length,
    critico: leituras.filter(l => l.status === "CRITICO").length
  };

}


// Agrupa leituras seguidas fora da faixa normal em ocorrências.
// Um intervalo maior que 3 envios sem leitura encerra a ocorrência.
function agruparOcorrencias(leituras) {

  const lacunaMax = CONFIG.UPDATE_INTERVAL * 3;

  const ordenadas = leituras
    .filter(l => l.status === "ATENCAO" || l.status === "CRITICO")
    .map(l => ({ ...l, data: horarioDe(l) }))
    .sort((a, b) => a.data - b.data);

  const ocorrencias = [];

  ordenadas.forEach(leitura => {

    const atual = ocorrencias[ocorrencias.length - 1];

    if (atual && leitura.data - atual.fim <= lacunaMax) {

      atual.fim = leitura.data;
      atual.leituras.push(leitura);

      if (leitura.temperatura > atual.pico) {
        atual.pico = leitura.temperatura;
      }

      if (leitura.status === "CRITICO") {
        atual.status = "CRITICO";
      }

    } else {

      ocorrencias.push({
        inicio: leitura.data,
        fim: leitura.data,
        pico: leitura.temperatura,
        status: leitura.status,
        leituras: [leitura]
      });

    }

  });

  // Duração: do início até o fim, contando o intervalo da última leitura.
  ocorrencias.forEach(o => {
    o.duracao = o.fim - o.inicio + CONFIG.UPDATE_INTERVAL;
  });

  return ocorrencias.reverse();

}


// Liga o filtro de período (botões com data-horas) e devolve o valor atual.
function ligarFiltroPeriodo(container, aoMudar) {

  container.querySelectorAll("button[data-horas]").forEach(botao => {

    botao.addEventListener("click", () => {

      container.querySelectorAll("button[data-horas]").forEach(b => {
        b.setAttribute("aria-pressed", String(b === botao));
      });

      aoMudar(Number(botao.dataset.horas));

    });

  });

}


const FILTRO_PERIODO = `
  <div class="filtro" role="group" aria-label="Período">
    <button type="button" data-horas="24" aria-pressed="true">Últimas 24 h</button>
    <button type="button" data-horas="168" aria-pressed="false">Últimos 7 dias</button>
  </div>
`;


const ERRO_AZURE = `
  <div class="panel estado">
    <strong>Não foi possível falar com o Azure.</strong>
    Os dados voltam na próxima atualização (${CONFIG.UPDATE_INTERVAL / 1000} s).
  </div>
`;


montarMenu();
