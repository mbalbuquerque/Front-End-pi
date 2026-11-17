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
  usuario: <><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="10" r="3.2" /><path d="M6.3 18.6a6.5 6.5 0 0 1 11.4 0" /></>,
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
