import qrcode from "qrcode-generator";
import { describe, expect, it } from "vitest";
import { desenharQr, enderecoEtiqueta } from "./etiqueta.js";


describe("enderecoEtiqueta", () => {

  it("mantém o formato das etiquetas já impressas", () => {
    expect(enderecoEtiqueta("CT-001", "https://site.exemplo"))
      .toBe("https://site.exemplo/dashboard.html?veiculo=CT-001");
  });

  it("codifica o código do veículo", () => {
    expect(enderecoEtiqueta("CT 01/A", "http://x"))
      .toBe("http://x/dashboard.html?veiculo=CT%2001%2FA");
  });

});


describe("desenharQr", () => {

  it("gera o mesmo desenho que o createSvgTag antigo", () => {

    const texto = "http://x/dashboard.html?veiculo=CT-001";
    const { tamanho, caminho } = desenharQr(texto);

    const qr = qrcode(0, "M");
    qr.addData(texto);
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });

    expect(svg).toContain(`viewBox="0 0 ${tamanho} ${tamanho}"`);
    expect(svg).toContain(`<path d="${caminho}"`);

  });

});
