// Tela de sensores: situação de cada sensor (online, sinal, última temperatura),
// configuração pelo cabo USB (gestor) e registro manual para o simulador.
// A chave aparece uma vez só: o servidor guarda apenas uma impressão dela.
// Wi-Fi e senha da rede vão direto para o sensor pelo cabo, nunca para a API.

// Sem leitura há mais que 3 envios (60 s), o sensor está sem sinal.
const SEM_SINAL_MS = CONFIG.UPDATE_INTERVAL * 3;

let dispositivosAtuais = [];
let primeiraCarga = true;


// ---------------------------------------------------------
// ESTRUTURA DA TELA (montada uma vez; só a tabela se atualiza)
// ---------------------------------------------------------

function montarTela() {

  document.getElementById("conteudo").innerHTML = `

    <div id="chaveNova"></div>

    ${ehGestor() ? `<article class="panel" id="painelCabo"></article>` : ""}

    <article class="panel">
      <h2>Sensores registrados</h2>
      <p>A situação se atualiza sozinha a cada ${CONFIG.UPDATE_INTERVAL / 1000} s.
        Depois de conectar, ligue o sensor a um veículo em <a href="veiculos.html">Veículos</a>.</p>
      <div id="tabelaSensores"><div class="estado">Carregando sensores…</div></div>
    </article>

    ${ajuda()}

    ${ehGestor() ? formularioManual() : ""}

  `;

  if (ehGestor()) {
    mostrarInicioCabo();
    ligarFormularioManual();
  }

  document.getElementById("conteudo").addEventListener("click", evento => {

    const link = evento.target.closest("[data-ajuda]");

    if (link) {
      evento.preventDefault();
      abrirAjuda(link.dataset.ajuda);
    }

  });

}


// ---------------------------------------------------------
// TABELA COM A SITUAÇÃO DE CADA SENSOR
// ---------------------------------------------------------

async function atualizarTabela() {

  const alvo = document.getElementById("tabelaSensores");

  try {

    const [{ dispositivos }, { veiculos }] = await Promise.all([
      api("/dispositivos"),
      api("/veiculos")
    ]);

    dispositivos.sort((a, b) => a.id.localeCompare(b.id));
    dispositivosAtuais = dispositivos;

    const ultimas = await Promise.all(
      dispositivos.map(d =>
        buscarLeituras({ deviceId: d.id, limite: 1 }).then(l => l[0] || null)
      )
    );

    marcarConexao(true);

    if (primeiraCarga) {
      primeiraCarga = false;
      // Empresa sem sensor: a ajuda já abre mostrando o caminho.
      document.getElementById("ajuda").open = dispositivos.length === 0;
    }

    if (!dispositivos.length) {

      alvo.innerHTML = `
        <div class="estado">
          <strong>Nenhum sensor registrado.</strong>
          ${ehGestor()
            ? "Ligue o sensor no cabo USB e use “Conectar sensor pelo cabo” acima."
            : "Peça ao gestor para conectar os sensores."}
        </div>`;
      return;

    }

    const linhas = dispositivos.map((d, i) => {

      const veiculo = veiculos.find(v => v.deviceId === d.id);
      const ultima = ultimas[i];

      return `
        <tr>
          <td><strong>${texto(d.id)}</strong></td>
          <td>${texto(d.descricao || "--")}</td>
          <td>${veiculo ? texto(veiculo.id) : "nenhum"}</td>
          <td>
            ${seloSituacao(ultima)}
            ${ultima ? `<small class="linha-apoio">último envio ${formatarDataHora(horarioDe(ultima))}</small>` : ""}
          </td>
          <td>${ultima ? descreverSinal(ultima.rssi) : "--"}</td>
          <td>${ultima ? formatarTemp(ultima.temperatura) : "--"}</td>
          ${ehGestor() ? `
            <td class="acoes-tabela">
              <button type="button" class="botao secundario" data-nova-chave="${texto(d.id)}">Gerar nova chave</button>
              <button type="button" class="botao perigo" data-remover="${texto(d.id)}">Remover</button>
            </td>` : ""}
        </tr>
      `;

    }).join("");

    alvo.innerHTML = `
      <div class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th>ID</th>
              <th>Descrição</th>
              <th>Veículo</th>
              <th>Situação</th>
              <th>Sinal Wi-Fi</th>
              <th>Última temperatura</th>
              ${ehGestor() ? "<th></th>" : ""}
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;

    ligarAcoesTabela();

  }

  catch (erro) {

    console.error("Erro ao carregar sensores:", erro);
    marcarConexao(false);

    // Já tinha tabela: mantém a última e só marca o selo do topo.
    if (primeiraCarga) {
      alvo.innerHTML = ERRO_AZURE;
    }

  }

}


function seloSituacao(ultima) {

  if (!ultima) {
    return `<span class="status aguardando">NUNCA ENVIOU</span>`;
  }

  const atraso = Date.now() - horarioDe(ultima).getTime();

  if (atraso <= SEM_SINAL_MS) {
    return `<span class="status normal">ONLINE</span>`;
  }

  return `<span class="status aguardando">SEM SINAL HÁ ${texto(formatarDuracao(atraso).toUpperCase())}</span>`;

}


// Mesma escala do dashboard (app.js).
function descreverSinal(rssi) {

  if (typeof rssi !== "number") {
    return "não informado";
  }

  const nivel =
    rssi >= -60 ? "Excelente" :
    rssi >= -70 ? "Bom" :
    rssi >= -80 ? "Regular" : "Fraco";

  return `${nivel} (${rssi} dBm)`;

}


function ligarAcoesTabela() {

  document.querySelectorAll("[data-nova-chave]").forEach(botao => {

    botao.addEventListener("click", async () => {

      const id = botao.dataset.novaChave;

      if (!confirm(`Gerar nova chave para ${id}? A chave atual para de funcionar na hora e o sensor precisa ser conectado no cabo de novo.`)) {
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
        atualizarTabela();
      } catch (falha) {
        alert(falha.message);
      }

    });

  });

}


// ---------------------------------------------------------
// CONECTAR PELO CABO (gestor)
// ---------------------------------------------------------

let sensorUsb = null;
let infoPlaca = null;
let chavePendente = null;   // chave já gerada na API, ainda não gravada na placa


function painelCabo(html) {

  document.getElementById("painelCabo").innerHTML = `
    <h2>Conectar sensor pelo cabo</h2>
    ${html}
  `;

}


function mostrarInicioCabo(mensagemErro) {

  if (!serialDisponivel) {

    painelCabo(`
      <p>Este navegador não conversa com o cabo USB. Abra o painel no
        <strong>Chrome ou Edge, no computador</strong>, para configurar o sensor.
        No celular, Firefox e Safari isso não funciona.</p>
      <p>Para o simulador Wokwi, use “Registrar sem cabo”, no fim da página.</p>
    `);
    return;

  }

  painelCabo(`
    <p>Ligue o sensor no computador pelo cabo USB. O painel reconhece o sensor,
      cadastra na sua empresa e grava nele a rede Wi-Fi que ele vai usar.</p>
    <div class="acoes-item">
      <button type="button" class="botao" id="botaoCabo">Conectar sensor pelo cabo</button>
      <a href="#" data-ajuda="passos">Como funciona</a>
    </div>
    ${mensagemErro ? `<p class="erro-form" role="alert">${mensagemErro}</p>` : ""}
  `);

  document.getElementById("botaoCabo").addEventListener("click", conectarPeloCabo);

}


async function conectarPeloCabo() {

  await encerrarCabo();

  sensorUsb = new SensorUsb();
  sensorUsb.aoDesconectar = () => {
    encerrarCabo();
    mostrarInicioCabo("O cabo foi desconectado. Ligue o sensor de novo e clique em “Conectar sensor pelo cabo”.");
  };

  try {
    await sensorUsb.conectar();
  } catch (erro) {

    sensorUsb = null;

    // Fechou a janela sem escolher: não é erro.
    if (erro.name === "NotFoundError") {
      mostrarInicioCabo();
      return;
    }

    mostrarInicioCabo(`Não foi possível abrir a porta (${texto(erro.message)}). Feche a Arduino IDE ou outra aba que esteja usando o sensor e tente de novo. <a href="#" data-ajuda="porta">Ver ajuda</a>`);
    return;

  }

  painelCabo(`<div class="estado">Conversando com o sensor…</div>`);

  infoPlaca = await sensorUsb.info();

  if (!infoPlaca) {
    await encerrarCabo();
    mostrarInicioCabo(`O sensor não respondeu. Confira se ele está com o firmware ColdTrack atualizado. <a href="#" data-ajuda="porta">Ver ajuda</a>`);
    return;
  }

  chavePendente = null;
  mostrarFormularioRede();

}


// Decide o que falta para este sensor e monta o formulário.
function situacaoDaPlaca() {

  // Já registrado nesta tentativa; falta só acertar a rede.
  if (chavePendente) {
    return "registrado-agora";
  }

  const registrado = dispositivosAtuais.some(d => d.id === infoPlaca.id.toLowerCase());

  if (registrado && infoPlaca.configurado) {
    return "trocar-rede";
  }

  if (registrado) {
    return "nova-chave";
  }

  return "novo";

}


function mostrarFormularioRede(mensagemErro, rede) {

  const situacao = situacaoDaPlaca();

  const explicacao = {
    "trocar-rede": `Este sensor já é da sua empresa e continua com a mesma chave. Informe só a rede nova.`,
    "nova-chave": `Este sensor já está registrado, mas não tem a chave gravada. Uma chave nova será gerada, e a anterior para de valer.`,
    "novo": `Sensor novo: ele será registrado na sua empresa com este ID.`,
    "registrado-agora": `Sensor registrado na sua empresa. Falta só o sensor entrar na rede.`
  }[situacao];

  painelCabo(`
    <p>
      <span class="status normal">SENSOR RECONHECIDO</span>
      <strong>${texto(infoPlaca.id)}</strong> · firmware ${texto(infoPlaca.fw || "--")}
      ${infoPlaca.ssid ? ` · rede atual: ${texto(infoPlaca.ssid)}` : ""}
    </p>
    <p>${explicacao}</p>

    <form id="formCabo" class="form-grade" novalidate autocomplete="off">
      ${situacao === "novo" ? `
        <label class="campo"><span>Descrição (opcional)</span>
          <input name="descricao" maxlength="60" placeholder="ESP32-C3 + DHT11, baú do CT-002"></label>` : ""}
      <label class="campo"><span>Nome da rede Wi-Fi</span>
        <input name="ssid" maxlength="32" required value="${texto(rede || "")}" placeholder="Hotspot do celular"></label>
      <label class="campo"><span>Senha da rede</span>
        <input name="senha" type="password" maxlength="63" autocomplete="new-password"></label>
      <button type="submit" class="botao">${situacao === "trocar-rede" ? "Trocar rede" : "Conectar sensor"}</button>
    </form>

    ${situacao === "trocar-rede" ? `
      <label class="opcao">
        <input type="checkbox" form="formCabo" name="novaChave">
        Gerar chave nova e gravar no sensor (use se ele parou de enviar depois de “Gerar nova chave”)
      </label>` : ""}

    ${mensagemErro ? `<p class="erro-form" role="alert">${mensagemErro}</p>` : ""}

    <div class="acoes-item">
      <button type="button" class="botao secundario" id="cancelarCabo">Cancelar</button>
    </div>
  `);

  document.getElementById("formCabo").addEventListener("submit", evento => {
    evento.preventDefault();
    const dados = new FormData(evento.target);
    enviarConfiguracao(dados.get("novaChave") ? "nova-chave" : situacao, dados);
  });

  document.getElementById("cancelarCabo").addEventListener("click", async () => {
    await encerrarCabo();
    mostrarInicioCabo();
  });

  document.querySelector("#formCabo [name=ssid]").focus();

}


async function enviarConfiguracao(situacao, dados) {

  const ssid = String(dados.get("ssid") || "").trim();
  const senha = String(dados.get("senha") || "");

  if (!ssid) {
    mostrarFormularioRede("Informe o nome da rede Wi-Fi.", ssid);
    return;
  }

  if (senha && senha.length < 8) {
    mostrarFormularioRede("Senha de Wi-Fi tem pelo menos 8 caracteres. Rede aberta: deixe a senha em branco.", ssid);
    return;
  }

  const id = infoPlaca.id.toLowerCase();
  let comando;

  try {

    if (situacao === "trocar-rede") {

      comando = { cmd: "wifi", ssid, senha };

    } else {

      // A chave sai da API uma vez; se a rede falhar, reaproveita na próxima tentativa.
      if (!chavePendente) {

        painelCabo(`<div class="estado">Registrando o sensor na sua empresa…</div>`);

        const resposta = situacao === "novo"
          ? await api("/dispositivos", { metodo: "POST", corpo: { id, descricao: String(dados.get("descricao") || "").trim() } })
          : await api(`/dispositivos/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: {} });

        chavePendente = resposta.chave;
        await atualizarTabela();

      }

      comando = { cmd: "config", ssid, senha, id, chave: chavePendente };

    }

  } catch (falha) {

    if (falha.status === 409) {
      mostrarFormularioRede(`O sensor ${texto(id)} está registrado em outra empresa. Peça para essa empresa remover o sensor antes.`, ssid);
    } else {
      mostrarFormularioRede(`Não foi possível registrar o sensor: ${texto(falha.message)}`, ssid);
    }
    return;

  }

  painelCabo(`<div class="estado">Testando a rede “${texto(ssid)}” no sensor. Isso leva até 15 s…</div>`);

  const resposta = await sensorUsb.configurar(comando);

  if (!resposta) {
    mostrarFormularioRede(`O sensor não respondeu. Confira se o cabo continua ligado e tente de novo. <a href="#" data-ajuda="porta">Ver ajuda</a>`, ssid);
    return;
  }

  if (!resposta.ok) {
    mostrarFormularioRede(mensagemDeErro(resposta.erro, ssid), ssid);
    return;
  }

  chavePendente = null;
  infoPlaca = { ...infoPlaca, configurado: true, ssid };
  esperarPrimeiraLeitura(id, ssid, resposta.rssi);

}


function mensagemDeErro(codigo, ssid) {

  const rede = `“${texto(ssid)}”`;

  return {
    senha: `Senha errada para a rede ${rede}. Confira e tente de novo. <a href="#" data-ajuda="senha">Ver ajuda</a>`,
    rede_nao_encontrada: `O sensor não achou a rede ${rede}. Confira o nome e se o hotspot está ligado em 2.4 GHz. <a href="#" data-ajuda="rede">Ver ajuda</a>`,
    tempo: `O sensor não conseguiu entrar na rede ${rede} em 15 s. Confira o nome, a senha, se o hotspot está em 2.4 GHz e perto do sensor. <a href="#" data-ajuda="rede">Ver ajuda</a>`,
    rede_invalida: "O nome da rede aceita até 32 caracteres e a senha até 63."
  }[codigo] || `O sensor recusou a configuração (${texto(codigo || "sem motivo")}). Tente de novo.`;

}


// Rede ok: agora espera a primeira leitura chegar na nuvem.
async function esperarPrimeiraLeitura(id, ssid, rssi) {

  const inicio = Date.now();

  painelCabo(`
    <p><span class="status normal">CONECTADO</span>
      Sensor <strong>${texto(id)}</strong> na rede “${texto(ssid)}” · sinal ${descreverSinal(rssi)}.</p>
    <div class="estado" id="esperaLeitura">Aguardando a primeira leitura chegar no Azure…</div>
  `);

  // O sensor manda na hora e depois a cada 20 s; 2 min cobre relógio e reenvio.
  while (Date.now() - inicio < 120000) {

    await new Promise(r => setTimeout(r, 5000));

    const alvo = document.getElementById("esperaLeitura");
    if (!alvo) {
      return;   // gestor já saiu desta etapa
    }

    try {

      const [ultima] = await buscarLeituras({ deviceId: id, limite: 1 });

      // Só vale leitura recebida depois desta configuração.
      const recebida = new Date(ultima ? ultima.recebidoEm || horarioDe(ultima) : 0);

      if (ultima && recebida.getTime() >= inicio - 5000) {

        await encerrarCabo();
        atualizarTabela();

        painelCabo(`
          <p><span class="status normal">ONLINE</span>
            Sensor <strong>${texto(id)}</strong> enviando: ${formatarTemp(ultima.temperatura)} às ${formatarDataHora(horarioDe(ultima))}.</p>
          <p>Pode tirar o sensor do computador e ligar num carregador. Ele lembra da rede.</p>
          <div class="acoes-item">
            <button type="button" class="botao" id="outroSensor">Conectar outro sensor</button>
          </div>
        `);

        document.getElementById("outroSensor").addEventListener("click", conectarPeloCabo);
        return;

      }

    } catch (erro) {
      // Falha momentânea da API: tenta de novo no próximo ciclo.
    }

  }

  await encerrarCabo();

  const alvo = document.getElementById("esperaLeitura");
  if (alvo) {
    alvo.innerHTML = `O sensor entrou na rede, mas nenhuma leitura chegou em 2 min.
      <a href="#" data-ajuda="online">Ver ajuda</a>`;
  }

}


async function encerrarCabo() {

  if (sensorUsb) {
    const usb = sensorUsb;
    sensorUsb = null;
    usb.aoDesconectar = null;
    await usb.fechar();
  }

}


// ---------------------------------------------------------
// AJUDA
// ---------------------------------------------------------

function ajuda() {

  return `
    <details class="panel ajuda" id="ajuda">
      <summary><h2>Como conectar um sensor</h2></summary>

      <ol class="passos" id="ajuda-passos">
        <li>Abra o painel no <strong>Chrome ou Edge, no computador</strong>, com a conta de gestor.</li>
        <li>Ligue o hotspot do celular (ou use o Wi-Fi do local) na banda de <strong>2.4 GHz</strong>. No iPhone: “Maximizar compatibilidade”.</li>
        <li>Ligue o sensor no computador pelo cabo USB.</li>
        <li>Clique em <strong>Conectar sensor pelo cabo</strong> e escolha a porta do sensor na janela que o navegador abre.</li>
        <li>Digite o nome e a senha da rede. O sensor testa a rede antes de gravar.</li>
        <li>Espere aparecer <strong>ONLINE</strong>. Pode tirar do cabo e ligar num carregador: ele lembra da rede.</li>
        <li>Em <a href="veiculos.html">Veículos</a>, ligue o sensor ao veículo que vai levar a carga.</li>
      </ol>

      <h3>Se der errado</h3>
      <dl class="problemas">
        <dt id="ajuda-porta">A porta não aparece ou o sensor não responde</dt>
        <dd>Use um cabo de dados (alguns só carregam). Feche a Arduino IDE e outras abas que estejam usando o sensor.
          O sensor precisa estar com o firmware ColdTrack gravado, com “USB CDC On Boot” ligado na Arduino IDE.</dd>

        <dt id="ajuda-senha">Senha errada</dt>
        <dd>Confira maiúsculas e minúsculas. Nada é gravado quando a rede falha: o sensor continua na rede anterior.</dd>

        <dt id="ajuda-rede">Rede não encontrada ou demorou demais</dt>
        <dd>O sensor só enxerga redes de 2.4 GHz. Confira o nome exato da rede e deixe o celular perto do sensor.</dd>

        <dt id="ajuda-online">Entrou na rede mas nunca ficou ONLINE</dt>
        <dd>Confira se a rede tem internet (o hotspot precisa de dados móveis). Se o sensor foi removido
          ou ganhou chave nova, conecte pelo cabo de novo.</dd>

        <dt id="ajuda-troca">Trocar de rede (de casa para o celular)</dt>
        <dd>Ligue o sensor no cabo e conecte de novo: o painel reconhece o sensor e pede só a rede nova.</dd>
      </dl>
    </details>
  `;

}


function abrirAjuda(item) {

  const painel = document.getElementById("ajuda");
  painel.open = true;

  const alvo = document.getElementById(`ajuda-${item}`) || painel;
  alvo.scrollIntoView({ block: "start" });

}


// ---------------------------------------------------------
// REGISTRO SEM CABO (simulador Wokwi e desenvolvimento)
// ---------------------------------------------------------

function formularioManual() {

  return `
    <details class="panel">
      <summary><h2>Registrar sem cabo</h2></summary>
      <p>Para o simulador Wokwi ou para gravar o sensor pela Arduino IDE: gera o ID e a chave
        para colar no <code>secrets.h</code>. Com o sensor em mãos, prefira “Conectar sensor pelo cabo”.</p>

      <form id="formSensor" class="form-grade" novalidate>
        <label class="campo"><span>ID do sensor</span><input name="id" placeholder="coldtrack-02" required></label>
        <label class="campo"><span>Descrição</span><input name="descricao" placeholder="ESP32-C3 + DHT22, simulador"></label>
        <button type="submit" class="botao">Registrar sensor</button>
      </form>

      <p class="erro-form" id="erroSensor" role="alert" hidden></p>
    </details>
  `;

}


function ligarFormularioManual() {

  const form = document.getElementById("formSensor");

  form.addEventListener("submit", async evento => {

    evento.preventDefault();

    const erro = document.getElementById("erroSensor");
    erro.hidden = true;

    try {
      const sensor = await api("/dispositivos", {
        metodo: "POST",
        corpo: Object.fromEntries(new FormData(form))
      });
      form.reset();
      await atualizarTabela();
      mostrarChave(sensor.id, sensor.chave);
    } catch (falha) {
      erro.textContent = falha.message;
      erro.hidden = false;
    }

  });

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
        Com o sensor em mãos, o jeito mais fácil é “Conectar sensor pelo cabo”, que grava a chave sozinho.
        Para o simulador, cole estas linhas no <code>secrets.h</code>.</p>

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


montarTela();
atualizarTabela();
setInterval(atualizarTabela, CONFIG.UPDATE_INTERVAL);
