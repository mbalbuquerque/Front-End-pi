// Card "Risco térmico da saída": consulta o modelo por mês e hora e trata 404 e falha de rede.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RiscoSaida from "./RiscoSaida.jsx";

const predicao = vi.hoisted(() => ({ buscarRisco: vi.fn() }));

vi.mock("../../lib/predicao.js", async importarOriginal => ({
  ...(await importarOriginal()),
  buscarRisco: predicao.buscarRisco
}));

const DADOS = {
  probabilidade: 0.9,
  nivel: "alto",
  limiarC: 30,
  hora: 15,
  mes: 11,
  baseline: { probabilidade: 0.21 },
  modelo: { versao: "teste-v1", brierModelo: 0.091, brierBaseline: 0.2 }
};

beforeEach(() => {
  vi.clearAllMocks();
  predicao.buscarRisco.mockResolvedValue(DADOS);
});

describe("RiscoSaida", () => {

  it("mostra Carregando e depois chance, nível, média geral e ficha do modelo", async () => {
    predicao.buscarRisco.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<RiscoSaida />);
    expect(screen.getByText("Carregando o risco…")).toBeInTheDocument();
    unmount();

    predicao.buscarRisco.mockResolvedValue(DADOS);
    render(<RiscoSaida />);
    expect(await screen.findByText("90%")).toBeInTheDocument();
    expect(document.getElementById("riscoSaidaNivel")).toHaveTextContent("RISCO ALTO");
    const card = document.getElementById("riscoSaida");
    expect(card).toHaveTextContent("Média geral sem considerar mês e hora: 21%");
    expect(card).toHaveTextContent("Modelo teste-v1");
    expect(card).toHaveTextContent("erro (Brier) 0,091 contra 0,200");
    expect(card).toHaveTextContent("às 15h em novembro, em Petrolina");
  });

  it("consulta com o mês e a hora de Recife e a hora do seletor acompanha a atual", async () => {
    render(<RiscoSaida />);
    await screen.findByText("90%");
    const { mes, hora } = predicao.buscarRisco.mock.calls[0][0];
    expect(mes).toBeGreaterThanOrEqual(1);
    expect(mes).toBeLessThanOrEqual(12);
    expect(screen.getByLabelText("Hora de saída")).toHaveValue(String(hora));
  });

  it("trocar a hora de saída consulta de novo com a hora escolhida", async () => {
    render(<RiscoSaida />);
    await screen.findByText("90%");
    predicao.buscarRisco.mockResolvedValue({ ...DADOS, hora: 6, probabilidade: 0.02, nivel: "baixo" });
    await userEvent.selectOptions(screen.getByLabelText("Hora de saída"), "6");
    await waitFor(() => expect(predicao.buscarRisco).toHaveBeenLastCalledWith(expect.objectContaining({ hora: 6 })));
    expect(await screen.findByText("2%")).toBeInTheDocument();
    expect(document.getElementById("riscoSaidaNivel")).toHaveTextContent("RISCO BAIXO");
  });

  it("nível desconhecido e campos ausentes: sem nível, traços no lugar dos números", async () => {
    predicao.buscarRisco.mockResolvedValue({ hora: 8, mes: 3, nivel: "???" });
    render(<RiscoSaida />);
    expect(await screen.findByText("SEM NÍVEL")).toBeInTheDocument();
    expect(document.getElementById("riscoSaidaChance")).toHaveTextContent("--");
    expect(document.getElementById("riscoSaida")).toHaveTextContent("Modelo -- · erro (Brier) --");
  });

  it("API sem a rota (404): avisa que o modelo não está publicado", async () => {
    predicao.buscarRisco.mockRejectedValue(Object.assign(new Error("HTTP 404"), { status: 404 }));
    render(<RiscoSaida />);
    expect(await screen.findByText("O modelo de risco ainda não está publicado nesta versão da API.")).toBeInTheDocument();
  });

  it("outra falha: mensagem genérica de nova tentativa", async () => {
    predicao.buscarRisco.mockRejectedValue(new Error("rede"));
    render(<RiscoSaida />);
    expect(await screen.findByText("Não foi possível consultar o risco agora. Tente de novo em instantes.")).toBeInTheDocument();
  });

});
