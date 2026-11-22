// useAlertasMotorista: o botão único liga push, som e vibração; a escolha
// sobrevive a recarregar (localStorage) e o som volta no primeiro toque.
// push.js e os efeitos do celular (alerta.js) simulados; a preferência é real.

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAlertasMotorista } from "./useAlertasMotorista.js";

const push = vi.hoisted(() => ({
  estadoPush: vi.fn(),
  ativarPush: vi.fn(),
  desativarPush: vi.fn()
}));
const celular = vi.hoisted(() => ({
  vibrar: vi.fn(),
  notificar: vi.fn(),
  pedirPermissaoDeNotificacao: vi.fn(async () => "granted"),
  som: { ativar: vi.fn(), tocar: vi.fn() }
}));

vi.mock("../../lib/push.js", () => push);
vi.mock("./alerta.js", async original => ({
  ...(await original()),
  vibrar: celular.vibrar,
  notificar: celular.notificar,
  pedirPermissaoDeNotificacao: celular.pedirPermissaoDeNotificacao,
  criarSom: () => celular.som
}));

const CHAVE = "coldtrack.motorista.alertas";

async function abrir(estadoInicial = "inativo") {
  push.estadoPush.mockResolvedValue(estadoInicial);
  const hook = renderHook(() => useAlertasMotorista());
  await waitFor(() => expect(hook.result.current.estadoPush).toBe(estadoInicial));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});


describe("useAlertasMotorista", () => {

  it("primeira vez: desligado, e disparar não faz nada", async () => {
    const { result } = await abrir();
    expect(result.current.ligado).toBe(false);
    expect(result.current.disparar("CRITICO", "Carga em CRÍTICO", "frase")).toBe(false);
    expect(celular.vibrar).not.toHaveBeenCalled();
    expect(celular.notificar).not.toHaveBeenCalled();
  });

  it("ativar: arma o som, inscreve o push, grava a escolha; disparar vibra, toca e notifica", async () => {
    push.ativarPush.mockResolvedValue("ativo");
    const { result } = await abrir();

    await act(() => result.current.ativar());

    expect(celular.som.ativar).toHaveBeenCalledTimes(1);
    expect(push.ativarPush).toHaveBeenCalledTimes(1);
    expect(celular.pedirPermissaoDeNotificacao).not.toHaveBeenCalled();
    expect(localStorage.getItem(CHAVE)).toBe("1");
    expect(result.current).toMatchObject({ ligado: true, somArmado: true, estadoPush: "ativo" });

    expect(result.current.disparar("CRITICO", "Carga em CRÍTICO", "frase")).toBe(true);
    expect(celular.vibrar).toHaveBeenCalledWith("CRITICO");
    expect(celular.som.tocar).toHaveBeenCalledWith("CRITICO");
    expect(celular.notificar).toHaveBeenCalledWith("Carga em CRÍTICO", "frase");
  });

  it("testar: arma o som, vibra, toca e notifica mesmo desligado", async () => {
    const { result } = await abrir();
    act(() => result.current.testar());
    expect(celular.som.ativar).toHaveBeenCalledTimes(1);
    expect(celular.vibrar).toHaveBeenCalledWith("ATENCAO");
    expect(celular.som.tocar).toHaveBeenCalledWith("ATENCAO");
    expect(celular.notificar).toHaveBeenCalledWith("Teste de alerta", expect.stringContaining("sair da faixa"));
  });

  it("sem Web Push: liga som e vibração e ainda pede a permissão de notificação", async () => {
    push.ativarPush.mockResolvedValue("sem-suporte");
    const { result } = await abrir("sem-suporte");
    await act(() => result.current.ativar());
    expect(celular.pedirPermissaoDeNotificacao).toHaveBeenCalledTimes(1);
    expect(result.current.ligado).toBe(true);
  });

  it("servidor recusa o push: fica ligado nesta tela, com o erro", async () => {
    push.ativarPush.mockRejectedValue(new Error("Alertas push indisponíveis no servidor."));
    const { result } = await abrir();
    await act(() => result.current.ativar());
    expect(result.current).toMatchObject({ ligado: true, estadoPush: "inativo", erro: "Alertas push indisponíveis no servidor." });
  });

  it("depois de recarregar: continua ligado, notifica, e o primeiro toque na página arma o som", async () => {
    localStorage.setItem(CHAVE, "1");
    const { result } = await abrir("ativo");
    expect(result.current).toMatchObject({ ligado: true, somArmado: false });

    // Antes do toque: vibra (melhor esforço) e notifica; som ainda não existe.
    result.current.disparar("ATENCAO", "Carga em ATENÇÃO", "frase");
    expect(celular.notificar).toHaveBeenCalledTimes(1);
    expect(celular.som.tocar).not.toHaveBeenCalled();

    act(() => document.body.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(celular.som.ativar).toHaveBeenCalledTimes(1);
    expect(result.current.somArmado).toBe(true);

    // Armado: o ouvinte sai, outro toque não recria nada.
    act(() => document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true })));
    expect(celular.som.ativar).toHaveBeenCalledTimes(1);

    result.current.disparar("CRITICO", "Carga em CRÍTICO", "frase");
    expect(celular.som.tocar).toHaveBeenCalledWith("CRITICO");
  });

  it("sem escolha gravada, mas com o push já ativo (versão de dois botões): aparece ligado", async () => {
    const { result } = await abrir("ativo");
    expect(result.current.ligado).toBe(true);
  });

  it("desativar: grava a escolha, cancela o push e para de alertar", async () => {
    push.desativarPush.mockResolvedValue("inativo");
    localStorage.setItem(CHAVE, "1");
    const { result } = await abrir("ativo");

    await act(() => result.current.desativar());

    expect(push.desativarPush).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CHAVE)).toBe("0");
    expect(result.current.ligado).toBe(false);
    expect(result.current.disparar("CRITICO", "Carga em CRÍTICO", "frase")).toBe(false);
  });

  it("desativar sem push inscrito: só grava a escolha", async () => {
    localStorage.setItem(CHAVE, "1");
    const { result } = await abrir("sem-suporte");
    await act(() => result.current.desativar());
    expect(push.desativarPush).not.toHaveBeenCalled();
    expect(result.current.ligado).toBe(false);
  });

  it("desligado de propósito ignora o push ainda inscrito", async () => {
    localStorage.setItem(CHAVE, "0");
    const { result } = await abrir("ativo");
    expect(result.current.ligado).toBe(false);
  });

});
