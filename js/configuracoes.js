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
        validados com o produtor. <strong>Trocar a faixa pela tela</strong> depende de enviar
        a nova faixa ao sensor, previsto para a versão com conexão celular.
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

    ${ehGestor() ? '<article class="panel" id="painelUsuarios"><h2>Usuários</h2><p>Carregando…</p></article>' : ""}

    <article class="panel">
      <h2>Fonte de dados</h2>
      <p>De onde o painel lê a telemetria.</p>

      <div class="campos section-gap">
        <div>
          <span>Fonte</span>
          <strong>Azure (Function + Cosmos DB)</strong>
        </div>
        <div>
          <span>Atualização do painel</span>
          <strong>a cada ${CONFIG.UPDATE_INTERVAL / 1000} s</strong>
        </div>
        <div>
          <span>Região</span>
          <strong>Brazil South (São Paulo)</strong>
        </div>
        <div>
          <span>Acesso</span>
          <strong>Login com perfis: operador e gestor</strong>
        </div>
      </div>
    </article>

  `;

}


async function carregarUsuarios() {

  const painel = document.getElementById("painelUsuarios");

  if (!painel) {
    return;
  }

  let usuarios = [];

  try {
    ({ usuarios } = await api("/usuarios"));
  } catch (falha) {
    painel.innerHTML = `<h2>Usuários</h2><p class="erro-form">${texto(falha.message)}</p>`;
    return;
  }

  const eu = usuarioAtual()?.id;

  const linhas = usuarios
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(u => `
      <tr>
        <td><strong>${texto(u.nome)}</strong></td>
        <td>${texto(u.id)}</td>
        <td>${u.perfil === "gestor" ? "Gestor" : "Operador logístico"}</td>
        <td>${u.id === eu
          ? "você"
          : `<button type="button" class="botao perigo" data-remover-usuario="${texto(u.id)}">Remover</button>`}</td>
      </tr>
    `).join("");

  painel.innerHTML = `
    <h2>Usuários</h2>
    <p>Quem acessa o painel. Operador acompanha a carga; gestor também cadastra veículos, viagens e usuários.</p>

    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>

    <form id="formUsuario" class="form-grade" novalidate>
      <label class="campo"><span>Nome</span><input name="nome" required></label>
      <label class="campo"><span>E-mail</span><input name="email" type="email" required></label>
      <label class="campo"><span>Perfil</span>
        <select name="perfil">
          <option value="operador">Operador logístico</option>
          <option value="gestor">Gestor</option>
        </select>
      </label>
      <label class="campo"><span>Senha inicial (mín. 8)</span><input name="senha" type="password" autocomplete="new-password" required></label>
      <button type="submit" class="botao">Criar usuário</button>
    </form>
    <p class="erro-form" id="erroUsuario" role="alert" hidden></p>
  `;

  document.getElementById("formUsuario").addEventListener("submit", async evento => {

    evento.preventDefault();

    const erro = document.getElementById("erroUsuario");
    erro.hidden = true;

    try {
      await api("/usuarios", { metodo: "POST", corpo: Object.fromEntries(new FormData(evento.target)) });
      carregarUsuarios();
    } catch (falha) {
      erro.textContent = falha.message;
      erro.hidden = false;
    }

  });

  painel.querySelectorAll("[data-remover-usuario]").forEach(botao => {

    botao.addEventListener("click", async () => {

      const id = botao.dataset.removerUsuario;

      if (!confirm(`Remover o acesso de ${id}?`)) {
        return;
      }

      try {
        await api(`/usuarios/${encodeURIComponent(id)}`, { metodo: "DELETE" });
        carregarUsuarios();
      } catch (falha) {
        alert(falha.message);
      }

    });

  });

}


carregarConfiguracoes().then(carregarUsuarios);
