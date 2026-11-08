import { describe, expect, it } from "vitest";
import { formatarCPF, validarCPF } from "./cpf.js";

describe("validarCPF", () => {
  it("aceita CPF válido, com ou sem máscara", () => {
    expect(validarCPF("52998224725")).toBe(true);
    expect(validarCPF("529.982.247-25")).toBe(true);
  });
  it("rejeita dígito errado, sequência repetida e tamanho errado", () => {
    expect(validarCPF("52998224726")).toBe(false);
    expect(validarCPF("11111111111")).toBe(false);
    expect(validarCPF("123")).toBe(false);
    expect(validarCPF("")).toBe(false);
  });
});

describe("formatarCPF", () => {
  it("aplica a máscara progressivamente", () => {
    expect(formatarCPF("529")).toBe("529");
    expect(formatarCPF("5299")).toBe("529.9");
    expect(formatarCPF("529982")).toBe("529.982");
    expect(formatarCPF("5299822")).toBe("529.982.2");
    expect(formatarCPF("52998224725999")).toBe("529.982.247-25");
  });
});
