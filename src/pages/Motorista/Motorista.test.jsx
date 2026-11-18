// Tela do motorista: os quatro estados, alerta que piora e volta, sem internet,
// sem veículo e falha da API. API, conexão e efeitos do celular simulados.

import { act, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Motorista from "./Motorista.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, sair: vi.fn() }));
const api = vi.hoisted(() => ({ api: vi.fn() }));
const rede = vi.hoisted(() => ({ online: true }));
const tela = vi.hoisted(() => ({ estado: "ativa" }));
const polling = vi.hoisted(() => ({ fn: null }));
const push = vi.hoisted(() => ({
  estadoPush: vi.fn(async () => "inativo"),
  ativarPush: vi.fn(async () => "ativo"),
  desativarPush: vi.fn(async () => "inativo")
}));
const alerta = vi.hoisted(() => ({
  vibrar: vi.fn(),
  notificar: vi.fn(),
  pedirPermissaoDeNotificacao: vi.fn(async () => "granted"),
  som: { ativar: vi.fn(), tocar: vi.fn() },
  preferencia: null
}));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);
vi.mock("../../lib/push.js", () => push);
vi.mock("../../lib/conectividade.js", () => ({ useOnline: () => rede.online }));
vi.mock("../../hooks/useTelaAcesa.js", () => ({ useTelaAcesa: () => tela.estado }));
vi.mock("../../components/PrevisaoSensor.jsx", () => ({ default: ({ variante, deviceId }) => <div data-testid="previsao" data-variante={variante} data-device={String(deviceId)} /> }));
vi.mock("./alerta.js", () => ({
  vibrar: alerta.vibrar,
  notificar: alerta.notificar,
  pedirPermissaoDeNotificacao: alerta.pedirPermissaoDeNotificacao,
  criarSom: () => alerta.som,
  lerPreferenciaAlertas: () => alerta.preferencia,
  gravarPreferenciaAlertas: valor => { alerta.preferencia = valor; }
}));
// A rodada roda ao abrir; as próximas, quando o teste chama atualizar().
vi.mock("../../hooks/usePolling.js", () => ({
  usePolling: fn => {
    polling.fn = fn;
    useEffect(() => {
      polling.controle = new AbortController();
      fn(polling.controle.signal);
      return () => polling.controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  }
}));

const AGORA = Date.parse("2026-11-16T22:00:00Z");

function resposta(status = "NORMAL", minutos = 1, extra = {}) {
  return {
    veiculo: { id: "CT-001", tipo: "Baú refrigerado", perfil: "manga" },
    faixa: { nome: "Manga", min: 10, max: 13, margem: 3 },
    leitura: {
      temperatura: status === "CRITICO" ? 17.5 : status === "ATENCAO" ? 14.2 : 11.8,
      umidade: 87,
      status,
      medidoEm: new Date(Date.now() - minutos * 60000).toISOString()
    },
    status,
    minutosSemLeitura: minutos,
    viagem: { origem: "Petrolina", destino: "Suape", carga: "Manga Tommy", inicio: "2026-11-16T09:00:00Z", fim: null },
    ...extra
  };
}

async function atualizar() {
  await act(async () => {
    await polling.fn(polling.controle.signal);
  });
}

async function abrir() {
  renderizarNaRota(<Motorista />, "/motorista");
  await act(async () => {});
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AGORA);
  sessao.usuario = { id: "moto@empresa.com", nome: "Mario", perfil: "motorista", veiculo: "CT-001" };
  rede.online = true;
  tela.estado = "ativa";
  api.api.mockResolvedValue(resposta());
  alerta.preferencia = null;
  push.estadoPush.mockResolvedValue("inativo");
});

afterEach(() => {
  vi.useRealTimers();
});


describe("Motorista", () => {

  it("antes da resposta: carregando, com o veículo da sessão", () => {
    api.api.mockReturnValue(new Promise(() => {}));
    renderizarNaRota(<Motorista />, "/motorista");
    expect(screen.getByText("Carregando a leitura do veículo…")).toBeInTheDocument();
    expect(document.getElementById("veiculoMotorista")).toHaveTextContent("CT-001");
    expect(document.querySelector(".escopo-motorista")).toHaveClass("tela-neutra");
    expect(document.title).toBe("Motorista · ColdTrack Control");
  });

  it("normal: número grande, status em texto, faixa, última leitura e viagem", async () => {
    await abrir();
    expect(api.api).toHaveBeenCalledWith("/motorista", { signal: expect.any(AbortSignal) });
    expect(document.getElementById("tempMotorista")).toHaveTextContent("11.8 °C");
    expect(document.getElementById("statusMotorista")).toHaveTextContent("NORMAL");
    expect(document.getElementById("blocoStatus")).toHaveClass("normal");
    expect(document.querySelector(".escopo-motorista")).toHaveClass("tela-normal");
    expect(document.querySelectorAll("#reguaMotorista .zona")).toHaveLength(5);
    expect(document.querySelector("#reguaMotorista .regua-marcador")).not.toBeNull();
    expect(document.getElementById("faixaCarga")).toHaveTextContent("Manga: de 10 a 13 °C");
    expect(document.getElementById("ultimaLeitura")).toHaveTextContent(/^às \d{2}:\d{2} · há 1 min$/);
    expect(screen.getByText("Petrolina → Suape")).toBeInTheDocument();
    expect(screen.getByText("Manga Tommy")).toBeInTheDocument();
    expect(screen.getByText("87.0 %")).toBeInTheDocument();
    expect(document.getElementById("veiculoMotorista")).toHaveTextContent("CT-001 · Baú refrigerado");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.getElementById("seloAntigo")).toBeNull();
    expect(screen.getByText("Use com o celular no suporte.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(alerta.vibrar).not.toHaveBeenCalled();
  });

  it("previsão em 10 min: variante motorista, sem deviceId", async () => {
    await abrir();
    const previsao = screen.getByTestId("previsao");
    expect(previsao).toHaveAttribute("data-variante", "motorista");
    expect(previsao).toHaveAttribute("data-device", "undefined");
  });

  it("os quatro estados aparecem com texto", async () => {
    for (const [status, texto, classe] of [
      ["ATENCAO", "ATENÇÃO", "atencao"],
      ["CRITICO", "CRÍTICO", "critico"]
    ]) {
      api.api.mockResolvedValue(resposta(status));
      await abrir();
      expect(document.getElementById("statusMotorista")).toHaveTextContent(texto);
      expect(document.getElementById("blocoStatus")).toHaveClass(classe);
      cleanup();
    }
    api.api.mockResolvedValue(resposta("NORMAL", 9));
    await abrir();
    expect(document.getElementById("statusMotorista")).toHaveTextContent("SEM SINAL");
    expect(document.getElementById("blocoStatus")).toHaveClass("sem-sinal");
    expect(document.getElementById("seloAntigo")).toHaveTextContent("LEITURA ANTIGA");
  });

  it("sensor que nunca enviou e sem viagem", async () => {
    api.api.mockResolvedValue({ ...resposta(), leitura: null, status: "SEM_LEITURA", minutosSemLeitura: null, viagem: null });
    await abrir();
    expect(document.getElementById("statusMotorista")).toHaveTextContent("SEM SINAL");
    expect(document.getElementById("tempMotorista")).toHaveTextContent("--");
    expect(document.querySelector("#reguaMotorista .regua-marcador")).toBeNull();
    expect(document.getElementById("ultimaLeitura")).toHaveTextContent("nenhuma ainda");
    expect(screen.getByText("Nenhuma viagem em curso.")).toBeInTheDocument();
    expect(screen.getByText("--", { selector: "dd" })).toBeInTheDocument();
  });

  it("API sem faixa da carga: sem régua, resto da tela igual", async () => {
    api.api.mockResolvedValue({ ...resposta(), faixa: null });
    await abrir();
    expect(document.getElementById("reguaMotorista")).toBeNull();
    expect(document.getElementById("tempMotorista")).toHaveTextContent("11.8 °C");
  });

  it("normal -> crítico -> normal: alerta ao piorar, aviso fica até voltar", async () => {
    await abrir();
    // Um botão só: som, vibração, permissão e Web Push juntos.
    expect(screen.getAllByRole("button", { name: /Ativar alertas/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Ativar alertas" }));
    expect(alerta.som.ativar).toHaveBeenCalled();
    expect(push.ativarPush).toHaveBeenCalledTimes(1);
    expect(alerta.preferencia).toBe(true);
    expect(screen.queryByRole("button", { name: "Ativar alertas" })).not.toBeInTheDocument();
    expect(document.getElementById("alertasLigados")).toHaveTextContent("Alertas ligados, também com a tela fechada.");
    expect(document.getElementById("dicaSom")).toBeNull();

    api.api.mockResolvedValue(resposta("CRITICO"));
    await atualizar();
    expect(screen.getByRole("alert")).toHaveTextContent("CRÍTICO");
    expect(alerta.vibrar).toHaveBeenCalledWith("CRITICO");
    expect(alerta.som.tocar).toHaveBeenCalledWith("CRITICO");
    expect(alerta.notificar).toHaveBeenCalledWith("Carga em CRÍTICO", expect.stringContaining("Pare em local seguro"));

    // Continua crítico na rodada seguinte: não vibra de novo.
    await atualizar();
    expect(alerta.vibrar).toHaveBeenCalledTimes(1);

    // Sensor sem sinal: o aviso continua.
    api.api.mockResolvedValue(resposta("CRITICO", 8));
    await atualizar();
    expect(screen.getByRole("alert")).toHaveTextContent("Sensor sem sinal: o aviso continua até chegar uma leitura normal.");

    api.api.mockResolvedValue(resposta("NORMAL"));
    await atualizar();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(alerta.vibrar).toHaveBeenCalledTimes(1);
  });

  it("atenção com os alertas desligados: só o aviso na tela", async () => {
    api.api.mockResolvedValue(resposta("ATENCAO"));
    await abrir();
    expect(screen.getByRole("alert")).toHaveTextContent("ATENÇÃO");
    expect(alerta.vibrar).not.toHaveBeenCalled();
    expect(alerta.notificar).not.toHaveBeenCalled();
    expect(alerta.som.tocar).not.toHaveBeenCalled();
  });

  it("sem internet: faixa com a hora da última leitura e valor marcado como antigo", async () => {
    await abrir();
    rede.online = false;
    api.api.mockRejectedValue(new TypeError("Failed to fetch"));
    await atualizar();
    expect(document.getElementById("faixaOffline")).toHaveTextContent(/^Sem conexão — última leitura às \d{2}:\d{2}$/);
    expect(document.getElementById("tempMotorista")).toHaveTextContent("11.8 °C");
    expect(document.getElementById("seloAntigo")).toBeInTheDocument();
  });

  it("sem internet desde o início: faixa sem leitura", async () => {
    rede.online = false;
    api.api.mockRejectedValue(new TypeError("Failed to fetch"));
    await abrir();
    expect(document.getElementById("faixaOffline")).toHaveTextContent("Sem conexão — nenhuma leitura recebida");
    expect(screen.getByText("Não foi possível falar com o Azure.")).toBeInTheDocument();
  });

  it("online mas a API parou de responder: faixa de servidor e último valor", async () => {
    await abrir();
    api.api.mockRejectedValue(Object.assign(new Error("HTTP 503"), { status: 503 }));
    await atualizar();
    expect(document.getElementById("faixaOffline")).toHaveTextContent(/^Sem resposta do servidor — última leitura às \d{2}:\d{2}$/);
    expect(document.getElementById("seloAntigo")).toBeInTheDocument();
  });

  it("API sem leitura e sem resposta: faixa sem hora", async () => {
    api.api.mockResolvedValue({ ...resposta(), leitura: null });
    await abrir();
    api.api.mockRejectedValue(new Error("HTTP 500"));
    await atualizar();
    expect(document.getElementById("faixaOffline")).toHaveTextContent("Sem resposta do servidor — última leitura às --:--");
  });

  it("404 (veículo fora da frota ou rota ainda não publicada): orienta falar com o gestor", async () => {
    api.api.mockRejectedValue(Object.assign(new Error("nenhum veículo"), { status: 404 }));
    await abrir();
    expect(screen.getByText("Nenhum veículo vinculado a você.")).toBeInTheDocument();
    expect(screen.getByText(/Configurações → Usuários/)).toBeInTheDocument();
  });

  it("rodada cancelada (tela fechada) não grava nada", async () => {
    let falhar;
    api.api.mockReturnValue(new Promise((_, rejeitar) => { falhar = rejeitar; }));
    await abrir();
    polling.controle.abort();
    await act(async () => falhar(new Error("abortado")));
    expect(screen.getByText("Carregando a leitura do veículo…")).toBeInTheDocument();

    let entregar;
    api.api.mockReturnValue(new Promise(r => { entregar = r; }));
    const rodada = polling.fn(polling.controle.signal);
    await act(async () => {
      entregar(resposta());
      await rodada;
    });
    expect(screen.getByText("Carregando a leitura do veículo…")).toBeInTheDocument();
  });

  it("recarregou com os alertas ligados: continua ligado, dica até o primeiro toque", async () => {
    alerta.preferencia = true;
    push.estadoPush.mockResolvedValue("ativo");
    await abrir();
    expect(document.getElementById("alertasLigados")).toHaveTextContent("Alertas ligados, também com a tela fechada.");
    expect(document.getElementById("dicaSom")).toHaveTextContent("Toque na tela para ligar o som e a vibração.");

    api.api.mockResolvedValue(resposta("CRITICO"));
    await atualizar();
    expect(alerta.notificar).toHaveBeenCalledWith("Carga em CRÍTICO", expect.any(String));
    expect(alerta.som.tocar).not.toHaveBeenCalled();

    await userEvent.click(document.getElementById("tempMotorista"));
    expect(alerta.som.ativar).toHaveBeenCalledTimes(1);
    expect(document.getElementById("dicaSom")).toBeNull();
  });

  it("Desativar: cancela o push e para de vibrar e notificar", async () => {
    alerta.preferencia = true;
    push.estadoPush.mockResolvedValue("ativo");
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(push.desativarPush).toHaveBeenCalledTimes(1);
    expect(alerta.preferencia).toBe(false);
    expect(await screen.findByRole("button", { name: "Ativar alertas" })).toBeInTheDocument();

    api.api.mockResolvedValue(resposta("CRITICO"));
    await atualizar();
    expect(screen.getByRole("alert")).toHaveTextContent("CRÍTICO");
    expect(alerta.vibrar).not.toHaveBeenCalled();
    expect(alerta.notificar).not.toHaveBeenCalled();
  });

  it("Sair chama o sair da sessão; indicador da tela acesa", async () => {
    tela.estado = "indisponivel";
    await abrir();
    expect(document.getElementById("telaAcesa")).toHaveTextContent("este navegador não permite");
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(sessao.sair).toHaveBeenCalled();
  });

  it("sem usuário na sessão e sem dados: topo vazio", () => {
    sessao.usuario = null;
    api.api.mockReturnValue(new Promise(() => {}));
    renderizarNaRota(<Motorista />, "/motorista");
    expect(document.getElementById("veiculoMotorista")).toHaveTextContent("");
  });

});

describe("Motorista - sensor em falha (#52)", () => {

  const DESDE = "2026-11-16T21:40:00Z";
  const hora = new Date(DESDE).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  it("mostra \"Sensor em falha desde HH:MM\" e marca a última leitura válida como antiga; some quando volta", async () => {
    api.api.mockResolvedValue(resposta("NORMAL", 20, { sensor: "falha", sensorFalhaDesde: DESDE }));
    await abrir();
    const aviso = document.getElementById("falhaSensorMotorista");
    expect(aviso).toHaveTextContent(`Sensor em falha desde ${hora}`);
    expect(aviso).toHaveTextContent("O valor abaixo é a última leitura válida.");
    expect(aviso).toHaveAttribute("role", "status");
    expect(document.getElementById("tempMotorista")).toHaveClass("antiga");
    expect(document.getElementById("seloAntigo")).toHaveTextContent("LEITURA ANTIGA");

    api.api.mockResolvedValue(resposta("NORMAL", 0, { sensor: "ok", sensorFalhaDesde: null }));
    await atualizar();
    expect(document.getElementById("falhaSensorMotorista")).toBeNull();
    expect(document.getElementById("seloAntigo")).toBeNull();
  });

  it("falha sem nenhuma leitura válida ainda", async () => {
    api.api.mockResolvedValue({ ...resposta("NORMAL", 1), leitura: null, status: "SEM_LEITURA", minutosSemLeitura: null, sensor: "falha", sensorFalhaDesde: DESDE });
    await abrir();
    expect(document.getElementById("falhaSensorMotorista")).toHaveTextContent("Nenhuma leitura válida ainda.");
    expect(document.getElementById("seloAntigo")).toBeNull();
  });

  it("API antiga, sem o campo sensor: tela como antes", async () => {
    await abrir();
    expect(document.getElementById("falhaSensorMotorista")).toBeNull();
    expect(document.getElementById("tempMotorista")).not.toHaveClass("antiga");
  });

});
