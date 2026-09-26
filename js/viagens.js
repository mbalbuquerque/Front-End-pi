// Tela de viagens: condição da carga do início ao fim de cada trajeto.

async function carregarViagens() {

  const conteudo = document.getElementById("conteudo");

  try {

    const dados = await Promise.all(
      CONFIG.VIAGENS.map(viagem => leiturasDaViagem(viagem))
    );

    marcarConexao(true);

    conteudo.innerHTML = `

      ${CONFIG.VIAGENS.map((viagem, i) => painelViagem(viagem, dados[i], i)).join("")}

      <div class="nota">
        <span class="planejado">PLANEJADO</span>
        <strong>Rota real no mapa.</strong>
        Chega com o módulo 4G com GPS no caminhão. Hoje origem, destino e horário de início
        de cada viagem do piloto ficam no arquivo de configuração do painel.
      </div>

    `;

    CONFIG.VIAGENS.forEach((viagem, i) => {

      const alvo = document.getElementById(`graficoViagem${i}`);

      if (alvo) {
        desenharGrafico(alvo, dados[i]);
      }

    });

  }

  catch (erro) {

    console.error("Erro ao carregar viagens:", erro);
    marcarConexao(false);
    conteudo.innerHTML = ERRO_AZURE;

  }

}


async function leiturasDaViagem(viagem) {

  const veiculo = CONFIG.VEICULOS.find(v => v.id === viagem.veiculo);

  const inicio = new Date(viagem.inicio);
  const fim = viagem.fim ? new Date(viagem.fim) : new Date();

  // A API aceita até 7 dias para trás a partir de agora.
  const horas = Math.min(168, Math.max(1, Math.ceil((Date.now() - inicio) / 3600000)));

  const leituras = await buscarLeituras({
    deviceId: veiculo.deviceId,
    horas,
    limite: 500
  });

  return leituras.filter(l => {
    const quando = horarioDe(l);
    return quando >= inicio && quando <= fim;
  });

}


function painelViagem(viagem, leituras, indice) {

  const r = resumir(leituras);
  const ocorrencias = agruparOcorrencias(leituras);

  const inicio = new Date(viagem.inicio);
  const fim = viagem.fim ? new Date(viagem.fim) : null;
  const duracao = (fim || new Date()) - inicio;

  const tempoFora = ocorrencias.reduce((total, o) => total + o.duracao, 0);

  const situacao = fim
    ? '<span class="status aguardando">CONCLUÍDA</span>'
    : '<span class="status normal">EM ANDAMENTO</span>';

  return `
    <article class="panel">

      <div class="panel-header">
        <div>
          <h2>${texto(viagem.id)} · ${texto(viagem.veiculo)}</h2>
          <p>${texto(viagem.carga)}</p>
        </div>
        ${situacao}
      </div>

      <div class="rota section-gap">
        <span>${texto(viagem.origem)}</span>
        <span class="seta" aria-hidden="true">→</span>
        <span>${texto(viagem.destino)}</span>
      </div>

      <div class="campos">
        <div>
          <span>Início</span>
          <strong>${formatarDataHora(inicio)}</strong>
        </div>
        <div>
          <span>${fim ? "Duração" : "Em viagem há"}</span>
          <strong>${formatarDuracao(duracao)}</strong>
        </div>
        <div>
          <span>Faixa registrada</span>
          <strong>${r ? `${formatarTemp(r.minima)} a ${formatarTemp(r.maxima)}` : "--"}</strong>
        </div>
        <div>
          <span>Tempo fora da faixa</span>
          <strong>${ocorrencias.length
            ? `${formatarDuracao(tempoFora)} em ${ocorrencias.length} ocorrência${ocorrencias.length > 1 ? "s" : ""}`
            : "nenhum"}</strong>
        </div>
      </div>

      <div id="graficoViagem${indice}" class="section-gap"></div>

    </article>
  `;

}


carregarViagens();

setInterval(carregarViagens, CONFIG.UPDATE_INTERVAL);
