// Base de conhecimento e regras de resposta do assistente virtual
// (porte da parte sem tela de legado/js/chat.js).

export const WHATSAPP = "558196878213";

// Mesma chave do chat antigo: avaliações já salvas continuam valendo.
export const AVALIACOES_KEY = "coldtrack_chat_avaliacoes_v1";

export const MENSAGEM_INICIAL =
  "Olá! 👋 Bem-vindo ao ColdTrack Control.\n\n" +
  "Sou o assistente virtual do projeto. " +
  "Posso responder perguntas sobre sensores, " +
  "monitoramento, temperatura e funcionalidades.\n\n" +
  "Se precisar, você também pode falar diretamente " +
  "com o desenvolvedor.";

export const MANUAL =
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
  "para receber instruções mais detalhadas.";

export const SEM_RESPOSTA =
  "Ainda não tenho uma resposta cadastrada para essa dúvida. " +
  "Você pode falar diretamente com o desenvolvedor pelo WhatsApp.";

export const AVISO_WHATSAPP =
  "O botão Falar com o desenvolvedor está disponível " +
  "logo abaixo do campo de mensagem.";


// Termos com espaço ("cadastrar carga") valem 10 pontos; palavra solta vale 1.
export const CONHECIMENTO = [
  {
    termos: ["manual", "guia", "tutorial", "instrucoes", "como usar", "ajuda do sistema"],
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
    termos: ["cadastrar carga", "nova carga", "criar carga", "incluir carga"],
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


// Sem acento, minúsculo, só letras/números e um espaço entre palavras.
export function normalizar(texto) {

  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


// { encontrada, texto }: a entrada com mais pontos vence; empate fica com a primeira.
export function responder(pergunta) {

  const texto = normalizar(pergunta);

  if (/^(oi|ola|bom dia|boa tarde|boa noite)$/.test(texto)) {
    return { encontrada: true, texto: "Olá! Sou o assistente virtual ColdTrack. Como posso ajudar?" };
  }

  let melhor = null;
  let pontuacao = 0;

  for (const item of CONHECIMENTO) {

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
    return { encontrada: true, texto: melhor.resposta };
  }

  return { encontrada: false, texto: SEM_RESPOSTA };

}


export function linkWhatsApp(pergunta = "") {

  const mensagem =
    "Olá! Vim pelo assistente virtual do ColdTrack Control. " +
    "Preciso de ajuda com o projeto." +
    (pergunta ? "\nMinha dúvida: " + pergunta : "");

  return `https://wa.me/${WHATSAPP}?text=` + encodeURIComponent(mensagem);

}
