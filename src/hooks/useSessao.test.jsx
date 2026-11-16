// Sessão em componentes: entrar, sair (avisa o servidor, limpa e vai ao login), 401 e uso fora do provedor.

import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api.js";
import { CHAVE_SESSAO, lerSessao } from "../lib/sessao.js";
import { AuthProvider, useSessao } from "./useSessao.jsx";

// JWT de teste com exp daqui a 1 h (só o corpo importa; a assinatura não é checada no navegador).
function tokenValido() {
  const corpo = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `cab.${corpo}.ass`;
}

function Mostra() {
  const { usuario, entrar, sair } = useSessao();
  const local = useLocation();
  return (
    <div>
      <p data-testid="quem">{usuario ? usuario.nome : "ninguém"}</p>
      <p data-testid="onde">{local.pathname}</p>
      <button onClick={() => entrar(tokenValido(), { nome: "Gina", perfil: "gestor" })}>entrar</button>
      <button onClick={sair}>sair</button>
    </div>
  );
}

function abrir() {
  return render(
    <MemoryRouter initialEntries={["/painel"]}>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<Mostra />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useSessao", () => {

  it("fora do AuthProvider lança erro claro", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSessao())).toThrow("useSessao precisa estar dentro de <AuthProvider>.");
  });

  it("começa sem usuário e entrar() grava a sessão e atualiza a tela", async () => {
    abrir();
    expect(screen.getByTestId("quem")).toHaveTextContent("ninguém");
    await userEvent.click(screen.getByRole("button", { name: "entrar" }));
    expect(screen.getByTestId("quem")).toHaveTextContent("Gina");
    expect(lerSessao().usuario.nome).toBe("Gina");
  });

  it("começa com o usuário da sessão já guardada", () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token: "t", usuario: { nome: "Ana" }, expiraEm: Date.now() + 60000 }));
    abrir();
    expect(screen.getByTestId("quem")).toHaveTextContent("Ana");
  });

  it("sair() avisa o servidor com o token, limpa a sessão e vai ao login", async () => {
    const sairNoServidor = vi.spyOn(api, "sairNoServidor").mockResolvedValue(true);
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token: "tok-9", usuario: { nome: "Ana" }, expiraEm: Date.now() + 60000 }));
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "sair" }));
    expect(sairNoServidor).toHaveBeenCalledWith("tok-9");
    expect(lerSessao()).toBeNull();
    expect(screen.getByTestId("quem")).toHaveTextContent("ninguém");
    expect(screen.getByTestId("onde")).toHaveTextContent("/login");
  });

  it("sessão vencida no servidor (401): zera o usuário e vai ao login", async () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token: "t", usuario: { nome: "Ana" }, expiraEm: Date.now() + 60000 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({}) }));
    abrir();
    await act(async () => {
      await expect(api.api("/veiculos")).rejects.toThrow("Sessão encerrada.");
    });
    vi.unstubAllGlobals();
    expect(screen.getByTestId("quem")).toHaveTextContent("ninguém");
    expect(screen.getByTestId("onde")).toHaveTextContent("/login");
    expect(lerSessao()).toBeNull();
  });

});
