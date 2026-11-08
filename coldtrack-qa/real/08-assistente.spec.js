import { expect, test } from "@playwright/test";
import { ESTADO, MOTIVO_SEM_CREDENCIAIS, TEM_CREDENCIAIS } from "./apoio-real.js";

// REAL-ASSIST-01: o gestor pergunta ao assistente do painel, pela tela, e
// recebe uma resposta não vazia da rota /assistente (Azure OpenAI).
// Uma única chamada real por execução (a rota tem limite por minuto e custa
// tokens). Se o site publicado ainda não tem o botão, ou a rota ainda não
// subiu (404/503, ou bloqueio de CORS de rota inexistente), o teste é pulado
// com o motivo: o backend pode publicar depois do front.

test.skip(!TEM_CREDENCIAIS, MOTIVO_SEM_CREDENCIAIS);
test.use({ storageState: ESTADO.gestor });

const PERGUNTA = "Quantos veículos eu tenho cadastrados?";


test("REAL-ASSIST-01: gestor pergunta quantos veículos tem e recebe resposta", async ({ page }) => {

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Visão Geral" })).toBeVisible();

  const botao = page.locator("#assistenteBotao");

  if (await botao.count() === 0) {
    test.skip(true, "o site publicado ainda não tem o assistente do painel (publicar o front)");
  }

  // Status da resposta da rota (null = não chegou: rede ou CORS).
  let status = null;
  page.on("response", resposta => {
    if (/\/api\/assistente(\?|$)/.test(resposta.url()) && resposta.request().method() === "POST") {
      status = resposta.status();
    }
  });

  await botao.click();
  const painel = page.getByRole("dialog", { name: "Assistente do painel" });
  await expect(painel).toBeVisible();

  await painel.getByLabel("Sua pergunta ao assistente").fill(PERGUNTA);
  await painel.getByRole("button", { name: "Enviar" }).click();

  // Resposta (2 a 8 s) ou aviso de erro; o painel desiste sozinho em 20 s.
  const resposta = painel.locator(".assistente-msg-assistente").nth(1);
  const erro = painel.locator(".assistente-msg-erro");
  await expect(resposta.or(erro)).toBeVisible({ timeout: 30000 });

  if (await erro.count()) {
    const aviso = await erro.textContent();
    if (status === null || status === 404 || status === 503) {
      test.skip(true, `rota /assistente ainda indisponível (status ${status ?? "sem resposta"}): ${aviso}`);
    }
    throw new Error(`assistente respondeu ${status}: ${aviso}`);
  }

  expect(status).toBe(200);

  const texto = (await resposta.evaluate(el => el.firstChild?.textContent || "")).trim();
  expect(texto.length, "resposta vazia").toBeGreaterThan(0);

});
