// Tela de veículos: situação atual da frota e cadastro (gestor).

// Sem leitura há mais que 3 envios, o dispositivo é considerado sem sinal.
const SEM_SINAL_MS = CONFIG.UPDATE_INTERVAL * 3;

let formularioAberto = false;


async function carregarVeiculos() {

  const conteudo = document.getElementById("conteudo");

  // Não redesenha enquanto o gestor preenche o formulário.
  if (formularioAberto) {
    return;
  }

  try {

    const { veiculos } = await api("/veiculos");

    const ultimas = await Promise.all(
      veiculos.map(v =>
        buscarLeituras({ deviceId: v.deviceId, limite: 1 })
          .then(leituras => leituras[0] || null)
      )
    );

    marcarConexao(true);

    conteudo.innerHTML = `

      ${ehGestor() ? formularioVeiculo() : ""}

      ${veiculos.length
        ? `<section class="lista-cards">${veiculos.map((v, i) => cardVeiculo(v, ultimas[i])).join("")}</section>`
        : `<div class="panel estado"><strong>Nenhum veículo cadastrado.</strong>${ehGestor()
            ? "Cadastre o primeiro veículo acima."
            : "Peça ao gestor para cadastrar a frota."}</div>`}

    `;

    ligarAcoes();

  }

  catch (erro) {

    console.error("Erro ao carregar veículos:", erro);
    marcarConexao(false);
    conteudo.innerHTML = ERRO_AZURE;

  }

}


function formularioVeiculo() {

  const perfis = CONFIG.PERFIS
    .map(p => `<option value="${p.id}">${texto(p.nome)}</option>`)
    .join("");

  return `
    <details class="panel" id="painelNovo">
      <summary><h2>Cadastrar veículo</h2></summary>

      <form id="formVeiculo" class="form-grade" novalidate>
        <label class="campo"><span>Código</span><input name="id" placeholder="CT-002" required></label>
        <label class="campo"><span>Tipo</span><input name="tipo" placeholder="Caminhão baú refrigerado" required></label>
        <label class="campo"><span>ID do sensor</span><input name="deviceId" placeholder="coldtrack-02" required></label>
        <label class="campo"><span>Dispositivo</span><input name="dispositivo" placeholder="ESP32-C3 + DHT11"></label>
        <label class="campo"><span>Perfil da carga</span><select name="perfil">${perfis}</select></label>
        <button type="submit" class="botao">Cadastrar</button>
      </form>

      <p class="erro-form" id="erroVeiculo" role="alert" hidden></p>
    </details>
  `;

}


function cardVeiculo(veiculo, ultima) {

  const perfil = CONFIG.PERFIS.find(p => p.id === veiculo.perfil);

  let situacao = seloStatus(null);
  let comunicacao = "nunca enviou dados";

  if (ultima) {

    const quando = horarioDe(ultima);
    const atraso = Date.now() - quando.getTime();

    comunicacao = atraso > SEM_SINAL_MS
      ? `sem sinal há ${formatarDuracao(atraso)}`
      : formatarDataHora(quando);

    situacao = atraso > SEM_SINAL_MS
      ? '<span class="status aguardando">SEM SINAL</span>'
      : seloStatus(ultima.status);

  }

  return `
    <article class="item-card">

      <header>
        <div>
          <h3>${texto(veiculo.id)}</h3>
          <p>${texto(veiculo.tipo)}</p>
        </div>
        ${situacao}
      </header>

      <div class="campos">
        <div>
          <span>Temperatura</span>
          <strong>${formatarTemp(ultima?.temperatura)}</strong>
        </div>
        <div>
          <span>Umidade</span>
          <strong>${formatarUmidade(ultima?.umidade)}</strong>
        </div>
        <div>
          <span>Última comunicação</span>
          <strong>${comunicacao}</strong>
        </div>
        <div>
          <span>Perfil da carga</span>
          <strong>${texto(perfil ? perfil.nome : veiculo.perfil)}</strong>
        </div>
        <div>
          <span>Dispositivo</span>
          <strong>${texto(veiculo.dispositivo || "--")}</strong>
        </div>
        <div>
          <span>ID do sensor</span>
          <strong>${texto(veiculo.deviceId)}</strong>
        </div>
      </div>

      ${ehGestor() ? `
        <div class="acoes-item">
          <button type="button" class="botao perigo" data-remover="${texto(veiculo.id)}">Remover veículo</button>
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

  const form = document.getElementById("formVeiculo");

  if (form) {

    form.addEventListener("submit", async evento => {

      evento.preventDefault();

      const erro = document.getElementById("erroVeiculo");
      erro.hidden = true;

      const dados = Object.fromEntries(new FormData(form));

      try {
        await api("/veiculos", { metodo: "POST", corpo: dados });
        formularioAberto = false;
        carregarVeiculos();
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
      }

    });

  }

  document.querySelectorAll("[data-remover]").forEach(botao => {

    botao.addEventListener("click", async () => {

      const codigo = botao.dataset.remover;

      if (!confirm(`Remover o veículo ${codigo}? As leituras do sensor continuam guardadas.`)) {
        return;
      }

      try {
        await api(`/veiculos/${encodeURIComponent(codigo)}`, { metodo: "DELETE" });
        carregarVeiculos();
      } catch (falha) {
        alert(falha.message);
      }

    });

  });

}


carregarVeiculos();

setInterval(carregarVeiculos, CONFIG.UPDATE_INTERVAL);
