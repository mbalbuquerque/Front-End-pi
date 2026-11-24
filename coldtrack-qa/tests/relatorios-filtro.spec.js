import { entrarComo, errosDoConsole, expect, simularApi, test, HOST_API } from "./apoio.js";

// Histórico em Relatórios: filtro por período (24 h / 7 dias) e por sensor
// (o seletor de veículo escolhe o sensor ligado a ele). Confere o que a tela
// pede à API e o que ela mostra.

const DOIS_VEICULOS = [
  { id: "VAN-01", deviceId: "esp32-teste-01", perfil: "demonstrativo", tipo: "Van refrigerada" },
  { id: "BAU-02", deviceId: "esp32-teste-02", perfil: "demonstrativo", tipo: "Baú refrigerado" }
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

function leiturasDe(deviceId, quantidade = 12) {
  const agora = Date.now();
  return Array.from({ length: quantidade }, (_, i) => ({
    deviceId,
    temperatura: 4 + (i % 3) * 0.5,
    umidade: 70,
    rssi: -61,
    status: "NORMAL",
    medidoEm: new Date(agora - i * 20000).toISOString(),
    recebidoEm: new Date(agora - i * 20000).toISOString()
  }));
}

test.describe("QA - Relatórios: filtro do histórico", () => {

  let pedidos;

  test.beforeEach(async ({ page }) => {
    pedidos = [];
    await entrarComo(page, "gestor");
    await simularApi(page);
    // Registrada depois do simularApi: tem prioridade sobre ele.
    await page.route(HOST_API, async route => {
      const url = new URL(route.request().url());
      const caminho = url.pathname.replace(/^\/api/, "");
      if (route.request().method() === "GET" && caminho === "/veiculos") {
        return route.fulfill({ json: { veiculos: DOIS_VEICULOS }, headers: CORS });
      }
      if (route.request().method() === "GET" && caminho === "/leituras") {
        const deviceId = url.searchParams.get("deviceId");
        pedidos.push({ deviceId, horas: url.searchParams.get("horas") });
        return route.fulfill({ json: { leituras: leiturasDe(deviceId) }, headers: CORS });
      }
      return route.fallback();
    });
  });

  test("QA-REL-01 período: 7 dias pede horas=168 e muda o resumo", async ({ page }) => {
    const erros = errosDoConsole(page);
    await page.goto("/relatorios");

    await expect(page.getByText("últimas 24 h").first()).toBeVisible();
    expect(pedidos.at(-1).horas).toBe("24");

    await page.getByRole("button", { name: "Últimos 7 dias" }).click();
    await expect(page.getByRole("button", { name: "Últimos 7 dias" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("últimos 7 dias").first()).toBeVisible();
    await expect.poll(() => pedidos.at(-1).horas).toBe("168");

    expect(erros).toEqual([]);
  });

  test("QA-REL-02 sensor: trocar o veículo pede as leituras do sensor dele", async ({ page }) => {
    const erros = errosDoConsole(page);
    await page.goto("/relatorios");

    const seletor = page.locator("#seletorVeiculo");
    await expect(seletor).toBeVisible();
    // A ordem das opções é a da tela (ordenada); confere o texto de cada uma.
    await expect(seletor.locator("option", { hasText: "VAN-01 · sensor esp32-teste-01" })).toHaveCount(1);
    await expect(seletor.locator("option", { hasText: "BAU-02 · sensor esp32-teste-02" })).toHaveCount(1);

    const inicial = await seletor.inputValue();
    const outro = inicial === "VAN-01" ? "BAU-02" : "VAN-01";
    const sensorDe = { "VAN-01": "esp32-teste-01", "BAU-02": "esp32-teste-02" };
    await expect.poll(() => pedidos.at(-1)?.deviceId).toBe(sensorDe[inicial]);

    await seletor.selectOption(outro);
    await expect.poll(() => pedidos.at(-1).deviceId).toBe(sensorDe[outro]);
    await expect(seletor).toHaveValue(outro);

    expect(erros).toEqual([]);
  });

});
