// Calor na rota Petrolina → Suape: previsão do dia (Open-Meteo, sem chave)
// somada ao histórico do INMET (modelo climatológico da pasta analise/ do PI).
// Hora a hora, vale a cidade mais quente da rota: é o pior caso para o baú.

const LIMIAR_CALOR = 30;
const LIMIAR_CALOR_FORTE = 35;

const CIDADES_ROTA = [
  { nome: "Petrolina", lat: -9.39, lon: -40.50 },
  { nome: "Cabrobó", lat: -8.51, lon: -39.31 },
  { nome: "Salgueiro", lat: -8.07, lon: -39.12 },
  { nome: "Serra Talhada", lat: -7.99, lon: -38.30 },
  { nome: "Arcoverde", lat: -8.42, lon: -37.05 },
  { nome: "Caruaru", lat: -8.28, lon: -35.98 },
  { nome: "Suape", lat: -8.39, lon: -34.96 }
];

// P(temperatura > 30 °C) em Petrolina por mês (linha) e hora (coluna),
// INMET A307. Gerado por analise/explorar.py (função probabilidade).
const CHANCE_CALOR = [
  [0,0,0,0,0,0,0,0,0,0,.11,.29,.51,.67,.78,.82,.82,.82,.7,.52,.4,.24,.14,.05],
  [.01,0,0,0,0,0,0,0,0,0,.07,.23,.56,.77,.82,.81,.8,.79,.73,.57,.38,.23,.11,.07],
  [0,0,0,0,0,0,0,0,0,0,.04,.3,.67,.81,.88,.89,.87,.79,.7,.48,.34,.15,.05,.01],
  [0,0,0,0,0,0,0,0,0,0,.07,.32,.61,.78,.8,.84,.83,.72,.53,.25,.12,.06,.03,0],
  [0,0,0,0,0,0,0,0,0,0,.01,.1,.38,.53,.62,.62,.59,.48,.2,.08,.01,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,.05,.21,.39,.42,.38,.21,.04,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,.01,.05,.17,.28,.35,.38,.23,.08,.02,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,.01,.07,.17,.41,.56,.65,.64,.48,.24,.12,.07,.05,.01,0],
  [0,0,0,0,0,0,0,0,0,.02,.04,.13,.59,.88,.93,.97,.96,.93,.74,.52,.26,.1,.03,.03],
  [.08,.02,0,0,0,0,0,0,.01,.06,.25,.61,.95,.98,.98,.99,.99,.98,.98,.94,.85,.72,.35,.18],
  [.06,0,.01,0,0,0,0,0,.01,.07,.24,.41,.62,.76,.81,.86,.86,.84,.69,.52,.38,.3,.16,.08],
  [.01,.01,0,0,0,0,0,0,0,.01,.2,.46,.66,.82,.83,.83,.83,.8,.75,.61,.51,.31,.2,.08]
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];


async function buscarPrevisaoRota() {

  const params = new URLSearchParams({
    latitude: CIDADES_ROTA.map(c => c.lat).join(","),
    longitude: CIDADES_ROTA.map(c => c.lon).join(","),
    hourly: "temperature_2m",
    timezone: "America/Recife",
    forecast_days: "2"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Previsão: HTTP ${response.status}`);
  }

  const dados = await response.json();
  const tempos = dados[0].hourly.time;

  // Próximas 24 horas a partir da hora atual (horário de Recife).
  // "sv-SE" dá "2026-09-26 22:43:36"; a previsão usa "2026-09-26T22:00".
  const agora = new Date()
    .toLocaleString("sv-SE", { timeZone: "America/Recife" })
    .slice(0, 13)
    .replace(" ", "T");
  const inicio = Math.max(0, tempos.findIndex(t => t.slice(0, 13) === agora));

  return tempos.slice(inicio, inicio + 24).map((tempo, i) => {

    const temps = dados.map(d => d.hourly.temperature_2m[inicio + i]);
    const maior = Math.max(...temps);

    return {
      hora: Number(tempo.slice(11, 13)),
      temp: maior,
      cidade: CIDADES_ROTA[temps.indexOf(maior)].nome,
      origem: temps[0]
    };

  });

}


// Horas seguidas acima do limiar viram faixas: "14h às 17h".
function faixasDeHoras(horas) {

  const faixas = [];

  horas.forEach(h => {

    const ultima = faixas[faixas.length - 1];

    if (ultima && (ultima.fim + 1) % 24 === h.hora) {
      ultima.fim = h.hora;
    } else {
      faixas.push({ inicio: h.hora, fim: h.hora });
    }

  });

  return faixas.map(f => f.inicio === f.fim ? `${f.inicio}h` : `${f.inicio}h às ${(f.fim + 1) % 24}h`);

}


// Janela de 3 horas mais fresca na origem, para carregar o baú.
function janelaFresca(previsao) {

  let melhor = 0;

  for (let i = 1; i + 3 <= previsao.length; i++) {

    const soma = j => previsao.slice(j, j + 3).reduce((a, h) => a + h.origem, 0);

    if (soma(i) < soma(melhor)) {
      melhor = i;
    }

  }

  const inicio = previsao[melhor].hora;
  return `${inicio}h às ${(inicio + 3) % 24}h`;

}


function faixaCalor(temp) {

  if (temp > LIMIAR_CALOR_FORTE) {
    return { classe: "forte", texto: `acima de ${LIMIAR_CALOR_FORTE} °C` };
  }

  if (temp > LIMIAR_CALOR) {
    return { classe: "quente", texto: `acima de ${LIMIAR_CALOR} °C` };
  }

  return { classe: "ameno", texto: `até ${LIMIAR_CALOR} °C` };

}


function textoHistorico() {

  const mes = new Date().getMonth();
  const chances = CHANCE_CALOR[mes];
  const pico = chances.indexOf(Math.max(...chances));

  return `No histórico de ${MESES[mes]} (INMET, Petrolina), a chance de passar de ` +
    `${LIMIAR_CALOR} °C às ${pico}h é de ${Math.round(chances[pico] * 100)}%.`;

}


async function carregarRisco() {

  const painel = document.getElementById("risco");

  if (!painel) {
    return;
  }

  let previsao;

  try {
    previsao = await buscarPrevisaoRota();
  } catch (erro) {

    console.error("Erro ao buscar a previsão:", erro);

    painel.innerHTML = `
      <h2>Calor na rota</h2>
      <p>${textoHistorico()}</p>
      <div class="nota">A previsão do dia não carregou. Mostrando só o histórico.</div>
    `;
    return;

  }

  const quentes = previsao.filter(h => h.temp > LIMIAR_CALOR);
  const pico = previsao.reduce((a, h) => (h.temp > a.temp ? h : a));

  const resumo = quentes.length
    ? `A rota passa de ${LIMIAR_CALOR} °C ${faixasDeHoras(quentes).join(", ")}, ` +
      `com pico de ${pico.temp.toFixed(0)} °C em ${pico.cidade} às ${pico.hora}h.`
    : `A rota fica abaixo de ${LIMIAR_CALOR} °C nas próximas 24 horas ` +
      `(máxima de ${pico.temp.toFixed(0)} °C em ${pico.cidade}).`;

  const celulas = previsao.map(h => {

    const f = faixaCalor(h.temp);

    return `
      <li class="hora-risco ${f.classe}" title="${h.hora}h: ${h.temp.toFixed(1)} °C em ${texto(h.cidade)} (${f.texto})">
        <span>${h.hora}h</span>
        <strong>${h.temp.toFixed(0)}°</strong>
      </li>
    `;

  }).join("");

  painel.innerHTML = `
    <h2>Calor na rota · próximas 24 h</h2>
    <p>${resumo} Janela mais fresca para carregar em Petrolina: <strong>${janelaFresca(previsao)}</strong>.</p>

    <ol class="faixa-horas" aria-label="Temperatura máxima da rota por hora">${celulas}</ol>

    <ul class="legenda-risco">
      <li><i class="ameno"></i> até ${LIMIAR_CALOR} °C</li>
      <li><i class="quente"></i> acima de ${LIMIAR_CALOR} °C</li>
      <li><i class="forte"></i> acima de ${LIMIAR_CALOR_FORTE} °C</li>
    </ul>

    <div class="nota">
      Cada hora mostra a cidade mais quente entre Petrolina e Suape (previsão Open-Meteo).
      ${textoHistorico()}
    </div>
  `;

}


carregarRisco();

// A previsão muda devagar: atualiza a cada 30 minutos.
setInterval(carregarRisco, 30 * 60 * 1000);
