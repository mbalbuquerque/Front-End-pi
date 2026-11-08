// Converte as leituras da API para o formato usado pelo dashboard
// (created_at, field1 = temperatura, field2 = umidade, field3 = RSSI),
// do mais antigo para o mais recente.

// Veículo mostrado e faixa da carga dele (carregados uma vez).
let escolha = null;


async function buscarAzure() {

  const leituras =
    await buscarLeituras({
      deviceId: escolha.veiculo.deviceId,
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
      field3: leitura.rssi,
      status: leitura.status
    }));

}


async function carregarDados() {

  try {

    if (!escolha) {

      escolha = await escolherVeiculo();
      montarSeletorVeiculo(escolha);
      mostrarVeiculo(escolha);

    }

    if (!escolha.veiculo) {

      marcarConexao(true);
      document.getElementById("historico").innerHTML = SEM_VEICULO;
      return;

    }

    const feeds =
      await buscarAzure();

    // Sensor que ainda não enviou nada não é falha de conexão.
    if (feeds.length === 0) {

      marcarConexao(true);

      document.getElementById("historico").innerHTML = `
        <div class="estado">
          <strong>O sensor ${texto(escolha.veiculo.deviceId)} ainda não enviou leituras.</strong>
          Ligue o sensor e confira o Wi-Fi: a primeira leitura aparece em até 20 s.
        </div>
      `;

      return;

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


  atualizarStatus(feed.status || classificarTemperatura(temperatura));

  atualizarRSSI(rssi);

}


function atualizarStatus(situacao) {

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

  const textos = {
    NORMAL: "Temperatura dentro da faixa da carga",
    ATENCAO: "Temperatura em atenção",
    CRITICO: "Temperatura crítica"
  };

  const info = STATUS_INFO[situacao] || STATUS_INFO.NORMAL;

  status.className = `status ${info.classe}`;
  status.textContent = info.texto;
  tempStatus.textContent = textos[situacao] || textos.NORMAL;
  alerta.classList.toggle("hidden", situacao === "NORMAL");

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
          status: feed.status || classificarTemperatura(temperatura)
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
    leituras,
    { faixa: escolha.faixa }
  );

}


// Leitura antiga, gravada antes da faixa por carga, não traz status.
function classificarTemperatura(temperatura) {

  const f = escolha ? escolha.faixa : FAIXA_PADRAO;
  const minimo = f.min == null ? -Infinity : f.min;

  if (temperatura >= minimo && temperatura <= f.max) {
    return "NORMAL";
  }

  if (temperatura >= minimo - f.margem && temperatura <= f.max + f.margem) {
    return "ATENCAO";
  }

  return "CRITICO";

}


function mostrarVeiculo({ veiculo, perfil, faixa }) {

  if (!veiculo) {
    return;
  }

  document.getElementById("veiculoCodigo").textContent = veiculo.id;
  document.getElementById("veiculoCarga").textContent =
    `${perfil ? perfil.nome : veiculo.perfil} · normal ${descreverNormal(faixa)}`;
  document.getElementById("veiculoSensor").textContent = veiculo.deviceId;
  document.getElementById("subtituloVeiculo").textContent =
    `${veiculo.tipo} • ${veiculo.id}`;

}


carregarDados();


setInterval(
  carregarDados,
  CONFIG.UPDATE_INTERVAL
);