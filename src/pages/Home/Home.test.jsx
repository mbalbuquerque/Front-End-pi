// Página inicial: carrossel, menu, âncoras, cabeçalho ao rolar e login embutido.

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home.jsx";

const sessao = vi.hoisted(() => ({ entrar: vi.fn() }));
const api = vi.hoisted(() => ({ postPublico: vi.fn() }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../components/ChatWidget/ChatWidget.jsx", () => ({
  default: () => <div data-testid="chat-widget" />
}));

function abrir(rota = "/") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<p>destino /dashboard</p>} />
        <Route path="/login" element={<p>destino /login</p>} />
        <Route path="/cadastro" element={<p>destino /cadastro</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function slidesAtivos() {
  return [...document.querySelectorAll(".slide")].map(s => s.classList.contains("active"));
}

function simularMovimentoReduzido(reduzido) {
  window.matchMedia = vi.fn().mockImplementation(consulta => ({
    matches: reduzido,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
}

const original = { matchMedia: window.matchMedia, scrollIntoView: Element.prototype.scrollIntoView };

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  simularMovimentoReduzido(false);
});

afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = original.matchMedia;
  Element.prototype.scrollIntoView = original.scrollIntoView;
  window.scrollY = 0;
});

describe("Home", () => {

  it("renderiza as seções, o título da aba e o assistente", () => {
    abrir();
    expect(document.title).toBe("ColdTrack Control | Monitoramento da Cadeia Fria");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Da origem ao destino, sua carga monitorada.");
    ["projeto", "diferencial", "quem-somos", "login", "contato"].forEach(id => {
      expect(document.getElementById(id)).toBeInTheDocument();
    });
    expect(screen.getByTestId("chat-widget")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
  });

  it("carrossel: setas e pontos trocam o slide dando a volta nas pontas", async () => {
    abrir();
    expect(slidesAtivos()).toEqual([true, false, false]);
    await userEvent.click(screen.getByText("›"));
    expect(slidesAtivos()).toEqual([false, true, false]);
    await userEvent.click(screen.getByText("‹"));
    await userEvent.click(screen.getByText("‹"));
    expect(slidesAtivos()).toEqual([false, false, true]);
    await userEvent.click(screen.getByText("›"));
    expect(slidesAtivos()).toEqual([true, false, false]);
    await userEvent.click(screen.getByRole("button", { name: "Slide 3" }));
    expect(slidesAtivos()).toEqual([false, false, true]);
  });

  it("carrossel avança sozinho a cada 6 s", () => {
    vi.useFakeTimers();
    abrir();
    act(() => { vi.advanceTimersByTime(5999); });
    expect(slidesAtivos()).toEqual([true, false, false]);
    act(() => { vi.advanceTimersByTime(1); });
    expect(slidesAtivos()).toEqual([false, true, false]);
  });

  it("com movimento reduzido o carrossel não avança sozinho", () => {
    simularMovimentoReduzido(true);
    vi.useFakeTimers();
    abrir();
    act(() => { vi.advanceTimersByTime(20000); });
    expect(slidesAtivos()).toEqual([true, false, false]);
  });

  it("menu móvel abre e fecha pelo botão e fecha ao escolher uma âncora", async () => {
    abrir();
    const botao = screen.getByRole("button", { name: "Abrir menu" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("menu")).toHaveClass("open");
    await userEvent.click(screen.getByRole("link", { name: "Contato" }));
    expect(document.getElementById("menu")).not.toHaveClass("open");
  });

  it("clique em âncora rola suave até a seção", async () => {
    abrir();
    await userEvent.click(screen.getByRole("link", { name: "Projeto" }));
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }));
  });

  it("clique em âncora com movimento reduzido rola sem animação", async () => {
    simularMovimentoReduzido(true);
    abrir();
    await userEvent.click(screen.getByRole("link", { name: "Diferencial" }));
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" }));
  });

  it("clique com Ctrl deixa o navegador agir (não navega pela âncora)", async () => {
    abrir();
    const usuario = userEvent.setup();
    await usuario.keyboard("{Control>}");
    await usuario.click(screen.getByRole("link", { name: "Quem somos" }));
    await usuario.keyboard("{/Control}");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("âncora na URL leva direto até a seção na carga da página", () => {
    abrir("/#contato");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("âncora inexistente na URL não rola", () => {
    abrir("/#nao-existe");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("cabeçalho fica mais opaco depois de 50 px de rolagem", () => {
    abrir();
    const cabecalho = document.getElementById("header");
    expect(cabecalho.style.background).toBe("rgba(4, 24, 39, 0.78)");
    act(() => {
      window.scrollY = 120;
      window.dispatchEvent(new Event("scroll"));
    });
    expect(cabecalho.style.background).toBe("rgba(4, 24, 39, 0.96)");
  });

  it("login sem preencher não chama a API (validação do navegador) e o aviso inicial permanece", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Entrar", hidden: false }));
    expect(api.postPublico).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Acesso para operadores e gestores cadastrados.");
  });

  it("login só com espaços no e-mail pede e-mail e senha", async () => {
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "   ");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    document.getElementById("loginForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Informe e-mail e senha."));
    expect(api.postPublico).not.toHaveBeenCalled();
  });

  it("login válido chama /login, guarda a sessão e vai ao dashboard", async () => {
    api.postPublico.mockResolvedValue({ ok: true, dados: { token: "tok", usuario: { nome: "Ana" } } });
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), " ana@empresa.com ");
    await userEvent.type(screen.getByLabelText("Senha"), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar", hidden: false }));
    expect(api.postPublico).toHaveBeenCalledWith("/login", { email: "ana@empresa.com", senha: "segredo123" });
    expect(await screen.findByText("destino /dashboard")).toBeInTheDocument();
    expect(sessao.entrar).toHaveBeenCalledWith("tok", { nome: "Ana" });
  });

  it("credenciais recusadas: mostra o erro da API e libera o botão", async () => {
    api.postPublico.mockResolvedValue({ ok: false, dados: { erros: ["E-mail ou senha incorretos."] } });
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar", hidden: false }));
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(sessao.entrar).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Entrar" }).every(b => !b.disabled)).toBe(true);
  });

  it("recusa sem lista de erros: mensagem genérica", async () => {
    api.postPublico.mockResolvedValue({ ok: false, dados: {} });
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar", hidden: false }));
    expect(await screen.findByText("Não foi possível entrar.")).toBeInTheDocument();
  });

  it("falha de rede: avisa que está sem conexão", async () => {
    api.postPublico.mockRejectedValue(new Error("rede"));
    abrir();
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar", hidden: false }));
    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeInTheDocument();
    expect(sessao.entrar).not.toHaveBeenCalled();
  });

  it("link de cadastro aponta para /cadastro", () => {
    abrir();
    expect(screen.getByRole("link", { name: "Cadastre sua empresa" })).toHaveAttribute("href", "/cadastro");
  });

});
