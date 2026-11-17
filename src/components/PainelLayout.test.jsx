// Moldura das telas logadas: menu, usuário, título do documento, indicador de conexão e faixa offline.

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { esquecerRecepcao, registrarRecepcao } from "../lib/conectividade.js";
import PainelLayout, { IndicadorConexao } from "./PainelLayout.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, sair: vi.fn() }));

vi.mock("../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("./AssistentePainel/AssistentePainel.jsx", () => ({ default: () => <div data-testid="assistente" /> }));

function abrir(props = {}, rota = "/sensores") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <PainelLayout titulo="Sensores" subtitulo="Situação de cada sensor" {...props}>
        <p>conteúdo da tela</p>
      </PainelLayout>
    </MemoryRouter>
  );
}

function internet(ligada) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(ligada);
  act(() => {
    window.dispatchEvent(new Event(ligada ? "online" : "offline"));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessao.usuario = { nome: "Gina", perfil: "gestor", empresa: "Frio Sul" };
});

afterEach(() => {
  esquecerRecepcao();
  vi.restoreAllMocks();
});

describe("PainelLayout", () => {

  it("mostra título, subtítulo, conteúdo, rodapé e o assistente", () => {
    abrir();
    expect(screen.getByRole("heading", { level: 1, name: "Sensores" })).toBeInTheDocument();
    expect(screen.getByText("Situação de cada sensor")).toBeInTheDocument();
    expect(screen.getByText("conteúdo da tela")).toBeInTheDocument();
    expect(screen.getByText(/Projeto Integrador 2026/)).toBeInTheDocument();
    expect(screen.getByTestId("assistente")).toBeInTheDocument();
  });

  it("título do documento padrão e o personalizado", () => {
    const { unmount } = abrir();
    expect(document.title).toBe("Sensores · ColdTrack Control");
    unmount();
    abrir({ tituloDocumento: "ColdTrack Control" });
    expect(document.title).toBe("ColdTrack Control");
  });

  it("menu com as 7 telas e a atual marcada", () => {
    abrir();
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(menu).getAllByRole("link")).toHaveLength(7);
    expect(within(menu).getByRole("link", { name: /Sensores/ })).toHaveAttribute("aria-current", "page");
    expect(within(menu).getByRole("link", { name: /Veículos/ })).not.toHaveAttribute("aria-current");
    expect(within(menu).getByRole("link", { name: /Relatórios/ })).toHaveAttribute("href", "/relatorios");
  });

  it("usuário: nome, perfil e empresa; o operador aparece como operador logístico", () => {
    const { unmount } = abrir();
    expect(screen.getByText("Gina")).toBeInTheDocument();
    expect(screen.getByText("Gestor")).toBeInTheDocument();
    expect(screen.getByText("Frio Sul")).toBeInTheDocument();
    unmount();
    sessao.usuario = { nome: "Otto", perfil: "operador", empresa: "Frio Sul" };
    abrir();
    expect(screen.getByText("Operador logístico")).toBeInTheDocument();
  });

  it("Sair chama a saída da sessão", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(sessao.sair).toHaveBeenCalledTimes(1);
  });

  it("extraTopo e diálogos são renderizados", () => {
    abrir({ extraTopo: <span>seletor</span>, dialogos: <dialog id="etiqueta" /> });
    expect(screen.getByText("seletor")).toBeInTheDocument();
    expect(document.getElementById("etiqueta")).not.toBeNull();
  });

  it("sem sessão no contexto não quebra (nome vazio)", () => {
    sessao.usuario = null;
    abrir();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });

  it("sem internet: faixa fixa com a hora dos últimos dados e indicador 'Sem internet'", () => {
    registrarRecepcao(new Date(2026, 10, 16, 14, 5));
    abrir({ conexao: true });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.getElementById("fonteDados")).toHaveTextContent("Azure conectado");
    internet(false);
    expect(screen.getByRole("status")).toHaveTextContent("Sem conexão — exibindo os últimos dados recebidos às 14:05");
    expect(document.getElementById("fonteDados")).toHaveTextContent("Sem internet");
    internet(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.getElementById("fonteDados")).toHaveTextContent("Azure conectado");
  });

});

describe("IndicadorConexao", () => {

  it("Conectando, Azure conectado e Sem conexão com Azure, com o ponto vermelho na falha", () => {
    const { rerender, container } = render(<IndicadorConexao conexao={null} />);
    expect(screen.getByText("Conectando...")).toBeInTheDocument();
    rerender(<IndicadorConexao conexao={true} />);
    expect(screen.getByText("Azure conectado")).toBeInTheDocument();
    expect(container.querySelector(".online-dot")).not.toHaveAttribute("style");
    rerender(<IndicadorConexao conexao={false} />);
    expect(screen.getByText("Sem conexão com Azure")).toBeInTheDocument();
    expect(container.querySelector(".online-dot")).toHaveAttribute("style", expect.stringContaining("var(--red)"));
  });

});
