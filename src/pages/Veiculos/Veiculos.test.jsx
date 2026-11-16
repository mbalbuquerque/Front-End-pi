// Veículos: cards da frota, situação por leitura recente, cadastro e remoção (gestor), etiqueta QR.

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Veiculos from "./Veiculos.jsx";

const sessao = vi.hoisted(() => ({ usuario: null }));
const api = vi.hoisted(() => ({ api: vi.fn() }));
const faixas = vi.hoisted(() => ({ carregarPerfis: vi.fn() }));
const leituras = vi.hoisted(() => ({ buscarLeituras: vi.fn() }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../lib/faixas.js", async importarOriginal => ({
  ...(await importarOriginal()),
  carregarPerfis: faixas.carregarPerfis
}));
vi.mock("../../lib/leituras.js", async importarOriginal => ({
  ...(await importarOriginal()),
  buscarLeituras: leituras.buscarLeituras
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

const GESTOR = { id: "g@e.com", nome: "Gina", perfil: "gestor" };
const OPERADOR = { id: "o@e.com", nome: "Otto", perfil: "operador" };

const PERFIS = [
  { id: "demonstrativo", nome: "Demonstrativo", min: null, max: 15, margem: 5 },
  { id: "uva", nome: "Uva", min: 0, max: 2, margem: 1 }
];

const VEICULOS = [
  { id: "VAN-01", deviceId: "esp32-01", perfil: "demonstrativo", tipo: "Van refrigerada", dispositivo: "ESP32-C3" },
  { id: "BAU-02", deviceId: "esp32-02", perfil: "uva", tipo: "Baú" },
  { id: "BAU-03", deviceId: "esp32-03", perfil: "extinto", tipo: "Baú velho" }
];

const leitura = (segundosAtras, temperatura, status) => ({
  temperatura,
  umidade: 71,
  status,
  medidoEm: new Date(Date.now() - segundosAtras * 1000).toISOString()
});

let veiculos;
let dispositivos;

function respostas(extra = {}) {
  api.api.mockImplementation(async (caminho, opcoes = {}) => {
    const chave = `${opcoes.metodo || "GET"} ${caminho}`;
    if (chave in extra) {
      const valor = extra[chave];
      if (valor instanceof Error) throw valor;
      return typeof valor === "function" ? valor(opcoes) : valor;
    }
    if (chave === "GET /veiculos") return { veiculos };
    if (chave === "GET /dispositivos") return { dispositivos };
    throw new Error(`rota não simulada: ${chave}`);
  });
}

function abrir() {
  return renderizarNaRota(<Veiculos />, "/veiculos", ["/dashboard", "/sensores"]);
}

const cartao = id => screen.getByRole("heading", { name: id }).closest("article");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "alert").mockImplementation(() => {});
  sessao.usuario = GESTOR;
  veiculos = VEICULOS;
  dispositivos = [{ id: "esp32-01" }, { id: "esp32-02" }, { id: "esp32-03" }, { id: "esp32-livre-b" }, { id: "esp32-livre-a" }];
  faixas.carregarPerfis.mockResolvedValue(PERFIS);
  leituras.buscarLeituras.mockImplementation(async ({ deviceId }) => ({
    "esp32-01": [leitura(10, 6.4, "NORMAL")],
    "esp32-02": [leitura(3 * 3600, 5, "CRITICO")],
    "esp32-03": []
  })[deviceId]);
  respostas();
});

describe("Veiculos", () => {

  it("mostra Carregando e depois um card por veículo", async () => {
    abrir();
    expect(screen.getByText("Carregando leituras…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "VAN-01" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(screen.getByTestId("conexao")).toHaveTextContent("true");
  });

  it("veículo com leitura recente: temperatura, umidade, status e perfil", async () => {
    abrir();
    await screen.findByRole("heading", { name: "VAN-01" });
    const van = cartao("VAN-01");
    expect(van).toHaveTextContent("6.4 °C");
    expect(van).toHaveTextContent("71.0 %");
    expect(van).toHaveTextContent("NORMAL");
    expect(van).toHaveTextContent("Demonstrativo");
    expect(van).toHaveTextContent("ESP32-C3");
    expect(within(van).getByRole("link", { name: "Ver no painel" })).toHaveAttribute("href", "/dashboard?veiculo=VAN-01");
  });

  it("leitura antiga vira SEM SINAL e informa há quanto tempo; sem leitura nunca enviou dados", async () => {
    abrir();
    await screen.findByRole("heading", { name: "BAU-02" });
    expect(cartao("BAU-02")).toHaveTextContent("SEM SINAL");
    expect(cartao("BAU-02")).toHaveTextContent("sem sinal há 3 h");
    expect(cartao("BAU-03")).toHaveTextContent("nunca enviou dados");
    expect(cartao("BAU-03")).toHaveTextContent("SEM DADOS");
    // Perfil que já não existe na lista: mostra o código dele.
    expect(cartao("BAU-03")).toHaveTextContent("extinto");
  });

  it("falha da API: erro do Azure e conexão marcada como falha", async () => {
    respostas({ "GET /veiculos": new Error("HTTP 500") });
    abrir();
    expect(await screen.findByText("Não foi possível falar com o Azure.")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("false");
  });

  it("sem veículos: orientação do gestor e do operador", async () => {
    veiculos = [];
    const { unmount } = abrir();
    expect(await screen.findByText("Cadastre o primeiro veículo acima.")).toBeInTheDocument();
    unmount();
    sessao.usuario = OPERADOR;
    abrir();
    expect(await screen.findByText("Peça ao gestor para cadastrar a frota.")).toBeInTheDocument();
  });

  it("operador não vê o formulário nem o botão de remover", async () => {
    sessao.usuario = OPERADOR;
    abrir();
    await screen.findByRole("heading", { name: "VAN-01" });
    expect(document.getElementById("painelNovo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover veículo" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Etiqueta QR" })).toHaveLength(3);
  });

  it("formulário só oferece os sensores livres, em ordem alfabética", async () => {
    abrir();
    await screen.findByRole("heading", { name: "VAN-01" });
    const opcoes = within(document.getElementById("formVeiculo").elements.deviceId).getAllByRole("option");
    expect(opcoes.map(o => o.value)).toEqual(["esp32-livre-a", "esp32-livre-b"]);
    const perfis = within(document.getElementById("formVeiculo").elements.perfil).getAllByRole("option");
    expect(perfis[1]).toHaveTextContent("Uva (normal de 0 a 2 °C)");
  });

  it("sem sensor livre: manda registrar o sensor antes", async () => {
    dispositivos = [{ id: "esp32-01" }, { id: "esp32-02" }, { id: "esp32-03" }];
    abrir();
    expect(await screen.findByText("Nenhum sensor livre para um veículo novo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sensores" })).toHaveAttribute("href", "/sensores");
  });

  it("cadastrar veículo: POST com os campos e a lista é recarregada", async () => {
    const enviados = [];
    respostas({ "POST /veiculos": opcoes => { enviados.push(opcoes.corpo); return {}; } });
    abrir();
    await screen.findByRole("heading", { name: "VAN-01" });
    const form = document.getElementById("formVeiculo");
    await userEvent.type(form.elements.id, "CT-09");
    await userEvent.type(form.elements.tipo, "Truck");
    fireEvent.submit(form);
    await waitFor(() => expect(enviados).toHaveLength(1));
    expect(enviados[0]).toMatchObject({ id: "CT-09", tipo: "Truck", deviceId: "esp32-livre-a", perfil: "demonstrativo" });
    await waitFor(() => expect(api.api.mock.calls.filter(([c, o]) => c === "/veiculos" && !o).length).toBeGreaterThan(1));
  });

  it("erro no cadastro: mostra a mensagem da API", async () => {
    respostas({ "POST /veiculos": new Error("código já existe") });
    abrir();
    await screen.findByRole("heading", { name: "VAN-01" });
    fireEvent.submit(document.getElementById("formVeiculo"));
    expect(await screen.findByRole("alert")).toHaveTextContent("código já existe");
  });

  it("remover: pede confirmação, envia DELETE; falha avisa com alert", async () => {
    const apagados = [];
    respostas({ "DELETE /veiculos/VAN-01": () => { apagados.push("VAN-01"); return {}; } });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    abrir();
    await screen.findByRole("heading", { name: "VAN-01" });
    const botao = within(cartao("VAN-01")).getByRole("button", { name: "Remover veículo" });
    await userEvent.click(botao);
    expect(confirmar).toHaveBeenCalledWith("Remover o veículo VAN-01? As leituras do sensor continuam guardadas.");
    expect(apagados).toHaveLength(0);
    await userEvent.click(botao);
    await waitFor(() => expect(apagados).toEqual(["VAN-01"]));

    respostas({ "DELETE /veiculos/BAU-02": new Error("em uso") });
    await userEvent.click(within(cartao("BAU-02")).getByRole("button", { name: "Remover veículo" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("em uso"));
  });

  it("Etiqueta QR abre o diálogo com o código e o QR; Fechar encerra", async () => {
    abrir();
    await screen.findByRole("heading", { name: "VAN-01" });
    await userEvent.click(within(cartao("VAN-01")).getByRole("button", { name: "Etiqueta QR" }));
    const dialogo = document.getElementById("etiqueta");
    expect(dialogo).toHaveAttribute("open");
    expect(within(dialogo).getByText("VAN-01")).toBeInTheDocument();
    expect(dialogo.querySelector("svg path").getAttribute("d").length).toBeGreaterThan(100);
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    await userEvent.click(document.getElementById("imprimirEtiqueta"));
    expect(imprimir).toHaveBeenCalledTimes(1);
    await userEvent.click(document.getElementById("fecharEtiqueta"));
    await waitFor(() => expect(document.getElementById("etiqueta")).toBeNull());
  });

});
