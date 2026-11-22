import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReguaFaixa from "./ReguaFaixa.jsx";

const FAIXA = { nome: "Frutas", min: 10, max: 13, margem: 3 };


describe("ReguaFaixa, variante painel (padrão)", () => {

  it("desenha trilho, marcador com o valor, escala e legenda em texto", () => {
    const { container } = render(<ReguaFaixa faixa={FAIXA} temperatura={11.5} />);

    expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("temperatura atual 11.5"));
    expect(container.querySelectorAll(".regua-zona")).toHaveLength(5);
    expect(container.querySelector(".regua-marcador")).toHaveStyle({ left: "50%" });
    expect(container.querySelector(".regua-valor")).toHaveTextContent("11.5");
    expect(container.querySelectorAll(".regua-legenda li")).toHaveLength(3);
    expect(container.querySelector(".regua-faixa")).not.toHaveAttribute("id");
  });

  it("sem leitura: sem marcador e o rótulo diz isso", () => {
    const { container } = render(<ReguaFaixa faixa={FAIXA} temperatura={null} />);

    expect(container.querySelector(".regua-marcador")).toBeNull();
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("sem leitura"));
  });

  it("o rótulo encosta na borda perto das pontas", () => {
    const { container, rerender } = render(<ReguaFaixa faixa={FAIXA} temperatura={4} />);
    expect(container.querySelector(".regua-valor")).toHaveClass("regua-valor--inicio");

    rerender(<ReguaFaixa faixa={FAIXA} temperatura={19} />);
    expect(container.querySelector(".regua-valor")).toHaveClass("regua-valor--fim");
  });

});


describe("ReguaFaixa, variante motorista", () => {

  it("barra com cinco zonas, marcador, limites e id; escondida do leitor de tela", () => {
    const { container } = render(<ReguaFaixa variante="motorista" id="reguaMotorista" faixa={FAIXA} temperatura={11.5} />);
    const regua = container.querySelector("#reguaMotorista");

    expect(regua).toHaveAttribute("aria-hidden", "true");
    expect(regua.querySelectorAll(".zona")).toHaveLength(5);
    expect(regua.querySelector(".regua-marcador")).toHaveStyle({ left: "50%" });
    expect(regua.querySelector(".regua-bolha")).toHaveTextContent("11.5 °C");
    expect(regua.querySelector(".regua-bolha")).not.toHaveClass("inicio");
    expect([...regua.querySelectorAll(".regua-limites span")].map(s => s.textContent))
      .toEqual(["7 °C", "10 °C", "13 °C", "16 °C"]);
  });

  it("valor perto das pontas: a bolha encosta na borda", () => {
    const { container, rerender } = render(<ReguaFaixa variante="motorista" faixa={FAIXA} temperatura={-5} />);
    expect(container.querySelector(".regua-bolha")).toHaveClass("inicio");
    rerender(<ReguaFaixa variante="motorista" faixa={FAIXA} temperatura={40} />);
    expect(container.querySelector(".regua-bolha")).toHaveClass("fim");
  });

  it("sem leitura: sem marcador; faixa inválida: nada na tela", () => {
    const { container, rerender } = render(<ReguaFaixa variante="motorista" faixa={FAIXA} temperatura={undefined} />);
    expect(container.querySelector(".regua-barra")).not.toBeNull();
    expect(container.querySelector(".regua-marcador")).toBeNull();

    rerender(<ReguaFaixa variante="motorista" faixa={null} temperatura={5} />);
    expect(container).toBeEmptyDOMElement();
  });

});
