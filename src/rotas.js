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
  usuarios: "/configuracoes",
  auditoria: "/dashboard",
  "cadastro-usuario": "/configuracoes",
  logistica: "/viagens",
  monitoramento: "/monitoramento",
  motorista: "/motorista"
};


// Telas que mostravam dados de exemplo (sem API) e foram retiradas. O endereço
// continua vivo e leva à tela real: usuários são geridos em Configurações
// (GET /usuarios), cargas são as viagens (GET /viagens) e a API não tem registro
// de auditoria, então /auditoria volta à visão geral.
export const ROTAS_REMOVIDAS = {
  "/usuarios": "/configuracoes#painelUsuarios",
  "/cadastro-usuario": "/configuracoes#painelUsuarios",
  "/logistica": "/viagens",
  "/auditoria": "/dashboard"
};


// Navegação única do painel (PainelLayout), em dois grupos, como no design
// system (docs/design-system.md, seção 7). "celular": posição do item na barra
// inferior do celular (Visão geral, Alertas, Sensores, Viagens; o resto fica em "Mais"). "tambem": rotas que acendem
// o mesmo item. "gestor": só aparece para o perfil gestor (Usuários abre a seção
// de usuários de Configurações, que só o gestor vê).
export const GRUPOS_PAINEL = [
  {
    nome: "Operação",
    paginas: [
      { rota: "/dashboard", icone: "painel", nome: "Visão geral", celular: 1 },
      { rota: "/veiculos", icone: "veiculo", nome: "Veículos" },
      { rota: "/sensores", icone: "sensor", nome: "Sensores", celular: 3 },
      { rota: "/viagens", icone: "viagem", nome: "Viagens", celular: 4 },
      { rota: "/alertas", icone: "alerta", nome: "Alertas", celular: 2 },
      { rota: "/relatorios", icone: "relatorio", nome: "Relatórios" }
    ]
  },
  {
    nome: "Gestão",
    paginas: [
      { rota: "/configuracoes#painelUsuarios", icone: "usuarios", nome: "Usuários", gestor: true },
      { rota: "/monitoramento", icone: "monitoramento", nome: "Monitoramento ThingSpeak" },
      { rota: "/configuracoes", icone: "configuracoes", nome: "Configurações" }
    ]
  }
];


// Lista plana, na ordem do menu.
export const PAGINAS_PAINEL = GRUPOS_PAINEL.flatMap(grupo => grupo.paginas);
