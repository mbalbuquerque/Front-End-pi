// Filtro de período (antigo FILTRO_PERIODO + ligarFiltroPeriodo).
//
//   const [horas, setHoras] = useState(24);
//   <div className="acoes"><FiltroPeriodo horas={horas} aoMudar={setHoras} /></div>

const OPCOES = [
  { horas: 24, texto: "Últimas 24 h" },
  { horas: 168, texto: "Últimos 7 dias" }
];

export default function FiltroPeriodo({ horas, aoMudar }) {

  return (
    <div className="filtro" role="group" aria-label="Período">
      {OPCOES.map(opcao => (
        <button
          key={opcao.horas}
          type="button"
          data-horas={opcao.horas}
          aria-pressed={String(opcao.horas === horas)}
          onClick={() => aoMudar(opcao.horas)}
        >
          {opcao.texto}
        </button>
      ))}
    </div>
  );

}
