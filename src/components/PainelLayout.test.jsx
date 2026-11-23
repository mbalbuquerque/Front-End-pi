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

  it("menu único com os grupos Operação e Gestão (9 telas para o gestor) e a atual marcada", () => {
    abrir();
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(menu).getAllByRole("link")).toHaveLength(9);
    expect(within(menu).getByRole("link", { name: /Usuários/ })).toHaveAttribute("href", "/configuracoes#painelUsuarios");
    expect(within(menu).queryByRole("link", { name: /Auditoria|Logística/ })).not.toBeInTheDocument();
    expect(within(menu).getByText("Operação")).toBeInTheDocument();
    expect(within(menu).getByText("Gestão")).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /Monitoramento ThingSpeak/ })).toHaveAttribute("href", "/monitoramento");
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

  it("Usuários só aparece para o gestor (a seção de usuários é só dele)", () => {
    sessao.usuario = { nome: "Otto", perfil: "operador", empresa: "Frio Sul" };
    abrir({}, "/configuracoes");
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(menu).queryByRole("link", { name: /Usuários/ })).not.toBeInTheDocument();
    expect(within(menu).getAllByRole("link")).toHaveLength(8);
    expect(within(menu).getByRole("link", { name: /Configurações/ })).toHaveAttribute("aria-current", "page");
  });

  it("Mais abre e fecha o menu do celular (botão, Escape, véu e clique num item)", async () => {
    const { container } = abrir();
    const raiz = container.querySelector(".ct-shell");
    const mais = screen.getByRole("button", { name: "Mais" });
    expect(mais).toHaveAttribute("aria-expanded", "false");
    expect(mais).toHaveAttribute("aria-controls", screen.getByRole("navigation", { name: "Menu principal" }).id);

    await userEvent.click(mais);
    expect(raiz).toHaveClass("ct-shell--menu-aberto");
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(raiz).not.toHaveClass("ct-shell--menu-aberto");

    await userEvent.click(screen.getByRole("button", { name: "Mais" }));
    await userEvent.keyboard("{Escape}");
    expect(raiz).not.toHaveClass("ct-shell--menu-aberto");

    await userEvent.click(screen.getByRole("button", { name: "Mais" }));
    await userEvent.keyboard("a");
    expect(raiz).toHaveClass("ct-shell--menu-aberto");
    await userEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
    expect(raiz).not.toHaveClass("ct-shell--menu-aberto");

    await userEvent.click(screen.getByRole("button", { name: "Mais" }));
    await userEvent.click(screen.getByRole("link", { name: /Alertas/ }));
    expect(raiz).not.toHaveClass("ct-shell--menu-aberto");
  });

  it("tela de gestão: família própria, sem barra superior, sem rodapé e sem assistente", () => {
    document.title = "Monitoramento | ColdTrack";
    const { container } = render(
      <MemoryRouter initialEntries={["/monitoramento"]}>
        <PainelLayout familia="gestao"><h1>Monitoramento de sensores</h1></PainelLayout>
      </MemoryRouter>
    );
    expect(container.querySelector(".escopo-gestao")).not.toBeNull();
    expect(container.querySelector(".ct-topbar")).toBeNull();
    expect(document.getElementById("fonteDados")).toBeNull();
    expect(screen.queryByText(/Projeto Integrador 2026/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("assistente")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(document.title).toBe("Monitoramento | ColdTrack");
  });

  it("extraTopo e diálogos são renderizados", () => {
    abrir({ extraTopo: <span>seletor</span>, dialogos: <dialog id="etiqueta" /> });
    expect(screen.getByText("seletor")).toBeInTheDocument();
    expect(document.getElementById("etiqueta")).not.toBeNull();
  });

  it("sem sessão no contexto não quebra (sem bloco de usuário)", () => {
    sessao.usuario = null;
    const { container } = abrir();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    expect(container.querySelector(".ct-usuario")).toBeNull();
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

  it("Conectando, Azure conectado e Sem conexão com Azure, com a pílula vermelha na falha", () => {
    const { rerender, container } = render(<IndicadorConexao conexao={null} />);
    const pilula = () => container.querySelector(".ct-pilula");
    expect(screen.getByText("Conectando...")).toBeInTheDocument();
    expect(pilula()).toHaveClass("ct-pilula--aguardando");
    rerender(<IndicadorConexao conexao={true} />);
    expect(screen.getByText("Azure conectado")).toBeInTheDocument();
    expect(pilula()).toHaveClass("ct-pilula--ok");
    rerender(<IndicadorConexao conexao={false} />);
    expect(screen.getByText("Sem conexão com Azure")).toBeInTheDocument();
    expect(pilula()).toHaveClass("ct-pilula--falha");
  });

  it("com dados recebidos e conectado, mostra a hora da última atualização", () => {
    const { rerender } = render(<IndicadorConexao conexao={true} />);
    expect(screen.queryByText(/atualizado às/)).not.toBeInTheDocument();
    act(() => registrarRecepcao(new Date(2026, 10, 16, 9, 7)));
    expect(screen.getByText("atualizado às 09:07")).toBeInTheDocument();
    rerender(<IndicadorConexao conexao={false} />);
    expect(screen.queryByText(/atualizado às/)).not.toBeInTheDocument();
  });

});
