// Sensores: tabela de situação, chave nova, registro sem cabo e o passo a passo do cabo USB (porta simulada).

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sensores from "./Sensores.jsx";

const sessao = vi.hoisted(() => ({ usuario: null }));
const api = vi.hoisted(() => ({ api: vi.fn() }));
const leituras = vi.hoisted(() => ({ buscarLeituras: vi.fn() }));
const usb = vi.hoisted(() => ({ disponivel: true, instancias: [], comportamento: {} }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../lib/leituras.js", async importarOriginal => ({
  ...(await importarOriginal()),
  buscarLeituras: leituras.buscarLeituras
}));

// A porta serial não existe no teste: o sensor USB é simulado e cada passo é controlado aqui.
vi.mock("./serial.js", () => ({
  serialDisponivel: () => usb.disponivel,
  SensorUsb: class {
    constructor() {
      usb.instancias.push(this);
      this.aoDesconectar = null;
      this.fechar = vi.fn().mockResolvedValue(undefined);
    }
    conectar() { return usb.comportamento.conectar(); }
    info() { return usb.comportamento.info(); }
    configurar(comando) { return usb.comportamento.configurar(comando); }
    redes() { return usb.comportamento.redes(); }
  }
}));

// A moldura (menu, assistente) tem teste próprio; aqui só o conteúdo da tela.
vi.mock("../../components/PainelLayout.jsx", () => ({
  default: ({ titulo, conexao, children }) => (
    <div>
      <h1>{titulo}</h1>
      <span data-testid="conexao">{String(conexao)}</span>
      {children}
    </div>
  )
}));

const GESTOR = { id: "g@e.com", nome: "Gina", perfil: "gestor" };
const OPERADOR = { id: "o@e.com", nome: "Otto", perfil: "operador" };

const agora = () => new Date().toISOString();

let dispositivos;
let veiculos;

function respostas(extra = {}) {
  api.api.mockImplementation(async (caminho, opcoes = {}) => {
    const chave = `${opcoes.metodo || "GET"} ${caminho}`;
    if (chave in extra) {
      const valor = extra[chave];
      if (valor instanceof Error) throw valor;
      return typeof valor === "function" ? valor(opcoes) : valor;
    }
    if (chave === "GET /dispositivos") return { dispositivos: structuredClone(dispositivos) };
    if (chave === "GET /veiculos") return { veiculos };
    throw new Error(`rota não simulada: ${chave}`);
  });
}

function abrir() {
  return render(<MemoryRouter><Sensores /></MemoryRouter>);
}

const linhas = () => within(document.querySelector("table.tabela tbody")).getAllByRole("row");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "alert").mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  sessao.usuario = GESTOR;
  usb.disponivel = true;
  usb.instancias.length = 0;
  usb.comportamento = {
    conectar: async () => {},
    info: async () => ({ id: "ESP32-ABC", fw: "1.2", configurado: false }),
    configurar: async () => ({ ok: true, rssi: -62 }),
    redes: async () => ({ ok: true, redes: [] })
  };
  dispositivos = [
    { id: "esp32-b", descricao: "Baú da van", online: true, ultimoContato: "2026-11-16T19:40:12+00:00" },
    { id: "esp32-a", descricao: "", online: false, ultimoContato: null }
  ];
  veiculos = [{ id: "VAN-01", deviceId: "esp32-b" }];
  leituras.buscarLeituras.mockImplementation(async ({ deviceId }) =>
    (deviceId === "esp32-b" ? [{ temperatura: 6.5, rssi: -58, status: "NORMAL", medidoEm: agora() }] : []));
  respostas();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Sensores - tabela", () => {

  it("mostra Carregando e depois um sensor por linha, em ordem de ID", async () => {
    abrir();
    expect(screen.getByText("Carregando sensores…")).toBeInTheDocument();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    expect(linhas()[0]).toHaveTextContent("esp32-a");
    expect(linhas()[1]).toHaveTextContent("esp32-b");
    expect(screen.getByTestId("conexao")).toHaveTextContent("true");
  });

  it("linha do sensor: veículo, selo Online, último contato, sinal e temperatura", async () => {
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    const b = linhas()[1];
    expect(b).toHaveTextContent("Baú da van");
    expect(b).toHaveTextContent("VAN-01");
    expect(b.querySelector('[data-conexao="online"]')).toHaveTextContent("Online");
    expect(b.querySelector("[data-ultimo-contato]")).toHaveTextContent(/^Último contato: \d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(b).toHaveTextContent("Excelente (-58 dBm)");
    expect(b).toHaveTextContent("6.5 °C");
    const a = linhas()[0];
    expect(a.querySelector('[data-conexao="offline"]')).toHaveTextContent("Offline");
    expect(a.querySelector("[data-ultimo-contato]")).toHaveTextContent("Sem contato");
    expect(a).toHaveTextContent("nenhum");
    expect(a).toHaveTextContent("--");
  });

  it("API antiga sem o campo online: calcula a situação pela última leitura", async () => {
    dispositivos = [
      { id: "esp32-a", descricao: "" },
      { id: "esp32-b", descricao: "Baú" }
    ];
    leituras.buscarLeituras.mockImplementation(async ({ deviceId }) =>
      (deviceId === "esp32-b" ? [{ temperatura: 6, rssi: -80, status: "NORMAL", medidoEm: new Date(Date.now() - 1000).toISOString() }] : []));
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    expect(linhas()[0]).toHaveTextContent("NUNCA ENVIOU");
    expect(linhas()[1]).toHaveTextContent("ONLINE");
    expect(linhas()[1]).toHaveTextContent(/último envio/);
  });

  it("falha da API na primeira carga: erro do Azure e conexão falsa", async () => {
    respostas({ "GET /dispositivos": new Error("HTTP 500") });
    abrir();
    expect(await screen.findByText("Não foi possível falar com o Azure.")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("false");
  });

  it("sem sensores: orientação do gestor e do operador; a ajuda abre sozinha", async () => {
    dispositivos = [];
    const { unmount } = abrir();
    expect(await screen.findByText(/Ligue o sensor no cabo USB e use/)).toBeInTheDocument();
    expect(document.getElementById("ajuda")).toHaveAttribute("open");
    unmount();
    sessao.usuario = OPERADOR;
    abrir();
    expect(await screen.findByText("Peça ao gestor para conectar os sensores.")).toBeInTheDocument();
  });

  it("operador não vê o painel do cabo, as ações da tabela nem o registro sem cabo", async () => {
    sessao.usuario = OPERADOR;
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    expect(document.getElementById("painelCabo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover" })).not.toBeInTheDocument();
    expect(document.getElementById("formSensor")).toBeNull();
  });

});

describe("Sensores - ações do gestor", () => {

  it("gerar nova chave: confirma, mostra a chave uma vez com o trecho do secrets.h e fecha", async () => {
    respostas({ "PUT /dispositivos/esp32-b": { chave: "segredo-123" } });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    const botao = document.querySelector('[data-nova-chave="esp32-b"]');
    await userEvent.click(botao);
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Chave do sensor/)).not.toBeInTheDocument();
    await userEvent.click(botao);
    expect(await screen.findByText("Chave do sensor esp32-b")).toBeInTheDocument();
    expect(document.querySelector("pre.trecho-codigo").textContent).toBe('#define DEVICE_ID  "esp32-b"\n#define DEVICE_KEY "segredo-123"');
    await userEvent.click(document.getElementById("fecharChave"));
    expect(screen.queryByText(/Chave do sensor/)).not.toBeInTheDocument();
  });

  it("falha ao gerar a chave: avisa com alert", async () => {
    respostas({ "PUT /dispositivos/esp32-b": new Error("sem permissão") });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await userEvent.click(document.querySelector('[data-nova-chave="esp32-b"]'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("sem permissão"));
  });

  it("Copiar usa a área de transferência; sem permissão pede para copiar à mão", async () => {
    respostas({ "PUT /dispositivos/esp32-b": { chave: "k" } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await userEvent.click(document.querySelector('[data-nova-chave="esp32-b"]'));
    await userEvent.click(await screen.findByRole("button", { name: "Copiar" }));
    expect(escrever).toHaveBeenCalledWith('#define DEVICE_ID  "esp32-b"\n#define DEVICE_KEY "k"');
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();

    escrever.mockRejectedValue(new Error("negado"));
    await userEvent.click(document.querySelector('[data-nova-chave="esp32-b"]'));
    await userEvent.click(await screen.findByRole("button", { name: "Copiar" }));
    expect(await screen.findByRole("button", { name: "Selecione e copie o texto acima" })).toBeInTheDocument();
  });

  it("remover: confirma e envia DELETE; falha avisa com alert", async () => {
    const apagados = [];
    respostas({ "DELETE /dispositivos/esp32-a": () => { apagados.push("esp32-a"); return {}; } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await userEvent.click(document.querySelector('[data-remover="esp32-a"]'));
    await waitFor(() => expect(apagados).toEqual(["esp32-a"]));

    respostas({ "DELETE /dispositivos/esp32-b": new Error("em uso") });
    await userEvent.click(document.querySelector('[data-remover="esp32-b"]'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("em uso"));
  });

  it("registrar sem cabo: POST com id e descrição, mostra a chave e limpa o formulário", async () => {
    const enviados = [];
    respostas({ "POST /dispositivos": opcoes => { enviados.push(opcoes.corpo); return { id: "wokwi-01", chave: "abc" }; } });
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    const form = document.getElementById("formSensor");
    await userEvent.type(form.elements.id, "wokwi-01");
    await userEvent.type(form.elements.descricao, "Simulador");
    fireEvent.submit(form);
    await waitFor(() => expect(enviados).toEqual([{ id: "wokwi-01", descricao: "Simulador" }]));
    expect(await screen.findByText("Chave do sensor wokwi-01")).toBeInTheDocument();
    expect(form.elements.id).toHaveValue("");
  });

  it("registrar sem cabo com erro da API: mostra a mensagem", async () => {
    respostas({ "POST /dispositivos": Object.assign(new Error("id já existe"), { status: 409 }) });
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    fireEvent.submit(document.getElementById("formSensor"));
    expect(await screen.findByText("id já existe")).toBeInTheDocument();
  });

});

describe("Sensores - conectar pelo cabo", () => {

  async function ate(etapa) {
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: "Conectar sensor pelo cabo" }));
    if (etapa === "formulario") {
      await screen.findByText("SENSOR RECONHECIDO");
    }
  }

  it("navegador sem Web Serial: explica e indica o registro sem cabo", async () => {
    usb.disponivel = false;
    abrir();
    await waitFor(() => expect(document.getElementById("painelCabo")).toHaveTextContent("Este navegador não conversa com o cabo USB"));
    expect(document.getElementById("painelCabo")).toHaveTextContent("use “Registrar sem cabo”");
    expect(screen.queryByRole("button", { name: "Conectar sensor pelo cabo" })).not.toBeInTheDocument();
  });

  it("fechar a janela de escolha da porta não é erro", async () => {
    usb.comportamento.conectar = async () => { throw Object.assign(new Error("cancelado"), { name: "NotFoundError" }); };
    await ate("inicio");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar sensor pelo cabo" })).toBeInTheDocument();
  });

  it("porta ocupada: mostra o motivo e o link de ajuda abre a seção certa", async () => {
    usb.comportamento.conectar = async () => { throw new Error("Port busy"); };
    await ate("inicio");
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível abrir a porta (Port busy)");
    await userEvent.click(within(alerta).getByRole("link", { name: "Ver ajuda" }));
    expect(document.getElementById("ajuda")).toHaveAttribute("open");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("sensor que não responde: fecha a porta e avisa", async () => {
    usb.comportamento.info = async () => null;
    await ate("inicio");
    expect(await screen.findByText(/O sensor não respondeu em 20 s\. Confira se ele está com o firmware/)).toBeInTheDocument();
    expect(usb.instancias[0].fechar).toHaveBeenCalled();
  });

  it("sensor novo: pede descrição e rede; sem nome de rede e senha curta são recusados", async () => {
    await ate("formulario");
    expect(screen.getByText("Sensor novo: ele será registrado na sua empresa com este ID.")).toBeInTheDocument();
    const form = document.getElementById("formCabo");
    fireEvent.submit(form);
    expect(await screen.findByText("Informe o nome da rede Wi-Fi.")).toBeInTheDocument();
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Hotspot");
    await userEvent.type(document.getElementById("formCabo").elements.senha, "123");
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText(/Senha de Wi-Fi tem pelo menos 8 caracteres/)).toBeInTheDocument();
    // O nome da rede digitado volta preenchido.
    expect(document.getElementById("formCabo").elements.ssid).toHaveValue("Hotspot");
  });

  it("mostrar senha troca o tipo do campo; Cancelar volta ao início e fecha a porta", async () => {
    await ate("formulario");
    const senha = document.getElementById("formCabo").elements.senha;
    expect(senha).toHaveAttribute("type", "password");
    await userEvent.click(document.getElementById("mostrarSenha"));
    expect(document.getElementById("formCabo").elements.senha).toHaveAttribute("type", "text");
    await userEvent.click(document.getElementById("cancelarCabo"));
    expect(screen.getByRole("button", { name: "Conectar sensor pelo cabo" })).toBeInTheDocument();
    expect(usb.instancias[0].fechar).toHaveBeenCalled();
  });

  it("senha da rede errada: mostra a mensagem da placa e mantém a chave para a nova tentativa", async () => {
    const posts = [];
    respostas({ "POST /dispositivos": opcoes => { posts.push(opcoes.corpo); return { chave: "chave-1" }; } });
    const comandos = [];
    usb.comportamento.configurar = async comando => {
      comandos.push(comando);
      return comandos.length === 1 ? { ok: false, erro: "senha" } : { ok: false, erro: "tempo" };
    };
    await ate("formulario");
    await userEvent.type(document.getElementById("formCabo").elements.descricao, "Baú novo");
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Hotspot");
    await userEvent.type(document.getElementById("formCabo").elements.senha, "senha-errada");
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText("Senha errada para a rede “Hotspot”. Confira maiúsculas e minúsculas e tente de novo.")).toBeInTheDocument();
    expect(posts).toEqual([{ id: "esp32-abc", descricao: "Baú novo" }]);
    expect(comandos[0]).toEqual({ cmd: "config", ssid: "Hotspot", senha: "senha-errada", id: "esp32-abc", chave: "chave-1" });

    // Segunda tentativa: não registra de novo, reaproveita a chave.
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText(/não conseguiu entrar na rede “Hotspot” a tempo/)).toBeInTheDocument();
    expect(posts).toHaveLength(1);
    expect(comandos[1].chave).toBe("chave-1");
  });

  it("erro detalhado da placa: código novo com sinal, canal e motivo; ajuda abre o item certo", async () => {
    respostas({ "POST /dispositivos": { chave: "k" } });
    usb.comportamento.configurar = async () => ({ ok: false, erro: "rede_corporativa", motivo: 0, rssi: -67, canal: 1, seguranca: "enterprise" });
    await ate("formulario");
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Senac-Campus");
    fireEvent.submit(document.getElementById("formCabo"));
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("A rede “Senac-Campus” pede login com usuário");
    expect(alerta).toHaveTextContent("Sinal no sensor: Bom (-67 dBm), canal 1.");
    expect(alerta).not.toHaveTextContent("motivo");
    await userEvent.click(within(alerta).getByRole("link", { name: "Ver ajuda" }));
    expect(document.getElementById("ajuda")).toHaveAttribute("open");
    expect(document.getElementById("ajuda-corporativa")).toBeInTheDocument();
  });

  it("ver redes que o sensor enxerga: lista, marca a não suportada e preenche o nome ao escolher", async () => {
    usb.comportamento.redes = async () => ({
      ok: true,
      redes: [
        { ssid: "Hotspot do Joao", rssi: -48, canal: 6, seguranca: "wpa2" },
        { ssid: "Campus-Login", rssi: -71, canal: 11, seguranca: "enterprise" }
      ]
    });
    await ate("formulario");
    await userEvent.click(screen.getByRole("button", { name: "Ver redes que o sensor enxerga" }));
    await waitFor(() => expect(document.getElementById("tabelaRedes")).toBeInTheDocument());
    const linhasRedes = within(document.getElementById("tabelaRedes").querySelector("tbody")).getAllByRole("row");
    expect(linhasRedes).toHaveLength(2);
    expect(linhasRedes[0]).toHaveTextContent("Hotspot do Joao");
    expect(linhasRedes[0]).toHaveTextContent("Excelente (-48 dBm)");
    expect(linhasRedes[0]).toHaveTextContent("WPA2");
    expect(linhasRedes[1]).toHaveTextContent("Login (Enterprise): não suportada");
    expect(within(linhasRedes[1]).queryByRole("button")).not.toBeInTheDocument();
    await userEvent.click(within(linhasRedes[0]).getByRole("button", { name: "Usar esta rede" }));
    expect(document.getElementById("formCabo").elements.ssid).toHaveValue("Hotspot do Joao");
    expect(document.getElementById("formCabo").elements.senha).toHaveFocus();
  });

  it("ver redes: lista vazia, firmware antigo e sensor mudo", async () => {
    await ate("formulario");
    const botao = screen.getByRole("button", { name: "Ver redes que o sensor enxerga" });
    await userEvent.click(botao);
    expect(await screen.findByText(/não enxergou nenhuma rede de 2\.4 GHz/)).toBeInTheDocument();
    usb.comportamento.redes = async () => ({ ok: false, erro: "comando_desconhecido" });
    await userEvent.click(botao);
    expect(await screen.findByText(/firmware antigo, que não lista redes/)).toBeInTheDocument();
    usb.comportamento.redes = async () => null;
    await userEvent.click(botao);
    expect(await screen.findByText(/não respondeu à busca de redes/)).toBeInTheDocument();
    usb.comportamento.redes = async () => ({ ok: false, erro: "scan_falhou" });
    await userEvent.click(botao);
    expect(await screen.findByText(/não conseguiu procurar redes \(scan_falhou\)/)).toBeInTheDocument();
  });

  it("sensor registrado em outra empresa (409) e falha genérica de registro", async () => {
    respostas({ "POST /dispositivos": Object.assign(new Error("conflito"), { status: 409 }) });
    await ate("formulario");
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Hotspot");
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText(/está registrado em outra empresa/)).toBeInTheDocument();
    respostas({ "POST /dispositivos": new Error("HTTP 500") });
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText("Não foi possível registrar o sensor: HTTP 500")).toBeInTheDocument();
  });

  it("placa que some no meio da configuração: pede para conferir o cabo", async () => {
    respostas({ "POST /dispositivos": { chave: "k" } });
    usb.comportamento.configurar = async () => null;
    await ate("formulario");
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Hotspot");
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText(/Confira se o cabo continua ligado/)).toBeInTheDocument();
  });

  it("sensor já da empresa e configurado: só pede a rede nova (PUT não é chamado)", async () => {
    usb.comportamento.info = async () => ({ id: "ESP32-B", fw: "1.2", configurado: true, ssid: "Casa" });
    const comandos = [];
    usb.comportamento.configurar = async comando => { comandos.push(comando); return { ok: true, rssi: -70 }; };
    await ate("formulario");
    expect(screen.getByText("Este sensor já é da sua empresa e continua com a mesma chave. Informe só a rede nova.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar rede" })).toBeInTheDocument();
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Celular");
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText(/Aguardando a primeira leitura chegar no Azure/)).toBeInTheDocument();
    expect(comandos).toEqual([{ cmd: "wifi", ssid: "Celular", senha: "" }]);
    expect(api.api.mock.calls.some(([, o]) => o?.metodo === "PUT")).toBe(false);
  });

  it("rede aceita e primeira leitura chega: fica ONLINE com a temperatura recebida", async () => {
    respostas({ "POST /dispositivos": { chave: "k" } });
    await ate("formulario");
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Hotspot");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    leituras.buscarLeituras.mockImplementation(async ({ deviceId }) =>
      (deviceId === "esp32-abc"
        ? [{ temperatura: 8.5, status: "NORMAL", medidoEm: agora(), recebidoEm: new Date(Date.now() + 1000).toISOString() }]
        : []));
    fireEvent.submit(document.getElementById("formCabo"));
    expect(await screen.findByText(/Aguardando a primeira leitura chegar no Azure/)).toBeInTheDocument();
    expect(document.getElementById("painelCabo")).toHaveTextContent("na rede “Hotspot” · sinal Bom (-62 dBm)");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5500);
    });
    await waitFor(() => expect(document.getElementById("painelCabo")).toHaveTextContent("ONLINE"));
    expect(document.getElementById("painelCabo")).toHaveTextContent("enviando: 8.5 °C");
    expect(screen.getByRole("button", { name: "Conectar outro sensor" })).toBeInTheDocument();
    expect(usb.instancias[0].fechar).toHaveBeenCalled();
  });

  it("nenhuma leitura em 2 minutos: avisa e oferece ajuda", async () => {
    respostas({ "POST /dispositivos": { chave: "k" } });
    leituras.buscarLeituras.mockResolvedValue([]);
    await ate("formulario");
    await userEvent.type(document.getElementById("formCabo").elements.ssid, "Hotspot");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.submit(document.getElementById("formCabo"));
    await screen.findByText(/Aguardando a primeira leitura/);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(125000);
    });
    await waitFor(() => expect(document.getElementById("esperaLeitura")).toHaveTextContent("nenhuma leitura chegou em 2 min"));
  });

  it("cabo desconectado durante o uso: volta ao início com o aviso", async () => {
    await ate("formulario");
    act(() => {
      usb.instancias[0].aoDesconectar();
    });
    expect(await screen.findByText(/O cabo foi desconectado/)).toBeInTheDocument();
  });

});

describe("Sensores - sensor em falha (#52)", () => {

  const desde = new Date();
  desde.setHours(11, 2, 20, 0);

  it("placa viva com sensor em falha: texto com a hora, continua Online e a última leitura fica marcada como antiga", async () => {
    dispositivos[0] = { ...dispositivos[0], sensor: "falha", sensorFalhaDesde: desde.toISOString() };
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    const b = linhas()[1];
    expect(b).toHaveClass("sensor-falha");
    expect(b.querySelector("[data-sensor-falha]")).toHaveTextContent("Sensor em falha desde 11:02");
    expect(b.querySelector('[data-conexao="online"]')).toHaveTextContent("Online");
    expect(b.querySelector('[data-conexao="offline"]')).toBeNull();
    expect(b.querySelector(".sensor-temp")).toHaveClass("antiga");
    expect(b.querySelector(".sensor-temp")).toHaveTextContent(/^6\.5 °Cúltima válida, de \d{2}:\d{2}$/);
    expect(linhas()[0].querySelector("[data-sensor-falha]")).toBeNull();
  });

  it("sensor volta (sensor ok) ou placa offline: a falha some", async () => {
    dispositivos[0] = { ...dispositivos[0], sensor: "ok", sensorFalhaDesde: null };
    dispositivos[1] = { ...dispositivos[1], sensor: "falha", sensorFalhaDesde: desde.toISOString() };
    abrir();
    await waitFor(() => expect(linhas()).toHaveLength(2));
    expect(document.querySelector("[data-sensor-falha]")).toBeNull();
    expect(linhas()[0].querySelector('[data-conexao="offline"]')).toHaveTextContent("Offline");
    expect(linhas()[1].querySelector(".sensor-temp")).not.toHaveClass("antiga");
  });

});
