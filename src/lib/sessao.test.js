import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHAVE_SESSAO,
  ehGestor,
  expiracaoDoToken,
  lerSessao,
  limparSessao,
  salvarSessao,
  usuarioAtual
} from "./sessao.js";


// JWT de teste (sem assinatura válida; o painel só lê o exp).
function token(carga) {

  const base64url = texto => Buffer.from(texto, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${base64url('{"alg":"HS256"}')}.${base64url(JSON.stringify(carga))}.assinatura`;

}

const AGORA = Date.UTC(2026, 10, 8, 12, 0, 0);

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});


describe("sessao", () => {

  it("decodifica o exp do JWT (base64url) em milissegundos", () => {
    // "?~" e "ãé" geram "-" e "_" no base64url.
    const exp = Math.floor(AGORA / 1000) + 8 * 3600;
    expect(expiracaoDoToken(token({ exp, nome: "?~>>ãé" }))).toBe(exp * 1000);
  });

  it("salva e lê a sessão com o mesmo formato do painel antigo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);

    const exp = Math.floor(AGORA / 1000) + 3600;
    const usuario = { id: "u1", nome: "Ana", perfil: "gestor", empresa: "Frio Ltda" };
    const t = token({ exp });

    salvarSessao(t, usuario);

    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO))).toEqual({ token: t, usuario, expiraEm: exp * 1000 });
    expect(lerSessao()).toEqual({ token: t, usuario, expiraEm: exp * 1000 });
    expect(usuarioAtual()).toEqual(usuario);
    expect(ehGestor()).toBe(true);
  });

  it("descarta sessão vencida", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);

    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token: "x", usuario: {}, expiraEm: AGORA }));

    expect(lerSessao()).toBeNull();
    expect(usuarioAtual()).toBeNull();
  });

  it("descarta sessão sem token ou com JSON inválido", () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ usuario: {}, expiraEm: Date.now() + 1000 }));
    expect(lerSessao()).toBeNull();

    localStorage.setItem(CHAVE_SESSAO, "{quebrado");
    expect(lerSessao()).toBeNull();
  });

  it("limparSessao apaga a chave", () => {
    localStorage.setItem(CHAVE_SESSAO, "{}");
    limparSessao();
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it("ehGestor só para perfil gestor", () => {
    expect(ehGestor({ perfil: "gestor" })).toBe(true);
    expect(ehGestor({ perfil: "operador" })).toBe(false);
    expect(ehGestor(null)).toBe(false);
  });

});
