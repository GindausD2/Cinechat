import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/responsive",
  timeout: 300000,
  use: { ...base.use, actionTimeout: 15000 },
  outputDir: "test-results/responsive",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/responsive", open: "never" }]],
  projects: [
    { name: "chromium", use: { browserName: "chromium", reducedMotion: "reduce" } },
    { name: "webkit", use: { browserName: "webkit", reducedMotion: "reduce", ...(process.env.E2E_WEBKIT_EXECUTABLE ? { launchOptions: { executablePath: process.env.E2E_WEBKIT_EXECUTABLE } } : {}) } },
    { name: "firefox", use: { browserName: "firefox", reducedMotion: "reduce", ...(process.env.E2E_FIREFOX_EXECUTABLE ? { launchOptions: { executablePath: process.env.E2E_FIREFOX_EXECUTABLE } } : {}) } }
  ]
});
