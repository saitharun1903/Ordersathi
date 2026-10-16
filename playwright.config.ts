import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 760 } }, testMatch: /mobile/ },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
