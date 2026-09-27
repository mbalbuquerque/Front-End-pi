// Tela de sensores: registro de sensor novo, chave de acesso e remoção (gestor).
// A chave aparece uma vez só, na hora de registrar ou de gerar outra:
// o servidor guarda apenas uma impressão dela, não a chave.

async function carregarSensores() {

  const conteudo = document.getElementById("conteudo");

  try {

    const [{ dispositivos }, { veiculos }] = await Promise.all([
      api("/dispositivos"),
      api("/veiculos")
    ]);

    dispositivos.sort((a, b) => a.id.localeCompare(b.id));

    const ultimas = await Promise.all(
      dispositivos.map(d =>
        buscarLeituras({ deviceId: d.id, limite: 1 }).then(l => l[0] || null)
      )
    );

    marcarConexao(true);

    const linhas = dispositivos.map((d, i) => {

      const veiculo = veiculos.find(v => v.deviceId === d.id);
      const ultima = ultimas[i];

      return `
        <tr>
          <td><strong>${texto(d.id)}</strong></td>
          <td>${texto(d.descricao || "--")}</td>
          <td>${veiculo ? texto(veiculo.id) : "nenhum"}</td>
          <td>${ultima ? formatarDataHora(horarioDe(ultima)) : "nunca enviou"}</td>
          ${ehGestor() ? `
            <td class="acoes-tabela">
              <button type="button" class="botao secundario" data-nova-chave="${texto(d.id)}">Gerar nova chave</button>
              <button type="button" class="botao perigo" data-remover="${texto(d.id)}">Remover</button>
            </td>` : ""}
        </tr>
      `;

    }).join("");

    conteudo.innerHTML = `

      <div id="chaveNova"></div>

      ${ehGestor() ? formularioSensor() : ""}

      <article class="panel">
        <h2>Sensores registrados</h2>
        <p>Um sensor só envia dados com a chave dele. Depois de registrar, ligue o sensor a um veículo em Veículos.</p>

        ${dispositivos.length ? `
          <div class="tabela-wrap">
            <table class="tabela">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Descrição</th>
                  <th>Veículo</th>
                  <th>Último envio</th>
                  ${ehGestor() ? "<th></th>" : ""}
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>` : `
          <div class="estado">
            <strong>Nenhum sensor registrado.</strong>
            ${ehGestor() ? "Registre o primeiro sensor acima." : "Peça ao gestor para registrar os sensores."}
          </div>`}
      </article>

    `;

    ligarAcoes();

  }

  catch (erro) {

    console.error("Erro ao carregar sensores:", erro);
    marcarConexao(false);
    conteudo.innerHTML = ERRO_AZURE;

  }

}


function formularioSensor() {

  return `
    <article class="panel">
      <h2>Registrar sensor</h2>
      <p>Use o ID da etiqueta do gabinete (ex.: coldtrack-02). A chave é gerada aqui.</p>

      <form id="formSensor" class="form-grade" novalidate>
        <label class="campo"><span>ID do sensor</span><input name="id" placeholder="coldtrack-02" required></label>
        <label class="campo"><span>Descrição</span><input name="descricao" placeholder="ESP32-C3 + DHT11, baú do CT-002"></label>
        <button type="submit" class="botao">Registrar sensor</button>
      </form>

      <p class="erro-form" id="erroSensor" role="alert" hidden></p>
    </article>
  `;

}


// Mostra a chave com o trecho pronto para o secrets.h do firmware.
function mostrarChave(id, chave) {

  const trecho =
    `#define DEVICE_ID  "${id}"\n#define DEVICE_KEY "${chave}"`;

  const alvo = document.getElementById("chaveNova");

  alvo.innerHTML = `
    <article class="panel chave-nova" role="status">
      <h2>Chave do sensor ${texto(id)}</h2>
      <p><strong>Copie agora: a chave não aparece de novo.</strong>
        Cole estas linhas no <code>secrets.h</code> do firmware e grave o sensor.</p>

      <pre class="trecho-codigo">${texto(trecho)}</pre>

      <div class="acoes-item">
        <button type="button" class="botao" id="copiarChave">Copiar</button>
        <button type="button" class="botao secundario" id="fecharChave">Já copiei</button>
      </div>
    </article>
  `;

  document.getElementById("copiarChave").addEventListener("click", async evento => {

    try {
      await navigator.clipboard.writeText(trecho);
      evento.target.textContent = "Copiado";
    } catch (erro) {
      evento.target.textContent = "Selecione e copie o texto acima";
    }

  });

  document.getElementById("fecharChave").addEventListener("click", () => {
    alvo.innerHTML = "";
  });

  alvo.scrollIntoView({ block: "start" });

}


function ligarAcoes() {

  const form = document.getElementById("formSensor");

  if (form) {

    form.addEventListener("submit", async evento => {

      evento.preventDefault();

      const erro = document.getElementById("erroSensor");
      erro.hidden = true;

      try {
        const sensor = await api("/dispositivos", {
          metodo: "POST",
          corpo: Object.fromEntries(new FormData(form))
        });
        await carregarSensores();
        mostrarChave(sensor.id, sensor.chave);
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
      }

    });

  }

  document.querySelectorAll("[data-nova-chave]").forEach(botao => {

    botao.addEventListener("click", async () => {

      const id = botao.dataset.novaChave;

      if (!confirm(`Gerar nova chave para ${id}? A chave atual para de funcionar na hora e o sensor precisa ser gravado de novo.`)) {
        return;
      }

      try {
        const { chave } = await api(`/dispositivos/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: {} });
        mostrarChave(id, chave);
      } catch (falha) {
        alert(falha.message);
      }

    });

  });

  document.querySelectorAll("[data-remover]").forEach(botao => {

    botao.addEventListener("click", async () => {

      const id = botao.dataset.remover;

      if (!confirm(`Remover o sensor ${id}? Ele para de enviar dados. As leituras já gravadas continuam guardadas.`)) {
        return;
      }

      try {
        await api(`/dispositivos/${encodeURIComponent(id)}`, { metodo: "DELETE" });
        carregarSensores();
      } catch (falha) {
        alert(falha.message);
      }

    });

  });

}


carregarSensores();
