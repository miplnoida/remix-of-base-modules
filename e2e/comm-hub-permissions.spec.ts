/**
 * CH-PERM-VERIFY-1 — Playwright permission harness (opt-in).
 *
 * This suite is NOT part of the default `bun run test` script. It runs only
 * when Playwright is installed and credentials are provided via env vars.
 * See docs/testing/comm-hub-permission-harness.md for setup.
 *
 * The harness never sends email, never toggles a live gate, never enqueues a
 * cron/bulk job. It only navigates to each screen and asserts allow/deny.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.CH_PERM_BASE_URL ?? "http://localhost:8080";

type RoleKey = "admin" | "sysAdminView" | "commHubView" | "plain";

interface RoleFixture {
  key: RoleKey;
  storageState: string;
  allowedEverywhere: boolean;
}

const ROLES: RoleFixture[] = [
  { key: "admin",        storageState: "e2e/.auth/admin.json",        allowedEverywhere: true },
  { key: "sysAdminView", storageState: "e2e/.auth/sys-admin-view.json", allowedEverywhere: true },
  { key: "commHubView",  storageState: "e2e/.auth/comm-hub-view.json",  allowedEverywhere: true },
  { key: "plain",        storageState: "e2e/.auth/plain.json",           allowedEverywhere: false },
];

const PATHS: string[] = [
  "/admin/communication-hub",
  "/admin/communication-hub/control-center",
  "/admin/communication-hub/recipient-control",
  "/admin/communication-hub/traces",
  "/admin/communication-hub/governance",
  "/admin/communication-hub/safety",
  "/admin/communication-hub/governance/send-policies",
  "/admin/communication-hub/governance/automation-settings",
  "/admin/communication-hub/pilots",
  "/admin/communication-hub/delivery-monitor",
  "/admin/communication-hub/dispatch-register",
  "/admin/communication-hub/retry-queue",
  "/admin/communication-hub/design/sender-profiles",
  "/admin/communication-hub/design/sender-verification",
];

async function assertAllowed(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  // Not the denial screen, and not redirected to /login.
  await expect(page.getByTestId("comm-hub-not-authorized")).toHaveCount(0, { timeout: 5_000 });
  expect(page.url()).not.toContain("/login");
}

async function assertDenied(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  const denied = page.getByTestId("comm-hub-not-authorized");
  await expect(denied).toBeVisible({ timeout: 5_000 });
}

for (const role of ROLES) {
  test.describe(`role: ${role.key}`, () => {
    test.use({ storageState: role.storageState });

    for (const path of PATHS) {
      test(`${path} → ${role.allowedEverywhere ? "allowed" : "denied"}`, async ({ page }) => {
        if (role.allowedEverywhere) {
          await assertAllowed(page, path);
        } else {
          await assertDenied(page, path);
        }
      });
    }
  });
}
