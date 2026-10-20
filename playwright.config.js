const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
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
    ["html", {
      outputFolder: "playwright-report",
      open: "never"
    }]
  ],

  use: {
    baseURL: "http://127.0.0.1:5500",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
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
    command: "python -m http.server 5500 --bind 127.0.0.1",
    url: "http://127.0.0.1:5500",
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
