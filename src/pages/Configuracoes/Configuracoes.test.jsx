// Tela de configurações: conta, faixas, sensores e, para o gestor, usuários.

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Configuracoes from "./Configuracoes.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, entrar: vi.fn() }));
const api = vi.hoisted(() => ({ api: vi.fn() }));
const faixas = vi.hoisted(() => ({ carregarPerfis: vi.fn() }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../lib/faixas.js", async importarOriginal => ({
  ...(await importarOriginal()),
  carregarPerfis: faixas.carregarPerfis
}));

// A moldura (menu, assistente) tem teste próprio; aqui só o conteúdo da tela.
vi.mock("../../components/PainelLayout.jsx", () => ({
  default: ({ titulo, conexao, dialogos, children }) => (
    <div>
      <h1>{titulo}</h1>
      <span data-testid="conexao">{String(conexao)}</span>
      {children}
      {dialogos}
    </div>
  )
}));

const GESTOR = { id: "gestor@empresa.com", nome: "Gina", perfil: "gestor", empresa: "Frio Sul" };
const OPERADOR = { id: "op@empresa.com", nome: "Otto", perfil: "operador", empresa: "Frio Sul" };

const PERFIS = [
  { id: "demonstrativo", nome: "Demonstrativo", min: null, max: 15, margem: 5 },
  { id: "uva", nome: "Uva", min: 0, max: 2, margem: 1 }
];

const USUARIOS = [
  { id: "gestor@empresa.com", nome: "Gina", perfil: "gestor" },
  { id: "op@empresa.com", nome: "Otto", perfil: "operador" }
];

function respostas(rotas = {}) {
  api.api.mockImplementation(async (caminho, opcoes = {}) => {
    const chave = `${opcoes.metodo || "GET"} ${caminho}`;
    if (chave in rotas) {
      const valor = rotas[chave];
      if (valor instanceof Error) throw valor;
      return typeof valor === "function" ? valor(opcoes) : valor;
    }
    if (chave === "GET /dispositivos") return { dispositivos: [{ id: "a" }, { id: "b" }] };
    if (chave === "GET /usuarios") return { usuarios: USUARIOS };
    throw new Error(`rota não simulada: ${chave}`);
  });
}

function abrir() {
  return renderizarNaRota(<Configuracoes />, "/configuracoes", ["/sensores"]);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "alert").mockImplementation(() => {});
  sessao.usuario = GESTOR;
  faixas.carregarPerfis.mockResolvedValue(PERFIS);
  respostas();
});

describe("Configurações", () => {

  it("operador vê conta, faixas e sensores, sem o painel de usuários", async () => {
    sessao.usuario = OPERADOR;
    abrir();
    expect(await screen.findByText("Minha conta")).toBeInTheDocument();
    expect(screen.getByText("Otto · op@empresa.com · Frio Sul")).toBeInTheDocument();
    expect(screen.getByText("Uva")).toBeInTheDocument();
    expect(screen.getByText("de 0 a 2 °C")).toBeInTheDocument();
    expect(screen.getByText("até 5 °C fora da faixa")).toBeInTheDocument();
    expect(screen.getByText("2 ·", { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Usuários" })).not.toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("true");
  });

  it("sem conexão: avisa nas faixas e nos sensores", async () => {
    faixas.carregarPerfis.mockRejectedValue(new Error("fora"));
    abrir();
    expect(await screen.findByText("Sem conexão com o Azure.")).toBeInTheDocument();
    expect(screen.getByText(/sem conexão ·/)).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("false");
  });

  it("troca de senha com sucesso: guarda o token novo e confirma", async () => {
    const atualizado = { ...GESTOR };
    respostas({ "POST /senha": { token: "novo", usuario: atualizado } });
    abrir();
    await userEvent.type(await screen.findByLabelText("Senha atual"), "antiga123");
    await userEvent.type(screen.getByLabelText("Nova senha (mín. 8)", { selector: "#formSenha input" }), "nova12345");
    await userEvent.click(screen.getByRole("button", { name: "Trocar senha" }));

    expect(await screen.findByText(/Senha trocada/)).toBeVisible();
    expect(sessao.entrar).toHaveBeenCalledWith("novo", atualizado);
    expect(api.api).toHaveBeenCalledWith("/senha", {
      metodo: "POST",
      corpo: { atual: "antiga123", nova: "nova12345" }
    });
  });

  it("troca de senha recusada: mostra a mensagem da API", async () => {
    respostas({ "POST /senha": new Error("Senha atual incorreta.") });
    abrir();
    await userEvent.type(await screen.findByLabelText("Senha atual"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Trocar senha" }));
    expect(await screen.findByText("Senha atual incorreta.")).toBeVisible();
  });

  it("gestor vê os usuários e 'você' no próprio, sem botões nele", async () => {
    abrir();
    const painel = await screen.findByText("Quem acessa o painel.", { exact: false });
    const tabela = within(painel.closest("article"));
    expect(tabela.getByText("você")).toBeInTheDocument();
    expect(tabela.getAllByRole("button", { name: "Remover" })).toHaveLength(1);
    expect(tabela.getByText("Operador logístico", { selector: "td" })).toBeInTheDocument();
  });

  it("falha ao listar usuários: mostra a mensagem no painel", async () => {
    respostas({ "GET /usuarios": new Error("Sem permissão.") });
    abrir();
    expect(await screen.findByText("Sem permissão.")).toBeInTheDocument();
  });

  it("cria usuário: envia o formulário e recarrega a lista", async () => {
    respostas({ "POST /usuarios": {} });
    abrir();
    await screen.findByText("você");
    const form = document.getElementById("formUsuario");
    await userEvent.type(within(form).getByLabelText("Nome"), "Nina");
    await userEvent.type(within(form).getByLabelText("E-mail"), "nina@empresa.com");
    await userEvent.type(within(form).getByLabelText("Senha inicial (mín. 8)"), "senha12345");
    await userEvent.click(within(form).getByRole("button", { name: "Criar usuário" }));

    await vi.waitFor(() => expect(api.api).toHaveBeenCalledWith("/usuarios", {
      metodo: "POST",
      corpo: { nome: "Nina", email: "nina@empresa.com", perfil: "operador", senha: "senha12345" }
    }));
    await vi.waitFor(() => expect(api.api.mock.calls.filter(c => c[0] === "/usuarios" && !c[1]).length).toBe(2));
  });

  it("criar usuário recusado: mostra o erro no formulário", async () => {
    respostas({ "POST /usuarios": new Error("E-mail já existe.") });
    abrir();
    await screen.findByText("você");
    await userEvent.click(screen.getByRole("button", { name: "Criar usuário" }));
    expect(await screen.findByText("E-mail já existe.")).toBeVisible();
  });

  it("remove usuário só depois de confirmar", async () => {
    respostas({ "DELETE /usuarios/op%40empresa.com": {} });
    const confirmar = vi.spyOn(window, "confirm");
    abrir();
    await screen.findByText("você");

    confirmar.mockReturnValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(api.api).not.toHaveBeenCalledWith("/usuarios/op%40empresa.com", expect.anything());

    confirmar.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    await vi.waitFor(() => expect(api.api).toHaveBeenCalledWith("/usuarios/op%40empresa.com", { metodo: "DELETE" }));
  });

  it("falha ao remover usuário: avisa com alert", async () => {
    respostas({ "DELETE /usuarios/op%40empresa.com": new Error("Não pode remover.") });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    abrir();
    await screen.findByText("você");
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    await vi.waitFor(() => expect(window.alert).toHaveBeenCalledWith("Não pode remover."));
  });

});

describe("Configurações: redefinir senha de usuário", () => {

  // jsdom não implementa showModal/close de <dialog>.
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  });

  it("abre o diálogo, redefine e avisa", async () => {
    respostas({ "PUT /usuarios/op%40empresa.com": {} });
    abrir();
    await userEvent.click(await screen.findByRole("button", { name: "Redefinir senha" }));

    const dialogo = document.getElementById("redefinir");
    expect(dialogo).toHaveAttribute("open");
    await userEvent.type(within(dialogo).getByLabelText("Nova senha (mín. 8)"), "outra12345");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Redefinir senha" }));

    await vi.waitFor(() => expect(api.api).toHaveBeenCalledWith("/usuarios/op%40empresa.com", {
      metodo: "PUT",
      corpo: { senha: "outra12345" }
    }));
    await vi.waitFor(() => expect(window.alert).toHaveBeenCalledWith("Senha de op@empresa.com redefinida."));
    expect(document.getElementById("redefinir")).toBeNull();
  });

  it("erro da API aparece no diálogo; Cancelar fecha", async () => {
    respostas({ "PUT /usuarios/op%40empresa.com": new Error("Senha curta.") });
    abrir();
    await userEvent.click(await screen.findByRole("button", { name: "Redefinir senha" }));

    const dialogo = document.getElementById("redefinir");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Redefinir senha" }));
    expect(await within(dialogo).findByText("Senha curta.")).toBeVisible();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    expect(document.getElementById("redefinir")).toBeNull();
  });

});
