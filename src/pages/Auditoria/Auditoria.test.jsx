// Tela demonstrativa de auditoria: filtros, detalhes e exportação CSV do que está filtrado.

import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Auditoria from "./Auditoria.jsx";

// A tela abre dentro da moldura do painel (PainelLayout), que lê a sessão.
vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => ({ usuario: null, sair: () => {} }) }));

afterEach(() => {
  vi.restoreAllMocks();
});

function abrir() {
  return renderizarNaRota(<Auditoria />, "/auditoria");
}

const linhas = () => within(document.getElementById("logsTabela")).queryAllByRole("row");

describe("Auditoria", () => {

  it("lista os 6 eventos e os indicadores", () => {
    abrir();
    expect(linhas()).toHaveLength(6);
    expect(document.getElementById("totalEventos")).toHaveTextContent("6");
    expect(document.getElementById("totalAlteracoes")).toHaveTextContent("2");
    expect(document.getElementById("totalAlertas")).toHaveTextContent("1");
    expect(document.getElementById("contadorResultados")).toHaveTextContent("6 de 6 eventos");
    expect(screen.getByText("SOMENTE LEITURA")).toBeInTheDocument();
  });

  it("filtra por pesquisa, tipo e resultado, e atualiza o contador", async () => {
    abrir();
    await userEvent.type(screen.getByLabelText("Pesquisar"), "mariana");
    expect(linhas()).toHaveLength(2);
    expect(document.getElementById("contadorResultados")).toHaveTextContent("2 de 6");
    await userEvent.clear(screen.getByLabelText("Pesquisar"));
    await userEvent.selectOptions(screen.getByLabelText("Tipo de evento"), "alerta");
    expect(linhas()).toHaveLength(1);
    await userEvent.selectOptions(screen.getByLabelText("Tipo de evento"), "");
    await userEvent.selectOptions(screen.getByLabelText("Resultado"), "negado");
    expect(linhas()).toHaveLength(1);
    expect(linhas()[0]).toHaveTextContent("Negado");
  });

  it("intervalo de datas invertido: lista vazia e mensagem; Limpar filtros restaura", async () => {
    abrir();
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-10-01" } });
    expect(document.getElementById("filtroMensagem")).toHaveTextContent("A data inicial não pode ser posterior à data final.");
    expect(document.getElementById("semResultados")).toBeVisible();
    expect(linhas()).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(linhas()).toHaveLength(6);
    expect(document.getElementById("filtroMensagem")).toBeEmptyDOMElement();
  });

  it("Visualizar mostra o evento; campo nulo vira 'Não se aplica'; o x fecha", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Visualizar evento AUD-0005" }));
    const dialogo = document.getElementById("detalhesDialog");
    expect(dialogo).toHaveAttribute("open");
    expect(within(dialogo).getByText("20/10/2026 08:15")).toBeInTheDocument();
    expect(within(dialogo).getAllByText("Não se aplica")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Fechar detalhes", hidden: true }));
    expect(dialogo).not.toHaveAttribute("open");
  });

  it("Exportar CSV baixa só o que está filtrado", async () => {
    const blobs = [];
    URL.createObjectURL = vi.fn(blob => { blobs.push(blob); return "blob:teste"; });
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    abrir();
    await userEvent.selectOptions(screen.getByLabelText("Resultado"), "negado");
    await userEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));
    expect(clique).toHaveBeenCalledTimes(1);
    const texto = await new Promise(resolve => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.readAsText(blobs[0]);
    });
    expect(texto).toContain("AUD-0003");
    expect(texto).not.toContain("AUD-0001");
  });

});
