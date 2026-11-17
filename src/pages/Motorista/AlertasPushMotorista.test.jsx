// Alertas push da tela do motorista: cada estado do celular e as ações de
// ativar e desativar (src/lib/push.js simulado).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlertasPushMotorista from "./AlertasPushMotorista.jsx";

const push = vi.hoisted(() => ({
  estadoPush: vi.fn(),
  ativarPush: vi.fn(),
  desativarPush: vi.fn()
}));

vi.mock("../../lib/push.js", () => push);

beforeEach(() => {
  vi.clearAllMocks();
});


describe("Alertas push do motorista", () => {

  it("enquanto consulta o celular, não mostra nada", () => {
    push.estadoPush.mockReturnValue(new Promise(() => {}));
    const { container } = render(<AlertasPushMotorista />);
    expect(container).toBeEmptyDOMElement();
  });

  it("navegador sem suporte explica Android e iPhone, sem botão", async () => {
    push.estadoPush.mockResolvedValue("sem-suporte");
    render(<AlertasPushMotorista />);
    expect(await screen.findByText(/Este navegador não recebe alertas com a tela fechada/)).toBeInTheDocument();
    expect(screen.getByText(/iOS 16.4 ou mais novo/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("notificações bloqueadas: diz como liberar, sem botão", async () => {
    push.estadoPush.mockResolvedValue("negado");
    render(<AlertasPushMotorista />);
    expect(await screen.findByText(/As notificações estão bloqueadas para este site/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("ativa: botão ocupado e depois o aviso de ativo", async () => {
    push.estadoPush.mockResolvedValue("inativo");
    let concluir;
    push.ativarPush.mockReturnValue(new Promise(resolver => { concluir = resolver; }));
    render(<AlertasPushMotorista />);

    expect(await screen.findByText(/alerta do seu veículo mesmo com esta tela fechada/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ativar alertas no celular" }));
    expect(screen.getByRole("button", { name: "Ativando…" })).toBeDisabled();

    concluir("ativo");
    expect(await screen.findByText("Alertas ativos neste celular.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeEnabled();
  });

  it("API recusa (ex.: servidor antigo sem push para motorista): erro aparece e o botão volta", async () => {
    push.estadoPush.mockResolvedValue("inativo");
    push.ativarPush.mockRejectedValue(new Error("Sem permissão."));
    render(<AlertasPushMotorista />);

    await userEvent.click(await screen.findByRole("button", { name: "Ativar alertas no celular" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão.");
    expect(screen.getByRole("button", { name: "Ativar alertas no celular" })).toBeEnabled();
  });

  it("desativa: volta para o botão de ativar", async () => {
    push.estadoPush.mockResolvedValue("ativo");
    let concluir;
    push.desativarPush.mockReturnValue(new Promise(resolver => { concluir = resolver; }));
    render(<AlertasPushMotorista />);

    await userEvent.click(await screen.findByRole("button", { name: "Desativar" }));
    expect(screen.getByRole("button", { name: "Desativando…" })).toBeDisabled();

    concluir("inativo");
    expect(await screen.findByRole("button", { name: "Ativar alertas no celular" })).toBeInTheDocument();
  });

});
