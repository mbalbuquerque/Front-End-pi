const CONFIG = {
  // Fonte da telemetria: "azure" (Azure Function + Cosmos DB) ou "thingspeak".
  DATA_SOURCE: "azure",

  AZURE_API_URL: "https://func-coldtrack-7319.azurewebsites.net/api/leituras",
  DEVICE_ID: "coldtrack-01",

  THINGSPEAK_CHANNEL_ID: "3496439",

  // Quantidade de leituras usadas no histórico.
  HISTORY_SIZE: 60,

  UPDATE_INTERVAL: 20000,

  // Limites demonstrativos (os mesmos do firmware e da Azure Function).
  TEMP_NORMAL_MAX: 15,
  TEMP_ATENCAO_MAX: 20,

  // ---------------------------------------------------------
  // Piloto: frota, viagens e perfis de carga.
  // Cadastro pela interface depende de login com perfis (planejado);
  // até lá, os dados do piloto ficam aqui.
  // ---------------------------------------------------------

  VEICULOS: [
    {
      id: "CT-001",
      tipo: "Caminhão baú refrigerado",
      deviceId: "coldtrack-01",
      dispositivo: "ESP32-C3 + DHT22",
      perfil: "demonstrativo"
    }
  ],

  VIAGENS: [
    {
      id: "V-001",
      veiculo: "CT-001",
      origem: "Petrolina/PE",
      destino: "Porto de Suape/PE",
      carga: "Viagem de teste do piloto (sensor simulado no Wokwi)",
      inicio: "2026-09-26T21:00:00Z",
      fim: null
    }
  ],

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
