import { describe, expect, it, vi } from "vitest";
import {
  CHAVE_RECARGA, JANELA_RECARGA_MS, ehErroDeVersao, importarTela, instalarRecargaDeVersao, recarregarUmaVez
} from "./versao.js";


function memoria(inicial = {}) {

  const dados = { ...inicial };

  return {
    dados,
    getItem: chave => (chave in dados ? dados[chave] : null),
    setItem: (chave, valor) => { dados[chave] = valor; }
  };

}


describe("ehErroDeVersao", () => {

  it.each([
    "Failed to fetch dynamically imported module: https://x/assets/Viagens-abc.js",
    "error loading dynamically imported module",
    "Importing a module script failed.",
    "Unable to preload CSS for /assets/Viagens-abc.css",
    "'text/html' is not a valid JavaScript MIME type.",
    "Loading chunk 3 failed"
  ])("reconhece: %s", mensagem => {
    expect(ehErroDeVersao(new TypeError(mensagem))).toBe(true);
  });

  it("erro comum, texto solto e vazio não são de versão", () => {
    expect(ehErroDeVersao(new Error("x is not a function"))).toBe(false);
    expect(ehErroDeVersao("ChunkLoadError")).toBe(true);
    expect(ehErroDeVersao(null)).toBe(false);
    expect(ehErroDeVersao(undefined)).toBe(false);
  });

});


describe("recarregarUmaVez", () => {

  it("recarrega e guarda a hora na sessão", () => {
    const armazenamento = memoria();
    const recarregar = vi.fn();
    expect(recarregarUmaVez({ armazenamento, recarregar, agora: 1000 })).toBe(true);
    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(armazenamento.dados[CHAVE_RECARGA]).toBe("1000");
  });

  it("segunda falha dentro da janela não recarrega (sem laço)", () => {
    const armazenamento = memoria({ [CHAVE_RECARGA]: "1000" });
    const recarregar = vi.fn();
    expect(recarregarUmaVez({ armazenamento, recarregar, agora: 1000 + JANELA_RECARGA_MS - 1 })).toBe(false);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it("depois da janela, uma publicação nova volta a recarregar", () => {
    const armazenamento = memoria({ [CHAVE_RECARGA]: "1000" });
    const recarregar = vi.fn();
    expect(recarregarUmaVez({ armazenamento, recarregar, agora: 1000 + JANELA_RECARGA_MS })).toBe(true);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("sem sessionStorage (bloqueado) não recarrega", () => {
    const recarregar = vi.fn();
    const bloqueado = { getItem: () => { throw new Error("SecurityError"); } };
    expect(recarregarUmaVez({ armazenamento: bloqueado, recarregar })).toBe(false);
    expect(recarregarUmaVez({ armazenamento: null, recarregar })).toBe(false);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it("padrões: sessionStorage da janela e location.reload", () => {
    sessionStorage.removeItem(CHAVE_RECARGA);
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, reload } });
    try {
      expect(recarregarUmaVez()).toBe(true);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(recarregarUmaVez()).toBe(false);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
      sessionStorage.removeItem(CHAVE_RECARGA);
    }
  });

  it("sessionStorage que lança ao ser acessado conta como ausente", () => {
    const descritor = Object.getOwnPropertyDescriptor(window, "sessionStorage");
    Object.defineProperty(window, "sessionStorage", { configurable: true, get: () => { throw new Error("bloqueado"); } });
    try {
      expect(recarregarUmaVez({ recarregar: vi.fn() })).toBe(false);
    } finally {
      Object.defineProperty(window, "sessionStorage", descritor);
    }
  });

});


describe("importarTela", () => {

  it("sucesso passa o módulo adiante", async () => {
    const modulo = { default: () => null };
    await expect(importarTela(() => Promise.resolve(modulo))()).resolves.toBe(modulo);
  });

  it("pedaço sumido: recarrega e fica pendente", async () => {
    const recarga = vi.fn(() => true);
    const carregar = importarTela(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module")), recarga);
    const resultado = await Promise.race([carregar().then(() => "resolveu", () => "falhou"), new Promise(r => setTimeout(() => r("pendente"), 20))]);
    expect(resultado).toBe("pendente");
    expect(recarga).toHaveBeenCalledTimes(1);
  });

  it("módulo undefined (o Vite já mandou recarregar) fica pendente", async () => {
    const carregar = importarTela(() => Promise.resolve(undefined), vi.fn());
    const resultado = await Promise.race([carregar().then(() => "resolveu"), new Promise(r => setTimeout(() => r("pendente"), 20))]);
    expect(resultado).toBe("pendente");
  });

  it("já recarregou: repassa o erro (o ErroTela mostra Atualizar)", async () => {
    const erro = new TypeError("Failed to fetch dynamically imported module");
    await expect(importarTela(() => Promise.reject(erro), () => false)()).rejects.toBe(erro);
  });

  it("erro que não é de versão não recarrega", async () => {
    const recarga = vi.fn(() => true);
    const erro = new Error("quebrou");
    await expect(importarTela(() => Promise.reject(erro), recarga)()).rejects.toBe(erro);
    expect(recarga).not.toHaveBeenCalled();
  });

});


describe("instalarRecargaDeVersao", () => {

  it("vite:preloadError recarrega e evita o erro solto; remover desliga", () => {
    const alvo = new EventTarget();
    const recarga = vi.fn(() => true);
    const remover = instalarRecargaDeVersao(alvo, recarga);

    const evento = new Event("vite:preloadError", { cancelable: true });
    alvo.dispatchEvent(evento);
    expect(recarga).toHaveBeenCalledTimes(1);
    expect(evento.defaultPrevented).toBe(true);

    remover();
    alvo.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
    expect(recarga).toHaveBeenCalledTimes(1);
  });

  it("sem recarga (já tentou), o evento segue sem preventDefault", () => {
    const alvo = new EventTarget();
    instalarRecargaDeVersao(alvo, () => false);
    const evento = new Event("vite:preloadError", { cancelable: true });
    alvo.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
  });

  it("padrão: escuta a janela", () => {
    const espiao = vi.spyOn(window, "addEventListener");
    const remover = instalarRecargaDeVersao();
    expect(espiao).toHaveBeenCalledWith("vite:preloadError", expect.any(Function));
    remover();
    espiao.mockRestore();
  });

});
