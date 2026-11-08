import { afterEach, describe, expect, it, vi } from "vitest";
import { limparCachePerfis } from "./faixas.js";
import { CHAVE_VEICULO, decidirVeiculo, escolherVeiculo, lembrarVeiculo } from "./veiculo.js";

const VEICULOS = [
  { id: "VAN-02", deviceId: "esp-2", perfil: "vacinas" },
  { id: "VAN-01", deviceId: "esp-1" }
];

const PERFIS = [
  { id: "demonstrativo", min: null, max: 15, margem: 5 },
  { id: "vacinas", min: 2, max: 8, margem: 2 }
];

afterEach(() => {
  localStorage.clear();
  limparCachePerfis();
  vi.unstubAllGlobals();
});


describe("decidirVeiculo", () => {

  it("ordena por id e prefere o ?veiculo= da URL", () => {
    const r = decidirVeiculo(VEICULOS, "VAN-02", "VAN-01");
    expect(r.veiculos.map(v => v.id)).toEqual(["VAN-01", "VAN-02"]);
    expect(r.veiculo.id).toBe("VAN-02");
  });

  it("sem URL usa o salvo; pedido inexistente cai no salvo", () => {
    expect(decidirVeiculo(VEICULOS, null, "VAN-02").veiculo.id).toBe("VAN-02");
    expect(decidirVeiculo(VEICULOS, "NAO-EXISTE", "VAN-02").veiculo.id).toBe("VAN-02");
  });

  it("sem URL nem salvo válido fica o primeiro por id; lista vazia dá null", () => {
    expect(decidirVeiculo(VEICULOS, null, "SUMIU").veiculo.id).toBe("VAN-01");
    expect(decidirVeiculo([], null, null).veiculo).toBeNull();
  });

  it("não altera a lista recebida", () => {
    const lista = [...VEICULOS];
    decidirVeiculo(lista, null, null);
    expect(lista).toEqual(VEICULOS);
  });

});


describe("escolherVeiculo", () => {

  function fetchFalso() {

    return vi.fn(url => Promise.resolve({
      status: 200,
      ok: true,
      json: () => Promise.resolve(url.endsWith("/perfis") ? { perfis: PERFIS } : { veiculos: VEICULOS })
    }));

  }

  it("usa o salvo no localStorage e a faixa do perfil do veículo", async () => {
    vi.stubGlobal("fetch", fetchFalso());
    lembrarVeiculo("VAN-02");

    expect(localStorage.getItem(CHAVE_VEICULO)).toBe("VAN-02");

    const r = await escolherVeiculo("");
    expect(r.veiculo.id).toBe("VAN-02");
    expect(r.perfil.id).toBe("vacinas");
    expect(r.faixa).toEqual({ min: 2, max: 8, margem: 2 });
  });

  it("?veiculo= ganha do salvo; veículo sem perfil usa o demonstrativo", async () => {
    vi.stubGlobal("fetch", fetchFalso());
    lembrarVeiculo("VAN-02");

    const r = await escolherVeiculo("?veiculo=VAN-01");
    expect(r.veiculo.id).toBe("VAN-01");
    expect(r.perfil.id).toBe("demonstrativo");
    expect(r.faixa).toEqual({ min: null, max: 15, margem: 5 });
  });

  it("busca /perfis uma vez só", async () => {
    const fetch = fetchFalso();
    vi.stubGlobal("fetch", fetch);

    await escolherVeiculo("");
    await escolherVeiculo("");

    expect(fetch.mock.calls.filter(([url]) => url.endsWith("/perfis"))).toHaveLength(1);
  });

});
