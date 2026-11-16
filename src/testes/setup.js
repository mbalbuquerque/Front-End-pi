// Preparação dos testes de componente: matchers do jest-dom e limpeza da tela a cada teste.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom não implementa <dialog>.showModal()/close(): simula o essencial (atributo open e evento close).
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// O AbortSignal do jsdom não tem any() (usado em consultarCanal).
if (typeof AbortSignal !== "undefined" && !AbortSignal.any) {
  AbortSignal.any = sinais => {
    const controle = new AbortController();
    for (const sinal of sinais) {
      if (sinal.aborted) {
        controle.abort(sinal.reason);
        break;
      }
      sinal.addEventListener("abort", () => controle.abort(sinal.reason), { once: true });
    }
    return controle.signal;
  };
}

// O jsdom não tem PointerEvent: sem ele o clientX dos eventos de ponteiro se perde.
if (typeof window !== "undefined" && !window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {};
}
