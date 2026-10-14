import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", workers: 1, fullyParallel: false, timeout: 90000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: [
    ...(process.env.E2E_PRODUCTION === "true" ? [{ command: "npx tsx tests/support/mail-server.ts", url: "http://127.0.0.1:2526/health", reuseExistingServer: false, timeout: 30000 }] : []),
    { command: process.env.E2E_PRODUCTION === "true" ? "npm run start" : "npm run dev:web", url: "http://localhost:3000", reuseExistingServer: !process.env.CI && process.env.E2E_PRODUCTION !== "true", timeout: 120000, ...(process.env.E2E_PRODUCTION === "true" ? { env: { SMTP_URL: "smtp://127.0.0.1:2525/?ignoreTLS=true", EMAIL_FROM: "CineChat <cinechat@example.test>" } } : {}) },
    { command: "npm run start:realtime", url: "http://localhost:3001/health", reuseExistingServer: !process.env.CI, timeout: 60000 },
    { command: "npm run media:serve", url: "http://localhost:3002/big-buck-bunny.mp4", reuseExistingServer: !process.env.CI, timeout: 30000 }
  ]
});
