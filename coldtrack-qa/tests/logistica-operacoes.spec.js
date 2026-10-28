
const { test, expect } = require('@playwright/test');

test.describe('QA - Operações da Gestão Logística', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/logistica.html');
    await expect(page.locator('#tabelaCargas')).toContainText('CT-001');
  });

  async function detalhesDaCarga(page, id) {
    const linha = page.locator('#tabelaCargas tr').filter({ hasText: id });
    await linha.getByRole('button', { name: 'Detalhes' }).click();
    await expect(page.locator('#modalDetalhes')).toBeVisible();
  }

  test('QA-031: editar carga atualiza os dados', async ({ page }) => {
    await detalhesDaCarga(page, 'CT-001');

    await page.locator('#acoesDetalhes')
      .getByRole('button', { name: 'Editar' }).click();

    await expect(page.locator('#modalCarga')).toBeVisible();
    await page.locator('#produto').fill('Uva premium');
    await page.locator('#salvarCarga').click();

    await expect(page.locator('#modalCarga')).not.toBeVisible();
    await expect(
      page.locator('#tabelaCargas tr').filter({ hasText: 'CT-001' })
    ).toContainText('Uva premium');
  });

  test('QA-032: concluir entrega mediante confirmação', async ({ page }) => {
    await detalhesDaCarga(page, 'CT-001');

    await page.locator('#acoesDetalhes')
      .getByRole('button', { name: 'Concluir entrega' }).click();

    await expect(page.locator('#modalConfirmacao')).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar entrega' }).click();

    await expect(
      page.locator('#tabelaCargas tr').filter({ hasText: 'CT-001' })
    ).toContainText('Entregue');

    await expect(page.locator('#cargasTransporte')).toHaveText('1');
  });

  test('QA-033: cancelar carga mediante confirmação', async ({ page }) => {
    await detalhesDaCarga(page, 'CT-002');

    await page.locator('#acoesDetalhes')
      .getByRole('button', { name: 'Cancelar carga' }).click();

    await expect(page.locator('#modalConfirmacao')).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();

    await expect(
      page.locator('#tabelaCargas tr').filter({ hasText: 'CT-002' })
    ).toContainText('Cancelada');

    await expect(page.locator('#cargasAtencao')).toHaveText('0');
  });

  test('QA-034: carga finalizada não oferece ações de alteração', async ({ page }) => {
    await detalhesDaCarga(page, 'CT-001');

    await page.locator('#acoesDetalhes')
      .getByRole('button', { name: 'Concluir entrega' }).click();

    await page.getByRole('button', { name: 'Confirmar entrega' }).click();

    await detalhesDaCarga(page, 'CT-001');

    await expect(
      page.locator('#acoesDetalhes').getByRole('button', { name: 'Editar' })
    ).toHaveCount(0);

    await expect(
      page.locator('#acoesDetalhes').getByRole('button', { name: 'Cancelar carga' })
    ).toHaveCount(0);

    await expect(
      page.locator('#acoesDetalhes').getByRole('button', { name: 'Concluir entrega' })
    ).toHaveCount(0);
  });
});
