// Tela de alertas: estados (carregando, erro, sem veículo) e ocorrências agrupadas.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Alertas from "./Alertas.jsx";

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

const leitura = (minutos, temperatura, status) => ({
  temperatura,
  status,
  medidoEm: new Date(Date.UTC(2026, 10, 16, 12, minutos)).toISOString()
});

function abrir() {
  return renderizarNaRota(<Alertas />, "/alertas");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [VAN], veiculo: VAN, faixa: FAIXA });
  leituras.buscarLeituras.mockResolvedValue([]);
});

describe("Alertas", () => {

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

  it("API fora: mostra o erro e marca a conexão como falha", async () => {
    veiculo.escolherVeiculo.mockRejectedValue(new Error("fora"));
    abrir();
    expect(await screen.findByText("Não foi possível falar com o Azure.")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("false");
  });

  it("sem alertas no período: mostra a mensagem de carga dentro da faixa", async () => {
    abrir();
    expect(await screen.findByText("Nenhum alerta nas últimas 24 h.")).toBeInTheDocument();
    expect(screen.getByText(/dentro da faixa normal \(até 15 °C\)/)).toBeInTheDocument();
    expect(leituras.buscarLeituras).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: "esp32-01", horas: 24, status: ["ATENCAO", "CRITICO"] })
    );
  });

  it("agrupa leituras seguidas em uma ocorrência e conta as críticas", async () => {
    leituras.buscarLeituras.mockResolvedValue([
      leitura(30, 22.5, "CRITICO"),
      leitura(29, 17, "ATENCAO"),
      leitura(28, 16, "ATENCAO"),
      leitura(0, 18, "ATENCAO")
    ]);
    abrir();
    await screen.findByRole("table");

    // Duas ocorrências: a de 12:00 (atenção) e a de 12:28-12:30 (crítica).
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("CRÍTICO")).toBeInTheDocument();
    expect(screen.getByText("ATENÇÃO")).toBeInTheDocument();
    expect(screen.getByText("22.5 °C", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Ocorrências de temperatura · VAN-01")).toBeInTheDocument();
  });

  it("troca o período para 7 dias e busca de novo", async () => {
    abrir();
    await screen.findByText("Nenhum alerta nas últimas 24 h.");
    await userEvent.click(screen.getByRole("button", { name: "Últimos 7 dias" }));
    expect(await screen.findByText("Nenhum alerta nos últimos 7 dias.")).toBeInTheDocument();
    expect(leituras.buscarLeituras).toHaveBeenLastCalledWith(expect.objectContaining({ horas: 168 }));
  });

  it("com mais de um veículo, o seletor troca a escolha e recarrega", async () => {
    const outro = { id: "VAN-02", deviceId: "esp32-02", perfil: "demonstrativo" };
    veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [VAN, outro], veiculo: VAN, faixa: FAIXA });
    abrir();
    await userEvent.selectOptions(await screen.findByRole("combobox"), "VAN-02");
    expect(veiculo.lembrarVeiculo).toHaveBeenCalledWith("VAN-02");
  });

});
