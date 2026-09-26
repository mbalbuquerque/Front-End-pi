// Tela de alertas: leituras fora da faixa normal, agrupadas em ocorrências.

let horasAlertas = 24;


async function carregarAlertas() {

  const conteudo = document.getElementById("conteudo");

  try {

    const leituras = await buscarLeituras({
      horas: horasAlertas,
      status: ["ATENCAO", "CRITICO"],
      limite: 500
    });

    marcarConexao(true);

    const ocorrencias = agruparOcorrencias(leituras);
    const criticas = ocorrencias.filter(o => o.status === "CRITICO").length;
    const periodo = horasAlertas === 24 ? "nas últimas 24 h" : "nos últimos 7 dias";

    const pico = leituras.length
      ? Math.max(...leituras.map(l => l.temperatura))
      : null;

    const ultima = ocorrencias[0];

    conteudo.innerHTML = `

      <div class="acoes">${FILTRO_PERIODO}</div>

      <section class="resumo">
        <article class="card">
          <span>Ocorrências</span>
          <strong>${ocorrencias.length}</strong>
          <small>${periodo}</small>
        </article>

        <article class="card">
          <span>Críticas</span>
          <strong class="${criticas ? "critico" : ""}">${criticas}</strong>
          <small>acima de ${CONFIG.TEMP_ATENCAO_MAX} °C</small>
        </article>

        <article class="card">
          <span>Pico registrado</span>
          <strong class="${pico > CONFIG.TEMP_ATENCAO_MAX ? "critico" : pico ? "atencao" : ""}">${formatarTemp(pico)}</strong>
          <small>maior temperatura fora da faixa</small>
        </article>

        <article class="card">
          <span>Última ocorrência</span>
          <strong>${ultima ? formatarDataHora(ultima.inicio).slice(0, 5) : "--"}</strong>
          <small>${ultima ? "às " + ultima.inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "nenhuma " + periodo}</small>
        </article>
      </section>

      <article class="panel">
        <h2>Ocorrências de temperatura</h2>
        <p>Leituras seguidas fora da faixa normal viram uma ocorrência.</p>
        ${ocorrencias.length ? tabelaOcorrencias(ocorrencias) : `
          <div class="estado">
            <strong>Nenhum alerta ${periodo}.</strong>
            A carga ficou dentro da faixa normal (até ${CONFIG.TEMP_NORMAL_MAX} °C).
          </div>`}
      </article>

    `;

    ligarFiltroPeriodo(conteudo, horas => {
      horasAlertas = horas;
      carregarAlertas();
    });

    conteudo.querySelectorAll("button[data-horas]").forEach(b => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.horas) === horasAlertas));
    });

  }

  catch (erro) {

    console.error("Erro ao carregar alertas:", erro);
    marcarConexao(false);
    conteudo.innerHTML = ERRO_AZURE;

  }

}


function tabelaOcorrencias(ocorrencias) {

  const linhas = ocorrencias.map(o => `
    <tr>
      <td>${seloStatus(o.status)}</td>
      <td>${formatarDataHora(o.inicio)}</td>
      <td class="num">${formatarDuracao(o.duracao)}</td>
      <td class="num">${formatarTemp(o.pico)}</td>
      <td class="num">${o.leituras.length}</td>
    </tr>
  `).join("");

  return `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>Nível</th>
            <th>Início</th>
            <th class="num">Duração</th>
            <th class="num">Pico</th>
            <th class="num">Leituras</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;

}


carregarAlertas();

setInterval(carregarAlertas, CONFIG.UPDATE_INTERVAL);
