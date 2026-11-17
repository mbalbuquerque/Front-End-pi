// Tela acesa (Screen Wake Lock): pede ao abrir, de novo ao voltar ao primeiro plano, solta ao sair.

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTelaAcesa } from "./useTelaAcesa.js";

function travaFalsa() {
  const ouvintes = {};
  return {
    release: vi.fn(),
    addEventListener: (nome, fn) => {
      ouvintes[nome] = fn;
    },
    soltar: () => ouvintes.release?.()
  };
}

function visibilidade(valor) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => valor });
}

afterEach(() => {
  delete navigator.wakeLock;
  visibilidade("visible");
});


describe("useTelaAcesa", () => {

  it("navegador sem Wake Lock: indisponivel", () => {
    const { result } = renderHook(() => useTelaAcesa());
    expect(result.current).toBe("indisponivel");
  });

  it("pede a trava, volta a pedir ao reaparecer e solta ao desmontar", async () => {
    const travas = [];
    navigator.wakeLock = {
      request: vi.fn(async () => {
        const t = travaFalsa();
        travas.push(t);
        return t;
      })
    };

    const { result, unmount } = renderHook(() => useTelaAcesa());
    await waitFor(() => expect(result.current).toBe("ativa"));
    expect(navigator.wakeLock.request).toHaveBeenCalledWith("screen");

    // A aba foi para segundo plano: o navegador solta a trava.
    act(() => travas[0].soltar());
    expect(result.current).toBe("recusada");

    // Em segundo plano não pede.
    visibilidade("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);

    // Voltou: pede de novo.
    visibilidade("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(result.current).toBe("ativa"));
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);

    unmount();
    expect(travas[1].release).toHaveBeenCalled();
    // Depois de desmontar, soltar não mexe mais no estado.
    travas[1].soltar();
  });

  it("pedido recusado (bateria fraca, política): recusada", async () => {
    navigator.wakeLock = { request: vi.fn(async () => { throw new Error("NotAllowedError"); }) };
    const { result } = renderHook(() => useTelaAcesa());
    await waitFor(() => expect(navigator.wakeLock.request).toHaveBeenCalled());
    expect(result.current).toBe("recusada");
  });

  it("trava que chega depois de desmontar é solta na hora", async () => {
    let entregar;
    const trava = travaFalsa();
    navigator.wakeLock = { request: vi.fn(() => new Promise(r => { entregar = r; })) };
    const { unmount } = renderHook(() => useTelaAcesa());
    unmount();
    await act(async () => entregar(trava));
    expect(trava.release).toHaveBeenCalled();
  });

});
