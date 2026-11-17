// Sensor de temperatura em falha (campos `sensor` e `sensorFalhaDesde` de
// GET /dispositivos e GET /motorista). A placa continua viva e manda heartbeat
// a cada 20 s no lugar da leitura; leitura inválida nunca é gravada.
//
// Lidos junto com `online` (só GET /dispositivos): `online: false` é placa sem
// contato nenhum, e aí vale o "Offline" / "Sem dados desde" de sempre. API
// antiga, sem o campo `sensor`, devolve null e a tela fica como era.

import { formatarMomento } from "./formatar.js";


// { texto: "Sensor em falha desde 11:02", desde: Date | null } ou null.
export function falhaDoSensor(dados, agora = new Date()) {

  if (!dados || dados.sensor !== "falha" || dados.online === false) {
    return null;
  }

  const desde = dados.sensorFalhaDesde ? new Date(dados.sensorFalhaDesde) : null;

  if (!desde || Number.isNaN(desde.getTime())) {
    return { texto: "Sensor em falha", desde: null };
  }

  return { texto: `Sensor em falha desde ${formatarMomento(desde, agora)}`, desde };

}
