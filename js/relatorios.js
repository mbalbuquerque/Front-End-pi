// Tela de relatórios: resumo da temperatura por período, gráfico,
// tabela de leituras e exportação em CSV.

const LIMITE_RELATORIO = 500;

let horasRelatorio = 24;
let leiturasRelatorio = [];


async function carregarRelatorio() {

  const conteudo = document.getElementById("conteudo");

  try {

    leiturasRelatorio = await buscarLeituras({
      horas: horasRelatorio,
      limite: LIMITE_RELATORIO
    });

    marcarConexao(true);

    const periodo = horasRelatorio === 24 ? "últimas 24 h" : "últimos 7 dias";
    const r = resumir(leiturasRelatorio);

    if (!r) {

      conteudo.innerHTML = `
        <div class="acoes">${FILTRO_PERIODO}</div>
        <div class="panel estado">
          <strong>Nenhuma leitura nas ${periodo}.</strong>
          Confira se o sensor está ligado e conectado.
        </div>
      `;

      prepararFiltro(conteudo);
      return;

    }

    const fora = r.atencao + r.critico;
    const percentual = (fora / r.total) * 100;

    conteudo.innerHTML = `

      <div class="acoes">
        ${FILTRO_PERIODO}
        <button type="button" class="botao" id="baixarCsv">Baixar CSV</button>
      </div>

      <section class="resumo">
        <article class="card">
          <span>Leituras</span>
          <strong>${r.total}</strong>
          <small>${periodo}</small>
        </article>

        <article class="card">
          <span>Temperatura média</span>
          <strong>${formatarTemp(r.media)}</strong>
          <small>mín. ${formatarTemp(r.minima)} · máx. ${formatarTemp(r.maxima)}</small>
        </article>

        <article class="card">
          <span>Fora da faixa normal</span>
          <strong class="${r.critico ? "critico" : fora ? "atencao" : ""}">${percentual.toFixed(0)} %</strong>
          <small>${fora} de ${r.total} leituras</small>
        </article>

        <article class="card">
          <span>Críticas</span>
          <strong class="${r.critico ? "critico" : ""}">${r.critico}</strong>
          <small>acima de ${CONFIG.TEMP_ATENCAO_MAX} °C</small>
        </article>
      </section>

      <article class="panel">
        <h2>Temperatura no período</h2>
        <p>A faixa azul é a faixa normal da carga (até ${CONFIG.TEMP_NORMAL_MAX} °C).</p>
        <div id="graficoRelatorio"></div>
      </article>

      <article class="panel">
        <h2>Leituras</h2>
        <p>${r.total === LIMITE_RELATORIO
          ? `Mostrando as ${LIMITE_RELATORIO} leituras mais recentes do período.`
          : "Da mais recente para a mais antiga."}</p>
        ${tabelaLeituras(leiturasRelatorio)}
      </article>

    `;

    desenharGrafico(
      document.getElementById("graficoRelatorio"),
      leiturasRelatorio
    );

    document
      .getElementById("baixarCsv")
      .addEventListener("click", baixarCsv);

    prepararFiltro(conteudo);

  }

  catch (erro) {

    console.error("Erro ao carregar relatório:", erro);
    marcarConexao(false);
    conteudo.innerHTML = ERRO_AZURE;

  }

}


function prepararFiltro(conteudo) {

  ligarFiltroPeriodo(conteudo, horas => {
    horasRelatorio = horas;
    carregarRelatorio();
  });

  conteudo.querySelectorAll("button[data-horas]").forEach(b => {
    b.setAttribute("aria-pressed", String(Number(b.dataset.horas) === horasRelatorio));
  });

}


function tabelaLeituras(leituras) {

  const linhas = leituras.map(l => `
    <tr>
      <td>${formatarDataHora(horarioDe(l))}</td>
      <td class="num">${formatarTemp(l.temperatura)}</td>
      <td class="num">${formatarUmidade(l.umidade)}</td>
      <td>${seloStatus(l.status)}</td>
    </tr>
  `).join("");

  return `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>Medido em</th>
            <th class="num">Temperatura</th>
            <th class="num">Umidade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;

}


function baixarCsv() {

  const cabecalho = "medido_em;temperatura_c;umidade_pct;rssi_dbm;status";

  const linhas = leiturasRelatorio.map(l => [
    horarioDe(l).toISOString(),
    l.temperatura,
    l.umidade,
    l.rssi ?? "",
    l.status
  ].join(";"));

  // BOM para o Excel abrir com acentos corretos.
  const arquivo = new Blob(
    ["﻿" + [cabecalho, ...linhas].join("\n")],
    { type: "text/csv;charset=utf-8" }
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = `coldtrack-${CONFIG.DEVICE_ID}-${horasRelatorio}h.csv`;
  link.click();

  URL.revokeObjectURL(link.href);

}


carregarRelatorio();
