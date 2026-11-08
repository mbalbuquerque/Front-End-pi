import { defineConfig, devices } from "@playwright/test";

// Testes e2e em coldtrack-qa/tests (CommonJS: coldtrack-qa/package.json).
// O servidor é o build publicado (vite preview), igual ao que vai para o Azure.
// Rode `npm run build` antes de `npm run test:e2e`.
export default defineConfig({
  testDir: "./coldtrack-qa/tests",

  timeout: 30000,

  expect: {
    timeout: 10000
  },

  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],

  use: {
    baseURL: "http://127.0.0.1:5500",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 15000
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 7"] }
    }
  ],

  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 5500 --strictPort",
    url: "http://127.0.0.1:5500",
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
