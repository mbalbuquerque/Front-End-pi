import { describe, expect, it } from "vitest";
import { USUARIOS, filtrarUsuarios } from "./usuarios.js";

describe("filtrarUsuarios", () => {
  it("sem filtro devolve todos", () => {
    expect(filtrarUsuarios(USUARIOS, {})).toHaveLength(4);
  });
  it("pesquisa ignora caixa e espaços", () => {
    expect(filtrarUsuarios(USUARIOS, { termo: "  ANA OLIV " }).map(u => u.id)).toEqual([1]);
  });
  it("combina perfil e status", () => {
    expect(filtrarUsuarios(USUARIOS, { perfil: "cliente", status: "ativo" })).toHaveLength(0);
    expect(filtrarUsuarios(USUARIOS, { status: "inativo" }).map(u => u.id)).toEqual([3]);
  });
});
