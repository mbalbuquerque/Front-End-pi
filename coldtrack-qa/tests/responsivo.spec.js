import { abrirMenu, entrarComo, errosDoConsole, expect, simularApi, test } from "./apoio.js";

// Todas as rotas em 390 px (celular comum): sem rolagem horizontal e sem
// erro no console. Sessão de gestor (a que mostra mais controles) e API simulada.

const PUBLICAS = ["/", "/cadastro"];
const LOGADAS = ["/dashboard", "/alertas", "/relatorios", "/veiculos", "/sensores", "/viagens", "/configuracoes"];

test.use({ viewport: { width: 390, height: 844 } });


async function semRolagemHorizontal(page, rota) {

  const medidas = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: window.innerWidth
  }));

  expect(medidas.conteudo, `${rota}: conteúdo com ${medidas.conteudo}px numa tela de ${medidas.tela}px`)
    .toBeLessThanOrEqual(medidas.tela);

}


test.describe("QA - Responsivo 390 px", () => {

  // A largura é fixa: rodar uma vez basta.
  test.skip(({ isMobile }) => isMobile, "viewport fixo em 390 px; roda só no projeto desktop");

  test("QA-041: login em 390 px", async ({ page }) => {
    const erros = errosDoConsole(page);
    await page.goto("/login");
    await expect(page.locator("#loginForm")).toBeVisible();
    await semRolagemHorizontal(page, "/login");
    expect(erros).toEqual([]);
  });

  for (const rota of PUBLICAS) {
    test(`QA-041: ${rota} em 390 px`, async ({ page }) => {
      const erros = errosDoConsole(page);
      await simularApi(page);
      await page.goto(rota);
      await page.locator("a[href]:visible, button:visible").first().waitFor();
      await semRolagemHorizontal(page, rota);
      expect(erros, erros.join("\n")).toEqual([]);
    });
  }

  test("QA-041: /monitoramento em 390 px (gestor)", async ({ page }) => {
    const erros = errosDoConsole(page);
    await entrarComo(page, "gestor");
    await simularApi(page);
    await page.goto("/monitoramento");
    await expect(page.getByRole("heading", { name: "Monitoramento de sensores" })).toBeVisible();
    await semRolagemHorizontal(page, "/monitoramento");
    expect(erros, erros.join("\n")).toEqual([]);
  });

  for (const rota of LOGADAS) {
    test(`QA-041: ${rota} em 390 px (gestor)`, async ({ page }) => {
      const erros = errosDoConsole(page);
      await entrarComo(page, "gestor");
      await simularApi(page);
      await page.goto(rota);
      await expect(page.getByText("Azure conectado")).toBeVisible();
      await semRolagemHorizontal(page, rota);
      expect(erros, erros.join("\n")).toEqual([]);
    });
  }

  test("QA-SHELL-01: navegação inferior com 5 itens; Mais abre o menu inteiro e o Sair", async ({ page }) => {
    await entrarComo(page, "gestor");
    await simularApi(page);
    await page.goto("/alertas");
    await expect(page.getByText("Azure conectado")).toBeVisible();

    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByRole("link", { name: "Visão geral" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Alertas" })).toHaveAttribute("aria-current", "page");
    await expect(menu.getByRole("link", { name: "Sensores" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Viagens" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Usuários" })).toBeHidden();
    await expect(page.locator("#botaoSair")).toBeHidden();

    // Alvo de toque >= 44px em todos os itens da barra.
    for (const alvo of await page.locator(".ct-nav-item:visible, .ct-mais").all()) {
      expect((await alvo.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }

    await abrirMenu(page);
    await expect(page.getByRole("button", { name: "Fechar", exact: true })).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: "Usuários" })).toBeVisible();
    await expect(page.locator("#botaoSair")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu.getByRole("link", { name: "Usuários" })).toBeHidden();
  });

});
