// Dashboard: telemetria atual, histórico, aviso de dado antigo e estados de erro. API simulada.

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Dashboard from "./Dashboard.jsx";

const leituras = vi.hoisted(() => ({ buscarLeituras: vi.fn() }));
const veiculo = vi.hoisted(() => ({ escolherVeiculo: vi.fn(), lembrarVeiculo: vi.fn() }));

vi.mock("../../lib/leituras.js", async importarOriginal => ({
  ...(await importarOriginal()),
  buscarLeituras: leituras.buscarLeituras
}));
vi.mock("../../lib/veiculo.js", () => veiculo);

// A moldura e os cards de risco têm teste próprio; aqui só o conteúdo do Dashboard.
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
vi.mock("./RiscoSaida.jsx", () => ({ default: () => <div data-testid="risco-saida" /> }));
vi.mock("./RiscoRota.jsx", () => ({ default: () => <div data-testid="risco-rota" /> }));
vi.mock("../../components/PrevisaoSensor.jsx", () => ({ default: ({ deviceId, variante }) => <div data-testid="previsao" data-device={deviceId} data-variante={variante} /> }));
vi.mock("./AvisoFalhaSensor.jsx", () => ({ default: ({ deviceId }) => <div data-testid="aviso-falha" data-device={deviceId} /> }));

const FAIXA = { min: null, max: 15, margem: 5 };
const PERFIL = { id: "demonstrativo", nome: "Demonstrativo" };
const VAN = { id: "VAN-01", deviceId: "esp32-01", perfil: "demonstrativo", tipo: "Van refrigerada" };
const BAU = { id: "BAU-02", deviceId: "esp32-02", perfil: "demonstrativo", tipo: "Baú" };

// Da mais recente para a mais antiga, como a API.
const leitura = (segundosAtras, temperatura, status = "NORMAL", rssi = -61) => ({
  temperatura,
  umidade: 70.5,
  rssi,
  status,
  medidoEm: new Date(Date.now() - segundosAtras * 1000).toISOString()
});

function abrir(rota = "/dashboard") {
  return renderizarNaRota(<Dashboard />, rota);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [VAN], veiculo: VAN, perfil: PERFIL, faixa: FAIXA });
  leituras.buscarLeituras.mockResolvedValue([leitura(10, 7.25), leitura(30, 7), leitura(50, 6.5)]);
});

describe("Dashboard", () => {

  it("antes da resposta: valores vazios e status aguardando", () => {
    veiculo.escolherVeiculo.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(document.getElementById("temperatura")).toHaveTextContent("-- °C");
    expect(document.getElementById("statusCarga")).toHaveTextContent("AGUARDANDO");
    expect(screen.getByText("Carregando leituras…")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("null");
    expect(screen.getByTestId("risco-saida")).toBeInTheDocument();
    expect(screen.getByTestId("risco-rota")).toBeInTheDocument();
  });

  it("com leituras recentes: cards, veículo, carga, sinal e resumo do histórico", async () => {
    abrir();
    await waitFor(() => expect(document.getElementById("temperatura")).toHaveTextContent("7.3 °C"));
    expect(document.getElementById("tempStatus")).toHaveTextContent("Temperatura dentro da faixa da carga");
    expect(document.getElementById("umidade")).toHaveTextContent("70.5 %");
    expect(document.getElementById("rssi")).toHaveTextContent("-61 dBm");
    expect(document.getElementById("rssiStatus")).toHaveTextContent("Sinal bom");
    expect(document.getElementById("statusCarga")).toHaveTextContent("NORMAL");
    expect(document.getElementById("veiculoCodigo")).toHaveTextContent("VAN-01");
    expect(document.getElementById("veiculoSensor")).toHaveTextContent("esp32-01");
    expect(document.getElementById("veiculoCarga")).toHaveTextContent("Demonstrativo · normal");
    expect(document.getElementById("subtituloVeiculo")).toHaveTextContent("Van refrigerada • VAN-01");
    expect(document.getElementById("historico")).toHaveTextContent("3 leituras nos últimos 30 min");
    expect(document.getElementById("historico")).toHaveClass("com-grafico");
    expect(document.querySelector("#graficoTemperatura svg")).not.toBeNull();
    expect(screen.getByTestId("conexao")).toHaveTextContent("true");
    expect(document.getElementById("alerta")).toHaveClass("hidden");
    expect(document.getElementById("semDadosAviso")).toBeNull();
    expect(leituras.buscarLeituras).toHaveBeenCalledWith({ deviceId: "esp32-01", limite: 60 });
  });

  it("cartão herói: número grande, pílula com ícone, régua com marcador e sensor online", async () => {
    abrir();
    await waitFor(() => expect(document.getElementById("temperatura")).toHaveTextContent("7.3 °C"));
    expect(document.querySelector("#statusCarga svg")).not.toBeNull();
    expect(screen.getByText("Carga atual: Demonstrativo")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Régua de faixa de 0 a 25 °C, temperatura atual 7.3 °C/ })).toBeInTheDocument();
    expect(document.querySelector(".regua-marcador")).toHaveStyle({ left: "29.2%" });
    expect(screen.getByText("Segura: até 15 °C")).toBeInTheDocument();
    expect(screen.getByText("Atenção: 15 a 20 °C")).toBeInTheDocument();
    expect(screen.getByText("Crítica: acima de 20 °C")).toBeInTheDocument();
    expect(document.getElementById("contatoSensor")).toHaveTextContent(/^Online · último contato \d{2}:\d{2}$/);
  });

  it("leitura antiga: selo do sensor sem contato; antes da leitura, régua sem marcador", async () => {
    leituras.buscarLeituras.mockResolvedValue([leitura(600, 7)]);
    abrir();
    await waitFor(() => expect(document.getElementById("contatoSensor")).toHaveTextContent(/^Sem contato · último contato/));
    expect(document.getElementById("contatoSensor")).toHaveClass("selo-contato--offline");
  });

  it("perto da borda da régua o rótulo do valor encosta no limite", async () => {
    leituras.buscarLeituras.mockResolvedValue([leitura(10, 24.5, "CRITICO")]);
    const { unmount } = abrir();
    await waitFor(() => expect(document.querySelector(".regua-valor")).toHaveClass("regua-valor--fim"));
    unmount();
    leituras.buscarLeituras.mockResolvedValue([leitura(10, 1)]);
    abrir();
    await waitFor(() => expect(document.querySelector(".regua-valor")).toHaveClass("regua-valor--inicio"));
  });

  it("temperatura em atenção ou crítica: status e alerta aparecem", async () => {
    leituras.buscarLeituras.mockResolvedValue([leitura(10, 17.2, "ATENCAO")]);
    abrir();
    await waitFor(() => expect(document.getElementById("statusCarga")).toHaveTextContent("ATENÇÃO"));
    expect(document.getElementById("tempStatus")).toHaveTextContent("Temperatura em atenção");
    expect(document.getElementById("alerta")).not.toHaveClass("hidden");
  });

  it("leitura sem status e sem RSSI: classifica pela faixa e mostra sinal não informado", async () => {
    leituras.buscarLeituras.mockResolvedValue([{ ...leitura(10, 25), status: undefined, rssi: null }]);
    abrir();
    await waitFor(() => expect(document.getElementById("statusCarga")).toHaveTextContent("CRÍTICO"));
    expect(document.getElementById("rssi")).toHaveTextContent("--");
    expect(document.getElementById("rssiStatus")).toHaveTextContent("Sinal não informado");
  });

  it("última leitura com mais de 2 minutos: avisa que os valores não são os atuais", async () => {
    leituras.buscarLeituras.mockResolvedValue([leitura(600, 7)]);
    abrir();
    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent(/Sem dados desde \d{2}:\d{2}/);
    expect(aviso).toHaveTextContent("Os valores abaixo são os últimos recebidos, não os atuais.");
  });

  it("sensor que ainda não enviou nada: orienta e não é falha de conexão", async () => {
    leituras.buscarLeituras.mockResolvedValue([]);
    abrir();
    expect(await screen.findByText("O sensor esp32-01 ainda não enviou leituras.")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("true");
    expect(document.getElementById("temperatura")).toHaveTextContent("-- °C");
  });

  it("previsão em 10 min: variante painel com o sensor do veículo, e nada sem veículo", async () => {
    abrir();
    const previsao = await screen.findByTestId("previsao");
    expect(previsao).toHaveAttribute("data-device", VAN.deviceId);
    expect(previsao).toHaveAttribute("data-variante", "painel");
  });

  it("sem veículo cadastrado: orienta o cadastro", async () => {
    veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [], veiculo: null, perfil: undefined, faixa: FAIXA });
    abrir();
    expect(await screen.findByText("Nenhum veículo cadastrado.")).toBeInTheDocument();
    expect(document.getElementById("veiculoCodigo")).toHaveTextContent("--");
    expect(leituras.buscarLeituras).not.toHaveBeenCalled();
    expect(screen.queryByTestId("previsao")).toBeNull();
  });

  it("falha da API: histórico com erro, conexão falsa e aviso de falta de conexão", async () => {
    leituras.buscarLeituras.mockRejectedValue(new Error("HTTP 500"));
    abrir();
    expect(await screen.findByText("Não foi possível carregar a telemetria.")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("false");
    expect(screen.getByRole("status")).toHaveTextContent("Sem conexão com a API");
    expect(screen.getByRole("status")).toHaveTextContent("Não foi possível consultar as leituras agora.");
  });

  it("com dois veículos o seletor aparece e trocar guarda a escolha", async () => {
    veiculo.escolherVeiculo.mockResolvedValue({ veiculos: [VAN, BAU], veiculo: VAN, perfil: PERFIL, faixa: FAIXA });
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Veículo"), "BAU-02");
    expect(veiculo.lembrarVeiculo).toHaveBeenCalledWith("BAU-02");
  });

});
