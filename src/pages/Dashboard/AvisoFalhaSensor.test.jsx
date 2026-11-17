// Aviso "Sensor em falha desde HH:MM" da visão geral: aparece, some quando o sensor volta,
// e não aparece com API antiga, placa offline, outro sensor ou falha na consulta.

import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvisoFalhaSensor from "./AvisoFalhaSensor.jsx";

const api = vi.hoisted(() => ({ api: vi.fn() }));
const polling = vi.hoisted(() => ({ fn: null }));

vi.mock("../../lib/api.js", () => api);
// A rodada roda ao abrir; as próximas, quando o teste chama atualizar().
vi.mock("../../hooks/usePolling.js", () => ({
  usePolling: (fn, _ms, deps) => {
    polling.fn = fn;
    useEffect(() => {
      polling.controle = new AbortController();
      fn(polling.controle.signal);
      return () => polling.controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
  }
}));

const desde = new Date();
desde.setHours(11, 2, 20, 0);

function dispositivos(...lista) {
  api.api.mockResolvedValue({ dispositivos: lista });
}

async function abrir(deviceId = "esp32-01") {
  const tela = render(<AvisoFalhaSensor deviceId={deviceId} />);
  await act(async () => {});
  return tela;
}

async function atualizar() {
  await act(async () => {
    await polling.fn(polling.controle.signal);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AvisoFalhaSensor", () => {

  it("placa viva com sensor em falha: texto com a hora e a leitura dita antiga; some quando volta", async () => {
    dispositivos(
      { id: "esp32-02", online: true, sensor: "ok", sensorFalhaDesde: null },
      { id: "esp32-01", online: true, sensor: "falha", sensorFalhaDesde: desde.toISOString() }
    );
    await abrir();
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("Sensor em falha desde 11:02");
    expect(aviso).toHaveTextContent("Os valores abaixo são a última leitura válida, não os atuais.");
    expect(api.api).toHaveBeenCalledWith("/dispositivos", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    dispositivos({ id: "esp32-01", online: true, sensor: "ok", sensorFalhaDesde: null });
    await atualizar();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("API antiga, placa offline ou sensor de outro veículo: nada", async () => {
    dispositivos({ id: "esp32-01", online: true });
    const { unmount } = await abrir();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    unmount();

    dispositivos({ id: "esp32-01", online: false, sensor: "falha", sensorFalhaDesde: desde.toISOString() });
    await abrir();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    dispositivos({ id: "esp32-09", online: true, sensor: "falha", sensorFalhaDesde: desde.toISOString() });
    await atualizar();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    api.api.mockResolvedValue({});
    await atualizar();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("falha na consulta esconde o aviso; sem veículo nem consulta", async () => {
    dispositivos({ id: "esp32-01", online: true, sensor: "falha", sensorFalhaDesde: desde.toISOString() });
    await abrir();
    expect(screen.getByRole("status")).toBeInTheDocument();

    api.api.mockRejectedValue(new Error("HTTP 500"));
    await atualizar();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    api.api.mockClear();
    await abrir(null);
    expect(api.api).not.toHaveBeenCalled();
  });

  it("rodada cancelada não grava estado", async () => {
    let responder;
    api.api.mockReturnValue(new Promise(r => { responder = r; }));
    const { unmount } = await abrir();
    unmount();
    await act(async () => {
      responder({ dispositivos: [{ id: "esp32-01", online: true, sensor: "falha", sensorFalhaDesde: desde.toISOString() }] });
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    let falhar;
    api.api.mockReturnValue(new Promise((_, r) => { falhar = r; }));
    const outra = await abrir();
    outra.unmount();
    await act(async () => { falhar(new Error("cancelado")); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

});
