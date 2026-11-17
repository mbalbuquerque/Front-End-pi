import { entrarComo, expect, HOST_API, simularApi, test } from "./apoio.js";

// Cadastro de veículo e de viagem na gaveta da direita (design system, seção 7).
// API simulada: o POST é capturado aqui, nada sai para o Azure.

const CASOS = [
  {
    rota: "/veiculos",
    botao: "Cadastrar veículo",
    form: "#formVeiculo",
    caminho: "/api/veiculos",
    preencher: async gaveta => {
      await gaveta.getByLabel("Código").fill("QA-77");
      await gaveta.getByLabel("Tipo").fill("Baú refrigerado");
    },
    salvar: "Cadastrar",
    esperado: { id: "QA-77", tipo: "Baú refrigerado", deviceId: "esp32-teste-02" }
  },
  {
    rota: "/viagens",
    botao: "Registrar viagem",
    form: "#formViagem",
    caminho: "/api/viagens",
    preencher: async gaveta => {
      await gaveta.getByLabel("Origem").fill("Juazeiro/BA");
      await gaveta.getByLabel("Destino").fill("Salvador/BA");
      await gaveta.getByLabel("Carga").fill("Manga");
    },
    salvar: "Registrar",
    esperado: { veiculo: "VAN-01", origem: "Juazeiro/BA", destino: "Salvador/BA", carga: "Manga" }
  }
];


for (const caso of CASOS) {

  test.describe(`QA-FROTA gaveta ${caso.rota}`, () => {

    test.beforeEach(async ({ page }) => {
      await entrarComo(page, "gestor");
      await simularApi(page);
    });

    test(`QA-FROTA ${caso.rota}: abre a gaveta, envia o POST e fecha`, async ({ page }) => {

      const enviados = [];
      await page.route(HOST_API, async (route, pedido) => {
        if (pedido.method() === "POST" && new URL(pedido.url()).pathname === caso.caminho) {
          enviados.push(pedido.postDataJSON());
        }
        return route.fallback();
      });

      await page.goto(caso.rota);
      const gaveta = page.locator("#painelNovo");
      await expect(gaveta).toBeHidden();

      await page.getByRole("button", { name: caso.botao }).click();
      await expect(page.getByRole("dialog", { name: caso.botao })).toBeVisible();
      await expect(gaveta.locator(caso.form)).toBeVisible();

      await caso.preencher(gaveta);
      await gaveta.getByRole("button", { name: caso.salvar, exact: true }).click();

      await expect(gaveta).toBeHidden();
      expect(enviados).toHaveLength(1);
      expect(enviados[0]).toMatchObject(caso.esperado);

    });

    test(`QA-FROTA ${caso.rota}: Escape e Cancelar fecham sem enviar`, async ({ page }) => {

      await page.goto(caso.rota);
      const gaveta = page.locator("#painelNovo");

      await page.getByRole("button", { name: caso.botao }).click();
      await expect(gaveta).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(gaveta).toBeHidden();

      await page.getByRole("button", { name: caso.botao }).click();
      await gaveta.getByRole("button", { name: "Cancelar" }).click();
      await expect(gaveta).toBeHidden();

      // O foco volta para quem abriu (comportamento do <dialog> modal).
      await expect(page.getByRole("button", { name: caso.botao })).toBeFocused();

    });

  });

}


test("QA-FROTA celular: a gaveta ocupa a largura toda e os botões têm 44 px", async ({ page }) => {

  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, "gestor");
  await simularApi(page);
  await page.goto("/veiculos");

  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  const gaveta = page.locator("#painelNovo");
  await expect(gaveta).toBeVisible();

  const caixa = await gaveta.boundingBox();
  expect(Math.round(caixa.width)).toBe(390);

  for (const nome of ["Fechar", "Cancelar", "Cadastrar"]) {
    const botao = await gaveta.getByRole("button", { name: nome, exact: true }).boundingBox();
    expect(botao.height, `${nome} com alvo de toque`).toBeGreaterThanOrEqual(44);
  }

});
