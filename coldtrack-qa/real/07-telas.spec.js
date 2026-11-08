import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ESTADO, MOTIVO_SEM_CREDENCIAIS, TEM_CREDENCIAIS, errosDoConsole, semRolagemHorizontal } from "./apoio-real.js";

// Cada tela do painel, com a sessão do gestor (a que mostra mais controles),
// em 1280 px e em 390 px: título, dados do Azure, sem erro no console e sem
// rolagem horizontal. E o CSV do relatório, baixado de verdade.

test.skip(!TEM_CREDENCIAIS, MOTIVO_SEM_CREDENCIAIS);
test.use({ storageState: ESTADO.gestor });

const TELAS = [
  { rota: "/dashboard", titulo: "Visão Geral", documento: "ColdTrack Control" },
  { rota: "/alertas", titulo: "Alertas" },
  { rota: "/relatorios", titulo: "Relatórios" },
  { rota: "/veiculos", titulo: "Veículos" },
  { rota: "/sensores", titulo: "Sensores" },
  { rota: "/viagens", titulo: "Viagens" },
  { rota: "/configuracoes", titulo: "Configurações" }
];

const LARGURAS = [
  { largura: 1280, altura: 800 },
  { largura: 390, altura: 844 }
];


for (const { largura, altura } of LARGURAS) {

  for (const tela of TELAS) {

    test(`REAL-TEL ${tela.rota} em ${largura} px`, async ({ page }) => {

      const erros = errosDoConsole(page);

      await page.setViewportSize({ width: largura, height: altura });
      await page.goto(tela.rota);

      await expect(page.getByRole("heading", { level: 1, name: tela.titulo })).toBeVisible();
      await expect(page).toHaveTitle(tela.documento || `${tela.titulo} · ColdTrack Control`);
      await expect(page.getByText("Azure conectado")).toBeVisible();

      // Conteúdo carregado (sai do "Carregando").
      await expect(page.locator("#conteudo .estado", { hasText: /^Carregando/ })).toHaveCount(0);

      const medidas = await semRolagemHorizontal(page);
      expect(medidas.conteudo, `${tela.rota}: conteúdo com ${medidas.conteudo}px numa tela de ${medidas.tela}px`)
        .toBeLessThanOrEqual(medidas.tela);

      expect(erros, `Erros no console em ${tela.rota}:\n${erros.join("\n")}`).toEqual([]);

    });

  }

}


test("REAL-TEL-CSV: relatório baixa CSV com o cabeçalho e as leituras da tela", async ({ page }, testInfo) => {

  await page.goto("/relatorios");
  await expect(page.getByText("Azure conectado")).toBeVisible();

  await page.locator('[data-horas="168"]').click();
  await expect(page.locator('[data-horas="168"]')).toHaveAttribute("aria-pressed", "true");

  const botao = page.locator("#baixarCsv");
  // "nas" no build antigo, "nos" depois da correção do texto.
  const vazio = page.getByText(/^Nenhuma leitura n[ao]s últimos 7 dias\.$/);
  await expect(botao.or(vazio)).toBeVisible();

  // Sem leitura na última semana (sensor físico desligado): a tela mostra o
  // estado vazio. Para ainda assim baixar o CSV, o pedido segue para a API de
  // verdade só sem o filtro de período (as últimas leituras reais do sensor).
  if (await vazio.isVisible()) {
    testInfo.annotations.push({ type: "aviso", description: "sem leituras em 7 dias: CSV gerado com as últimas leituras reais, sem filtro de período" });
    await page.route(/\/api\/leituras\?/, async route => {
      const url = new URL(route.request().url());
      url.searchParams.delete("horas");
      await route.continue({ url: url.href });
    });
    await page.locator('[data-horas="24"]').click();
    await page.locator('[data-horas="168"]').click();
    await expect(botao).toBeVisible();
  }

  // Espera a tela trocar de período antes de baixar: o botão já aparece com os
  // dados de 24 h enquanto os de 7 dias ainda estão chegando.
  await expect(page.getByText(/últimos 7 dias/).first()).toBeVisible();

  const linhasTela = await page.locator("table.tabela tbody tr").count();
  expect(linhasTela).toBeGreaterThan(0);

  const [download] = await Promise.all([page.waitForEvent("download"), botao.click()]);
  expect(download.suggestedFilename()).toMatch(/^coldtrack-[A-Z0-9-]+-168h\.csv$/);

  const texto = readFileSync(await download.path(), "utf8");
  expect(texto.charCodeAt(0)).toBe(0xFEFF);

  const linhas = texto.slice(1).split("\n");
  expect(linhas[0]).toBe("medido_em;temperatura_c;umidade_pct;rssi_dbm;status");
  expect(linhas.length - 1).toBe(linhasTela);
  for (const linha of linhas.slice(1)) {
    expect(linha).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z;-?[\d.]+;[\d.]+;-?\d*;(NORMAL|ATENCAO|CRITICO)$/);
  }

});
