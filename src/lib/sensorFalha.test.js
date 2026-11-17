// Sensor em falha: texto com hora local, data quando não é hoje, e os casos em que não aparece.

import { describe, expect, it } from "vitest";
import { falhaDoSensor } from "./sensorFalha.js";

const agora = new Date(2026, 10, 17, 15, 0);


describe("falhaDoSensor", () => {

  it("placa viva com sensor em falha: hora local do início", () => {
    const desde = new Date(2026, 10, 17, 11, 2, 20);
    expect(falhaDoSensor({ online: true, sensor: "falha", sensorFalhaDesde: desde.toISOString() }, agora))
      .toEqual({ texto: "Sensor em falha desde 11:02", desde });
  });

  it("falha que começou em outro dia leva a data", () => {
    const desde = new Date(2026, 10, 16, 23, 40);
    expect(falhaDoSensor({ sensor: "falha", sensorFalhaDesde: desde.toISOString() }, agora).texto)
      .toBe("Sensor em falha desde 16/11 23:40");
  });

  it("sem horário válido: só \"Sensor em falha\"", () => {
    expect(falhaDoSensor({ sensor: "falha", sensorFalhaDesde: null }, agora)).toEqual({ texto: "Sensor em falha", desde: null });
    expect(falhaDoSensor({ sensor: "falha", sensorFalhaDesde: "ontem" }, agora).texto).toBe("Sensor em falha");
  });

  it("sensor ok, nunca falou, API antiga, placa offline ou sem dados: nada", () => {
    expect(falhaDoSensor({ online: true, sensor: "ok", sensorFalhaDesde: null }, agora)).toBeNull();
    expect(falhaDoSensor({ online: true, sensor: null }, agora)).toBeNull();
    expect(falhaDoSensor({ online: true }, agora)).toBeNull();
    expect(falhaDoSensor({ online: false, sensor: "falha", sensorFalhaDesde: agora.toISOString() }, agora)).toBeNull();
    expect(falhaDoSensor(null)).toBeNull();
  });

  it("usa a hora de agora quando não recebe", () => {
    expect(falhaDoSensor({ sensor: "falha", sensorFalhaDesde: new Date().toISOString() }).texto)
      .toMatch(/^Sensor em falha desde \d{2}:\d{2}$/);
  });

});
