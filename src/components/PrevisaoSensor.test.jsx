import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("../lib/api.js", () => api);

import PrevisaoSensor from "./PrevisaoSensor.jsx";

const ponto = (temperatura, status = "NORMAL") => ({ para: "2026-11-17T06:27:05+00:00", temperatura, status });

const resposta = (extra = {}) => ({
  deviceId: "coldtrack-01",
  horizonteMin: 10,
  ultimaLeitura: { medidoEm: "2026-11-17T06:17:05+00:00", perfil: "frutas", temperatura: 11.5, status: "NORMAL" },
  previsao: ponto(11.9),
  baseline: ponto(11.5),
  recomendada: "baseline",
  antecipaExcursao: false,
  motivo: null,
  modelo: { versao: "v1", maeModelo: 0.342, maeBaseline: 0.3128, superaBaseline: false },
  ...extra
});

beforeEach(() => {
  api.api.mockReset();
});


describe("PrevisaoSensor, painel", () => {

  it("rótulo honesto: valor e método da recomendada, erros dos dois e ressalva de que o modelo não supera", async () => {
    api.api.mockResolvedValue(resposta());
    render(<PrevisaoSensor deviceId="coldtrack-01" />);

    await waitFor(() => expect(document.getElementById("previsaoTexto")).toBeInTheDocument());
    expect(api.api).toHaveBeenCalledWith("/predict/sensor?deviceId=coldtrack-01", { signal: expect.any(AbortSignal) });
    expect(document.getElementById("previsaoTexto")).toHaveTextContent("Previsão 10 min: 11.5 °C — método: persistência");
    expect(document.getElementById("previsaoErros")).toHaveTextContent("modelo 0,342 °C · persistência 0,313 °C");
    expect(document.getElementById("previsaoErros")).toHaveTextContent("O modelo ainda não supera a persistência.");
    expect(document.getElementById("previsaoAviso")).toBeNull();
    expect(screen.getByLabelText("Previsão de temperatura em 10 minutos")).toHaveClass("previsao--painel");
  });

  it("recomendada modelo que supera: sem a ressalva", async () => {
    api.api.mockResolvedValue(resposta({ recomendada: "modelo", modelo: { maeModelo: 0.2, maeBaseline: 0.3, superaBaseline: true } }));
    render(<PrevisaoSensor deviceId="a" />);

    await waitFor(() => expect(document.getElementById("previsaoTexto")).toHaveTextContent("11.9 °C — método: modelo"));
    expect(document.getElementById("previsaoErros")).not.toHaveTextContent("não supera");
  });

  it("antecipa a excursão: texto e cor do status previsto", async () => {
    api.api.mockResolvedValue(resposta({ baseline: ponto(17.5, "CRITICO"), antecipaExcursao: true }));
    render(<PrevisaoSensor deviceId="a" />);

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveClass("previsao-aviso--critico");
    expect(aviso).toHaveTextContent("Previsto: CRÍTICO em 10 min");
  });

  it("antecipa atenção com a classe de atenção", async () => {
    api.api.mockResolvedValue(resposta({ baseline: ponto(14, "ATENCAO"), antecipaExcursao: true }));
    render(<PrevisaoSensor deviceId="a" />);

    expect(await screen.findByRole("status")).toHaveClass("previsao-aviso--atencao");
  });

  it("sem previsão: diz o motivo e não mostra temperatura", async () => {
    api.api.mockResolvedValue(resposta({ previsao: null, baseline: null, motivo: "sem_leitura_recente" }));
    render(<PrevisaoSensor deviceId="a" />);

    await waitFor(() => expect(document.getElementById("previsaoTexto")).toHaveTextContent("Sem previsão para 10 min. A última leitura tem mais de 5 min."));
    expect(document.getElementById("previsaoTexto")).not.toHaveTextContent("°C");
    expect(document.getElementById("previsaoErros")).toBeNull();
  });

  it("sem deviceId: não chama a API e não mostra nada", () => {
    const { container } = render(<PrevisaoSensor />);
    expect(api.api).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("rota ainda não publicada (404) ou qualquer erro: silêncio, sem quebrar", async () => {
    api.api.mockRejectedValue(Object.assign(new Error("HTTP 404"), { status: 404 }));
    const { container } = render(<PrevisaoSensor deviceId="a" />);

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("resposta que a tela não entende: silêncio", async () => {
    api.api.mockResolvedValue({ erros: ["x"] });
    const { container } = render(<PrevisaoSensor deviceId="a" />);

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

});


describe("PrevisaoSensor, motorista", () => {

  it("chama sem deviceId, usa a variante e não mostra os erros do teste", async () => {
    api.api.mockResolvedValue(resposta({ baseline: ponto(14, "ATENCAO"), antecipaExcursao: true }));
    render(<PrevisaoSensor variante="motorista" deviceId="ignorado" />);

    await waitFor(() => expect(document.getElementById("previsaoTexto")).toBeInTheDocument());
    expect(api.api).toHaveBeenCalledWith("/predict/sensor", { signal: expect.any(AbortSignal) });
    expect(screen.getByLabelText("Previsão de temperatura em 10 minutos")).toHaveClass("previsao--motorista");
    expect(document.getElementById("previsaoTexto")).toHaveTextContent("método: persistência");
    expect(document.getElementById("previsaoAviso")).toHaveTextContent("Previsto: ATENÇÃO");
    expect(document.getElementById("previsaoErros")).toBeNull();
  });

});
