// Guarda das rotas logadas. Sem sessão válida vai para /login (replace, como
// o antigo location.replace). Com perfil="gestor", operador volta ao /dashboard.
// O motorista só tem a tela /motorista: qualquer outra rota logada o leva para
// lá, e perfil="motorista" manda os outros perfis de volta ao /dashboard.
//
//   <Route element={<RequireAuth />}> ...rotas do painel... </Route>
//   <RequireAuth perfil="gestor"><TelaSoDeGestor /></RequireAuth>
//   <RequireAuth perfil="motorista"><Motorista /></RequireAuth>

import { Navigate, Outlet } from "react-router-dom";
import { useSessao } from "../hooks/useSessao.jsx";
import { ehGestor, ehMotorista, lerSessao } from "../lib/sessao.js";

export default function RequireAuth({ perfil, children }) {

  const { usuario } = useSessao();

  // lerSessao() também descarta token vencido enquanto a aba ficou aberta.
  if (!usuario || !lerSessao()) {
    return <Navigate to="/login" replace />;
  }

  const motorista = ehMotorista(usuario);

  if (perfil === "motorista") {
    return motorista ? children ?? <Outlet /> : <Navigate to="/dashboard" replace />;
  }

  if (motorista) {
    return <Navigate to="/motorista" replace />;
  }

  if (perfil === "gestor" && !ehGestor(usuario)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ?? <Outlet />;

}
