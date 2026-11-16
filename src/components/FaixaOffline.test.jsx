// Faixa "Sem conexão": aparece só offline, diz a hora dos últimos dados, some ao voltar.

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { esquecerRecepcao, registrarRecepcao } from "../lib/conectividade.js";
import FaixaOffline from "./FaixaOffline.jsx";

afterEach(() => {
  esquecerRecepcao();
  vi.restoreAllMocks();
});

function internet(ligada) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(ligada);
  act(() => {
    window.dispatchEvent(new Event(ligada ? "online" : "offline"));
  });
}

describe("FaixaOffline", () => {

  it("online: não mostra nada", () => {
    render(<FaixaOffline />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offline com dados recebidos: informa a hora dos últimos dados", () => {
    registrarRecepcao(new Date(2026, 10, 16, 14, 5, 30));
    render(<FaixaOffline />);
    internet(false);
    expect(screen.getByRole("status")).toHaveTextContent("Sem conexão — exibindo os últimos dados recebidos às 14:05");
  });

  it("offline sem nenhum dado recebido: não inventa hora", () => {
    render(<FaixaOffline />);
    internet(false);
    expect(screen.getByRole("status")).toHaveTextContent("Sem conexão — nenhum dado foi recebido nesta sessão");
    expect(screen.getByRole("status")).not.toHaveTextContent(/\d{2}:\d{2}/);
  });

  it("some quando a conexão volta", () => {
    registrarRecepcao(new Date(2026, 10, 16, 14, 5));
    render(<FaixaOffline />);
    internet(false);
    expect(screen.getByRole("status")).toBeInTheDocument();
    internet(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

});
