// Relatórios: estados da tela, resumo do período, filtro de 24 h / 7 dias, troca de veículo e CSV.

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Relatorios from "./Relatorios.jsx";

const leituras = vi.hoisted(() => ({ buscarLeituras: vi.fn() }));
const veiculo = vi.hoisted(() => ({ escolherVeiculo: vi.fn(), lembrarVeiculo: vi.fn() }));

vi.mock("../../lib/leituras.js", async importarOriginal => ({
  ...(await importarOriginal()),
  buscarLeituras: leituras.buscarLeituras
}));
vi.mock("../../lib/veiculo.js", () => veiculo);

// A moldura (menu, assistente, sessão) tem teste próprio; aqui só o conteúdo da tela.
vi.mock("../../components/PainelLayout.jsx", () => ({
  default: ({ titulo, conexao, extraTopo, children }) => (
    <div>
      <h1>{titulo}</h1>
      <span data-testid="conexao">{String(conexao)}</span>
      {extraTopo}
      {children}
    </div>
  )
}));

const FAIXA = { min: null, max: 15, margem: 5 };
const VAN = { id: "VAN-01", deviceId: "esp32-01", perfil: "demonstrativo" };
const BAU = { id: "BAU-02", deviceId: "esp32-02", perfil: "demonstrativo" };

const leitura = (minutos, temperatura, status, umidade = 70) => ({
  temperatura,
  umidade,
  status,
  medidoEm: new Date(Date.UTC(2026, 10, 16, 12, minutos)).toISOString()
});

function abrir() {
  return renderizarNaRota(<Relatorios />, "/relatorios");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [VAN], veiculo: VAN, faixa: FAIXA });
  leituras.buscarLeituras.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Relatorios", () => {

  it("mostra Carregando antes da resposta", () => {
    veiculo.escolherVeiculo.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando leituras…")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("null");
  });

  it("sem veículo cadastrado: orienta o cadastro", async () => {
    veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [], veiculo: null, faixa: FAIXA });
    abrir();
    expect(await screen.findByText("Nenhum veículo cadastrado.")).toBeInTheDocument();
    expect(leituras.buscarLeituras).not.toHaveBeenCalled();
  });

  it("falha da API: mostra o erro do Azure e marca a conexão como falha", async () => {
    leituras.buscarLeituras.mockRejectedValue(new Error("HTTP 503"));
    abrir();
    expect(await screen.findByText("Não foi possível falar com o Azure.")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("false");
  });

  it("sem leituras no período: texto de 24 h e depois de 7 dias, com o filtro funcionando", async () => {
    abrir();
    expect(await screen.findByText("Nenhuma leitura nas últimas 24 h.")).toBeInTheDocument();
    expect(leituras.buscarLeituras).toHaveBeenCalledWith({ deviceId: "esp32-01", horas: 24, limite: 500 });
    await userEvent.click(screen.getByRole("button", { name: "Últimos 7 dias" }));
    expect(await screen.findByText("Nenhuma leitura nos últimos 7 dias.")).toBeInTheDocument();
    expect(leituras.buscarLeituras).toHaveBeenLastCalledWith({ deviceId: "esp32-01", horas: 168, limite: 500 });
    expect(screen.getByRole("button", { name: "Últimos 7 dias" })).toHaveAttribute("aria-pressed", "true");
  });

  it("com leituras: resumo, percentual fora da faixa, gráfico e tabela da mais recente à mais antiga", async () => {
    leituras.buscarLeituras.mockResolvedValue([
      leitura(3, 24, "CRITICO"),
      leitura(2, 17, "ATENCAO"),
      leitura(1, 7, "NORMAL"),
      leitura(0, 8, "NORMAL")
    ]);
    abrir();
    expect(await screen.findByText("Temperatura média")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("true");
    const cartoes = document.querySelector(".resumo");
    expect(cartoes).toHaveTextContent("Leituras4últimas 24 h");
    expect(cartoes).toHaveTextContent("14.0 °C");
    expect(cartoes).toHaveTextContent("mín. 7.0 °C · máx. 24.0 °C");
    expect(cartoes).toHaveTextContent("50 %");
    expect(cartoes).toHaveTextContent("2 de 4 leituras");
    expect(within(cartoes).getAllByText("1")[0]).toHaveClass("critico");
    expect(screen.getByRole("heading", { name: /Temperatura no período · VAN-01/ })).toBeInTheDocument();
    expect(document.querySelector("#graficoRelatorio svg")).not.toBeNull();
    const linhas = within(document.querySelector("table.tabela tbody")).getAllByRole("row");
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toHaveTextContent("24.0 °C");
    expect(linhas[0]).toHaveTextContent("CRÍTICO");
    expect(linhas[3]).toHaveTextContent("8.0 °C");
    expect(screen.getByText("Da mais recente para a mais antiga.")).toBeInTheDocument();
  });

  it("500 leituras: avisa que mostra só as mais recentes", async () => {
    leituras.buscarLeituras.mockResolvedValue(Array.from({ length: 500 }, (_, i) => leitura(i % 50, 7, "NORMAL")));
    abrir();
    expect(await screen.findByText("Mostrando as 500 leituras mais recentes do período.")).toBeInTheDocument();
  });

  it("Baixar CSV gera o arquivo com o nome do veículo e do período", async () => {
    leituras.buscarLeituras.mockResolvedValue([leitura(1, 7.25, "NORMAL")]);
    const blobs = [];
    URL.createObjectURL = vi.fn(blob => { blobs.push(blob); return "blob:csv"; });
    URL.revokeObjectURL = vi.fn();
    let nome = null;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function baixar() {
      nome = this.download;
    });
    abrir();
    await userEvent.click(await screen.findByRole("button", { name: "Baixar CSV" }));
    expect(nome).toBe("coldtrack-VAN-01-24h.csv");
    const texto = await new Promise(resolve => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.readAsText(blobs[0]);
    });
    expect(texto).toContain("medido_em;temperatura_c;umidade_pct;rssi_dbm;status");
    expect(texto).toContain("2026-11-16T12:01:00.000Z;7.25;70;;NORMAL");
  });

  it("com dois veículos mostra o seletor e a troca guarda a escolha", async () => {
    veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [VAN, BAU], veiculo: VAN, faixa: FAIXA });
    abrir();
    const seletor = await screen.findByLabelText("Veículo");
    await userEvent.selectOptions(seletor, "BAU-02");
    await waitFor(() => expect(veiculo.lembrarVeiculo).toHaveBeenCalledWith("BAU-02"));
  });

});
