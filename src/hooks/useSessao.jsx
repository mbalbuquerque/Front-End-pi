// Sessão do usuário para os componentes. AuthProvider fica em main.jsx,
// dentro do BrowserRouter. Fora de componente, use lib/sessao.js.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { definirAoExpirar } from "../lib/api.js";
import { limparSessao, salvarSessao, usuarioAtual } from "../lib/sessao.js";

const SessaoContexto = createContext(null);


export function AuthProvider({ children }) {

  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(() => usuarioAtual());

  // Login (ou troca de senha, que devolve token novo): grava e atualiza a tela.
  const entrar = useCallback((token, novoUsuario) => {
    salvarSessao(token, novoUsuario);
    setUsuario(novoUsuario);
  }, []);

  const sair = useCallback(() => {
    limparSessao();
    setUsuario(null);
    navigate("/login");
  }, [navigate]);

  // 401 em api(): a sessão já foi limpa lá; aqui só zera o estado e vai ao login.
  useEffect(() => definirAoExpirar(() => {
    setUsuario(null);
    navigate("/login");
  }), [navigate]);

  const valor = useMemo(() => ({ usuario, entrar, sair }), [usuario, entrar, sair]);

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>;

}


// { usuario, entrar(token, usuario), sair() }. usuario é null sem login.
// eslint-disable-next-line react-refresh/only-export-components
export function useSessao() {

  const contexto = useContext(SessaoContexto);

  if (!contexto) {
    throw new Error("useSessao precisa estar dentro de <AuthProvider>.");
  }

  return contexto;

}
