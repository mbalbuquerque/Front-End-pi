// Painel "Calor na rota": previsão das próximas 24 h, janela mais fresca e queda para o histórico.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RiscoRota from "./RiscoRota.jsx";

const rota = vi.hoisted(() => ({ buscarPrevisaoRota: vi.fn() }));

vi.mock("./risco.js", async importarOriginal => ({
  ...(await importarOriginal()),
  buscarPrevisaoRota: rota.buscarPrevisaoRota
}));

// 24 horas: madrugada amena, tarde quente e um pico forte às 15h em Petrolina.
function previsao() {
  return Array.from({ length: 24 }, (_, hora) => {
    const temp = hora === 15 ? 36.4 : hora >= 12 && hora <= 17 ? 32 : 24;
    return { hora, temp, origem: temp - 1, cidade: "Petrolina" };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  rota.buscarPrevisaoRota.mockResolvedValue(previsao());
});

describe("RiscoRota", () => {

  it("mostra Carregando antes da previsão", () => {
    rota.buscarPrevisaoRota.mockReturnValue(new Promise(() => {}));
    render(<RiscoRota />);
    expect(screen.getByText("Carregando a previsão…")).toBeInTheDocument();
  });

  it("com previsão: resumo do pico, janela fresca, 24 horas e legenda", async () => {
    render(<RiscoRota />);
    expect(await screen.findByText("Calor na rota · próximas 24 h")).toBeInTheDocument();
    const painel = document.getElementById("risco");
    expect(painel).toHaveTextContent("A rota passa de 30 °C 12h às 18h, com pico de 36 °C em Petrolina às 15h.");
    expect(painel).toHaveTextContent("Janela mais fresca para carregar em Petrolina: 0h às 3h.");
    const horas = screen.getByRole("list", { name: "Temperatura máxima da rota por hora" });
    expect(horas.querySelectorAll("li")).toHaveLength(24);
    expect(horas.querySelectorAll("li.forte")).toHaveLength(1);
    expect(horas.querySelectorAll("li.quente")).toHaveLength(5);
    expect(horas.querySelectorAll("li.ameno")).toHaveLength(18);
    expect(horas.querySelector("li.forte")).toHaveAttribute("title", "15h: 36.4 °C em Petrolina (acima de 35 °C)");
    expect(painel).toHaveTextContent("acima de 35 °C");
    expect(painel).toHaveTextContent("No histórico de");
  });

  it("previsão sem calor: diz que a rota fica abaixo de 30 °C", async () => {
    rota.buscarPrevisaoRota.mockResolvedValue(previsao().map(h => ({ ...h, temp: 22 })));
    render(<RiscoRota />);
    expect(await screen.findByText(/A rota fica abaixo de 30 °C nas próximas 24 horas \(máxima de 22 °C em Petrolina\)/)).toBeInTheDocument();
  });

  it("falha da previsão: mostra só o histórico e avisa", async () => {
    rota.buscarPrevisaoRota.mockRejectedValue(new Error("Open-Meteo fora"));
    render(<RiscoRota />);
    expect(await screen.findByText("A previsão do dia não carregou. Mostrando só o histórico.")).toBeInTheDocument();
    expect(document.getElementById("risco")).toHaveTextContent("No histórico de");
    expect(screen.queryByRole("list", { name: /Temperatura máxima/ })).not.toBeInTheDocument();
  });

});
