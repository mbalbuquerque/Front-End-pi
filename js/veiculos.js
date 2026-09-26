// Tela de veículos: situação atual de cada veículo da frota.

// Sem leitura há mais que 3 envios, o dispositivo é considerado sem sinal.
const SEM_SINAL_MS = CONFIG.UPDATE_INTERVAL * 3;


async function carregarVeiculos() {

  const conteudo = document.getElementById("conteudo");

  try {

    const ultimas = await Promise.all(
      CONFIG.VEICULOS.map(v =>
        buscarLeituras({ deviceId: v.deviceId, limite: 1 })
          .then(leituras => leituras[0] || null)
      )
    );

    marcarConexao(true);

    const cards = CONFIG.VEICULOS
      .map((veiculo, i) => cardVeiculo(veiculo, ultimas[i]))
      .join("");

    conteudo.innerHTML = `

      <section class="lista-cards">${cards}</section>

      <div class="nota">
        <span class="planejado">PLANEJADO</span>
        <strong>Cadastro de veículos pela tela.</strong>
        Depende do login com perfis (operador logístico e gestor). Até lá, a frota do piloto
        fica no arquivo de configuração do painel.
      </div>

    `;

  }

  catch (erro) {

    console.error("Erro ao carregar veículos:", erro);
    marcarConexao(false);
    conteudo.innerHTML = ERRO_AZURE;

  }

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
          <strong>${texto(veiculo.dispositivo)}</strong>
        </div>
        <div>
          <span>ID do sensor</span>
          <strong>${texto(veiculo.deviceId)}</strong>
        </div>
      </div>

    </article>
  `;

}


carregarVeiculos();

setInterval(carregarVeiculos, CONFIG.UPDATE_INTERVAL);
