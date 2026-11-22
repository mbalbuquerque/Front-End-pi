// Ícones de traço (24x24, currentColor) da navegação do painel. Desenhados em
// SVG no próprio código: sem fonte de ícones externa (CSP font-src 'self') e
// sem emoji, que muda de cara em cada sistema. Sempre decorativos: o texto ao
// lado (ou o aria-label do botão) é que dá o nome.

const TRACOS = {
  painel: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  veiculo: <><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  sensor: <><circle cx="12" cy="12" r="2" /><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></>,
  viagem: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.8" /></>,
  alerta: <><path d="M12 3.5 2.8 19.5h18.4z" /><path d="M12 10v4.5M12 17v.5" /></>,
  relatorio: <><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  logistica: <><path d="M3.5 7.5h17v13h-17z" /><path d="M2.5 3.5h19v4h-19zM9.5 12h5" /></>,
  usuarios: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20" /></>,
  auditoria: <><path d="M12 2.8 4 6v5.5c0 4.6 3.3 8.4 8 9.7 4.7-1.3 8-5.1 8-9.7V6z" /><path d="m8.8 12 2.2 2.2 4.4-4.4" /></>,
  monitoramento: <><path d="M3.5 3.5v17h17" /><path d="m7 15 4-5 3.5 3L20 7" /></>,
  configuracoes: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9" /></>,
  sair: <><path d="M14.5 4.5h-9v15h9" /><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" /></>,
  mais: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  critico: <><path d="M8.2 2.8h7.6l5.4 5.4v7.6l-5.4 5.4H8.2l-5.4-5.4V8.2z" /><path d="M12 7.5v5.5M12 16v.5" /></>,
  aguardando: <><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3.2 2" /></>,
  umidade: <path d="M12 3.2s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11z" />,
  usuario: <><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="10" r="3.2" /><path d="M6.3 18.6a6.5 6.5 0 0 1 11.4 0" /></>,
  relogio: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  termometro: <><path d="M10 4.5a2 2 0 0 1 4 0v9.3a4 4 0 1 1-4 0z" /><path d="M12 10v6" /></>,
  leituras: <path d="M5 20v-6M10 20V9M15 20v-8M20 20V5" />,
  ok: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></>,
  wifi: <><path d="M2.8 9a13 13 0 0 1 18.4 0M5.9 12.2a8.6 8.6 0 0 1 12.2 0M9 15.4a4.2 4.2 0 0 1 6 0" /><path d="M12 18.8v.2" /></>,
  semSinal: <><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" /><path d="M3.5 3.5l17 17" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></>,
  usb: <><path d="M12 21V4M12 4l-2.5 3M12 4l2.5 3" /><path d="M12 15l-4.5-3V9.5M12 13l4.5-2.5V8" /><rect x="6" y="7.5" width="3" height="2" /><circle cx="16.5" cy="7" r="1.2" /><circle cx="12" cy="20" r="1.2" /></>,
  adicionar: <path d="M12 5v14M5 12h14" />,
  baixar: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></>,
  busca: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5.5 5.5" /></>,
  calendario: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  atualizar: <><path d="M20 11a8 8 0 0 0-14.3-4.6L3.5 9" /><path d="M3.5 4v5h5" /><path d="M4 13a8 8 0 0 0 14.3 4.6l2.2-2.6" /><path d="M20.5 20v-5h-5" /></>,
  cadeado: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  sino: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  entrar: <><path d="M9.5 4.5h9v15h-9" /><path d="M3.5 12H14M10.5 8.5 14 12l-3.5 3.5" /></>,
  editar: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  predio: <><path d="M4.5 20.5v-16h9v16M13.5 9.5h6v11" /><path d="M3 20.5h18M7.5 8h3M7.5 11.5h3M7.5 15h3M16 13h1M16 16.5h1" /></>,
  ajuda: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17v.2" /></>,
  seta: <path d="m9.5 6 6 6-6 6" />,
  marca: <path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 3.8 12 6l2.5-2.2M9.5 20.2 12 18l2.5 2.2M3.6 10.4 6.6 9.6 5.8 6.6M20.4 13.6l-3-.8.8 3M3.6 13.6l3-.8-.8 3M20.4 10.4l-3-.8.8-3" />
};

export default function Icone({ nome, tamanho = 22 }) {

  return (
    <svg
      className="ct-icone"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRACOS[nome]}
    </svg>
  );

}
