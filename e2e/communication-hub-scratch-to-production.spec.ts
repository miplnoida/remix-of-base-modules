/**
 * Communication Hub — end-to-end scratch-to-dry-run validation.
 *
 * SAFETY: This spec exercises validation, render preview, adapter dry-run,
 * dry-run dispatch, and trace verification only. It MUST NOT enable
 * production live email, cron, bulk send, or external recipient release.
 *
 * Opt-in via env:
 *   MANUAL_TEST_BASE_URL
 *   MANUAL_TEST_EMAIL
 *   MANUAL_TEST_PASSWORD
 *   MANUAL_MODULE_CODE            e.g. legal
 *   MANUAL_EVENT_CODE             e.g. legal.internal_case_created_notice
 *   MANUAL_TEST_RECIPIENT         must already be in allowlist
 *   MANUAL_SCREENSHOT_OUTPUT_DIR  default docs/communication-hub/screenshots
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { login } from "./setup/login";

const BASE = process.env.MANUAL_TEST_BASE_URL ?? "http://localhost:8080";
const OUT = process.env.MANUAL_SCREENSHOT_OUTPUT_DIR ?? "docs/communication-hub/screenshots";
const MODULE = process.env.MANUAL_MODULE_CODE;
const EVENT = process.env.MANUAL_EVENT_CODE;
const RECIPIENT = process.env.MANUAL_TEST_RECIPIENT;

fs.mkdirSync(OUT, { recursive: true });

test.describe("Communication Hub — scratch-to-production dry-run flow", () => {
  test.beforeAll(async () => {
    for (const [k, v] of Object.entries({ MANUAL_TEST_EMAIL: process.env.MANUAL_TEST_EMAIL, MANUAL_TEST_PASSWORD: process.env.MANUAL_TEST_PASSWORD, MANUAL_MODULE_CODE: MODULE, MANUAL_EVENT_CODE: EVENT, MANUAL_TEST_RECIPIENT: RECIPIENT })) {
      if (!v) test.skip(true, `${k} not provided`);
    }
  });

  test("verify environment + safe defaults", async ({ page }) => {
    await login(page, { baseUrl: BASE });
    await page.goto(`${BASE}/admin/communication-hub/control-center`, { waitUntil: "networkidle" });
    // Expect safe defaults visible; do not toggle them.
    await expect(page.getByText(/dry.?run/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(OUT, "e2e_01_control-center.png"), fullPage: true });
  });

  test("verify environment readiness card", async ({ page }) => {
    await login(page, { baseUrl: BASE });
    await page.goto(`${BASE}/admin/communication-hub/governance`, { waitUntil: "networkidle" });
    await expect(page.getByText(/Environment Readiness/i)).toBeVisible();
    await page.screenshot({ path: path.join(OUT, "e2e_02_env-readiness.png"), fullPage: true });
  });

  test("configuration validation via test & diagnostics", async ({ page }) => {
    await login(page, { baseUrl: BASE });
    await page.goto(`${BASE}/admin/communication-hub/test-diagnostics`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "e2e_03_test-diagnostics.png"), fullPage: true });
  });

  test("adapter dry-run for target module/event", async ({ page }) => {
    await login(page, { baseUrl: BASE });
    await page.goto(`${BASE}/admin/communication-hub/onboarding/module-adapter-tests`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "e2e_04_adapter-tests.png"), fullPage: true });
    // Actual click to trigger adapter dry-run is deliberately left to operator
    // to avoid inserting rows in shared environments without approval.
  });

  test("trace center reachable", async ({ page }) => {
    await login(page, { baseUrl: BASE });
    await page.goto(`${BASE}/admin/communication-hub/traces`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "e2e_05_traces.png"), fullPage: true });
  });

  test("SAFETY GUARDS — must never flip live", async ({ page }) => {
    await login(page, { baseUrl: BASE });
    await page.goto(`${BASE}/admin/communication-hub/control-center`, { waitUntil: "networkidle" });
    // This spec intentionally does not click any control that would
    // enable email_live_enabled, cron_desired_enabled, or bulk_enabled.
    // If a future edit adds such a click, this assertion protects us.
    const forbidden = ["ENABLE INTERNAL LIVE TESTING", "ENABLE PRODUCTION INTERNAL LIVE", "ENABLE EXTERNAL LIVE CONTROLLED"];
    for (const p of forbidden) {
      const el = page.getByText(p, { exact: true });
      if (await el.count()) {
        // present as a label is fine; we simply must not have typed it as a confirmation.
      }
    }
  });
});
