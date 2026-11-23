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

  describe("verificação em duas etapas", () => {

    const USUARIO = { id: "ana@empresa.com", perfil: "gestor" };

    async function passarDaSenha() {
      api.postPublico.mockResolvedValueOnce({ ok: true, dados: { exige2fa: true, desafio: "jwt-desafio" } });
      abrir();
      await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
      await userEvent.type(screen.getByLabelText("Senha"), "segredo123");
      await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
      return screen.findByLabelText("Código do aplicativo autenticador");
    }

    it("usuário com 2FA: não entra só com a senha e pede o código de 6 dígitos", async () => {
      const campo = await passarDaSenha();
      expect(sessao.entrar).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { level: 1, name: "Verificação em duas etapas" })).toBeInTheDocument();
      expect(campo).toHaveAttribute("inputmode", "numeric");
      expect(campo).toHaveAttribute("autocomplete", "one-time-code");
      await userEvent.type(campo, "12345678");
      expect(campo).toHaveValue("123456");
      await userEvent.clear(campo);
      expect(campo).toHaveFocus();
    });

    it("código válido entra no painel", async () => {
      const campo = await passarDaSenha();
      api.postPublico.mockResolvedValueOnce({ ok: true, dados: { token: "t2", usuario: USUARIO } });
      await userEvent.type(campo, "123456");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("destino /dashboard")).toBeInTheDocument());
      expect(api.postPublico).toHaveBeenLastCalledWith("/login/2fa", { desafio: "jwt-desafio", codigo: "123456" });
      expect(sessao.entrar).toHaveBeenCalledWith("t2", USUARIO);
    });

    it("aceita colar o código com espaço ou traço", async () => {
      const campo = await passarDaSenha();
      campo.focus();
      await userEvent.paste("123 456");
      expect(campo).toHaveValue("123456");
      await userEvent.clear(campo);
      await userEvent.paste("987-654-extra");
      expect(campo).toHaveValue("987654");
    });

    it("código errado, vencido ou já usado: mostra o erro da API e não entra", async () => {
      const campo = await passarDaSenha();
      api.postPublico.mockResolvedValueOnce({ ok: false, status: 401, dados: { erros: ["Código inválido ou vencido."] } });
      await userEvent.type(campo, "000000");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Código inválido ou vencido.");
      expect(sessao.entrar).not.toHaveBeenCalled();
      expect(campo).toHaveValue("");
      expect(campo).toHaveFocus();
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    });

    it("401 sem lista de erros usa a mesma mensagem genérica", async () => {
      const campo = await passarDaSenha();
      api.postPublico.mockResolvedValueOnce({ ok: false, status: 401, dados: {} });
      await userEvent.type(campo, "000000");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Código inválido ou vencido.");
    });

    it("muitas tentativas (429): pede para esperar", async () => {
      const campo = await passarDaSenha();
      api.postPublico.mockResolvedValueOnce({ ok: false, status: 429, dados: {} });
      await userEvent.type(campo, "111111");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Muitas tentativas");
    });

    it("código incompleto: avisa sem chamar a API", async () => {
      const campo = await passarDaSenha();
      await userEvent.type(campo, "123");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(screen.getByRole("status")).toHaveTextContent("Digite os 6 dígitos");
      expect(api.postPublico).toHaveBeenCalledTimes(1);
    });

    it("falha de rede no segundo passo: avisa que está sem conexão", async () => {
      const campo = await passarDaSenha();
      api.postPublico.mockRejectedValueOnce(new Error("rede"));
      await userEvent.type(campo, "123456");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Sem conexão com o servidor");
    });

    it("entra uma vez com um código de recuperação", async () => {
      await passarDaSenha();
      await userEvent.click(screen.getByRole("button", { name: "Usar código de recuperação" }));
      const campo = screen.getByLabelText("Código de recuperação");
      expect(campo).toHaveFocus();

      api.postPublico.mockResolvedValueOnce({ ok: true, dados: { token: "t3", usuario: USUARIO } });
      await userEvent.type(campo, "A1B2 C3D4");
      expect(campo).toHaveValue("a1b2c3d4");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() => expect(screen.getByText("destino /dashboard")).toBeInTheDocument());
      expect(api.postPublico).toHaveBeenLastCalledWith("/login/2fa", { desafio: "jwt-desafio", recuperacao: "a1b2c3d4" });
    });

    it("código de recuperação já usado: recusa com o erro da API", async () => {
      await passarDaSenha();
      await userEvent.click(screen.getByRole("button", { name: "Usar código de recuperação" }));
      api.postPublico.mockResolvedValueOnce({ ok: false, status: 401, dados: { erros: ["Código inválido ou vencido."] } });
      await userEvent.type(screen.getByLabelText("Código de recuperação"), "a1b2c3d4");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Código inválido ou vencido.");
      expect(sessao.entrar).not.toHaveBeenCalled();
    });

    it("recuperação incompleta: avisa sem chamar a API", async () => {
      await passarDaSenha();
      await userEvent.click(screen.getByRole("button", { name: "Usar código de recuperação" }));
      await userEvent.type(screen.getByLabelText("Código de recuperação"), "a1b2");
      await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(screen.getByRole("status")).toHaveTextContent("Digite os 8 caracteres");
      expect(api.postPublico).toHaveBeenCalledTimes(1);
    });

    it("volta do código de recuperação para o do aplicativo", async () => {
      await passarDaSenha();
      await userEvent.click(screen.getByRole("button", { name: "Usar código de recuperação" }));
      await userEvent.click(screen.getByRole("button", { name: "Usar código do aplicativo" }));
      expect(screen.getByLabelText("Código do aplicativo autenticador")).toHaveFocus();
    });

    it("Voltar recomeça pelo e-mail e senha, com o e-mail mantido", async () => {
      await passarDaSenha();
      await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
      expect(screen.getByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
      expect(screen.getByLabelText("E-mail")).toHaveValue("ana@empresa.com");
      expect(screen.getByLabelText("Senha")).toHaveValue("");
    });

  });

  it("já logado: vai direto ao dashboard", () => {
    sessao.usuario = { id: "ana@empresa.com" };
    armazenada.lerSessao.mockReturnValue({ token: "t" });
    abrir();
    expect(screen.getByText("destino /dashboard")).toBeInTheDocument();
  });

});
