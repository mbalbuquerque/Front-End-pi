// Funções compartilhadas pelas telas do ColdTrack Control.


// ---------------------------------------------------------
// SESSÃO (login com perfis)
// ---------------------------------------------------------

const CHAVE_SESSAO = "coldtrack.sessao";


function lerSessao() {

  try {

    const sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || "null");

    // O token vence em 8 h; sessão vencida é descartada antes de usar.
    if (!sessao || !sessao.token || sessao.expiraEm <= Date.now()) {
      return null;
    }

    return sessao;

  } catch (erro) {
    return null;
  }

}


function salvarSessao(token, usuario) {

  // exp do token (segundos) vira milissegundos para comparar com Date.now().
  const carga = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));

  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      token,
      usuario,
      expiraEm: carga.exp * 1000
    }));
  } catch (erro) {
    // Navegador sem armazenamento: o login vale só nesta página.
  }

}


function sair() {

  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch (erro) {
    // nada a limpar
  }

  location.href = "login.html";

}


function usuarioAtual() {

  const sessao = lerSessao();
  return sessao ? sessao.usuario : null;

}


function ehGestor() {

  return usuarioAtual()?.perfil === "gestor";

}


// Toda chamada à API passa por aqui: leva o token e trata sessão vencida.
async function api(caminho, { metodo = "GET", corpo } = {}) {

  const sessao = lerSessao();

  const response = await fetch(`${CONFIG.API_URL}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {})
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined
  });

  if (response.status === 401) {
    sair();
    throw new Error("Sessão encerrada.");
  }

  const dados = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    const erro = new Error((dados.erros || [`HTTP ${response.status}`]).join(" · "));
    erro.status = response.status;
    throw erro;
  }

  return dados;

}


// Telas do painel (as que têm o menu lateral) exigem login.
// Página inicial e tela de login são abertas.
if (document.getElementById("sidebar") && !lerSessao()) {
  location.replace("login.html");
}


// ---------------------------------------------------------
// MENU LATERAL
// ---------------------------------------------------------

const PAGINAS = [
  { href: "dashboard.html", icone: "▦", nome: "Dashboard" },
  { href: "veiculos.html", icone: "🚚", nome: "Veículos" },
  { href: "sensores.html", icone: "📡", nome: "Sensores" },
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
      <div class="usuario-menu">
        <strong>${texto(usuarioAtual()?.nome || "")}</strong>
        <span>${usuarioAtual()?.perfil === "gestor" ? "Gestor" : "Operador logístico"}</span>
        <span>${texto(usuarioAtual()?.empresa || "")}</span>
      </div>
      <button type="button" class="sair" id="botaoSair">Sair</button>
    </div>
  `;

  document.getElementById("botaoSair").addEventListener("click", sair);

}


// ---------------------------------------------------------
// VEÍCULO ESCOLHIDO E FAIXA DA CARGA
// ---------------------------------------------------------

// Faixa do perfil demonstrativo: vale enquanto o perfil não carrega.
const FAIXA_PADRAO = { min: null, max: 15, margem: 5 };

const CHAVE_VEICULO = "coldtrack.veiculo";

let perfisCarga = null;


// Perfis de carga e faixas vêm da API: a mesma regra do sensor e da nuvem.
async function carregarPerfis() {

  if (!perfisCarga) {
    const response = await fetch(`${CONFIG.API_URL}/perfis`);
    perfisCarga = (await response.json()).perfis;
  }

  return perfisCarga;

}


function faixaDoPerfil(perfil) {

  return perfil ? { min: perfil.min, max: perfil.max, margem: perfil.margem } : FAIXA_PADRAO;

}


// "de 10 a 13 °C" ou "até 15 °C"
function descreverNormal(faixa) {

  return faixa.min == null
    ? `até ${faixa.max} °C`
    : `de ${faixa.min} a ${faixa.max} °C`;

}


// "acima de 20 °C" ou "abaixo de 7 °C ou acima de 16 °C"
function descreverCritico(faixa) {

  const acima = `acima de ${faixa.max + faixa.margem} °C`;

  return faixa.min == null
    ? acima
    : `abaixo de ${faixa.min - faixa.margem} °C ou ${acima}`;

}


// Veículo da tela: ?veiculo= na URL (etiqueta QR), o último escolhido ou o primeiro.
async function escolherVeiculo() {

  const [{ veiculos }, perfis] = await Promise.all([api("/veiculos"), carregarPerfis()]);

  veiculos.sort((a, b) => a.id.localeCompare(b.id));

  let salvo = null;

  try {
    salvo = localStorage.getItem(CHAVE_VEICULO);
  } catch (erro) {
    // sem armazenamento: fica o primeiro
  }

  const pedido = new URLSearchParams(location.search).get("veiculo");

  const veiculo =
    veiculos.find(v => v.id === pedido) ||
    veiculos.find(v => v.id === salvo) ||
    veiculos[0] ||
    null;

  const perfil = perfis.find(p => p.id === (veiculo?.perfil || "demonstrativo"));

  return { veiculos, veiculo, perfil, faixa: faixaDoPerfil(perfil) };

}


// Seletor de veículo no topo da tela (só aparece com mais de um veículo).
function montarSeletorVeiculo({ veiculos, veiculo }) {

  const topo = document.querySelector(".topbar");

  if (!topo || veiculos.length < 2 || document.getElementById("seletorVeiculo")) {
    return;
  }

  const rotulo = document.createElement("label");
  rotulo.className = "seletor-veiculo";
  rotulo.innerHTML = `
    <span>Veículo</span>
    <select id="seletorVeiculo">
      ${veiculos.map(v => `<option value="${texto(v.id)}"${v.id === veiculo?.id ? " selected" : ""}>${texto(v.id)}</option>`).join("")}
    </select>
  `;

  topo.insertBefore(rotulo, topo.querySelector(".connection"));

  rotulo.querySelector("select").addEventListener("change", evento => {

    try {
      localStorage.setItem(CHAVE_VEICULO, evento.target.value);
    } catch (erro) {
      // sem armazenamento
    }

    // Tira o ?veiculo= da URL para a escolha valer.
    location.href = location.pathname;

  });

}


const SEM_VEICULO = `
  <div class="panel estado">
    <strong>Nenhum veículo cadastrado.</strong>
    Registre o sensor em Sensores e depois cadastre o veículo em Veículos.
  </div>
`;


// ---------------------------------------------------------
// DADOS (Azure Function)
// ---------------------------------------------------------

async function buscarLeituras({ deviceId, limite = 50, horas, status } = {}) {

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

  const data = await api(`/leituras?${params}`);

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
