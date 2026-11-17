// Guarda das rotas logadas: sem sessão vai ao login, operador não entra em rota de gestor.

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequireAuth from "./RequireAuth.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, valida: true }));

vi.mock("../hooks/useSessao.jsx", () => ({ useSessao: () => ({ usuario: sessao.usuario }) }));
vi.mock("../lib/sessao.js", () => ({
  lerSessao: () => (sessao.valida ? { token: "t" } : null),
  ehGestor: usuario => usuario?.perfil === "gestor"
}));

function abrir(guarda) {
  return render(
    <MemoryRouter initialEntries={["/privada"]}>
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route path="/dashboard" element={<p>tela do dashboard</p>} />
        <Route path="/privada" element={guarda} />
        <Route element={<RequireAuth />}>
          <Route path="/aninhada" element={<p>rota aninhada</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  sessao.usuario = { perfil: "operador" };
  sessao.valida = true;
});

describe("RequireAuth", () => {

  it("sem usuário: vai para o login", () => {
    sessao.usuario = null;
    abrir(<RequireAuth><p>segredo</p></RequireAuth>);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
    expect(screen.queryByText("segredo")).not.toBeInTheDocument();
  });

  it("usuário em memória mas token vencido: vai para o login", () => {
    sessao.valida = false;
    abrir(<RequireAuth><p>segredo</p></RequireAuth>);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("com sessão válida: mostra os filhos", () => {
    abrir(<RequireAuth><p>segredo</p></RequireAuth>);
    expect(screen.getByText("segredo")).toBeInTheDocument();
  });

  it("perfil gestor exigido e usuário operador: volta ao dashboard", () => {
    abrir(<RequireAuth perfil="gestor"><p>só gestor</p></RequireAuth>);
    expect(screen.getByText("tela do dashboard")).toBeInTheDocument();
    expect(screen.queryByText("só gestor")).not.toBeInTheDocument();
  });

  it("perfil gestor exigido e usuário gestor: entra", () => {
    sessao.usuario = { perfil: "gestor" };
    abrir(<RequireAuth perfil="gestor"><p>só gestor</p></RequireAuth>);
    expect(screen.getByText("só gestor")).toBeInTheDocument();
  });

  it("usado como layout de rotas (Outlet)", () => {
    render(
      <MemoryRouter initialEntries={["/aninhada"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/aninhada" element={<p>rota aninhada</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("rota aninhada")).toBeInTheDocument();
  });

});
