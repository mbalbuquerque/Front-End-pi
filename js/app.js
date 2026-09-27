// Converte as leituras da API para o formato usado pelo dashboard
// (created_at, field1 = temperatura, field2 = umidade, field3 = RSSI),
// do mais antigo para o mais recente.

async function buscarAzure() {

  const leituras =
    await buscarLeituras({
      limite: CONFIG.HISTORY_SIZE
    });

  // A API devolve da mais recente para a mais antiga.
  return leituras
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


async function carregarDados() {

  try {

    const feeds =
      await buscarAzure();

    if (feeds.length === 0) {
      throw new Error(
        "Sensor sem telemetria."
      );
    }

    const ultimo =
      feeds[feeds.length - 1];

    atualizarDashboard(ultimo);

    atualizarHistorico(feeds);

    marcarConexao(true);

  }

  catch (erro) {

    console.error(
      "Erro ao consultar o Azure:",
      erro
    );

    document.getElementById(
      "historico"
    ).textContent =
      "Não foi possível carregar a telemetria.";

    marcarConexao(false);

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

  // "Tempo real": últimos 30 min a partir da leitura mais recente.
  const JANELA_MS = 30 * 60 * 1000;

  const maisRecente =
    new Date(feeds[feeds.length - 1].created_at);

  // Converte para o formato de leitura do gráfico (as duas fontes).
  const leituras =
    feeds
      .filter(feed =>
        maisRecente - new Date(feed.created_at) <= JANELA_MS
      )
      .map(feed => {

        const temperatura =
          parseFloat(feed.field1);

        return {
          temperatura,
          medidoEm: feed.created_at,
          status: classificarTemperatura(temperatura)
        };

      })
      .filter(leitura =>
        !Number.isNaN(leitura.temperatura)
      );


  if (leituras.length === 0) {
    return;
  }


  const r =
    resumir(leituras);

  const historico =
    document.getElementById(
      "historico"
    );

  historico.classList.add("com-grafico");

  historico.innerHTML = `

    <p class="historico-resumo">
      <strong>${r.total} leituras nos últimos 30 min</strong>
      · mínima ${formatarTemp(r.minima)}
      · máxima ${formatarTemp(r.maxima)}
    </p>

    <div id="graficoTemperatura"></div>

  `;

  desenharGrafico(
    document.getElementById(
      "graficoTemperatura"
    ),
    leituras
  );

}


function classificarTemperatura(temperatura) {

  if (temperatura <= CONFIG.TEMP_NORMAL_MAX) {
    return "NORMAL";
  }

  if (temperatura <= CONFIG.TEMP_ATENCAO_MAX) {
    return "ATENCAO";
  }

  return "CRITICO";

}


carregarDados();


setInterval(
  carregarDados,
  CONFIG.UPDATE_INTERVAL
);