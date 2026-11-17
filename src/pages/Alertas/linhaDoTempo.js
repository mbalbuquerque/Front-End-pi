// Regras da linha do tempo de Alertas sem React: agrupar por dia e desenhar a
// linha de uma ocorrência (coordenadas do SVG).

import { formatarTemp } from "../../lib/formatar.js";


const chaveDoDia = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;


// Ocorrências (mais recente primeiro) em grupos por dia local: [{ chave, rotulo, ocorrencias }].
export function agruparPorDia(ocorrencias, hoje = new Date()) {

  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const grupos = [];

  ocorrencias.forEach(o => {

    const chave = chaveDoDia(o.inicio);
    let grupo = grupos.find(g => g.chave === chave);

    if (!grupo) {
      const data = o.inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const rotulo =
        chave === chaveDoDia(hoje) ? `Hoje, ${data}` :
        chave === chaveDoDia(ontem) ? `Ontem, ${data}` : data;
      grupo = { chave, rotulo, ocorrencias: [] };
      grupos.push(grupo);
    }

    grupo.ocorrencias.push(o);

  });

  return grupos;

}


// Linha da ocorrência contra o limite que ela passou: acima do máximo da faixa
// (calor) ou abaixo do mínimo (frio). Escala vertical com folga de 1 °C.
export function linhaDaOcorrencia(ocorrencia, faixa, largura = 600, altura = 96) {

  const frio = faixa.min != null && ocorrencia.leituras.every(l => l.temperatura < faixa.min);
  const limite = frio ? faixa.min : faixa.max;

  const temps = ocorrencia.leituras.map(l => l.temperatura);
  const yMin = Math.min(...temps, limite) - 1;
  const yMax = Math.max(...temps, limite) + 1;

  const t0 = ocorrencia.leituras[0].data.getTime();
  const t1 = ocorrencia.leituras[ocorrencia.leituras.length - 1].data.getTime();
  const margem = 4;

  const x = t => (t1 === t0 ? largura / 2 : ((t - t0) / (t1 - t0)) * largura);
  const y = v => margem + (1 - (v - yMin) / (yMax - yMin)) * (altura - 2 * margem);
  const r = v => Math.round(v * 10) / 10;

  return {
    largura,
    altura,
    yLimite: r(y(limite)),
    pontos: ocorrencia.leituras.map(l => `${r(x(l.data.getTime()))},${r(y(l.temperatura))}`).join(" "),
    rotuloLimite: `limite ${frio ? "mínimo" : "máximo"} ${formatarTemp(limite)}`,
    descricao: `${temps.length} leituras fora da faixa, de ${formatarTemp(Math.min(...temps))} a ${formatarTemp(Math.max(...temps))}; limite ${formatarTemp(limite)}.`
  };

}
