// Cadastro de empresa: campos obrigatórios, erro da API, sucesso e redirecionamento.

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Cadastro from "./Cadastro.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, entrar: vi.fn() }));
const api = vi.hoisted(() => ({ postPublico: vi.fn() }));
const armazenada = vi.hoisted(() => ({ lerSessao: vi.fn() }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../lib/sessao.js", () => armazenada);

function abrir() {
  return renderizarNaRota(<Cadastro />, "/cadastro", ["/sensores", "/dashboard", "/login"]);
}

async function preencher({ empresa = "Frio Sul", nome = "Ana", email = "ana@frio.com", senha = "senha1234" } = {}) {
  const campos = { "Nome da empresa": empresa, "Seu nome": nome, "E-mail": email, "Senha (mínimo 8 caracteres)": senha };
  for (const [rotulo, valor] of Object.entries(campos)) {
    if (valor) await userEvent.type(screen.getByLabelText(rotulo), valor);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  sessao.usuario = null;
  armazenada.lerSessao.mockReturnValue(null);
});

describe("Cadastro", () => {

  it("campo em branco: pede para preencher tudo e não chama a API", async () => {
    abrir();
    await preencher({ nome: "" });
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar empresa" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Preencha todos os campos.");
    expect(api.postPublico).not.toHaveBeenCalled();
  });

  it("API recusa: junta os erros e libera o botão", async () => {
    api.postPublico.mockResolvedValue({ ok: false, dados: { erros: ["E-mail já cadastrado.", "Senha fraca."] } });
    abrir();
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar empresa" }));
    expect(await screen.findByText("E-mail já cadastrado. · Senha fraca.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Cadastrar empresa" })).toBeEnabled();
  });

  it("recusa sem lista de erros: mensagem genérica", async () => {
    api.postPublico.mockResolvedValue({ ok: false, dados: {} });
    abrir();
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar empresa" }));
    expect(await screen.findByText("Não foi possível cadastrar.")).toBeVisible();
  });

  it("falha de rede: avisa que está sem conexão", async () => {
    api.postPublico.mockRejectedValue(new Error("rede"));
    abrir();
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar empresa" }));
    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeVisible();
  });

  it("cadastro certo: envia os campos, entra e vai para Sensores", async () => {
    const usuario = { id: "ana@frio.com", perfil: "gestor" };
    api.postPublico.mockResolvedValue({ ok: true, dados: { token: "t", usuario } });
    abrir();
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar empresa" }));
    await waitFor(() => expect(screen.getByText("destino /sensores")).toBeInTheDocument());
    expect(api.postPublico).toHaveBeenCalledWith("/empresas", {
      empresa: "Frio Sul", nome: "Ana", email: "ana@frio.com", senha: "senha1234"
    });
    expect(sessao.entrar).toHaveBeenCalledWith("t", usuario);
  });

  it("já logado: vai direto ao dashboard", () => {
    sessao.usuario = { id: "ana@frio.com" };
    armazenada.lerSessao.mockReturnValue({ token: "t" });
    abrir();
    expect(screen.getByText("destino /dashboard")).toBeInTheDocument();
  });

});
