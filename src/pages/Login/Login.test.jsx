// Tela de login: validação, erro da API, sucesso e redirecionamento.

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Login from "./Login.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, entrar: vi.fn() }));
const api = vi.hoisted(() => ({ postPublico: vi.fn() }));
const armazenada = vi.hoisted(() => ({
  lerSessao: vi.fn(),
  rotaInicial: usuario => (usuario?.perfil === "motorista" ? "/motorista" : "/dashboard")
}));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../lib/sessao.js", () => armazenada);

function abrir() {
  return renderizarNaRota(<Login />, "/login", ["/dashboard", "/motorista", "/cadastro"]);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessao.usuario = null;
  armazenada.lerSessao.mockReturnValue(null);
});

describe("Login", () => {

  it("mostra o aviso vindo da navegação (ex.: empresa excluída)", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { aviso: "Empresa excluída." } }]}>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Empresa excluída.");
  });

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

  it("login de motorista: vai direto para a tela do motorista", async () => {
    const usuario = { id: "moto@empresa.com", perfil: "motorista", veiculo: "CT-001" };
    api.postPublico.mockResolvedValue({ ok: true, dados: { token: "t", usuario } });
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "moto@empresa.com");
    await userEvent.type(screen.getByLabelText("Senha"), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    await waitFor(() => expect(screen.getByText("destino /motorista")).toBeInTheDocument());
  });

  it("motorista já logado: vai direto para /motorista", () => {
    sessao.usuario = { id: "moto@empresa.com", perfil: "motorista" };
    armazenada.lerSessao.mockReturnValue({ token: "t" });
    abrir();
    expect(screen.getByText("destino /motorista")).toBeInTheDocument();
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
    // Orientação sai em azul; erro de validação volta ao vermelho.
    expect(screen.getByRole("status")).toHaveClass("aviso", "aviso-info");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Informe um e-mail válido.");
    expect(screen.getByRole("status")).not.toHaveClass("aviso-info");
  });

  it("tela dividida: marca com a régua de faixa e o formulário no cartão", () => {
    abrir();
    expect(screen.getByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ColdTrack Control, página inicial" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Faixa segura")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cadastrar empresa" })).toHaveAttribute("href", "/cadastro");
  });

  it("já logado: vai direto ao dashboard", () => {
    sessao.usuario = { id: "ana@empresa.com" };
    armazenada.lerSessao.mockReturnValue({ token: "t" });
    abrir();
    expect(screen.getByText("destino /dashboard")).toBeInTheDocument();
  });

});
