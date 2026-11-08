// Tela de configurações: minha conta (troca de senha), faixas das cargas,
// sensores, fonte de dados e, para o gestor, os usuários da empresa.

async function carregarConfiguracoes() {

  const conteudo = document.getElementById("conteudo");

  let perfis = [];
  let dispositivos = [];
  let conectado = true;

  try {

    [perfis, { dispositivos }] = await Promise.all([
      carregarPerfis(),
      api("/dispositivos")
    ]);

  }

  catch (erro) {

    console.error("Erro ao consultar o Azure:", erro);
    conectado = false;

  }

  marcarConexao(conectado);

  const linhasPerfis = perfis.map(p => {

    const faixa = faixaDoPerfil(p);

    return `
      <tr>
        <td><strong>${texto(p.nome)}</strong></td>
        <td>${descreverNormal(faixa)}</td>
        <td>até ${faixa.margem} °C fora da faixa</td>
        <td>${descreverCritico(faixa)}</td>
      </tr>
    `;

  }).join("");

  const usuario = usuarioAtual();

  conteudo.innerHTML = `

    <article class="panel">
      <h2>Minha conta</h2>
      <p>${texto(usuario?.nome)} · ${texto(usuario?.id)} · ${texto(usuario?.empresa)}</p>

      <form id="formSenha" class="form-grade" novalidate>
        <label class="campo"><span>Senha atual</span><input name="atual" type="password" autocomplete="current-password" required></label>
        <label class="campo"><span>Nova senha (mín. 8)</span><input name="nova" type="password" autocomplete="new-password" minlength="8" required></label>
        <button type="submit" class="botao">Trocar senha</button>
      </form>
      <p class="erro-form" id="erroSenha" role="alert" hidden></p>
      <p class="aviso-ok" id="okSenha" role="status" hidden>Senha trocada. Os outros aparelhos conectados saem da conta.</p>
    </article>

    <article class="panel">
      <h2>Faixas de temperatura</h2>
      <p>Cada veículo usa a faixa do perfil da carga. A mesma regra vale no sensor (LED), na nuvem e no painel: o sensor recebe a faixa do veículo a cada envio.</p>

      ${conectado ? `
        <div class="tabela-wrap">
          <table class="tabela">
            <thead>
              <tr>
                <th>Perfil de carga</th>
                <th>Normal</th>
                <th>Atenção</th>
                <th>Crítico</th>
              </tr>
            </thead>
            <tbody>${linhasPerfis}</tbody>
          </table>
        </div>` : '<div class="estado">Sem conexão com o Azure.</div>'}

      <div class="nota">
        Manga e uva usam faixas de referência de pós-colheita, ainda a validar com o produtor.
        Frio demais também conta: abaixo da faixa a fruta sofre dano por frio.
        <strong>O DHT11 não mede abaixo de 0 °C</strong>: para uva, usar DHT22 ou sonda DS18B20.
      </div>
    </article>

    <article class="panel">
      <h2>Sensores e comunicação</h2>
      <p>Sensores instalados nos compartimentos de carga.</p>

      <div class="campos section-gap">
        <div>
          <span>Sensores registrados</span>
          <strong>${conectado ? dispositivos.length : "sem conexão"} · <a href="sensores.html">ver sensores</a></strong>
        </div>
        <div>
          <span>Intervalo de envio</span>
          <strong>${CONFIG.UPDATE_INTERVAL / 1000} s</strong>
        </div>
        <div>
          <span>Acesso do sensor</span>
          <strong>Chave própria por sensor</strong>
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
          <strong>Login com perfis; cada empresa vê só os próprios dados</strong>
        </div>
      </div>
    </article>

  `;

}


function ligarTrocaSenha() {

  const form = document.getElementById("formSenha");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async evento => {

    evento.preventDefault();

    const erro = document.getElementById("erroSenha");
    const ok = document.getElementById("okSenha");
    erro.hidden = true;
    ok.hidden = true;

    try {

      const { token, usuario } = await api("/senha", {
        metodo: "POST",
        corpo: Object.fromEntries(new FormData(form))
      });

      // A troca derruba o token antigo: guarda o novo para seguir logado aqui.
      salvarSessao(token, usuario);
      form.reset();
      ok.hidden = false;

    } catch (falha) {

      erro.textContent = falha.message;
      erro.hidden = false;

    }

  });

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
        <td class="acoes-tabela">${u.id === eu
          ? "você"
          : `<button type="button" class="botao secundario" data-redefinir="${texto(u.id)}">Redefinir senha</button>
             <button type="button" class="botao perigo" data-remover-usuario="${texto(u.id)}">Remover</button>`}</td>
      </tr>
    `).join("");

  painel.innerHTML = `
    <h2>Usuários</h2>
    <p>Quem acessa o painel. Operador acompanha a carga; gestor também cadastra sensores, veículos, viagens e usuários.</p>

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

  painel.querySelectorAll("[data-redefinir]").forEach(botao => {
    botao.addEventListener("click", () => abrirRedefinir(botao.dataset.redefinir));
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


// Gestor define uma senha nova para quem esqueceu (a pessoa troca depois).
function abrirRedefinir(id) {

  let dialogo = document.getElementById("redefinir");

  if (!dialogo) {
    dialogo = document.createElement("dialog");
    dialogo.id = "redefinir";
    dialogo.className = "etiqueta";
    document.body.appendChild(dialogo);
  }

  dialogo.innerHTML = `
    <form class="dialogo-form" novalidate>
      <h2>Redefinir senha</h2>
      <p>${texto(id)} sai de todos os aparelhos e entra com a senha nova.</p>
      <label class="campo"><span>Nova senha (mín. 8)</span><input name="senha" type="password" autocomplete="new-password" minlength="8" required></label>
      <p class="erro-form" role="alert" hidden></p>
      <div class="acoes-item">
        <button type="submit" class="botao">Redefinir senha</button>
        <button type="button" class="botao secundario" data-fechar>Cancelar</button>
      </div>
    </form>
  `;

  const form = dialogo.querySelector("form");
  const erro = dialogo.querySelector(".erro-form");

  dialogo.querySelector("[data-fechar]").addEventListener("click", () => dialogo.close());

  form.addEventListener("submit", async evento => {

    evento.preventDefault();
    erro.hidden = true;

    try {
      await api(`/usuarios/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: { senha: form.senha.value } });
      dialogo.close();
      alert(`Senha de ${id} redefinida.`);
    } catch (falha) {
      erro.textContent = falha.message;
      erro.hidden = false;
    }

  });

  dialogo.showModal();

}


carregarConfiguracoes().then(() => {
  ligarTrocaSenha();
  carregarUsuarios();
});
