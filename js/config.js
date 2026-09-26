const CONFIG = {
  // Fonte da telemetria: "azure" (Azure Function + Cosmos DB) ou "thingspeak".
  DATA_SOURCE: "azure",

  AZURE_API_URL: "https://func-coldtrack-7319.azurewebsites.net/api/leituras",
  DEVICE_ID: "coldtrack-01",

  THINGSPEAK_CHANNEL_ID: "3496439",

  // Quantidade de leituras usadas no histórico.
  HISTORY_SIZE: 20,

  UPDATE_INTERVAL: 20000,

  TEMP_NORMAL_MAX: 15,
  TEMP_ATENCAO_MAX: 20
};
