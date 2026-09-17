const channelId =
  CONFIG.THINGSPEAK_CHANNEL_ID;

const apiUrl =
  `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=20`;


async function carregarDados() {

  try {

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.feeds || data.feeds.length === 0) {
      throw new Error(
        "Canal sem telemetria."
      );
    }

    const ultimo =
      data.feeds[data.feeds.length - 1];

    atualizarDashboard(ultimo);

    atualizarHistorico(data.feeds);

  }

  catch (erro) {

    console.error(
      "Erro ao consultar ThingSpeak:",
      erro
    );

    document.getElementById(
      "historico"
    ).textContent =
      "Não foi possível carregar a telemetria.";

  }

}


function atualizarDashboard(feed) {

  const temperatura =
    parseFloat(feed.field1);

  const umidade =
    parseFloat(feed.field2);

  const rssi =
    parseInt(feed.field3);


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
    `${rssi} dBm`;


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
    `${rssi} dBm`;


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

  if (rssi >= -60) {
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