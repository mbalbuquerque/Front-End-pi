import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Suíte e2e REAL (opt-in): site publicado + API de produção, sem simulação.
// Roda só com `npm run test:e2e:real`; fica fora do `npm run test:e2e` e do CI.
// Regras de segurança e como rodar: coldtrack-qa/real/README.md.

// Credenciais: variáveis de ambiente, ou um .env.local (fora do git).
if (existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

// Mesmo carimbo QA-<timestamp> para todos os processos desta execução.
process.env.COLDTRACK_QA_CARIMBO ||= String(Date.now());

const SITE = (process.env.COLDTRACK_SITE_URL || "https://stcoldtrackweb7319.z15.web.core.windows.net").replace(/\/$/, "");

export default defineConfig({
  testDir: "./coldtrack-qa/real",
  outputDir: "./test-results-real",

  timeout: 90000,
  expect: { timeout: 20000 },

  // Um teste por vez, na ordem dos arquivos: o banco é compartilhado com a equipe.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-real", open: "never" }]
  ],

  use: {
    baseURL: SITE,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20000,
    navigationTimeout: 30000,
    // Sem service worker: cada teste vê o build publicado de agora.
    serviceWorkers: "block",
    locale: "pt-BR",
    timezoneId: "America/Recife"
  },

  projects: [
    // Login das contas fixas pela tela, uma vez por execução (salva storageState).
    {
      name: "login",
      testMatch: /login\.setup\.js/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "real",
      testMatch: /\.spec\.js$/,
      dependencies: ["login"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }
    }
  ]
});
