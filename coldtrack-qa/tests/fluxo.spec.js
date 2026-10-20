const { test, expect } = require('@playwright/test');

// Testes para as telas descritas no fluxo atual; falhas apontam regressões ou diferenças de implementação.
test('QA-001: login abre com formulário', async ({ page }) => {
  await page.goto('/login.html');
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('QA-002: login rejeita campos vazios', async ({ page }) => {
  await page.goto('/login.html');
  await page.locator('#loginForm button[type=submit]').click();
  await expect(page.locator('#loginMessage')).toContainText(/e-mail|email|obrigat/i);
  await expect(page).toHaveURL(/login\.html/);
});

test('QA-003: alternar visibilidade da senha', async ({ page }) => {
  await page.goto('/login.html');
  await page.locator('#togglePassword').click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.locator('#togglePassword').click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
});

test('QA-004: botão Cadastrar navega para cadastro', async ({ page }) => {
  await page.goto('/login.html');
  await page.locator('a[href="cadastro.html"]').click();
  await expect(page).toHaveURL(/cadastro\.html/);
  await expect(page.locator('#cadastroForm')).toBeVisible();
});

test('QA-005: CPF inválido é rejeitado', async ({ page }) => {
  await page.goto('/cadastro.html');
  await page.locator('#nome').fill('Maria da Silva');
  await page.locator('#cpf').fill('11111111111');
  await page.locator('#email').fill('maria@empresa.com');
  await page.locator('#funcao').fill('Operadora');
  await page.locator('#perfil').selectOption('operador');
  await page.locator('#cadastroForm button[type=submit]').click();
  await expect(page.locator('#mensagem')).toContainText(/CPF inválido|CPF válido/i);
});

test('QA-006: cadastro preenchido não cria conta sem API', async ({ page }) => {
  await page.goto('/cadastro.html');
  await page.locator('#nome').fill('Maria da Silva');
  await page.locator('#cpf').fill('52998224725'); // CPF matematicamente válido, fictício para teste
  await page.locator('#email').fill('maria@empresa.com');
  await page.locator('#funcao').fill('Operadora');
  await page.locator('#perfil').selectOption('operador');
  await page.locator('#cadastroForm button[type=submit]').click();
  await expect(page.locator('#mensagem')).toContainText(/API|integração/i);
});

test('QA-007: gestão de usuários exibe dados demonstrativos', async ({ page }) => {
  await page.goto('/usuarios.html');
  await expect(page.locator('#usuariosTabela tr')).toHaveCount(4);
});

test('QA-008: pesquisa filtra usuários', async ({ page }) => {
  await page.goto('/usuarios.html');
  await page.locator('#pesquisa').fill('Ana Oliveira');
  await expect(page.locator('#usuariosTabela tr')).toHaveCount(1);
  await expect(page.locator('#usuariosTabela')).toContainText('Ana Oliveira');
});

test('QA-009: link Auditoria abre a tela', async ({ page }) => {
  await page.goto('/usuarios.html');
  await page.locator('a[href="auditoria.html"]').click();
  await expect(page).toHaveURL(/auditoria\.html/);
  await expect(page.locator('body')).toContainText(/Auditoria/i);
});

test('QA-010: dashboard exibe componentes e tolera indisponibilidade ThingSpeak', async ({ page }) => {
  await page.route('https://api.thingspeak.com/**', route => route.abort());
  await page.goto('/dashboard.html');
  await expect(page.locator('#temperatura')).toBeVisible();
  await expect(page.locator('#historico')).toContainText(/telemetria|carregar/i);
});

test('QA-011: nenhuma senha é salva no localStorage durante o login', async ({ page }) => {
  await page.goto('/login.html');
  await page.locator('#email').fill('teste@empresa.com');
  await page.locator('#password').fill('SenhaFicticiaNaoUsar123!');
  await page.locator('#loginForm button[type=submit]').click();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(storage).not.toContain('SenhaFicticiaNaoUsar123!');
});
