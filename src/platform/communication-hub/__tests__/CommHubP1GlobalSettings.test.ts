/**
 * CH-SIMPLE-P1 — Canonical Global Settings and Operating Mode
 *
 * Source-static + service tests. No network I/O — the RPC contract is
 * asserted from the migration SQL text and the service wrapper.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BLOCKED_OPERATING_MODES,
  COMMUNICATION_SETTINGS_SINGLETON_GUARD,
  deriveCompatBooleans,
  SELECTABLE_OPERATING_MODES,
  setOperatingMode,
  type CommunicationOperatingMode,
} from "@/platform/communication-hub/globalSettingsService";

const repoRoot = path.resolve(__dirname, "../../../..");
const read = (rel: string) => fs.readFileSync(path.join(repoRoot, rel), "utf-8");
const readAll = (dir: string) =>
  fs
    .readdirSync(path.join(repoRoot, dir))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => read(path.join(dir, f)))
    .join("\n");
const migrations = readAll("supabase/migrations");
const p1Migration = fs
  .readdirSync(path.join(repoRoot, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .map((f) => read(path.join("supabase/migrations", f)))
  .find((sql) => sql.includes("set_communication_operating_mode")) as string;
const svc = read(
  "src/platform/communication-hub/globalSettingsService.ts"
);

describe("CH-SIMPLE-P1 — canonical global settings", () => {
  it("service reads by singleton_guard='primary' and never uses .order()", () => {
    expect(COMMUNICATION_SETTINGS_SINGLETON_GUARD).toBe("primary");
    expect(svc).toMatch(
      /\.from\(\s*["']communication_hub_control_settings["']\s*\)[\s\S]{0,600}\.eq\(\s*["']singleton_guard["']\s*,\s*COMMUNICATION_SETTINGS_SINGLETON_GUARD/
    );
    // Assert the canonical reader does not order.
    const readerBlock = svc.slice(svc.indexOf("fetchGlobalSettings"));
    expect(readerBlock).not.toMatch(/\.order\(/);
  });

  it("migration creates a UNIQUE guard so at most one row can exist", () => {
    expect(migrations).toMatch(
      /communication_hub_control_settings_singleton_key[\s\S]{0,100}UNIQUE\s*\(\s*singleton_guard\s*\)/i
    );
    expect(migrations).toMatch(
      /communication_hub_control_settings_singleton_check[\s\S]{0,120}singleton_guard\s*=\s*'primary'/i
    );
  });

  it("RPC blocks AUTOMATED_PRODUCTION", () => {
    expect(BLOCKED_OPERATING_MODES).toContain(
      "AUTOMATED_PRODUCTION" as CommunicationOperatingMode
    );
    expect(SELECTABLE_OPERATING_MODES).not.toContain(
      "AUTOMATED_PRODUCTION" as CommunicationOperatingMode
    );
    expect(p1Migration).toMatch(
      /AUTOMATED_PRODUCTION[\s\S]{0,120}not available/i
    );
    // Service-level guard as well.
    expect(setOperatingMode("AUTOMATED_PRODUCTION")).rejects.toThrow(
      /not available/i
    );
  });

  it("mode transition does NOT modify recipient-approval columns", () => {
    // The UPDATE statement inside set_communication_operating_mode
    // must not reference allowed_email_addresses / allowed_email_domains /
    // recipient_release_mode as SET targets.
    const rpcBody =
      p1Migration.slice(
        p1Migration.indexOf("set_communication_operating_mode")
      );
    const updateBlock = rpcBody.match(
      /UPDATE\s+public\.communication_hub_control_settings[\s\S]*?WHERE\s+singleton_guard='primary'/i
    );
    expect(updateBlock, "expected UPDATE block in RPC").toBeTruthy();
    const setClause = updateBlock![0];
    expect(setClause).not.toMatch(/^\s*allowed_email_addresses\s*=/m);
    expect(setClause).not.toMatch(/^\s*allowed_email_domains\s*=/m);
    expect(setClause).not.toMatch(/^\s*recipient_release_mode\s*=/m);
  });

  it("emergency stop forces dispatch_enabled=false regardless of recipient config", () => {
    const { dispatchEnabled, dryRunOnly } = deriveCompatBooleans("EMERGENCY_STOP");
    expect(dispatchEnabled).toBe(false);
    expect(dryRunOnly).toBe(true);
    // Same rule encoded in SQL:
    expect(p1Migration).toMatch(
      /dispatch_enabled\s*=\s*CASE\s+v_new_mode\s+WHEN\s+'EMERGENCY_STOP'\s+THEN\s+false/i
    );
  });

  it("returning from EMERGENCY_STOP restores dispatch but does not touch recipients", () => {
    for (const mode of ["DRY_RUN", "CONTROLLED_LIVE", "MANUAL_PRODUCTION"] as const) {
      const derived = deriveCompatBooleans(mode);
      expect(derived.dispatchEnabled).toBe(true);
      expect(derived.dryRunOnly).toBe(mode === "DRY_RUN");
    }
    // Confirm SQL derivation matches for the resumable modes.
    expect(p1Migration).toMatch(/dry_run_only\s*=\s*CASE\s+v_new_mode/i);
  });

  it("no email address is hardcoded in the operating-mode RPC or service", () => {
    expect(p1Migration).not.toMatch(/rohit@mishainfotech\.com/i);
    expect(svc).not.toMatch(/@/); // no addresses at all in the service file
  });

  it("compat booleans are derived transactionally inside the RPC", () => {
    // Both derivations live in the same UPDATE statement (one txn).
    const rpc = p1Migration.slice(
      p1Migration.indexOf("set_communication_operating_mode")
    );
    const updateIdx = rpc.search(
      /UPDATE\s+public\.communication_hub_control_settings/i
    );
    const commitIdx = rpc.indexOf("INSERT INTO public.communication_hub_operating_mode_audit");
    expect(updateIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(updateIdx);
    const between = rpc.slice(updateIdx, commitIdx);
    expect(between).toMatch(/dispatch_enabled\s*=\s*CASE/i);
    expect(between).toMatch(/dry_run_only\s*=\s*CASE/i);
    expect(between).toMatch(/operating_mode\s*=\s*v_new_mode/i);
    expect(between).toMatch(/configuration_version\s*=\s*v_next_version/i);
  });

  it("audit row captures previous mode, new mode, actor, reason, version, timestamp", () => {
    expect(p1Migration).toMatch(
      /INSERT INTO public\.communication_hub_operating_mode_audit[\s\S]{0,400}previous_mode,\s*new_mode,\s*actor,\s*reason,[\s\S]{0,80}configuration_version/i
    );
    // Table declaration proves changed_at column exists with NOT NULL default.
    expect(p1Migration).toMatch(
      /changed_at\s+timestamptz\s+NOT NULL\s+DEFAULT\s+now\(\)/i
    );
  });

  it("mode change does not widen recipient eligibility (allowlist untouched)", () => {
    // Snapshot: RPC stores allowed_email_addresses in the audit snapshot but
    // never rewrites them. Verified structurally above; also assert the
    // snapshot builder captures the pre-change allowlist.
    expect(p1Migration).toMatch(
      /'allowed_email_addresses'\s*,\s*v_row\.allowed_email_addresses/i
    );
  });

  it("read RPC filters by guard and has no ORDER BY", () => {
    const readRpc = p1Migration.slice(
      p1Migration.indexOf("get_communication_operating_mode")
    );
    const body = readRpc.slice(0, readRpc.indexOf("$$") + 2);
    expect(body).toMatch(/WHERE\s+s\.singleton_guard\s*=\s*'primary'/i);
    expect(body).not.toMatch(/ORDER BY/i);
  });
});
