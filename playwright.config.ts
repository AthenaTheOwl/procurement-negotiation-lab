import { defineConfig } from "@playwright/test";

const baseURL = process.env.SMOKE_URL ?? "https://procurement-negotiation-lab.vercel.app/";
const browserChannel = process.env.PLAYWRIGHT_CHROME_CHANNEL;

export default defineConfig({
  testDir: "./apps/web/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    actionTimeout: 5_000,
    channel: browserChannel || undefined,
    navigationTimeout: 10_000,
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
});
