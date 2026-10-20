
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  // Pasta onde estão os testes automatizados
  testDir: "./coldtrack-qa/tests",

  // Tempo máximo de cada teste
  timeout: 30000,

  // Tempo máximo para cada verificação
  expect: {
    timeout: 10000,
  },

  // Executar os testes sequencialmente
  fullyParallel: false,
  workers: 1,

  // Não repetir testes com falha
  retries: 0,

  // Relatórios
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report",
        open: "never",
      },
    ],
  ],

  // Configurações compartilhadas
  use: {
    baseURL: "http://127.0.0.1:5500",

    headless: true,

    trace: "retain-on-failure",

    screenshot: "only-on-failure",

    video: "retain-on-failure",

    actionTimeout: 10000,

    navigationTimeout: 15000,
  },

  // Navegadores e dispositivos
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 7"],
        defaultBrowserType: "chromium",
      },
    },
  ],

  // Servidor local do Front-End
  webServer: {
    command: "python -m http.server 5500 --bind 127.0.0.1",

    url: "http://127.0.0.1:5500",

    reuseExistingServer: !process.env.CI,

    timeout: 30000,
  },
});
