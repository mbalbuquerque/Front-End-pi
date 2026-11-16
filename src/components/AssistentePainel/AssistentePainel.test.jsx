// Assistente do painel: abrir/fechar, sugestões, envio, resposta com fontes, erro e fim da sessão.

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { limparConversa } from "./conversa.js";
import AssistentePainel from "./AssistentePainel.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, token: "tok-1" }));
const assistente = vi.hoisted(() => ({ perguntarAssistente: vi.fn() }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => ({ usuario: sessao.usuario }) }));
vi.mock("../../lib/sessao.js", () => ({
  lerSessao: () => (sessao.token ? { token: sessao.token } : null)
}));
vi.mock("../../lib/assistente.js", async importarOriginal => ({
  ...(await importarOriginal()),
  perguntarAssistente: assistente.perguntarAssistente
}));

const botao = () => screen.getByRole("button", { name: "Assistente" });
const campo = () => screen.getByLabelText("Sua pergunta ao assistente");

beforeEach(() => {
  vi.clearAllMocks();
  sessao.usuario = { nome: "Gestora Teste", perfil: "gestor" };
  sessao.token = "tok-1";
  assistente.perguntarAssistente.mockResolvedValue({ resposta: "Você tem 2 veículos.", fontes: ["veículos", "leituras"] });
});

afterEach(() => {
  limparConversa();
});

describe("AssistentePainel", () => {

  it("sem usuário logado não mostra nada", () => {
    sessao.usuario = null;
    const { container } = render(<AssistentePainel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("começa fechado, abre pelo botão com o foco no campo e saúda pelo primeiro nome", async () => {
    render(<AssistentePainel />);
    expect(botao()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("hidden");
    await userEvent.click(botao());
    expect(botao()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(campo()).toHaveFocus();
    expect(screen.getByText(/Olá, Gestora!/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\?$/ })).toHaveLength(4);
  });

  it("Escape e o × fecham e devolvem o foco ao botão", async () => {
    render(<AssistentePainel />);
    await userEvent.click(botao());
    await userEvent.keyboard("{Escape}");
    expect(botao()).toHaveAttribute("aria-expanded", "false");
    expect(botao()).toHaveFocus();
    await userEvent.click(botao());
    await userEvent.click(screen.getByRole("button", { name: "Fechar assistente" }));
    expect(botao()).toHaveAttribute("aria-expanded", "false");
  });

  it("Enviar fica desabilitado sem texto; pergunta digitada vai à rota e a resposta aparece com as fontes", async () => {
    render(<AssistentePainel />);
    await userEvent.click(botao());
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await userEvent.type(campo(), "Quantos veículos tenho?");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(assistente.perguntarAssistente).toHaveBeenCalledWith("Quantos veículos tenho?", [], expect.any(Object));
    expect(await screen.findByText("Você tem 2 veículos.")).toBeInTheDocument();
    expect(screen.getByText("Fontes: veículos, leituras")).toBeInTheDocument();
    expect(screen.getByText("Quantos veículos tenho?")).toBeInTheDocument();
    expect(campo()).toHaveValue("");
    // Depois da primeira pergunta as sugestões somem.
    expect(screen.queryByRole("group", { name: "Sugestões de pergunta" })).not.toBeInTheDocument();
  });

  it("clicar numa sugestão envia a pergunta pronta; enquanto espera mostra 'digitando'", async () => {
    let responder;
    assistente.perguntarAssistente.mockReturnValue(new Promise(resolve => { responder = resolve; }));
    render(<AssistentePainel />);
    await userEvent.click(botao());
    await userEvent.click(screen.getByRole("button", { name: "Teve alerta nas últimas 24 h?" }));
    expect(screen.getByText("Assistente digitando…")).toBeInTheDocument();
    expect(campo()).toBeDisabled();
    await act(async () => {
      responder({ resposta: "Nenhum alerta.", fontes: [] });
    });
    expect(await screen.findByText("Nenhum alerta.")).toBeInTheDocument();
    expect(screen.queryByText(/Fontes:/)).not.toBeInTheDocument();
    await waitFor(() => expect(campo()).toBeEnabled());
  });

  it("segunda pergunta leva o histórico da primeira", async () => {
    render(<AssistentePainel />);
    await userEvent.click(botao());
    await userEvent.type(campo(), "Primeira");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await screen.findByText("Você tem 2 veículos.");
    await userEvent.type(campo(), "Segunda");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(assistente.perguntarAssistente).toHaveBeenCalledTimes(2));
    expect(assistente.perguntarAssistente.mock.calls[1][1]).toEqual([
      { papel: "usuario", texto: "Primeira" },
      { papel: "assistente", texto: "Você tem 2 veículos." }
    ]);
  });

  it("falha da rota: mostra o aviso de indisponível na conversa", async () => {
    assistente.perguntarAssistente.mockRejectedValue(Object.assign(new Error("HTTP 503"), { status: 503 }));
    render(<AssistentePainel />);
    await userEvent.click(botao());
    await userEvent.type(campo(), "Oi");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("O assistente está indisponível agora. Tente de novo em instantes.")).toBeInTheDocument();
  });

  it("a conversa pertence à sessão: outro token começa do zero; trocar de tela com a mesma sessão mantém", async () => {
    const { unmount } = render(<AssistentePainel />);
    await userEvent.click(botao());
    await userEvent.type(campo(), "Pergunta antiga");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await screen.findByText("Você tem 2 veículos.");
    unmount();

    const { unmount: trocarDeTela } = render(<AssistentePainel />);
    await userEvent.click(botao());
    expect(screen.getByText("Pergunta antiga")).toBeInTheDocument();
    trocarDeTela();

    sessao.token = "tok-2";
    render(<AssistentePainel />);
    await userEvent.click(botao());
    expect(screen.queryByText("Pergunta antiga")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sugestões de pergunta" })).toBeInTheDocument();
  });

  it("sessão encerrada ao sair da tela: a conversa é apagada", async () => {
    const { unmount } = render(<AssistentePainel />);
    await userEvent.click(botao());
    await userEvent.type(campo(), "Segredo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await screen.findByText("Você tem 2 veículos.");
    sessao.token = null;
    unmount();
    sessao.token = "tok-1";
    render(<AssistentePainel />);
    await userEvent.click(botao());
    expect(screen.queryByText("Segredo")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sugestões de pergunta" })).toBeInTheDocument();
  });

});
