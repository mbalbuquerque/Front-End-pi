// Hora da última resposta da API e leitura de navigator.onLine.

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { esquecerRecepcao, lerUltimaRecepcao, registrarRecepcao, useOnline, useUltimaRecepcao } from "./conectividade.js";

afterEach(() => {
  esquecerRecepcao();
  vi.restoreAllMocks();
});

function internet(ligada) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(ligada);
  window.dispatchEvent(new Event(ligada ? "online" : "offline"));
}

describe("conectividade", () => {

  it("começa sem nenhuma recepção registrada", () => {
    expect(lerUltimaRecepcao()).toBeNull();
  });

  it("registrarRecepcao guarda a hora e esquecerRecepcao apaga", () => {
    const quando = new Date(2026, 10, 16, 14, 5);
    registrarRecepcao(quando);
    expect(lerUltimaRecepcao()).toBe(quando);
    esquecerRecepcao();
    expect(lerUltimaRecepcao()).toBeNull();
  });

  it("useUltimaRecepcao reage a uma nova resposta", () => {
    const { result } = renderHook(() => useUltimaRecepcao());
    expect(result.current).toBeNull();
    const quando = new Date(2026, 10, 16, 9, 30);
    act(() => registrarRecepcao(quando));
    expect(result.current).toBe(quando);
  });

  it("useOnline acompanha os eventos offline e online do navegador", () => {
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
    act(() => internet(false));
    expect(result.current).toBe(false);
    act(() => internet(true));
    expect(result.current).toBe(true);
  });

});
