// Tela de login: validação, erro da API, sucesso e redirecionamento.

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Login from "./Login.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, entrar: vi.fn() }));
const api = vi.hoisted(() => ({ postPublico: vi.fn() }));
const armazenada = vi.hoisted(() => ({ lerSessao: vi.fn() }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../lib/sessao.js", () => armazenada);

function abrir() {
  return renderizarNaRota(<Login />, "/login", ["/dashboard", "/cadastro"]);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessao.usuario = null;
  armazenada.lerSessao.mockReturnValue(null);
});

describe("Login", () => {

  it("e-mail inválido: avisa e não chama a API", async () => {
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "sem-arroba");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Informe um e-mail válido.");
    expect(api.postPublico).not.toHaveBeenCalled();
  });

  it("senha vazia: pede a senha", async () => {
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Informe sua senha.");
    expect(api.postPublico).not.toHaveBeenCalled();
  });

  it("credenciais recusadas: mostra o erro da API e libera o botão", async () => {
    api.postPublico.mockResolvedValue({ ok: false, dados: { erros: ["E-mail ou senha incorretos."] } });
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada123");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entrar/ })).toBeEnabled();
    expect(sessao.entrar).not.toHaveBeenCalled();
  });

  it("resposta sem lista de erros: mensagem genérica", async () => {
    api.postPublico.mockResolvedValue({ ok: false, dados: {} });
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(await screen.findByText("Não foi possível entrar.")).toBeInTheDocument();
  });

  it("falha de rede: avisa que está sem conexão", async () => {
    api.postPublico.mockRejectedValue(new Error("rede"));
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeInTheDocument();
  });

  it("login certo: guarda a sessão e vai ao dashboard", async () => {
    const usuario = { id: "ana@empresa.com", perfil: "gestor" };
    api.postPublico.mockResolvedValue({ ok: true, dados: { token: "t", usuario } });
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), " ana@empresa.com ");
    await userEvent.type(screen.getByLabelText("Senha"), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    await waitFor(() => expect(screen.getByText("destino /dashboard")).toBeInTheDocument());
    expect(api.postPublico).toHaveBeenCalledWith("/login", { email: "ana@empresa.com", senha: "segredo123" });
    expect(sessao.entrar).toHaveBeenCalledWith("t", usuario);
  });

  it("mostrar/ocultar senha alterna o tipo do campo", async () => {
    abrir();
    const campo = screen.getByLabelText("Senha");
    expect(campo).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(campo).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(campo).toHaveAttribute("type", "password");
  });

  it("esqueci a senha orienta a falar com o gestor", async () => {
    abrir();
    await userEvent.click(screen.getByText("Esqueceu a senha?"));
    expect(screen.getByRole("status")).toHaveTextContent("Peça ao gestor");
  });

  it("já logado: vai direto ao dashboard", () => {
    sessao.usuario = { id: "ana@empresa.com" };
    armazenada.lerSessao.mockReturnValue({ token: "t" });
    abrir();
    expect(screen.getByText("destino /dashboard")).toBeInTheDocument();
  });

});
