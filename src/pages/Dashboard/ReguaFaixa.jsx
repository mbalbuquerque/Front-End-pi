// Régua de faixa do cartão herói (design system, seção 7): zonas segura,
// atenção e crítica da carga, com o marcador no valor atual. A legenda diz os
// limites em texto: a cor nunca é a única pista.

import { descreverCritico, descreverNormal } from "../../lib/faixas.js";
import { formatarTemp } from "../../lib/formatar.js";
import { descreverAtencao, montarRegua } from "./regua.js";


export default function ReguaFaixa({ faixa, temperatura }) {

  const regua = montarRegua(faixa, temperatura);
  const temValor = regua.marcador != null;

  // Rótulo do marcador encosta na borda em vez de sair da régua.
  const lado = !temValor ? "" : regua.marcador < 15 ? " regua-valor--inicio" : regua.marcador > 85 ? " regua-valor--fim" : "";

  return (
    <div className="regua-faixa">

      <div
        className="regua-trilho"
        role="img"
        aria-label={temValor
          ? `Régua de faixa de ${regua.inicio} a ${regua.fim} °C, temperatura atual ${formatarTemp(temperatura)}`
          : `Régua de faixa de ${regua.inicio} a ${regua.fim} °C, sem leitura`}
      >
        {regua.zonas.map((zona, i) => (
          <span
            key={`${zona.tipo}-${zona.de}`}
            className={`regua-zona regua-zona--${zona.tipo}${i === 0 ? " regua-zona--primeira" : ""}${i === regua.zonas.length - 1 ? " regua-zona--ultima" : ""}`}
            style={{ flexGrow: zona.largura }}
          />
        ))}

        {temValor && (
          <span className="regua-marcador" style={{ left: `${regua.marcador}%` }}>
            <span className={`regua-valor${lado}`}>{formatarTemp(temperatura)}</span>
          </span>
        )}
      </div>

      <div className="regua-escala" aria-hidden="true">
        <span>{regua.inicio} °C</span>
        <span>{regua.fim} °C</span>
      </div>

      <ul className="regua-legenda">
        <li className="regua-legenda--normal">Segura: {descreverNormal(faixa)}</li>
        <li className="regua-legenda--atencao">Atenção: {descreverAtencao(faixa)}</li>
        <li className="regua-legenda--critico">Crítica: {descreverCritico(faixa)}</li>
      </ul>

    </div>
  );

}
