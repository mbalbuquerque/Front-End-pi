const CONFIG = {
  API_URL: "https://func-coldtrack-7319.azurewebsites.net/api",
  DEVICE_ID: "coldtrack-01",

  // Quantidade de leituras usadas no histórico.
  HISTORY_SIZE: 60,

  UPDATE_INTERVAL: 20000,

  // Limites demonstrativos (os mesmos do firmware e da Azure Function).
  TEMP_NORMAL_MAX: 15,
  TEMP_ATENCAO_MAX: 20,

  // Veículos, viagens e usuários ficam no Azure (cadastro pelo gestor).

  // Faixas de referência de pós-colheita, a validar com o produtor parceiro.
  // Só o perfil "demonstrativo" está ativo no firmware e na nuvem hoje.
  PERFIS: [
    {
      id: "demonstrativo",
      nome: "Demonstrativo (protótipo)",
      normalMax: 15,
      atencaoMax: 20,
      ativo: true
    },
    {
      id: "manga",
      nome: "Manga",
      faixa: "10 a 13 °C",
      ativo: false
    },
    {
      id: "uva",
      nome: "Uva de mesa",
      faixa: "-1 a 0 °C",
      ativo: false
    }
  ]
};
