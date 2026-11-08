
(() => {
  "use strict";

  if (document.getElementById("ctChatWidget")) return;

  const WHATSAPP = "558196878213";
  const AVALIACOES_KEY = "coldtrack_chat_avaliacoes_v1";

  const conhecimento = [

    
{
  termos: [
    "manual", "guia", "tutorial",
    "instrucoes", "como usar", "ajuda do sistema"
  ],
  resposta:
    "O Manual do ColdTrack Control explica o acesso, " +
    "Dashboard, Monitoramento, Gestão Logística, Usuários, " +
    "Auditoria, Assistente Virtual e avaliação. " +
    "Use o botão Manual do sistema para consultar " +
    "os principais procedimentos."
},
{
  termos: ["infografico", "material visual", "ilustracao"],
  resposta:
    "O infográfico apresenta visualmente as funcionalidades " +
    "do ColdTrack e o fluxo Sensor → ESP32 → ThingSpeak → " +
    "Plataforma Web. Clique em Ver infográfico para abrir a imagem."
},
{
  termos: [
    "cadastrar carga", "nova carga",
    "criar carga", "incluir carga"
  ],
  resposta:
    "Para cadastrar uma carga:\n" +
    "1. Abra Gestão Logística.\n" +
    "2. Selecione a opção de nova carga.\n" +
    "3. Preencha os campos do formulário.\n" +
    "4. Revise e confirme.\n\n" +
    "Atenção: o cadastro ainda é demonstrativo e " +
    "não possui persistência definitiva no servidor."
},
{
  termos: ["editar carga", "alterar carga"],
  resposta:
    "Abra Gestão Logística, localize a carga, " +
    "selecione Editar, altere as informações e confirme. " +
    "As alterações ainda são demonstrativas."
},
{
  termos: ["cancelar carga", "concluir carga"],
  resposta:
    "Em Gestão Logística, localize o registro e escolha " +
    "a ação correspondente. Confira os dados antes de confirmar. " +
    "Essas operações ainda não possuem persistência no servidor."
},
{
  termos: ["atualizar leitura", "dados antigos", "sem dados"],
  resposta:
    "No Monitoramento, confira o horário da última leitura " +
    "e utilize a atualização manual. Se os dados continuarem " +
    "antigos ou indisponíveis, verifique a conectividade " +
    "do dispositivo e a disponibilidade do ThingSpeak."
},
{
  termos: ["interpretar temperatura", "temperatura critica"],
  resposta:
    "Os limites demonstrativos são:\n" +
    "• Até 15 °C: Normal.\n" +
    "• Acima de 15 °C até 20 °C: Atenção.\n" +
    "• Acima de 20 °C: Crítico.\n\n" +
    "Esses valores não substituem os limites específicos " +
    "de conservação de cada mercadoria."
},
{
  termos: ["avaliar atendimento", "dar nota", "estrelas"],
  resposta:
    "Após receber uma resposta, informe se sua dúvida " +
    "foi resolvida. Depois selecione de 1 a 5 estrelas, " +
    "escreva um comentário opcional e envie sua avaliação. " +
    "Atualmente, ela é salva apenas neste navegador."
},
{
  termos: ["exportar auditoria", "baixar csv"],
  resposta:
    "Abra Auditoria, aplique os filtros desejados " +
    "e utilize a opção de exportação CSV. " +
    "Os registros atuais são demonstrativos."
},
{
  termos: ["aplicativo", "instalar", "pwa", "offline"],
  resposta:
    "O ColdTrack possui estrutura PWA, mas a instalação " +
    "e o funcionamento offline dependem da configuração " +
    "e do suporte do navegador. Leituras atualizadas " +
    "do ThingSpeak exigem conexão com o serviço."
},

    {
      termos: ["coldtrack", "projeto", "plataforma", "objetivo"],
      resposta: "O ColdTrack Control é um projeto de monitoramento da cadeia fria que utiliza sensores IoT, ESP32, ThingSpeak e uma interface web."
    },
    {
      termos: ["temperatura", "limite", "graus", "critico", "alerta"],
      resposta: "Na configuração demonstrativa, até 15 °C é Normal; acima de 15 °C até 20 °C é Atenção; acima de 20 °C é Crítico. Os limites devem ser ajustados conforme a mercadoria."
    },
    {
      termos: ["sensor", "esp32", "dht", "dispositivo"],
      resposta: "O protótipo utiliza ESP32 e sensor da família DHT para coletar temperatura e umidade, transmitindo informações pela rede Wi-Fi."
    },
    {
      termos: ["thingspeak", "api", "nuvem"],
      resposta: "O ThingSpeak recebe as medições do dispositivo. O ColdTrack consulta o canal público 3496439 para apresentar temperatura, umidade e RSSI."
    },
    {
      termos: ["monitoramento", "monitorar", "leituras", "historico"],
      resposta: "O módulo de Monitoramento apresenta as leituras do ThingSpeak, histórico recente, situação térmica e indicação de dados antigos ou indisponíveis."
    },
    {
      termos: ["umidade"],
      resposta: "A umidade relativa do ar é medida em percentual (%) e ajuda a acompanhar as condições ambientais da operação."
    },
    {
      termos: ["wifi", "rssi", "sinal", "conectividade"],
      resposta: "O RSSI indica a intensidade do sinal Wi-Fi em dBm. Em geral, valores menos negativos representam sinais mais fortes."
    },
    {
      termos: ["logistica", "carga", "transporte", "veiculo"],
      resposta: "A Gestão Logística possui cadastro, consulta, edição e atualização demonstrativa de cargas. A persistência real depende da integração com o Back-End."
    },
    {
      termos: ["login", "acesso", "senha", "cadastro", "entrar"],
      resposta: "A plataforma possui telas de acesso e cadastro. A autenticação e as permissões reais ainda dependem da integração com o Back-End."
    },
    {
      termos: ["usuario", "perfil", "permissao"],
      resposta: "O módulo de Usuários apresenta perfis e registros demonstrativos. A autorização efetiva será controlada pelo servidor."
    },
    {
      termos: ["auditoria", "logs", "seguranca"],
      resposta: "A área de Auditoria permite explorar registros demonstrativos de eventos. Os logs operacionais reais dependerão do Back-End."
    },
    {
      termos: ["equipe", "desenvolvedor", "contato", "suporte", "atendimento", "humano"],
      resposta: "Você pode falar diretamente com o desenvolvedor pelo botão WhatsApp disponível neste chat."
    }
  ];

  const normalizar = texto =>
    String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  function responder(pergunta) {
    const texto = normalizar(pergunta);

    if (/^(oi|ola|bom dia|boa tarde|boa noite)$/.test(texto)) {
      return {
        encontrada: true,
        texto: "Olá! Sou o assistente virtual ColdTrack. Como posso ajudar?"
      };
    }

    let melhor = null;
    let pontuacao = 0;

    for (const item of conhecimento) {
      let pontos = 0;

      for (const termo of item.termos) {
        const chave = normalizar(termo);

        if (` ${texto} `.includes(` ${chave} `)) {
          pontos += chave.includes(" ") ? 10 : 1;
        }
      }

      if (pontos > pontuacao) {
        pontuacao = pontos;
        melhor = item;
      }
    }

    if (melhor) {
      return {
        encontrada: true,
        texto: melhor.resposta
      };
    }

    return {
      encontrada: false,
      texto:
        "Ainda não tenho uma resposta cadastrada para essa dúvida. " +
        "Você pode falar diretamente com o desenvolvedor pelo WhatsApp."
    };
  }

  const widget = document.createElement("div");
  widget.id = "ctChatWidget";
  widget.className = "ct-chat-widget";

  widget.innerHTML = `
    <button
      type="button"
      class="ct-chat-toggle"
      id="ctChatToggle"
      aria-expanded="false"
      aria-controls="ctChatPanel"
    >
      💬 Precisa de ajuda?
    </button>

    <section
      class="ct-chat-panel"
      id="ctChatPanel"
      aria-label="Assistente virtual ColdTrack"
      hidden
    >
      <header class="ct-chat-header">
        <div class="ct-chat-avatar" aria-hidden="true">❄</div>

        <div class="ct-chat-header-info">
          <strong>Assistente ColdTrack</strong>
          <small>Suporte virtual e atendimento humano</small>
        </div>

        <button
          type="button"
          class="ct-chat-close"
          id="ctChatClose"
          aria-label="Fechar chat"
        >×</button>
      </header>

      <div
        id="ctChatMessages"
        class="ct-chat-messages"
        role="log"
        aria-live="polite"
      ></div>

      <div class="ct-chat-resolution" id="ctChatResolution" hidden>
        <strong>Sua dúvida foi resolvida?</strong>

        <div class="ct-chat-resolution-actions">
          <button type="button" id="ctChatYes">Sim</button>
          <button type="button" id="ctChatNo">Não</button>
        </div>
      </div>

      <div class="ct-chat-rating" id="ctChatRating" hidden>
        <strong>Avalie nosso atendimento</strong>
        <p>Como foi sua experiência com o assistente?</p>

        <div class="ct-chat-stars" id="ctChatStars" role="group"
             aria-label="Nota do atendimento">
          <button type="button" data-star="1" aria-label="1 estrela">☆</button>
          <button type="button" data-star="2" aria-label="2 estrelas">☆</button>
          <button type="button" data-star="3" aria-label="3 estrelas">☆</button>
          <button type="button" data-star="4" aria-label="4 estrelas">☆</button>
          <button type="button" data-star="5" aria-label="5 estrelas">☆</button>
        </div>

        <label for="ctChatComment">Comentário (opcional)</label>
        <textarea
          id="ctChatComment"
          maxlength="500"
          rows="2"
          placeholder="Conte como podemos melhorar..."
        ></textarea>

        <button type="button" id="ctChatSaveRating">
          Enviar avaliação
        </button>

        <p id="ctChatRatingFeedback" role="status"></p>
      </div>

      <div class="ct-chat-quick" id="ctChatQuick">
      
<button type="button" data-action="manual">
  📘 Manual do sistema
</button>

<button type="button" data-action="infografico">
  🖼️ Ver infográfico
</button>

        <button type="button" data-question="O que é ColdTrack?">
          O projeto
        </button>
        <button type="button" data-question="Como funciona o monitoramento?">
          Monitoramento
        </button>
        <button type="button" data-question="Quais sensores são utilizados?">
          Sensores
        </button>
        <button type="button" data-question="Quais são os limites de temperatura?">
          Temperatura
        </button>
      </div>

      <form class="ct-chat-form" id="ctChatForm">
        <input
          id="ctChatInput"
          class="ct-chat-input"
          type="text"
          maxlength="300"
          placeholder="Digite sua pergunta..."
          aria-label="Digite sua pergunta"
          autocomplete="off"
          required
        >

        <button
          class="ct-chat-send"
          type="submit"
          aria-label="Enviar mensagem"
        >➤</button>
      </form>

      <div class="ct-chat-human">
        <a
          id="ctChatWhatsApp"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          ☎ Falar com o desenvolvedor
        </a>
      </div>

      <div class="ct-chat-footer">
        Atendimento virtual gratuito · Avaliação local
      </div>
    </section>
  `;

  document.body.appendChild(widget);

  const $ = id => document.getElementById(id);

  const toggle = $("ctChatToggle");
  const panel = $("ctChatPanel");
  const close = $("ctChatClose");
  const messages = $("ctChatMessages");
  const form = $("ctChatForm");
  const input = $("ctChatInput");
  const quick = $("ctChatQuick");
  const resolution = $("ctChatResolution");
  const rating = $("ctChatRating");
  const stars = $("ctChatStars");

  let iniciado = false;
  let respondendo = false;
  let nota = 0;
  let resolvida = null;
  let ultimaPergunta = "";

  function linkWhatsApp(pergunta = "") {
    const mensagem =
      "Olá! Vim pelo assistente virtual do ColdTrack Control. " +
      "Preciso de ajuda com o projeto." +
      (pergunta ? "\nMinha dúvida: " + pergunta : "");

    return (
      `https://wa.me/${WHATSAPP}?text=` +
      encodeURIComponent(mensagem)
    );
  }

  function atualizarWhatsApp() {
    $("ctChatWhatsApp").href = linkWhatsApp(ultimaPergunta);
  }

  function adicionarMensagem(texto, tipo = "bot") {
    const elemento = document.createElement("div");
    elemento.className = `ct-chat-message ${tipo}`;

    // Evita interpretar mensagens como HTML.
    elemento.textContent = texto;

    messages.appendChild(elemento);
    messages.scrollTop = messages.scrollHeight;

    return elemento;
  }

  function abrir() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");

    if (!iniciado) {
      adicionarMensagem(
        "Olá! 👋 Bem-vindo ao ColdTrack Control.\n\n" +
        "Sou o assistente virtual do projeto. " +
        "Posso responder perguntas sobre sensores, " +
        "monitoramento, temperatura e funcionalidades.\n\n" +
        "Se precisar, você também pode falar diretamente " +
        "com o desenvolvedor."
      );

      iniciado = true;
    }

    input.focus();
  }

  function fechar() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }

  function enviar(pergunta) {
    const texto = String(pergunta).trim();

    if (!texto || respondendo) return;

    ultimaPergunta = texto;
    atualizarWhatsApp();

    adicionarMensagem(texto, "user");

    input.value = "";
    input.disabled = true;
    respondendo = true;
    resolution.hidden = true;

    const digitando = adicionarMensagem(
      "Digitando...",
      "bot typing"
    );

    const resultado = responder(texto);

    setTimeout(() => {
      digitando.remove();
      adicionarMensagem(resultado.texto);

      if (!resultado.encontrada) {
        adicionarMensagem(
          "O botão Falar com o desenvolvedor está disponível " +
          "logo abaixo do campo de mensagem."
        );
      }

      resolution.hidden = false;
      input.disabled = false;
      respondendo = false;

      if (!panel.hidden) input.focus();
    }, 500);
  }

  function mostrarAvaliacao(foiResolvida) {
    resolvida = foiResolvida;
    resolution.hidden = true;
    rating.hidden = false;

    adicionarMensagem(
      foiResolvida
        ? "Que bom! Você pode avaliar o atendimento abaixo."
        : "Entendi. Você pode falar com o desenvolvedor " +
          "pelo WhatsApp e também avaliar sua experiência."
    );
  }

  function selecionarNota(valor) {
    nota = valor;

    stars.querySelectorAll("button").forEach(botao => {
      const selecionada =
        Number(botao.dataset.star) <= nota;

      botao.textContent = selecionada ? "★" : "☆";
      botao.setAttribute(
        "aria-pressed",
        String(Number(botao.dataset.star) === nota)
      );
    });
  }

  function salvarAvaliacao() {
    const feedback = $("ctChatRatingFeedback");

    if (nota < 1 || nota > 5) {
      feedback.textContent =
        "Selecione uma nota de 1 a 5 estrelas.";
      return;
    }

    const avaliacao = {
      nota,
      resolvida,
      comentario: $("ctChatComment").value.trim(),
      data: new Date().toISOString()
    };

    try {
      const existentes = JSON.parse(
        localStorage.getItem(AVALIACOES_KEY) || "[]"
      );

      const avaliacoes = Array.isArray(existentes)
        ? existentes
        : [];

      avaliacoes.push(avaliacao);

      localStorage.setItem(
        AVALIACOES_KEY,
        JSON.stringify(avaliacoes)
      );

      feedback.textContent =
        "Obrigado! Sua avaliação foi salva neste navegador.";

      $("ctChatSaveRating").disabled = true;

      adicionarMensagem(
        "Obrigado por avaliar nosso atendimento! ❄"
      );
    } catch (erro) {
      feedback.textContent =
        "Não foi possível salvar a avaliação neste navegador.";
    }
  }
  
function mostrarManual() {
  adicionarMensagem(
    "📘 MANUAL DO USUÁRIO — COLDTRACK CONTROL\n\n" +
    "1. Acesso: abra a Home e utilize o menu da plataforma.\n\n" +
    "2. Dashboard: consulte temperatura, umidade, RSSI " +
    "e horário da última leitura.\n\n" +
    "3. Monitoramento: veja o histórico, confira a " +
    "atualização dos dados e consulte as leituras.\n\n" +
    "4. Gestão Logística: consulte, cadastre, edite, " +
    "conclua ou cancele cargas demonstrativas.\n\n" +
    "5. Usuários: consulte registros e perfis demonstrativos.\n\n" +
    "6. Auditoria: pesquise eventos e exporte registros CSV.\n\n" +
    "7. Atendimento: faça perguntas, confirme se a dúvida " +
    "foi resolvida e avalie de 1 a 5 estrelas.\n\n" +
    "8. Suporte: utilize Falar com o desenvolvedor.\n\n" +
    "Digite o nome de um módulo ou procedimento " +
    "para receber instruções mais detalhadas."
  );
}

function mostrarInfografico() {
  const caminho = "assets/images/coldtrack-infografico.png";

  // Evita duplicar a prévia.
  const anterior = document.getElementById(
    "ctChatInfografico"
  );

  if (anterior) {
    anterior.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
    return;
  }

  const bloco = document.createElement("div");

  bloco.id = "ctChatInfografico";
  bloco.className = "ct-chat-infografico";

  const titulo = document.createElement("strong");
  titulo.textContent = "Infográfico ColdTrack Control";

  const imagem = document.createElement("img");
  imagem.src = caminho;
  imagem.alt =
    "Infográfico do ColdTrack Control com módulos " +
    "da plataforma e fluxo de monitoramento IoT.";
  imagem.loading = "lazy";

  const aviso = document.createElement("p");
  aviso.textContent =
    "Material ilustrativo. As telas e os indicadores " +
    "da imagem não representam medições atuais.";

  const abrir = document.createElement("a");
  abrir.href = caminho;
  abrir.target = "_blank";
  abrir.rel = "noopener noreferrer";
  abrir.textContent = "🔎 Ampliar infográfico";

  imagem.addEventListener("error", () => {
    imagem.hidden = true;
    aviso.textContent =
      "O infográfico não foi encontrado. Confira se " +
      "o arquivo existe em assets/coldtrack-infografico.png.";
    abrir.hidden = true;
  });

  bloco.appendChild(titulo);
  bloco.appendChild(imagem);
  bloco.appendChild(aviso);
  bloco.appendChild(abrir);

  messages.appendChild(bloco);
  messages.scrollTop = messages.scrollHeight;
}


  toggle.addEventListener("click", () => {
    panel.hidden ? abrir() : fechar();
  });

  close.addEventListener("click", fechar);

  form.addEventListener("submit", evento => {
    evento.preventDefault();
    enviar(input.value);
  });

  
quick.addEventListener("click", evento => {
  const botao = evento.target.closest("button");

  if (!botao) return;

  if (botao.dataset.action === "manual") {
    mostrarManual();
    return;
  }

  if (botao.dataset.action === "infografico") {
    mostrarInfografico();
    return;
  }

  if (botao.dataset.question) {
    enviar(botao.dataset.question);
  }

});

  // Confirmação de resolução da dúvida
  $("ctChatYes").addEventListener("click", () => {
    mostrarAvaliacao(true);
  });

  $("ctChatNo").addEventListener("click", () => {
    mostrarAvaliacao(false);
  });

  // Seleção da nota de atendimento
  stars.addEventListener("click", evento => {
    const botao = evento.target.closest("button[data-star]");

    if (botao) {
      selecionarNota(Number(botao.dataset.star));
    }
  });

  // Registro da avaliação
  $("ctChatSaveRating").addEventListener(
    "click",
    salvarAvaliacao
  );

  // Fechar o chat com a tecla Escape
  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && !panel.hidden) {
      fechar();
    }
  });

  // Configuração inicial do WhatsApp
  atualizarWhatsApp();

})();

