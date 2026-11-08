// Fonte única das rotas: usada pelo App.jsx (React Router) e pelo
// vite.config.js (cópias de index.html com o nome antigo de cada página).

// Nome antigo (sem .html) -> rota nova. As etiquetas QR impressas apontam
// para /dashboard.html?veiculo=<id>, então essas URLs precisam continuar vivas.
export const ROTAS_LEGADAS = {
  index: "/",
  login: "/login",
  cadastro: "/cadastro",
  dashboard: "/dashboard",
  alertas: "/alertas",
  relatorios: "/relatorios",
  veiculos: "/veiculos",
  sensores: "/sensores",
  viagens: "/viagens",
  configuracoes: "/configuracoes",
  usuarios: "/usuarios",
  auditoria: "/auditoria",
  "cadastro-usuario": "/cadastro-usuario",
  logistica: "/logistica",
  monitoramento: "/monitoramento"
};


// Menu lateral das telas logadas (PainelLayout), na ordem do menu antigo.
export const PAGINAS_PAINEL = [
  { rota: "/dashboard", icone: "▦", nome: "Dashboard" },
  { rota: "/veiculos", icone: "🚚", nome: "Veículos" },
  { rota: "/sensores", icone: "📡", nome: "Sensores" },
  { rota: "/viagens", icone: "↗", nome: "Viagens" },
  { rota: "/alertas", icone: "⚠", nome: "Alertas" },
  { rota: "/relatorios", icone: "▤", nome: "Relatórios" },
  { rota: "/configuracoes", icone: "⚙", nome: "Configurações" }
];
