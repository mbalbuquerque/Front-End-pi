// Dados demonstrativos e regras da gestão logística (sem React, testável).
// Não representam telemetria real do ThingSpeak.

export const CARGAS_INICIAIS = [
  { id: "CT-001", produto: "Uva", origem: "Petrolina/PE", destino: "Recife/PE", sensor: "ESP32-01", tempMin: 2, tempMax: 8, temperatura: 6.2, status: "Em transporte" },
  { id: "CT-002", produto: "Manga", origem: "Juazeiro/BA", destino: "Salvador/BA", sensor: "ESP32-02", tempMin: 10, tempMax: 12, temperatura: 12.8, status: "Atenção" },
  { id: "CT-003", produto: "Uva", origem: "Petrolina/PE", destino: "Fortaleza/CE", sensor: "ESP32-03", tempMin: 2, tempMax: 8, temperatura: 5.7, status: "Em transporte" }
];

export const STATUS_EDITAVEIS = ["Em transporte", "Atenção"];

export const formatarTemperatura = valor =>
  valor === null ? "Sem leitura" : `${valor.toFixed(1)} °C`;

export function classeStatus(status) {
  if (status === "Atenção") return "atencao";
  if (status === "Entregue") return "entregue";
  if (status === "Cancelada") return "cancelada";
  return "transporte";
}

export function filtrarCargas(cargas, pesquisa, status) {
  const busca = pesquisa.trim().toLowerCase();
  return cargas.filter(carga => {
    const texto = [carga.id, carga.produto, carga.origem, carga.destino, carga.sensor].join(" ").toLowerCase();
    return texto.includes(busca) && (!status || carga.status === status);
  });
}

export function resumir(cargas) {
  return {
    total: cargas.length,
    transporte: cargas.filter(c => c.status === "Em transporte").length,
    atencao: cargas.filter(c => c.status === "Atenção").length,
    sensores: new Set(cargas.map(c => c.sensor)).size
  };
}

// Devolve os dados limpos ou null quando o formulário é inválido.
export function validarCarga(campos) {
  const produto = String(campos.produto ?? "").trim();
  const origem = String(campos.origem ?? "").trim();
  const destino = String(campos.destino ?? "").trim();
  const sensor = String(campos.sensor ?? "").trim();
  const tempMin = Number(campos.tempMin);
  const tempMax = Number(campos.tempMax);

  if (!produto || !origem || !destino || !sensor ||
      !Number.isFinite(tempMin) || !Number.isFinite(tempMax) ||
      tempMin >= tempMax) {
    return null;
  }

  return { produto, origem, destino, sensor, tempMin, tempMax };
}

export function proximoId(cargas) {
  const maior = Math.max(0, ...cargas.map(c => Number(c.id.replace("CT-", "")) || 0));
  return `CT-${String(maior + 1).padStart(3, "0")}`;
}
