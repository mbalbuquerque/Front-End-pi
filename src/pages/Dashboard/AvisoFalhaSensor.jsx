// "Sensor em falha desde HH:MM" na visão geral (#52). Componente isolado de
// propósito: busca GET /dispositivos no próprio ritmo e só aparece quando a
// placa do veículo está viva com o sensor de temperatura em falha. API antiga
// (sem o campo `sensor`) ou falha na consulta: não mostra nada, a tela fica
// como era (o "Sem dados desde" continua com o Dashboard).
//
//   <AvisoFalhaSensor deviceId={veiculo?.deviceId} />

import { useState } from "react";
import { usePolling } from "../../hooks/usePolling.js";
import { api } from "../../lib/api.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { falhaDoSensor } from "../../lib/sensorFalha.js";


export default function AvisoFalhaSensor({ deviceId }) {

  const [falha, setFalha] = useState(null);

  usePolling(async sinal => {

    if (!deviceId) {
      setFalha(null);
      return;
    }

    try {
      const { dispositivos } = await api("/dispositivos", { signal: sinal });
      if (sinal.aborted) return;
      setFalha(falhaDoSensor((dispositivos || []).find(d => d.id === deviceId)));
    } catch {
      if (sinal.aborted) return;
      setFalha(null);
    }

  }, UPDATE_INTERVAL, [deviceId]);

  if (!falha) {
    return null;
  }

  return (
    <div id="falhaSensorAviso" className="alert aviso-falha-sensor" role="status">
      <strong>{falha.texto}</strong>{" "}
      <p>
        O sensor {deviceId} está ligado, mas não consegue medir a temperatura.
        Os valores abaixo são a última leitura válida, não os atuais.
      </p>
    </div>
  );

}
