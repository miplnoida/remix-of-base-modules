/**
 * CH-PERM-VERIFY-1 — one-shot login helper that produces the four
 * storage-state files consumed by comm-hub-permissions.spec.ts.
 *
 * Reads credentials from env; NEVER hardcodes them. NEVER logs the password.
 * Run manually:  bunx tsx e2e/setup/login.ts
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.CH_PERM_BASE_URL ?? "http://localhost:8080";
const OUT = resolve("e2e/.auth");
mkdirSync(OUT, { recursive: true });

type Fixture = { file: string; emailVar: string; passVar: string };

const FIXTURES: Fixture[] = [
  { file: "admin.json",          emailVar: "CH_TEST_ADMIN_EMAIL",           passVar: "CH_TEST_ADMIN_PASSWORD" },
  { file: "sys-admin-view.json", emailVar: "CH_TEST_SYS_ADMIN_VIEW_EMAIL",  passVar: "CH_TEST_SYS_ADMIN_VIEW_PASSWORD" },
  { file: "comm-hub-view.json",  emailVar: "CH_TEST_COMM_HUB_VIEW_EMAIL",   passVar: "CH_TEST_COMM_HUB_VIEW_PASSWORD" },
  { file: "plain.json",          emailVar: "CH_TEST_PLAIN_EMAIL",           passVar: "CH_TEST_PLAIN_PASSWORD" },
];

async function loginOne(email: string, password: string, outFile: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  // Adjust selectors here if the LoginScreen changes.
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
  await context.storageState({ path: outFile });
  await browser.close();
}

(async () => {
  for (const f of FIXTURES) {
    const email = process.env[f.emailVar];
    const password = process.env[f.passVar];
    if (!email || !password) {
      console.warn(`[skip] ${f.file}: ${f.emailVar} / ${f.passVar} not set`);
      continue;
    }
    console.log(`[login] ${f.file} as ${email.replace(/(.).*(@.*)/, "$1***$2")}`);
    await loginOne(email, password, resolve(OUT, f.file));
  }
  console.log("done.");
})().catch((err) => {
  console.error("login setup failed:", err.message);
  process.exit(1);
});
