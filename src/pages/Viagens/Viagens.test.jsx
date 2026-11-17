// Viagens: lista com condição da carga, formulário do gestor, encerrar e remover. API simulada.

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Viagens from "./Viagens.jsx";

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

const PERFIS = [{ id: "demonstrativo", nome: "Demonstrativo", min: null, max: 15, margem: 5 }];
const VEICULOS = [{ id: "VAN-01", deviceId: "esp32-01", perfil: "demonstrativo", tipo: "Van refrigerada" }];

const HORA = 3600 * 1000;
const antes = ms => new Date(Date.now() - ms).toISOString();

const EM_ANDAMENTO = { id: "VIA-02", veiculo: "VAN-01", origem: "Petrolina/PE", destino: "Suape/PE", carga: "Manga", inicio: antes(3 * HORA), fim: null };
const CONCLUIDA = { id: "VIA-01", veiculo: "VAN-01", origem: "Juazeiro/BA", destino: "Salvador/BA", carga: "Uva", inicio: antes(30 * HORA), fim: antes(20 * HORA) };

// Leituras: 8 °C normais e um trecho de 17 °C (atenção) de 3 envios seguidos.
function leiturasDe(viagem) {
  const inicio = new Date(viagem.inicio).getTime();
  return [0, 1, 2, 3, 4].map(i => ({
    temperatura: i >= 1 && i <= 3 ? 17 : 8,
    umidade: 70,
    status: i >= 1 && i <= 3 ? "ATENCAO" : "NORMAL",
    medidoEm: new Date(inicio + (i + 1) * 20000).toISOString()
  })).reverse();
}

let viagens;

function respostas(extra = {}) {
  api.api.mockImplementation(async (caminho, opcoes = {}) => {
    const chave = `${opcoes.metodo || "GET"} ${caminho}`;
    if (chave in extra) {
      const valor = extra[chave];
      if (valor instanceof Error) throw valor;
      return typeof valor === "function" ? valor(opcoes) : valor;
    }
    if (chave === "GET /viagens") return { viagens };
    if (chave === "GET /veiculos") return { veiculos: VEICULOS };
    throw new Error(`rota não simulada: ${chave}`);
  });
}

function abrir() {
  return renderizarNaRota(<Viagens />, "/viagens");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "alert").mockImplementation(() => {});
  sessao.usuario = GESTOR;
  viagens = [CONCLUIDA, EM_ANDAMENTO];
  faixas.carregarPerfis.mockResolvedValue(PERFIS);
  leituras.buscarLeituras.mockImplementation(async ({ deviceId }) => (deviceId ? leiturasDe(EM_ANDAMENTO) : []));
  respostas();
});

describe("Viagens", () => {

  it("mostra Carregando antes da resposta", () => {
    api.api.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando leituras…")).toBeInTheDocument();
  });

  it("falha da API: erro do Azure e conexão marcada como falha", async () => {
    respostas({ "GET /viagens": new Error("HTTP 500") });
    abrir();
    expect(await screen.findByText("Não foi possível falar com o Azure.")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("false");
  });

  it("lista a viagem em andamento primeiro e a concluída depois, com a condição da carga", async () => {
    abrir();
    const titulos = await screen.findAllByRole("heading", { level: 2, name: /VIA-/ });
    expect(titulos.map(t => t.textContent)).toEqual(["VIA-02 · VAN-01", "VIA-01 · VAN-01"]);
    const paineis = document.querySelectorAll("article.panel");
    expect(within(paineis[0]).getByText("EM ANDAMENTO")).toBeInTheDocument();
    expect(within(paineis[0]).getByText("Em viagem há")).toBeInTheDocument();
    expect(paineis[0]).toHaveTextContent("8.0 °C a 17.0 °C");
    expect(paineis[0]).toHaveTextContent("em 1 ocorrência");
    expect(within(paineis[1]).getByText("CONCLUÍDA")).toBeInTheDocument();
    expect(within(paineis[1]).getByText("Duração")).toBeInTheDocument();
    expect(screen.getByText("PLANEJADO")).toBeInTheDocument();
    expect(screen.getByTestId("conexao")).toHaveTextContent("true");
  });

  it("viagem sem leitura no período: faixa registrada '--' e tempo fora 'nenhum'", async () => {
    leituras.buscarLeituras.mockResolvedValue([]);
    viagens = [EM_ANDAMENTO];
    abrir();
    await screen.findByText("VIA-02 · VAN-01");
    const painel = document.querySelector("article.panel");
    expect(painel).toHaveTextContent("Faixa registrada--");
    expect(painel).toHaveTextContent("Tempo fora da faixanenhum");
  });

  it("veículo da viagem não existe mais: avisa em vez de desenhar gráfico", async () => {
    viagens = [{ ...EM_ANDAMENTO, veiculo: "SUMIU-9" }];
    abrir();
    expect(await screen.findByText("O veículo SUMIU-9 não está mais cadastrado.")).toBeInTheDocument();
    expect(leituras.buscarLeituras).not.toHaveBeenCalled();
  });

  it("sem viagens: orientação diferente para gestor e para operador", async () => {
    viagens = [];
    const { unmount } = abrir();
    expect(await screen.findByText("Registre a primeira viagem acima.")).toBeInTheDocument();
    unmount();
    sessao.usuario = OPERADOR;
    abrir();
    expect(await screen.findByText("Peça ao gestor para registrar as viagens.")).toBeInTheDocument();
  });

  it("operador não vê o formulário nem os botões de encerrar e remover", async () => {
    sessao.usuario = OPERADOR;
    abrir();
    await screen.findByText("VIA-02 · VAN-01");
    expect(document.getElementById("painelNovo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Encerrar viagem" })).not.toBeInTheDocument();
  });

  it("gestor registra viagem: manda os campos e o início em ISO", async () => {
    const enviados = [];
    respostas({ "POST /viagens": opcoes => { enviados.push(opcoes.corpo); return {}; } });
    abrir();
    await screen.findByText("VIA-02 · VAN-01");
    const form = document.getElementById("formViagem");
    await userEvent.type(form.elements.origem, "Recife/PE");
    await userEvent.type(form.elements.destino, "Natal/RN");
    await userEvent.type(form.elements.carga, "Melão");
    fireEvent.change(form.elements.inicio, { target: { value: "2026-11-16T08:30" } });
    fireEvent.submit(form);
    await waitFor(() => expect(enviados).toHaveLength(1));
    expect(enviados[0]).toMatchObject({ veiculo: "VAN-01", origem: "Recife/PE", destino: "Natal/RN", carga: "Melão" });
    expect(enviados[0].inicio).toBe(new Date("2026-11-16T08:30").toISOString());
    // Depois de salvar a lista é recarregada.
    await waitFor(() => expect(api.api.mock.calls.filter(([c, o]) => c === "/viagens" && !o).length).toBeGreaterThan(1));
  });

  it("erro ao registrar: mostra a mensagem da API no formulário", async () => {
    respostas({ "POST /viagens": new Error("origem obrigatória") });
    abrir();
    await screen.findByText("VIA-02 · VAN-01");
    fireEvent.submit(document.getElementById("formViagem"));
    expect(await screen.findByRole("alert")).toHaveTextContent("origem obrigatória");
  });

  it("encerrar viagem: confirma e envia PUT com o fim; recusar não envia", async () => {
    const puts = [];
    respostas({ "PUT /viagens/VIA-02": opcoes => { puts.push(opcoes.corpo); return {}; } });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    abrir();
    const botao = await screen.findByRole("button", { name: "Encerrar viagem" });
    await userEvent.click(botao);
    await waitFor(() => expect(confirmar).toHaveBeenCalledWith("Encerrar a viagem VIA-02 agora?"));
    expect(puts).toHaveLength(0);
    await userEvent.click(botao);
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toMatchObject({ id: "VIA-02", veiculo: "VAN-01" });
    expect(puts[0].fim).toEqual(expect.any(String));
  });

  it("falha ao encerrar: avisa com alert", async () => {
    respostas({ "PUT /viagens/VIA-02": new Error("sem permissão") });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    abrir();
    await userEvent.click(await screen.findByRole("button", { name: "Encerrar viagem" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("sem permissão"));
  });

  it("remover viagem: confirma e envia DELETE; falha avisa com alert", async () => {
    const apagadas = [];
    respostas({ "DELETE /viagens/VIA-01": () => { apagadas.push("VIA-01"); return {}; } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    abrir();
    const remover = await screen.findAllByRole("button", { name: "Remover" });
    await userEvent.click(remover[1]);
    await waitFor(() => expect(apagadas).toEqual(["VIA-01"]));
    respostas({ "DELETE /viagens/VIA-02": new Error("já removida") });
    await userEvent.click((await screen.findAllByRole("button", { name: "Remover" }))[0]);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("já removida"));
  });

  it("sem nenhum veículo cadastrado o formulário pede o cadastro antes", async () => {
    respostas({ "GET /veiculos": { veiculos: [] } });
    viagens = [];
    abrir();
    expect(await screen.findByText("Cadastre um veículo antes de registrar viagens.")).toBeInTheDocument();
  });

});
