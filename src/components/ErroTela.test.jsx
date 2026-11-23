import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErroTela from "./ErroTela.jsx";


function Quebra({ erro }) {
  throw erro;
}


describe("ErroTela", () => {

  beforeEach(() => {
    // O React registra no console o erro capturado pelo limite.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sem erro, mostra a tela", () => {
    render(<ErroTela local="/viagens"><p>Viagens</p></ErroTela>);
    expect(screen.getByText("Viagens")).toBeInTheDocument();
  });

  it("pedaço de versão antiga: aviso de versão nova com Atualizar, nunca tela em branco", async () => {
    const atualizar = vi.fn();
    render(
      <ErroTela local="/viagens" atualizar={atualizar}>
        <Quebra erro={new TypeError("Failed to fetch dynamically imported module")} />
      </ErroTela>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Há uma versão nova do ColdTrack" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it("outro erro: aviso genérico, e o padrão do Atualizar recarrega a página", async () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, reload } });
    try {
      render(<ErroTela local="/dashboard"><Quebra erro={new Error("x")} /></ErroTela>);
      expect(screen.getByRole("heading", { name: "Não foi possível abrir esta tela" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });

  it("mudar de rota limpa o erro", () => {
    const { rerender } = render(<ErroTela local="/viagens"><Quebra erro={new Error("x")} /></ErroTela>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<ErroTela local="/viagens"><p>Viagens</p></ErroTela>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<ErroTela local="/dashboard"><p>Visão geral</p></ErroTela>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Visão geral")).toBeInTheDocument();
  });

});
