// Etiqueta QR do veículo: endereço que o QR abre e o desenho do código.
// Sem React, para poder testar sozinho.

import qrcode from "qrcode-generator";


// O QR abre o painel já neste veículo. Formato fixo: as etiquetas já
// impressas usam /dashboard.html?veiculo=<id> (a rota antiga continua viva).
export function enderecoEtiqueta(codigo, origem = window.location.origin) {

  return `${origem}/dashboard.html?veiculo=${encodeURIComponent(codigo)}`;

}


// Mesmo desenho do antigo qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }),
// mas devolvido como dados ({ tamanho, caminho }) para montar o <svg> em JSX.
export function desenharQr(texto, { celula = 6, margem = 2 } = {}) {

  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();

  const modulos = qr.getModuleCount();
  const quadrado = `l${celula},0 0,${celula} -${celula},0 0,-${celula}z `;

  let caminho = "";

  for (let r = 0; r < modulos; r += 1) {
    for (let c = 0; c < modulos; c += 1) {
      if (qr.isDark(r, c)) {
        caminho += `M${c * celula + margem},${r * celula + margem}${quadrado}`;
      }
    }
  }

  return { tamanho: modulos * celula + margem * 2, caminho };

}
