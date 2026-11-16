// Gráfico de temperatura: estados (vazio, um ponto, série), limites da faixa e dica ao passar o mouse.

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GraficoTemperatura from "./GraficoTemperatura.jsx";

const FAIXA = { min: null, max: 15, margem: 5 };
const FAIXA_COM_MIN = { min: 2, max: 8, margem: 2 };

// Leituras a cada 20 s a partir de 12:00 UTC.
const leitura = (i, temperatura, status = "NORMAL") => ({
  temperatura,
  status,
  medidoEm: new Date(Date.UTC(2026, 10, 16, 12, 0, i * 20)).toISOString()
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GraficoTemperatura", () => {

  it("sem leituras: explica que o gráfico aparece quando o sensor enviar dados", () => {
    render(<GraficoTemperatura id="g" leituras={[]} faixa={FAIXA} />);
    expect(screen.getByText("Sem leituras neste período.")).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeNull();
  });

  it("ignora leitura sem temperatura numérica", () => {
    render(<GraficoTemperatura id="g" leituras={[{ temperatura: null, status: "NORMAL", medidoEm: "2026-11-16T12:00:00Z" }]} faixa={FAIXA} />);
    expect(screen.getByText("Sem leituras neste período.")).toBeInTheDocument();
  });

  it("uma leitura só: marca o ponto isolado e não desenha linha", () => {
    render(<GraficoTemperatura id="g" leituras={[leitura(0, 7)]} faixa={FAIXA} />);
    expect(document.querySelector("path.linha")).toBeNull();
    expect(document.querySelectorAll("circle.marcador").length).toBeGreaterThan(0);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/mínima 7\.0 °C, máxima 7\.0 °C, 0 leituras fora da faixa normal/);
  });

  it("série: linha, banda normal e limites de atenção e crítico do perfil", () => {
    const leituras = [leitura(0, 6), leitura(1, 7), leitura(2, 9)];
    render(<GraficoTemperatura id="g" leituras={leituras} faixa={FAIXA} />);
    expect(document.querySelector("path.linha")).not.toBeNull();
    expect(screen.getByText("Faixa normal")).toBeInTheDocument();
    expect(screen.getByText("Atenção > 15°")).toBeInTheDocument();
    expect(screen.getByText("Crítico > 20°")).toBeInTheDocument();
    expect(screen.queryByText(/Atenção </)).not.toBeInTheDocument();
  });

  it("perfil com mínimo: mostra também os limites inferiores", () => {
    render(<GraficoTemperatura id="g" leituras={[leitura(0, 5), leitura(1, 6)]} faixa={FAIXA_COM_MIN} />);
    expect(screen.getByText("Atenção < 2°")).toBeInTheDocument();
    expect(screen.getByText("Crítico < 0°")).toBeInTheDocument();
  });

  it("leitura acima de 15: ponto marcado como atenção; acima de 20, crítico", () => {
    const leituras = [leitura(0, 6), leitura(1, 17, "ATENCAO"), leitura(2, 23, "CRITICO"), leitura(3, 6)];
    render(<GraficoTemperatura id="g" leituras={leituras} faixa={FAIXA} />);
    expect(document.querySelectorAll("circle.ponto-fora.atencao")).toHaveLength(1);
    expect(document.querySelectorAll("circle.ponto-fora.critico")).toHaveLength(1);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/2 leituras fora da faixa normal/);
  });

  it("intervalo sem leitura maior que 3 envios interrompe a linha", () => {
    const leituras = [leitura(0, 6), leitura(1, 7), leitura(30, 8), leitura(31, 9)];
    render(<GraficoTemperatura id="g" leituras={leituras} faixa={FAIXA} />);
    const caminho = document.querySelector("path.linha").getAttribute("d");
    expect(caminho.match(/M/g)).toHaveLength(2);
  });

  it("passar o mouse mostra a dica com a temperatura, o status e a hora; sair esconde", () => {
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 760, height: 260, right: 760, bottom: 260 });
    const leituras = [leitura(0, 6), leitura(1, 18, "ATENCAO"), leitura(2, 7)];
    const { container } = render(<GraficoTemperatura id="g" leituras={leituras} faixa={FAIXA} />);
    const alvo = container.querySelector("rect.alvo");
    expect(container.querySelector(".tooltip")).toBeEmptyDOMElement();
    fireEvent.pointerMove(alvo, { clientX: 400 });
    expect(container.querySelector(".tooltip")).toHaveTextContent("18.0 °C · ATENÇÃO");
    expect(container.querySelector(".tooltip")).not.toHaveAttribute("hidden");
    fireEvent.pointerLeave(alvo);
    expect(container.querySelector(".tooltip")).toHaveAttribute("hidden");
  });

});
