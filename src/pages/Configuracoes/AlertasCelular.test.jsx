// Card "Alertas no celular": cada estado do aparelho e as ações de ativar e desativar.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlertasCelular from "./AlertasCelular.jsx";

const push = vi.hoisted(() => ({
  estadoPush: vi.fn(),
  ativarPush: vi.fn(),
  desativarPush: vi.fn()
}));

vi.mock("../../lib/push.js", () => push);

beforeEach(() => {
  vi.clearAllMocks();
});


describe("Alertas no celular", () => {

  it("mostra 'verificando' enquanto consulta o aparelho", () => {
    push.estadoPush.mockReturnValue(new Promise(() => {}));
    render(<AlertasCelular />);
    expect(screen.getByText("Verificando este aparelho…")).toBeInTheDocument();
  });

  it("navegador sem suporte explica Android e iPhone", async () => {
    push.estadoPush.mockResolvedValue("sem-suporte");
    render(<AlertasCelular />);
    expect(await screen.findByText(/Este navegador não recebe alertas push/)).toBeInTheDocument();
    expect(screen.getByText(/iOS 16.4 ou mais novo/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("notificações bloqueadas: diz como liberar", async () => {
    push.estadoPush.mockResolvedValue("negado");
    render(<AlertasCelular />);
    expect(await screen.findByText(/As notificações estão bloqueadas para este site/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falha ao consultar o aparelho cai em 'inativo'", async () => {
    push.estadoPush.mockRejectedValue(new Error("x"));
    render(<AlertasCelular />);
    expect(await screen.findByRole("button", { name: "Ativar alertas no celular" })).toBeEnabled();
  });

  it("ativa: botão ocupado e depois o aviso de ativo", async () => {
    push.estadoPush.mockResolvedValue("inativo");
    let concluir;
    push.ativarPush.mockReturnValue(new Promise(resolver => { concluir = resolver; }));
    render(<AlertasCelular />);

    await userEvent.click(await screen.findByRole("button", { name: "Ativar alertas no celular" }));
    expect(screen.getByRole("button", { name: "Ativando…" })).toBeDisabled();

    concluir("ativo");
    expect(await screen.findByText("Alertas ativos neste aparelho.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeEnabled();
    expect(screen.getByRole("alert", { hidden: true })).not.toBeVisible();
  });

  it("ativar com permissão negada mostra a explicação", async () => {
    push.estadoPush.mockResolvedValue("inativo");
    push.ativarPush.mockResolvedValue("negado");
    render(<AlertasCelular />);

    await userEvent.click(await screen.findByRole("button", { name: "Ativar alertas no celular" }));
    expect(await screen.findByText(/As notificações estão bloqueadas/)).toBeInTheDocument();
  });

  it("erro da API aparece e o botão volta", async () => {
    push.estadoPush.mockResolvedValue("inativo");
    push.ativarPush.mockRejectedValue(new Error("Alertas push indisponíveis no servidor. Tente mais tarde."));
    render(<AlertasCelular />);

    await userEvent.click(await screen.findByRole("button", { name: "Ativar alertas no celular" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Alertas push indisponíveis no servidor.");
    expect(screen.getByRole("button", { name: "Ativar alertas no celular" })).toBeEnabled();
  });

  it("desativa: volta para o botão de ativar", async () => {
    push.estadoPush.mockResolvedValue("ativo");
    let concluir;
    push.desativarPush.mockReturnValue(new Promise(resolver => { concluir = resolver; }));
    render(<AlertasCelular />);

    await userEvent.click(await screen.findByRole("button", { name: "Desativar" }));
    expect(screen.getByRole("button", { name: "Desativando…" })).toBeDisabled();

    concluir("inativo");
    expect(await screen.findByRole("button", { name: "Ativar alertas no celular" })).toBeInTheDocument();
  });

  it("desmontar antes da resposta não atualiza a tela", async () => {
    let concluir;
    push.estadoPush.mockReturnValue(new Promise(resolver => { concluir = resolver; }));
    const { unmount } = render(<AlertasCelular />);
    unmount();
    concluir("ativo");
    await Promise.resolve();
    expect(screen.queryByText("Alertas ativos neste aparelho.")).not.toBeInTheDocument();
  });

});
