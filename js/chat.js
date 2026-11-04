
(() => {
  "use strict";

  if (document.getElementById("ctChatWidget")) return;

  const WHATSAPP = "558196878213";
  const AVALIACOES_KEY = "coldtrack_chat_avaliacoes_v1";

  const conhecimento = [
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
          pontos += chave.includes(" ") ? 3 : 1;
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

  toggle.addEventListener("click", () => {
    panel.hidden ? abrir() : fechar();
  });

  close.addEventListener("click", fechar);

  form.addEventListener("submit", evento => {
    evento.preventDefault();
    enviar(input.value);
  });

  quick.addEventListener("click", evento => {
    const botao = evento.target.closest(
      "button[data-question]"
    );

    if (botao) enviar(botao.dataset.question);
  });

  $("ctChatYes").addEventListener("click", () => {
    mostrarAvaliacao(true);
  });

  $("ctChatNo").addEventListener("click", () => {
    mostrarAvaliacao(false);
  });

  stars.addEventListener("click", evento => {
    const botao = evento.target.closest(
      "button[data-star]"
    );

    if (botao) {
      selecionarNota(Number(botao.dataset.star));
    }
  });

  $("ctChatSaveRating").addEventListener(
    "click",
    salvarAvaliacao
  );

  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && !panel.hidden) {
      fechar();
    }
  });

  atualizarWhatsApp();
})();
