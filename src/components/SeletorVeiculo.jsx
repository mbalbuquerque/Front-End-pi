// Seletor de veículo no topo (só aparece com mais de um veículo).
// Vai no extraTopo do PainelLayout:
//
//   extraTopo={escolha && <SeletorVeiculo veiculos={escolha.veiculos}
//                          veiculo={escolha.veiculo} aoTrocar={trocarVeiculo} />}

export default function SeletorVeiculo({ veiculos, veiculo, aoTrocar }) {

  if (!veiculos || veiculos.length < 2) {
    return null;
  }

  return (
    <label className="seletor-veiculo">
      <span>Veículo</span>
      <select
        id="seletorVeiculo"
        value={veiculo?.id ?? ""}
        onChange={evento => aoTrocar(evento.target.value)}
      >
        {veiculos.map(v => (
          <option key={v.id} value={v.id}>{v.id}</option>
        ))}
      </select>
    </label>
  );

}
