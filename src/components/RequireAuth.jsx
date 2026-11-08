// Guarda das rotas logadas. Sem sessão válida vai para /login (replace, como
// o antigo location.replace). Com perfil="gestor", operador volta ao /dashboard.
//
//   <Route element={<RequireAuth />}> ...rotas... </Route>
//   <RequireAuth perfil="gestor"><TelaSoDeGestor /></RequireAuth>

import { Navigate, Outlet } from "react-router-dom";
import { useSessao } from "../hooks/useSessao.jsx";
import { ehGestor, lerSessao } from "../lib/sessao.js";

export default function RequireAuth({ perfil, children }) {

  const { usuario } = useSessao();

  // lerSessao() também descarta token vencido enquanto a aba ficou aberta.
  if (!usuario || !lerSessao()) {
    return <Navigate to="/login" replace />;
  }

  if (perfil === "gestor" && !ehGestor(usuario)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ?? <Outlet />;

}
