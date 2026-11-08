// Todas as rotas do painel. Quem porta uma tela NÃO mexe aqui: troca só o
// conteúdo de src/pages/<Nome>/<Nome>.jsx (contrato em docs/ARQUITETURA.md).

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import RequireAuth from "./components/RequireAuth.jsx";
import { ROTAS_LEGADAS } from "./rotas.js";

// Cada tela vira um pedaço separado do bundle (JS e CSS da família).
const Home = lazy(() => import("./pages/Home/Home.jsx"));
const Login = lazy(() => import("./pages/Login/Login.jsx"));
const Cadastro = lazy(() => import("./pages/Cadastro/Cadastro.jsx"));

const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard.jsx"));
const Alertas = lazy(() => import("./pages/Alertas/Alertas.jsx"));
const Relatorios = lazy(() => import("./pages/Relatorios/Relatorios.jsx"));
const Veiculos = lazy(() => import("./pages/Veiculos/Veiculos.jsx"));
const Sensores = lazy(() => import("./pages/Sensores/Sensores.jsx"));
const Viagens = lazy(() => import("./pages/Viagens/Viagens.jsx"));
const Configuracoes = lazy(() => import("./pages/Configuracoes/Configuracoes.jsx"));

// Telas demonstrativas (dados de exemplo, sem API e sem login, como no original).
const Usuarios = lazy(() => import("./pages/Usuarios/Usuarios.jsx"));
const Auditoria = lazy(() => import("./pages/Auditoria/Auditoria.jsx"));
const CadastroUsuario = lazy(() => import("./pages/CadastroUsuario/CadastroUsuario.jsx"));
const Logistica = lazy(() => import("./pages/Logistica/Logistica.jsx"));
const Monitoramento = lazy(() => import("./pages/Monitoramento/Monitoramento.jsx"));


// /dashboard.html?veiculo=X -> /dashboard?veiculo=X (etiquetas QR impressas).
function RedirecionarLegado({ para }) {

  const { search, hash } = useLocation();

  return <Navigate to={{ pathname: para, search, hash }} replace />;

}


export default function App() {

  return (
    <Suspense fallback={null}>
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/veiculos" element={<Veiculos />} />
          <Route path="/sensores" element={<Sensores />} />
          <Route path="/viagens" element={<Viagens />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>

        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/cadastro-usuario" element={<CadastroUsuario />} />
        <Route path="/logistica" element={<Logistica />} />
        <Route path="/monitoramento" element={<Monitoramento />} />

        {Object.entries(ROTAS_LEGADAS).map(([nome, para]) => (
          <Route key={nome} path={`/${nome}.html`} element={<RedirecionarLegado para={para} />} />
        ))}

        {/* O site antigo usava index.html como página 404. */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Suspense>
  );

}
