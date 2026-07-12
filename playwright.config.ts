/**
 * CH-PERM-VERIFY-1 — Playwright config (opt-in).
 * Not wired into the default test script. See docs/testing/comm-hub-permission-harness.md.
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.CH_PERM_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 900 },
  },
});
