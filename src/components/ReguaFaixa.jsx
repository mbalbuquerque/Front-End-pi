// Régua de faixa da carga (design system, seção 7): zonas segura, atenção e
// crítica com o marcador no valor atual. Um componente, duas variantes:
// - "painel" (padrão): cartão herói da Visão Geral, com valor sobre o marcador,
//   escala e legenda em texto (a cor nunca é a única pista);
// - "motorista": tela do celular no suporte, barra grossa com os limites
//   embaixo e o valor numa bolha sobre o marcador; decorativa para leitor de tela (a faixa e o valor já estão em
//   texto logo acima).
// A escala de cada variante é calculada em lib/regua.js.

import { descreverCritico, descreverNormal } from "../lib/faixas.js";
import { formatarTemp } from "../lib/formatar.js";
import { descreverAtencao, montarRegua, reguaDaFaixa } from "../lib/regua.js";


export default function ReguaFaixa({ faixa, temperatura, variante = "painel", id }) {

  return variante === "motorista"
    ? <ReguaMotorista faixa={faixa} temperatura={temperatura} id={id} />
    : <ReguaPainel faixa={faixa} temperatura={temperatura} id={id} />;

}


function ReguaPainel({ faixa, temperatura, id }) {

  const regua = montarRegua(faixa, temperatura);
  const temValor = regua.marcador != null;

  // Rótulo do marcador encosta na borda em vez de sair da régua.
  const lado = !temValor ? "" : regua.marcador < 15 ? " regua-valor--inicio" : regua.marcador > 85 ? " regua-valor--fim" : "";

  return (
    <div className="regua-faixa" id={id}>

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


function ReguaMotorista({ faixa, temperatura, id }) {

  const regua = reguaDaFaixa(faixa, temperatura);

  if (!regua) {
    return null;
  }

  return (
    <div className="regua" id={id} aria-hidden="true">
      <div className="regua-barra">
        <span className="regua-zonas">
          {regua.zonas.map((zona, i) => (
            <span key={i} className={`zona zona-${zona.tipo}`} style={{ width: `${zona.largura}%` }} />
          ))}
        </span>
        {regua.marcador !== null && (
          <span className="regua-marcador" style={{ left: `${regua.marcador}%` }}>
            <span className={`regua-bolha${regua.marcador < 15 ? " inicio" : regua.marcador > 85 ? " fim" : ""}`}>
              {formatarTemp(temperatura)}
            </span>
          </span>
        )}
      </div>
      <div className="regua-limites">
        {regua.limites.map(limite => (
          <span key={limite.valor} style={{ left: `${limite.posicao}%` }}>{limite.valor} °C</span>
        ))}
      </div>
    </div>
  );

}
