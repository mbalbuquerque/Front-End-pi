// Gaveta de cadastro: abre e fecha pelo estado, e o X e o véu avisam quem a usa.

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Gaveta from "./Gaveta.jsx";

function Tela({ aoFechar = () => {} }) {

  const [aberta, setAberta] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberta(true)}>Abrir</button>
      <Gaveta id="painelNovo" titulo="Cadastrar veículo" aberta={aberta} aoFechar={() => { aoFechar(); setAberta(false); }}>
        <p>conteúdo</p>
      </Gaveta>
    </>
  );

}

const gaveta = () => document.getElementById("painelNovo");

describe("Gaveta", () => {

  it("fica no DOM fechada e abre como diálogo com o título como nome", async () => {
    render(<Tela />);
    expect(gaveta()).not.toHaveAttribute("open");
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(gaveta()).toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: "Cadastrar veículo" })).toBe(gaveta());
    expect(screen.getByRole("heading", { level: 2, name: "Cadastrar veículo" })).toBeInTheDocument();
  });

  it("o X fecha e avisa", async () => {
    const aoFechar = vi.fn();
    render(<Tela aoFechar={aoFechar} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(gaveta()).not.toHaveAttribute("open");
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("clique no véu fecha; clique dentro da folha não", async () => {
    const aoFechar = vi.fn();
    render(<Tela aoFechar={aoFechar} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    fireEvent.click(screen.getByText("conteúdo"));
    expect(gaveta()).toHaveAttribute("open");
    fireEvent.click(gaveta());
    expect(gaveta()).not.toHaveAttribute("open");
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

});
