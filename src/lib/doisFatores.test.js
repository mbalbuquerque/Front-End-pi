import { describe, expect, it } from "vitest";
import { agruparSegredo, limparCodigo, limparRecuperacao, segredoDaUri, textoCodigos } from "./doisFatores.js";


describe("doisFatores", () => {

  it("limparCodigo deixa só 6 dígitos", () => {
    expect(limparCodigo("123 456")).toBe("123456");
    expect(limparCodigo("12-34-5678")).toBe("123456");
    expect(limparCodigo("abc")).toBe("");
  });

  it("limparRecuperacao deixa 8 caracteres minúsculos", () => {
    expect(limparRecuperacao("A1B2-C3D4")).toBe("a1b2c3d4");
    expect(limparRecuperacao(" a1b2 c3d4 e5 ")).toBe("a1b2c3d4");
  });

  it("segredoDaUri lê o secret do otpauth://", () => {
    expect(segredoDaUri("otpauth://totp/ColdTrack:a%40b.com?secret=jbswy3dpehpk3pxp&issuer=ColdTrack")).toBe("JBSWY3DPEHPK3PXP");
    expect(segredoDaUri("otpauth://totp/x?issuer=ColdTrack&secret=ABC")).toBe("ABC");
    expect(segredoDaUri("otpauth://totp/x")).toBe("");
    expect(segredoDaUri(undefined)).toBe("");
  });

  it("agruparSegredo separa de 4 em 4", () => {
    expect(agruparSegredo("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(agruparSegredo("ABCDEF")).toBe("ABCD EF");
    expect(agruparSegredo("")).toBe("");
  });

  it("textoCodigos lista um código por linha", () => {
    const texto = textoCodigos(["a1b2c3d4", "e5f6a7b8"]);
    expect(texto).toContain("uma vez só");
    expect(texto.trim().split("\n").slice(-2)).toEqual(["a1b2c3d4", "e5f6a7b8"]);
  });

});
