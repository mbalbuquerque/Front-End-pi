// Configuração do painel. A URL da API pode ser trocada por VITE_API_URL
// (arquivo .env.local), sem mexer no código.

export const API_URL =
  import.meta.env.VITE_API_URL || "https://func-coldtrack-7319.azurewebsites.net/api";

// Quantidade de leituras usadas no histórico.
export const HISTORY_SIZE = 60;

// Intervalo de atualização das telas (ms).
export const UPDATE_INTERVAL = 20000;

// Sensores, veículos, viagens, usuários e as faixas de cada perfil de
// carga ficam no Azure: o painel lê tudo da API.
