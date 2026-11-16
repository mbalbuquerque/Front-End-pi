// Preferência "reduzir movimento" do sistema: lida na abertura e acompanhada quando muda.

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { movimentoReduzido, useMovimentoReduzido } from "./useMovimentoReduzido.js";

function simularMidia(reduzir) {
  const ouvintes = new Set();
  const lista = {
    matches: reduzir,
    addEventListener: (_, f) => ouvintes.add(f),
    removeEventListener: (_, f) => ouvintes.delete(f)
  };
  window.matchMedia = vi.fn(() => lista);
  return {
    mudar(novo) {
      lista.matches = novo;
      ouvintes.forEach(f => f());
    },
    ouvintes
  };
}

afterEach(() => {
  delete window.matchMedia;
});

describe("useMovimentoReduzido", () => {

  it("sem matchMedia (jsdom): considera que não há preferência", () => {
    expect(movimentoReduzido()).toBe(false);
    const { result } = renderHook(() => useMovimentoReduzido());
    expect(result.current).toBe(false);
  });

  it("lê a preferência na abertura e consulta prefers-reduced-motion", () => {
    simularMidia(true);
    const { result } = renderHook(() => useMovimentoReduzido());
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("acompanha a troca da preferência e solta o ouvinte ao desmontar", () => {
    const midia = simularMidia(false);
    const { result, unmount } = renderHook(() => useMovimentoReduzido());
    expect(result.current).toBe(false);
    act(() => midia.mudar(true));
    expect(result.current).toBe(true);
    expect(midia.ouvintes.size).toBe(1);
    unmount();
    expect(midia.ouvintes.size).toBe(0);
  });

});
