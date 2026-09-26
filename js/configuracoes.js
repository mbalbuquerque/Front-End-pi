// Tela de configurações: o que está valendo hoje no sistema (somente leitura).

async function carregarConfiguracoes() {

  const conteudo = document.getElementById("conteudo");

  let ultima = null;
  let conectado = true;

  try {

    ultima = (await buscarLeituras({ limite: 1 }))[0] || null;

  }

  catch (erro) {

    console.error("Erro ao consultar o Azure:", erro);
    conectado = false;

  }

  marcarConexao(conectado);

  const perfis = CONFIG.PERFIS.map(p => `
    <tr>
      <td><strong>${texto(p.nome)}</strong></td>
      <td>${p.ativo
        ? `Normal até ${p.normalMax} °C · atenção até ${p.atencaoMax} °C · crítico acima`
        : `Faixa ideal ${texto(p.faixa)}`}</td>
      <td>${p.ativo
        ? '<span class="status normal">EM USO</span>'
        : '<span class="planejado">PLANEJADO</span>'}</td>
    </tr>
  `).join("");

  conteudo.innerHTML = `

    <article class="panel">
      <h2>Faixas de temperatura</h2>
      <p>Definem quando a carga está normal, em atenção ou crítica. Valem no sensor, na nuvem e no painel.</p>

      <div class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th>Perfil de carga</th>
              <th>Faixa</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>${perfis}</tbody>
        </table>
      </div>

      <div class="nota">
        Os perfis de manga e uva usam faixas de referência de pós-colheita e ainda precisam ser
        validados com o produtor parceiro. <strong>Trocar a faixa pela tela</strong> depende do
        login com perfis e de enviar a nova faixa ao sensor.
      </div>
    </article>

    <article class="panel">
      <h2>Dispositivo e comunicação</h2>
      <p>Sensor instalado no compartimento de carga.</p>

      <div class="campos section-gap">
        <div>
          <span>ID do sensor</span>
          <strong>${texto(CONFIG.DEVICE_ID)}</strong>
        </div>
        <div>
          <span>Intervalo de envio</span>
          <strong>${CONFIG.UPDATE_INTERVAL / 1000} s</strong>
        </div>
        <div>
          <span>Última leitura recebida</span>
          <strong>${ultima ? formatarDataHora(horarioDe(ultima)) : conectado ? "nenhuma" : "sem conexão"}</strong>
        </div>
        <div>
          <span>Guarda leituras sem sinal</span>
          <strong>Sim, até 500 na memória do sensor</strong>
        </div>
      </div>
    </article>

    <article class="panel">
      <h2>Fonte de dados</h2>
      <p>De onde o painel lê a telemetria.</p>

      <div class="campos section-gap">
        <div>
          <span>Fonte</span>
          <strong>${CONFIG.DATA_SOURCE === "azure" ? "Azure (Function + Cosmos DB)" : "ThingSpeak"}</strong>
        </div>
        <div>
          <span>Atualização do painel</span>
          <strong>a cada ${CONFIG.UPDATE_INTERVAL / 1000} s</strong>
        </div>
        <div>
          <span>Reserva</span>
          <strong>ThingSpeak, canal ${texto(CONFIG.THINGSPEAK_CHANNEL_ID)}</strong>
        </div>
        <div>
          <span>Acesso</span>
          <strong>Leitura aberta · login com perfis planejado</strong>
        </div>
      </div>
    </article>

  `;

}


carregarConfiguracoes();
