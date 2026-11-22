// Cartão "Alertas no celular" (aba Perfil) (um botão só, issue #75) e a dica do som:
// cada estado vindo de useAlertasMotorista, passado por props.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AlertasMotorista, { DicaSom } from "./AlertasMotorista.jsx";

function alertas(extra = {}) {
  return {
    ligado: false,
    somArmado: false,
    estadoPush: "inativo",
    ocupado: null,
    erro: null,
    ativar: vi.fn(),
    desativar: vi.fn(),
    testar: vi.fn(),
    ...extra
  };
}


describe("AlertasMotorista", () => {

  it("enquanto consulta o celular, não mostra nada", () => {
    const { container } = render(<AlertasMotorista alertas={alertas({ estadoPush: "verificando" })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("desligado: um botão só, \"Ativar alertas\"", async () => {
    const estado = alertas();
    render(<AlertasMotorista alertas={estado} />);
    expect(screen.getByRole("heading", { name: "Alertas no celular" })).toBeInTheDocument();
    expect(screen.getByText("Som, vibração e notificação quando a carga sair da faixa.")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Ativar alertas" }));
    expect(estado.ativar).toHaveBeenCalledTimes(1);
  });

  it("ativando: botão ocupado", () => {
    render(<AlertasMotorista alertas={alertas({ ocupado: "ativando" })} />);
    expect(screen.getByRole("button", { name: "Ativando…" })).toBeDisabled();
  });

  it("ligado com push: também com a tela fechada, e Desativar", async () => {
    const estado = alertas({ ligado: true, estadoPush: "ativo" });
    render(<AlertasMotorista alertas={estado} />);
    expect(screen.getByRole("status")).toHaveTextContent("Alertas ligados, também com a tela fechada.");
    expect(screen.queryByRole("button", { name: "Ativar alertas" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(estado.desativar).toHaveBeenCalledTimes(1);
  });

  it("ligado: Testar chama o teste do aviso", async () => {
    const estado = alertas({ ligado: true, estadoPush: "ativo", somArmado: true });
    render(<AlertasMotorista alertas={estado} telaAcesa="ativa" />);
    await userEvent.click(screen.getByRole("button", { name: "Testar" }));
    expect(estado.testar).toHaveBeenCalledTimes(1);
    expect(document.getElementById("somVibracao")).toHaveTextContent("Ligados");
  });

  it("linhas da tela acesa e do som: estado sempre em texto", () => {
    const { rerender } = render(<AlertasMotorista alertas={alertas()} telaAcesa="ativa" />);
    expect(document.getElementById("telaAcesa")).toHaveTextContent("Ligada");
    expect(document.getElementById("somVibracao")).toHaveTextContent("Desligados");

    rerender(<AlertasMotorista alertas={alertas({ ligado: true })} telaAcesa="recusada" />);
    expect(document.getElementById("telaAcesa")).toHaveTextContent("Desligada");
    expect(screen.getByText("O celular pode apagar a tela.")).toBeInTheDocument();
    expect(document.getElementById("somVibracao")).toHaveTextContent("Esperando toque");

    rerender(<AlertasMotorista alertas={alertas()} telaAcesa="indisponivel" />);
    expect(document.getElementById("telaAcesa")).toHaveTextContent("Indisponível");

    rerender(<AlertasMotorista alertas={alertas()} />);
    expect(document.getElementById("telaAcesa")).toBeNull();
  });

  it("ligado sem push (servidor recusou): vale com a tela aberta e mostra o erro", () => {
    render(<AlertasMotorista alertas={alertas({ ligado: true, erro: "Alertas push indisponíveis no servidor." })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Alertas ligados com esta tela aberta.");
    expect(screen.getByRole("alert")).toHaveTextContent("Alertas push indisponíveis no servidor.");
  });

  it("desativando: botão ocupado", () => {
    render(<AlertasMotorista alertas={alertas({ ligado: true, estadoPush: "ativo", ocupado: "desativando" })} />);
    expect(screen.getByRole("button", { name: "Desativando…" })).toBeDisabled();
  });

  it("navegador sem Web Push: explica Android e iPhone, e o botão continua (som e vibração)", () => {
    render(<AlertasMotorista alertas={alertas({ estadoPush: "sem-suporte" })} />);
    expect(screen.getByText(/Este navegador não recebe alertas com a tela fechada/)).toBeInTheDocument();
    expect(screen.getByText(/iOS 16.4 ou mais novo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar alertas" })).toBeInTheDocument();
  });

  it("notificações bloqueadas: diz como liberar", () => {
    render(<AlertasMotorista alertas={alertas({ ligado: true, estadoPush: "negado" })} />);
    expect(screen.getByText(/As notificações estão bloqueadas para este site/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Alertas ligados com esta tela aberta.");
  });

});


describe("DicaSom", () => {

  it("só aparece com os alertas ligados e o som ainda não liberado", () => {
    const { rerender, container } = render(<DicaSom alertas={alertas()} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<DicaSom alertas={alertas({ ligado: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Toque na tela para ligar o som e a vibração.");

    rerender(<DicaSom alertas={alertas({ ligado: true, somArmado: true })} />);
    expect(container).toBeEmptyDOMElement();
  });

});
