import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "npm run dev -- --hostname 0.0.0.0 --port 3000",
    port: 3000,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
