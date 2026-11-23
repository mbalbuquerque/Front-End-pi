import { abrirMenu, entrarComo, expect, simularApi, test } from "./apoio.js";

// Testes para as telas descritas no fluxo atual; falhas apontam regressões ou diferenças de implementação.
test('QA-001: login abre com formulário', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('QA-002: login rejeita campos vazios', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#loginForm button[type=submit]').click();
  await expect(page.locator('#loginMessage')).toContainText(/e-mail|email|obrigat/i);
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('QA-003: alternar visibilidade da senha', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#togglePassword').click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.locator('#togglePassword').click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
});

test('QA-004: botão Cadastrar empresa navega para cadastro', async ({ page }) => {
  await page.goto('/login');
  await page.locator('a[href="/cadastro"]').click();
  await expect(page).toHaveURL(/\/cadastro(\?|$)/);
  await expect(page.locator('#formCadastro')).toBeVisible();
});

// Telas antigas com dados de exemplo foram retiradas: o endereço leva à tela real.
for (const [antiga, destino, alvo] of [
  ['/usuarios', /\/configuracoes#painelUsuarios$/, '#painelUsuarios'],
  ['/cadastro-usuario', /\/configuracoes#painelUsuarios$/, '#painelUsuarios'],
  ['/logistica', /\/viagens$/, 'h1'],
  ['/auditoria', /\/dashboard$/, 'h1'],
  ['/usuarios.html', /\/configuracoes(#painelUsuarios)?$/, '#painelUsuarios']
]) {
  test(`QA-005: ${antiga} leva à tela real`, async ({ page }) => {
    await entrarComo(page, 'gestor');
    await simularApi(page);
    await page.goto(antiga);
    await expect(page).toHaveURL(destino);
    await expect(page.locator(alvo).first()).toBeVisible();
  });
}

test('QA-009: Usuários no menu abre a gestão real de usuários', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await simularApi(page);
  await page.goto('/dashboard');
  await abrirMenu(page);
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Usuários' }).click();
  await expect(page).toHaveURL(/\/configuracoes#painelUsuarios$/);
  await expect(page.locator('#painelUsuarios')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Ana Oliveira|empresa-exemplo|DADOS DEMONSTRATIVOS/i);
});

test('QA-010: dashboard sem sessão volta para o login', async ({ page }) => {
  await page.route('**/*.azurewebsites.net/**', route => route.abort());
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.locator('#loginForm')).toBeVisible();
});

test('QA-011: nenhuma senha é salva no localStorage durante o login', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('teste@empresa.com');
  await page.locator('#password').fill('SenhaFicticiaNaoUsar123!');
  await page.locator('#loginForm button[type=submit]').click();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(storage).not.toContain('SenhaFicticiaNaoUsar123!');
});
