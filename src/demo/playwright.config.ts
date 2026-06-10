import { defineConfig } from "@playwright/test";

/**
 * E2E critical paths (TDD §8.6): login, approve deal, create scan job.
 * Specs share one dev server and reset the mock store, so they run serially.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3210",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3210",
    url: "http://localhost:3210/auth/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
