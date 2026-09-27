// Tela de viagens: condição da carga do início ao fim de cada trajeto,
// com cadastro, encerramento e remoção (gestor).

let formularioAberto = false;


async function carregarViagens() {

  const conteudo = document.getElementById("conteudo");

  if (formularioAberto) {
    return;
  }

  try {

    const [{ viagens }, { veiculos }] = await Promise.all([
      api("/viagens"),
      api("/veiculos")
    ]);

    // Em andamento primeiro; depois as mais recentes.
    viagens.sort((a, b) => (!!a.fim - !!b.fim) || (new Date(b.inicio) - new Date(a.inicio)));

    const dados = await Promise.all(
      viagens.map(viagem => leiturasDaViagem(viagem, veiculos))
    );

    marcarConexao(true);

    conteudo.innerHTML = `

      ${ehGestor() ? formularioViagem(veiculos) : ""}

      ${viagens.length
        ? viagens.map((viagem, i) => painelViagem(viagem, dados[i], i)).join("")
        : `<div class="panel estado"><strong>Nenhuma viagem registrada.</strong>${ehGestor()
            ? "Registre a primeira viagem acima."
            : "Peça ao gestor para registrar as viagens."}</div>`}

      <div class="nota">
        <span class="planejado">PLANEJADO</span>
        <strong>Rota real no mapa.</strong>
        Chega com o módulo 4G com GPS no caminhão.
      </div>

    `;

    viagens.forEach((viagem, i) => {

      const alvo = document.getElementById(`graficoViagem${i}`);

      if (alvo && dados[i]) {
        desenharGrafico(alvo, dados[i]);
      }

    });

    ligarAcoes();

  }

  catch (erro) {

    console.error("Erro ao carregar viagens:", erro);
    marcarConexao(false);
    conteudo.innerHTML = ERRO_AZURE;

  }

}


async function leiturasDaViagem(viagem, veiculos) {

  const veiculo = veiculos.find(v => v.id === viagem.veiculo);

  if (!veiculo) {
    return null;
  }

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


function formularioViagem(veiculos) {

  const opcoes = veiculos
    .map(v => `<option value="${texto(v.id)}">${texto(v.id)} · ${texto(v.tipo)}</option>`)
    .join("");

  // datetime-local no horário do navegador, sem segundos.
  const agora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  return `
    <details class="panel" id="painelNovo">
      <summary><h2>Registrar viagem</h2></summary>

      ${veiculos.length ? `
        <form id="formViagem" class="form-grade" novalidate>
          <label class="campo"><span>Veículo</span><select name="veiculo" required>${opcoes}</select></label>
          <label class="campo"><span>Origem</span><input name="origem" placeholder="Petrolina/PE" required></label>
          <label class="campo"><span>Destino</span><input name="destino" placeholder="Porto de Suape/PE" required></label>
          <label class="campo"><span>Carga</span><input name="carga" placeholder="Manga Tommy Atkins" required></label>
          <label class="campo"><span>Início</span><input name="inicio" type="datetime-local" value="${agora}" required></label>
          <button type="submit" class="botao">Registrar</button>
        </form>
        <p class="erro-form" id="erroViagem" role="alert" hidden></p>
      ` : `<p class="estado">Cadastre um veículo antes de registrar viagens.</p>`}
    </details>
  `;

}


function painelViagem(viagem, leituras, indice) {

  const r = leituras ? resumir(leituras) : null;
  const ocorrencias = leituras ? agruparOcorrencias(leituras) : [];

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

      ${leituras
        ? `<div id="graficoViagem${indice}" class="section-gap"></div>`
        : `<p class="nota">O veículo ${texto(viagem.veiculo)} não está mais cadastrado.</p>`}

      ${ehGestor() ? `
        <div class="acoes-item">
          ${fim ? "" : `<button type="button" class="botao secundario" data-encerrar="${texto(viagem.id)}">Encerrar viagem</button>`}
          <button type="button" class="botao perigo" data-remover="${texto(viagem.id)}">Remover</button>
        </div>` : ""}

    </article>
  `;

}


function ligarAcoes() {

  const painel = document.getElementById("painelNovo");

  if (painel) {
    painel.addEventListener("toggle", () => {
      formularioAberto = painel.open;
    });
  }

  const form = document.getElementById("formViagem");

  if (form) {

    form.addEventListener("submit", async evento => {

      evento.preventDefault();

      const erro = document.getElementById("erroViagem");
      erro.hidden = true;

      const dados = Object.fromEntries(new FormData(form));

      // datetime-local vem sem fuso; convertemos para ISO com fuso (UTC).
      dados.inicio = dados.inicio ? new Date(dados.inicio).toISOString() : "";

      try {
        await api("/viagens", { metodo: "POST", corpo: dados });
        formularioAberto = false;
        carregarViagens();
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
      }

    });

  }

  document.querySelectorAll("[data-encerrar]").forEach(botao => {

    botao.addEventListener("click", async () => {

      const { viagens } = await api("/viagens");
      const viagem = viagens.find(v => v.id === botao.dataset.encerrar);

      if (!viagem || !confirm(`Encerrar a viagem ${viagem.id} agora?`)) {
        return;
      }

      try {
        await api(`/viagens/${encodeURIComponent(viagem.id)}`, {
          metodo: "PUT",
          corpo: { ...viagem, fim: new Date().toISOString() }
        });
        carregarViagens();
      } catch (falha) {
        alert(falha.message);
      }

    });

  });

  document.querySelectorAll("[data-remover]").forEach(botao => {

    botao.addEventListener("click", async () => {

      const id = botao.dataset.remover;

      if (!confirm(`Remover a viagem ${id}? As leituras do sensor continuam guardadas.`)) {
        return;
      }

      try {
        await api(`/viagens/${encodeURIComponent(id)}`, { metodo: "DELETE" });
        carregarViagens();
      } catch (falha) {
        alert(falha.message);
      }

    });

  });

}


carregarViagens();

setInterval(carregarViagens, CONFIG.UPDATE_INTERVAL);
