import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/mobile",
  outputDir: "test-results/mobile-engines",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/mobile", open: "never" }]],
  projects: [
    { name: "android-chromium-emulation", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "ios-webkit-emulation", use: { ...devices["iPhone 13"], browserName: "webkit", ...(process.env.E2E_WEBKIT_EXECUTABLE ? { launchOptions: { executablePath: process.env.E2E_WEBKIT_EXECUTABLE } } : {}) } }
  ]
});
