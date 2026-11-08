import { entrarComo, expect, simularApi, test } from "./apoio.js";

// CSP (meta no index.html do build): nenhuma rota pode gerar violação.
// Roda contra o build (vite preview); no dev a CSP não é injetada.

const ROTAS = [
  "/", "/login", "/cadastro", "/cadastro-usuario",
  "/dashboard", "/alertas", "/relatorios", "/veiculos", "/sensores", "/viagens", "/configuracoes",
  "/usuarios", "/auditoria", "/logistica", "/monitoramento"
];


function violacoes(page) {

  const lista = [];

  page.on("console", mensagem => {
    if (/Refused to|Content Security Policy/i.test(mensagem.text())) {
      lista.push(mensagem.text());
    }
  });

  page.on("pageerror", erro => {
    if (/Content Security Policy/i.test(erro.message)) {
      lista.push(erro.message);
    }
  });

  return lista;

}


test("QA-SEG-06: o build traz a CSP e o referrer em <meta>", async ({ page }) => {

  await page.goto("/login");

  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain("unsafe-eval");

  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "strict-origin-when-cross-origin");

});


test("QA-SEG-07: nenhuma rota gera violação de CSP", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  const lista = violacoes(page);

  for (const rota of ROTAS) {
    await page.goto(rota);
    await page.locator("h1, h2").first().waitFor();
    // Dá tempo de gráficos, fontes e do polling dispararem.
    await page.waitForLoadState("networkidle");
  }

  expect(lista, `Violações de CSP:\n${lista.join("\n")}`).toEqual([]);

});


test("QA-SEG-08: chat, assistente, QR e CSV não geram violação de CSP", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  const lista = violacoes(page);

  // Chat da Home (abre, link do WhatsApp é navegação, não fetch).
  await page.goto("/");
  await page.locator("#ctChatToggle").click();
  await expect(page.locator("#ctChatPanel")).toBeVisible();

  // Assistente do painel.
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Assistente", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Assistente do painel" })).toBeVisible();

  // Etiqueta QR (SVG/canvas gerado em tela).
  await page.goto("/veiculos");
  await page.getByRole("button", { name: /etiqueta/i }).first().click();
  await expect(page.locator("#fecharEtiqueta")).toBeVisible();

  // CSV por Blob URL.
  await page.goto("/relatorios");
  await expect(page.locator("#baixarCsv")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.locator("#baixarCsv").click();
  await download;

  expect(lista, `Violações de CSP:\n${lista.join("\n")}`).toEqual([]);

});
