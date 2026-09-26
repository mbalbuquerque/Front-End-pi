// Cada fonte devolve os registros no mesmo formato do ThingSpeak
// (created_at, field1 = temperatura, field2 = umidade, field3 = RSSI),
// do mais antigo para o mais recente. Assim o restante do dashboard
// não depende de onde os dados vêm.

async function buscarThingSpeak() {

  const url =
    `https://api.thingspeak.com/channels/${CONFIG.THINGSPEAK_CHANNEL_ID}/feeds.json?results=${CONFIG.HISTORY_SIZE}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return data.feeds || [];

}


async function buscarAzure() {

  const url =
    `${CONFIG.AZURE_API_URL}?deviceId=${encodeURIComponent(CONFIG.DEVICE_ID)}&limite=${CONFIG.HISTORY_SIZE}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const data = await response.json();

  // A API devolve da mais recente para a mais antiga.
  return (data.leituras || [])
    .slice()
    .reverse()
    .map(leitura => ({
      // Horário da medição (leituras guardadas offline chegam depois).
      created_at: leitura.medidoEm || leitura.recebidoEm,
      field1: leitura.temperatura,
      field2: leitura.umidade,
      field3: leitura.rssi
    }));

}


function nomeFonte() {

  return CONFIG.DATA_SOURCE === "azure"
    ? "Azure"
    : "ThingSpeak";

}


async function carregarDados() {

  try {

    const feeds =
      CONFIG.DATA_SOURCE === "azure"
        ? await buscarAzure()
        : await buscarThingSpeak();

    if (feeds.length === 0) {
      throw new Error(
        "Canal sem telemetria."
      );
    }

    const ultimo =
      feeds[feeds.length - 1];

    atualizarDashboard(ultimo);

    atualizarHistorico(feeds);

    document.getElementById(
      "fonteDados"
    ).textContent =
      `${nomeFonte()} conectado`;

  }

  catch (erro) {

    console.error(
      `Erro ao consultar ${CONFIG.DATA_SOURCE}:`,
      erro
    );

    document.getElementById(
      "historico"
    ).textContent =
      "Não foi possível carregar a telemetria.";

    document.getElementById(
      "fonteDados"
    ).textContent =
      `Sem conexão com ${nomeFonte()}`;

  }

}


function atualizarDashboard(feed) {

  const temperatura =
    parseFloat(feed.field1);

  const umidade =
    parseFloat(feed.field2);

  // RSSI pode vir vazio (o simulador Wokwi não informa um valor real).
  const rssi =
    parseInt(feed.field3);

  const rssiTexto =
    Number.isNaN(rssi)
      ? "--"
      : `${rssi} dBm`;


  document.getElementById(
    "temperatura"
  ).textContent =
    `${temperatura.toFixed(1)} °C`;


  document.getElementById(
    "umidade"
  ).textContent =
    `${umidade.toFixed(1)} %`;


  document.getElementById(
    "rssi"
  ).textContent =
    rssiTexto;


  document.getElementById(
    "tempDetalhe"
  ).textContent =
    `${temperatura.toFixed(1)} °C`;


  document.getElementById(
    "umidadeDetalhe"
  ).textContent =
    `${umidade.toFixed(1)} %`;


  document.getElementById(
    "rssiDetalhe"
  ).textContent =
    rssiTexto;


  const data =
    new Date(feed.created_at);

  document.getElementById(
    "ultimaAtualizacao"
  ).textContent =
    data.toLocaleString("pt-BR");


  atualizarStatus(temperatura);

  atualizarRSSI(rssi);

}


function atualizarStatus(temperatura) {

  const status =
    document.getElementById(
      "statusCarga"
    );

  const tempStatus =
    document.getElementById(
      "tempStatus"
    );

  const alerta =
    document.getElementById(
      "alerta"
    );


  status.className = "status";


  if (
    temperatura <=
    CONFIG.TEMP_NORMAL_MAX
  ) {

    status.textContent = "NORMAL";

    status.classList.add("normal");

    tempStatus.textContent =
      "Temperatura dentro do limite";

    alerta.classList.add("hidden");

  }

  else if (
    temperatura <=
    CONFIG.TEMP_ATENCAO_MAX
  ) {

    status.textContent = "ATENÇÃO";

    status.classList.add("atencao");

    tempStatus.textContent =
      "Temperatura em atenção";

    alerta.classList.remove("hidden");

  }

  else {

    status.textContent = "CRÍTICO";

    status.classList.add("critico");

    tempStatus.textContent =
      "Temperatura crítica";

    alerta.classList.remove("hidden");

  }

}


function atualizarRSSI(rssi) {

  let texto = "Sinal fraco";

  if (Number.isNaN(rssi)) {
    texto = "Sinal não informado";
  }

  else if (rssi >= -60) {
    texto = "Sinal excelente";
  }

  else if (rssi >= -70) {
    texto = "Sinal bom";
  }

  else if (rssi >= -80) {
    texto = "Sinal regular";
  }


  document.getElementById(
    "rssiStatus"
  ).textContent = texto;

}


function atualizarHistorico(feeds) {

  const temperaturas =
    feeds
      .map(feed =>
        parseFloat(feed.field1)
      )
      .filter(valor =>
        !Number.isNaN(valor)
      );


  if (temperaturas.length === 0) {
    return;
  }


  const minimo =
    Math.min(...temperaturas);

  const maximo =
    Math.max(...temperaturas);

  document.getElementById(
    "historico"
  ).innerHTML = `

    <strong>
      ${temperaturas.length}
      registros recebidos
    </strong>

    <br><br>

    Mínima:
    ${minimo.toFixed(1)} °C

    &nbsp; • &nbsp;

    Máxima:
    ${maximo.toFixed(1)} °C

  `;

}


carregarDados();


setInterval(
  carregarDados,
  CONFIG.UPDATE_INTERVAL
);