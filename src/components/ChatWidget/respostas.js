// Base de conhecimento e regras de resposta do assistente virtual
// (porte da parte sem tela do antigo js/chat.js).

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
  "4. Veículos e Viagens: o gestor cadastra os veículos, " +
  "com o perfil da carga, e registra as viagens.\n\n" +
  "5. Usuários: em Configurações, o gestor cria os acessos " +
  "de gestor, operador e motorista.\n\n" +
  "6. Relatórios: exporte as leituras em CSV.\n\n" +
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
      "Dashboard, Monitoramento, Veículos, Viagens, Usuários, " +
      "Relatórios, Assistente Virtual e avaliação. " +
      "Use o botão Manual do sistema para consultar " +
      "os principais procedimentos."
  },
  {
    termos: ["infografico", "material visual", "ilustracao"],
    resposta:
      "O infográfico apresenta visualmente as funcionalidades " +
      "do ColdTrack. O fluxo desenhado nele (com ThingSpeak) é o da " +
      "primeira versão; hoje as leituras vão do ESP32 para a API no Azure. " +
      "Clique em Ver infográfico para abrir a imagem."
  },
  {
    termos: ["cadastrar carga", "nova carga", "criar carga", "incluir carga"],
    resposta:
      "A carga é acompanhada pela viagem do veículo:\n" +
      "1. Em Veículos, o gestor cadastra o veículo com o perfil da carga.\n" +
      "2. Em Viagens, registra a viagem desse veículo.\n" +
      "3. Revise e confirme.\n\n" +
      "Os dados ficam gravados na API no Azure."
  },
  {
    termos: ["editar carga", "alterar carga"],
    resposta:
      "A viagem não é editada depois de registrada: em Viagens, " +
      "o gestor pode encerrá-la ou removê-la e registrar outra. " +
      "A faixa da carga vem do perfil escolhido no cadastro do veículo."
  },
  {
    termos: ["cancelar carga", "concluir carga"],
    resposta:
      "Em Viagens, o gestor localiza a viagem e usa Encerrar viagem " +
      "(concluída) ou Remover. Confira os dados antes de confirmar."
  },
  {
    termos: ["atualizar leitura", "dados antigos", "sem dados"],
    resposta:
      "No Monitoramento, confira o horário da última leitura " +
      "e utilize a atualização manual. Se os dados continuarem " +
      "antigos ou indisponíveis, verifique a conectividade " +
      "do sensor e o selo de conexão com o Azure no topo do painel."
  },
  {
    termos: ["interpretar temperatura", "temperatura critica"],
    resposta:
      "A faixa vem do perfil da carga de cada veículo, cadastrado na API:\n" +
      "• Dentro da faixa do perfil: Normal.\n" +
      "• Até a margem do perfil fora da faixa: Atenção.\n" +
      "• Além da margem: Crítico.\n\n" +
      "No perfil demonstrativo, até 15 °C é Normal e até 20 °C é Atenção."
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
    termos: ["exportar csv", "baixar csv"],
    resposta:
      "Abra Relatórios, escolha o veículo e o período " +
      "e utilize a opção de exportação CSV."
  },
  {
    termos: ["aplicativo", "instalar", "pwa", "offline"],
    resposta:
      "O ColdTrack possui estrutura PWA, mas a instalação " +
      "e o funcionamento offline dependem da configuração " +
      "e do suporte do navegador. Leituras atualizadas " +
      "exigem conexão com a API no Azure."
  },
  {
    termos: ["coldtrack", "projeto", "plataforma", "objetivo"],
    resposta: "O ColdTrack Control é um projeto de monitoramento da cadeia fria: sensores ESP32 no baú dos veículos enviam temperatura, umidade e sinal Wi-Fi para uma API no Azure (Azure Functions e Cosmos DB), e o painel web mostra a situação de cada carga."
  },
  {
    termos: ["temperatura", "limite", "graus", "critico", "alerta"],
    resposta: "Os limites não são fixos: cada veículo tem um perfil de carga cadastrado na API, com temperatura mínima, máxima e margem. Dentro da faixa é Normal, até a margem fora dela é Atenção e além disso é Crítico. No perfil demonstrativo, até 15 °C é Normal e até 20 °C é Atenção."
  },
  {
    termos: ["sensor", "sensores", "esp32", "dht", "dispositivo"],
    resposta: "O protótipo utiliza ESP32-C3 e sensor da família DHT para coletar temperatura e umidade, enviando as leituras pela rede Wi-Fi, por HTTPS, para a API no Azure."
  },
  {
    termos: ["thingspeak", "api", "nuvem", "azure"],
    resposta: "As medições vão do sensor para a API do ColdTrack no Azure (Azure Functions), que grava as leituras no Cosmos DB; o painel lê tudo dessa API. A tela Monitoramento, no painel logado, mostra as leituras do canal público 3515173 do ThingSpeak."
  },
  {
    termos: ["monitoramento", "monitorar", "leituras", "historico"],
    resposta: "Cada sensor envia temperatura, umidade e sinal Wi-Fi para a API no Azure. No painel, o Dashboard mostra a leitura atual, o histórico e a situação da carga conforme o perfil do veículo, e os Alertas reúnem as leituras fora da faixa. A tela Monitoramento mostra as leituras do canal público do ThingSpeak."
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
    resposta: "Veículos e Viagens, no painel logado, são cadastrados na API no Azure: o gestor cadastra veículos com o perfil da carga e registra viagens."
  },
  {
    termos: ["login", "acesso", "senha", "cadastro", "entrar"],
    resposta: "O acesso é feito em Entrar, com e-mail e senha; a sessão vale por 8 horas. O cadastro de empresa cria o primeiro gestor, e as permissões (gestor e operador) são controladas pela API."
  },
  {
    termos: ["usuario", "perfil", "permissao"],
    resposta: "Os usuários reais são gerenciados pelo gestor em Configurações, com perfil gestor, operador ou motorista, e a API controla o que cada um pode fazer. O motorista entra pela mesma tela de login e vê só o veículo vinculado a ele."
  },
  {
    termos: ["auditoria", "logs", "seguranca"],
    resposta: "O acesso exige login, a sessão vale por 8 horas e a API confere o perfil do usuário em cada operação. O painel ainda não tem uma tela de auditoria."
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
