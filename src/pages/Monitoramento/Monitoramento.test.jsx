// Monitoramento (ThingSpeak): leitura recente, leitura antiga, falha e botão Atualizar. A rede é simulada.

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Monitoramento from "./Monitoramento.jsx";

// A tela abre dentro da moldura do painel (PainelLayout), que lê a sessão.
vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => ({ usuario: null, sair: () => {} }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

function feed(minutosAtras, f1, f2 = "60", f3 = "-70") {
  return { created_at: new Date(Date.now() - minutosAtras * 60000).toISOString(), field1: f1, field2: f2, field3: f3 };
}

function canal(feeds) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ feeds }) });
}

function abrir() {
  return renderizarNaRota(<Monitoramento />, "/monitoramento", ["/dashboard"]);
}

describe("Monitoramento", () => {

  it("antes da resposta: aguardando dados e botão desabilitado", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    abrir();
    expect(screen.getByText("Aguardando dados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar leituras" })).toBeDisabled();
    expect(document.getElementById("conexao")).toHaveTextContent("Consultando canal…");
  });

  it("leitura recente normal: valores, situação, gráfico e histórico", async () => {
    vi.stubGlobal("fetch", canal([feed(3, "7.5"), feed(1, "8.0", "61", "-65")]));
    abrir();
    await waitFor(() => expect(document.getElementById("conexao")).toHaveTextContent("Leitura recente recebida"));
    expect(document.getElementById("temperatura")).toHaveTextContent("8.0");
    expect(document.getElementById("umidade")).toHaveTextContent("61.0");
    expect(document.getElementById("rssi")).toHaveTextContent("-65");
    expect(document.getElementById("situacao")).toHaveTextContent("Normal");
    expect(document.getElementById("origemDados")).toHaveTextContent("Dados reais consultados no ThingSpeak");
    expect(within(document.getElementById("historico")).getAllByRole("row")).toHaveLength(2);
    expect(document.querySelectorAll("#grafico polyline").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Atualizar leituras" })).toBeEnabled();
  });

  it("temperatura acima de 15 e de 20: Atenção e Crítico", async () => {
    vi.stubGlobal("fetch", canal([feed(1, "17.0")]));
    abrir();
    await waitFor(() => expect(document.getElementById("situacao")).toHaveTextContent("Atenção"));
    vi.stubGlobal("fetch", canal([feed(1, "25.0")]));
    await userEvent.click(screen.getByRole("button", { name: "Atualizar leituras" }));
    await waitFor(() => expect(document.getElementById("situacao")).toHaveTextContent("Crítico"));
  });

  it("última leitura antiga: não apresenta como atual", async () => {
    vi.stubGlobal("fetch", canal([feed(120, "7.0")]));
    abrir();
    await waitFor(() => expect(document.getElementById("conexao")).toHaveTextContent("Sem comunicação recente"));
    expect(document.getElementById("situacao")).toHaveTextContent("Leitura antiga");
    expect(document.getElementById("origemDados")).toHaveTextContent("fora da janela de atualização");
  });

  it("canal sem temperatura: mostra traço e aviso no gráfico", async () => {
    vi.stubGlobal("fetch", canal([feed(1, null)]));
    abrir();
    await waitFor(() => expect(document.getElementById("situacao")).toHaveTextContent("Sem temperatura"));
    expect(screen.getByText("Sem temperaturas disponíveis")).toBeInTheDocument();
  });

  it("falha do canal: indisponível e nenhum valor anterior mantido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));
    abrir();
    await waitFor(() => expect(document.getElementById("conexao")).toHaveTextContent("Indisponível"));
    expect(document.getElementById("origemDados")).toHaveTextContent("HTTP 503");
    expect(document.getElementById("origemDados")).toHaveTextContent("Nenhum valor anterior foi mantido como atual.");
    expect(document.getElementById("origemDados")).toHaveClass("error");
    expect(document.getElementById("temperatura")).toHaveTextContent("—");
    expect(screen.getByText("Sem dados disponíveis.")).toBeInTheDocument();
  });

  it("falha depois de uma leitura boa: limpa os valores antigos", async () => {
    const fetch = canal([feed(1, "7.0")]);
    vi.stubGlobal("fetch", fetch);
    abrir();
    await waitFor(() => expect(document.getElementById("temperatura")).toHaveTextContent("7.0"));
    fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await userEvent.click(screen.getByRole("button", { name: "Atualizar leituras" }));
    await waitFor(() => expect(document.getElementById("temperatura")).toHaveTextContent("—"));
    expect(document.getElementById("conexao")).toHaveTextContent("Indisponível");
  });

});
