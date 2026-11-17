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
  monitoramento: "/monitoramento",
  motorista: "/motorista"
};


// Navegação única do painel (PainelLayout), em dois grupos, como no design
// system (docs/design-system.md, seção 7). "celular": posição do item na barra
// inferior do celular (Visão geral, Alertas, Sensores, Viagens; o resto fica em "Mais"). "tambem": rotas que acendem
// o mesmo item (o formulário de novo usuário pertence a Usuários).
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
      { rota: "/logistica", icone: "logistica", nome: "Logística" },
      { rota: "/usuarios", icone: "usuarios", nome: "Usuários", tambem: ["/cadastro-usuario"] },
      { rota: "/auditoria", icone: "auditoria", nome: "Auditoria" },
      { rota: "/monitoramento", icone: "monitoramento", nome: "Monitoramento ThingSpeak" },
      { rota: "/configuracoes", icone: "configuracoes", nome: "Configurações" }
    ]
  }
];


// Lista plana, na ordem do menu.
export const PAGINAS_PAINEL = GRUPOS_PAINEL.flatMap(grupo => grupo.paginas);
