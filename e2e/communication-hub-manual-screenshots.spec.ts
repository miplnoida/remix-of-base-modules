/**
 * Communication Hub — manual screenshot capture spec.
 *
 * Captures REAL screenshots from the running application. Opt-in via env:
 *   MANUAL_TEST_BASE_URL         e.g. http://localhost:8080
 *   MANUAL_TEST_EMAIL            admin user with Comm Hub permissions
 *   MANUAL_TEST_PASSWORD         admin password
 *   MANUAL_SCREENSHOT_OUTPUT_DIR default: docs/communication-hub/screenshots
 *
 * This spec MUST NOT enable live sending, cron, or bulk send.
 * This spec MUST NOT trigger a production live communication.
 */
import { test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { login } from "./setup/login";

const BASE = process.env.MANUAL_TEST_BASE_URL ?? "http://localhost:8080";
const OUT = process.env.MANUAL_SCREENSHOT_OUTPUT_DIR ?? "docs/communication-hub/screenshots";

fs.mkdirSync(OUT, { recursive: true });

const ROUTES: Array<{ slug: string; path: string; verify: string }> = [
  { slug: "01_hub-home", path: "/admin/communication-hub", verify: "Hub landing loads" },
  { slug: "02_control-center", path: "/admin/communication-hub/control-center", verify: "Safety gates" },
  { slug: "03_safety-switchboard", path: "/admin/communication-hub/safety", verify: "Preset modes" },
  { slug: "04_governance", path: "/admin/communication-hub/governance", verify: "Live readiness + env readiness card" },
  { slug: "05_send-policies", path: "/admin/communication-hub/governance/send-policies", verify: "Send policies list" },
  { slug: "06_automation-settings", path: "/admin/communication-hub/governance/automation-settings", verify: "Cron/automation" },
  { slug: "07_pilots", path: "/admin/communication-hub/pilots", verify: "Governed Controlled Live Send" },
  { slug: "08_design", path: "/admin/communication-hub/design", verify: "Event → Template mapping" },
  { slug: "09_sender-profiles", path: "/admin/communication-hub/design/sender-profiles", verify: "Sender profiles" },
  { slug: "10_sender-verification", path: "/admin/communication-hub/design/sender-verification", verify: "Domain verification" },
  { slug: "11_onboarding", path: "/admin/communication-hub/onboarding", verify: "Onboarding workspace" },
  { slug: "12_event-template-wizard", path: "/admin/communication-hub/onboarding/event-template-wizard", verify: "Wizard step 1" },
  { slug: "13_module-adapter-tests", path: "/admin/communication-hub/onboarding/module-adapter-tests", verify: "Adapter dry-run cards" },
  { slug: "14_recipient-control", path: "/admin/communication-hub/recipient-control", verify: "Allowlist + suppression" },
  { slug: "15_requests", path: "/admin/communication-hub/requests", verify: "Request browser" },
  { slug: "16_dispatch-register", path: "/admin/communication-hub/dispatch-register", verify: "Dispatch register" },
  { slug: "17_delivery-monitor", path: "/admin/communication-hub/delivery-monitor", verify: "Delivery monitor" },
  { slug: "18_lifecycle-log", path: "/admin/communication-hub/lifecycle-log", verify: "Lifecycle events" },
  { slug: "19_retry-queue", path: "/admin/communication-hub/retry-queue", verify: "Retry queue" },
  { slug: "20_traces", path: "/admin/communication-hub/traces", verify: "Trace Center" },
  { slug: "21_test-diagnostics", path: "/admin/communication-hub/test-diagnostics", verify: "Test & Diagnostics" },
  { slug: "22_live-readiness-all-events", path: "/admin/communication-hub/live-readiness/all-events", verify: "All-events readiness" },
];

test.describe("Communication Hub — real screenshots", () => {
  test.beforeAll(async () => {
    if (!process.env.MANUAL_TEST_EMAIL || !process.env.MANUAL_TEST_PASSWORD) {
      test.skip(true, "MANUAL_TEST_EMAIL/PASSWORD not provided");
    }
  });

  for (const r of ROUTES) {
    test(`capture ${r.slug}`, async ({ page }) => {
      await login(page, { baseUrl: BASE });
      await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const file = path.join(OUT, `${r.slug}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // Caption file
      fs.writeFileSync(path.join(OUT, `${r.slug}.caption.md`), [
        `# ${r.slug}`,
        `- Route: ${r.path}`,
        `- Base URL: ${BASE}`,
        `- Capture date: ${new Date().toISOString()}`,
        `- Verify: ${r.verify}`,
        "",
      ].join("\n"));
    });
  }
});
