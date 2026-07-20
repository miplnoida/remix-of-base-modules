/**
 * Communication Hub Simplification — Prompt 0 Baseline
 *
 * Characterization tests. Each test locks in a KNOWN-BROKEN behavior that
 * Prompt 1+ must fix. When a fix lands, the corresponding assertion here
 * must flip (from "broken" to "correct"), and this file must be updated in
 * the same commit that ships the fix. That is the acceptance signal.
 *
 * Deliberately no supabase / network I/O — these run as fast unit tests.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  computePresetChanges,
  type SystemModePreset,
} from "@/pages/admin/communicationHub/safety/safetyService";
import { isCommunicationHubSendEnabled } from "@/platform/communication-hub/sendCommunication";
import type { CommHubControlSettings } from "@/pages/admin/communicationHub/controlCenter/controlCenterService";

const repoRoot = path.resolve(__dirname, "../../../..");
const read = (rel: string) => fs.readFileSync(path.join(repoRoot, rel), "utf-8");

function baseSettings(): CommHubControlSettings {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    dispatch_enabled: true,
    dry_run_only: false,
    email_live_enabled: false,
    sms_live_enabled: false,
    whatsapp_live_enabled: false,
    print_enabled: false,
    letter_enabled: false,
    allowed_email_addresses: ["rohit@mishainfotech.com"],
    allowed_email_domains: ["mishainfotech.com"],
    batch_size: 10,
    cron_desired_enabled: false,
    max_attempts: 3,
    retry_base_seconds: 30,
    retry_max_seconds: 3600,
    live_eligible_after: null,
    live_eligible_max_age_minutes: 60,
    notes: null,
    updated_by: null,
    updated_at: "2026-07-20T00:00:00Z",
    created_at: "2026-07-20T00:00:00Z",
    email_open_tracking_default: false,
    email_click_tracking_default: false,
    tracking_policy_mode: "off_by_default",
  };
}

describe("Communication Hub — Prompt 0 baseline (characterization)", () => {
  // F1 ------------------------------------------------------------------
  // FIXED by CH-SIMPLE-P1/P3B-R.2 — the enqueue/dispatch edge functions no
  // longer read control_settings via ORDER BY created_at + LIMIT 1; they now
  // read the canonical singleton row (singleton_guard='primary') indirectly
  // through evaluate_comm_hub_send_decision. Assertion inverted.
  it("F1 [FIXED]: control-settings singleton read is no longer scan-and-LIMIT-1 in edge functions", () => {
    const enqueue = read("supabase/functions/comm-hub-enqueue/index.ts");
    const dispatch = read("supabase/functions/comm-hub-dispatch/index.ts");
    // Neither edge function does a raw ORDER BY created_at + LIMIT 1 against control settings.
    for (const src of [enqueue, dispatch]) {
      const hasLegacyScan =
        /communication_hub_control_settings[\s\S]{0,400}order\(\s*["']created_at["'][\s\S]{0,120}limit\(\s*1\s*\)/i.test(
          src,
        );
      expect(hasLegacyScan).toBe(false);
    }
  });


  // F2 ------------------------------------------------------------------
  it("F2: preview_confirmed is written nested inside metadata by the test console", () => {
    const src = read(
      "src/pages/admin/communicationHub/testing/ControlledLiveTestPage.tsx",
    );
    // Producer nests it.
    expect(/metadata:\s*{[\s\S]*preview_confirmed:\s*true/.test(src)).toBe(true);
    // sendCommunication forwards metadata as-is and does NOT lift a
    // top-level preview_confirmed onto the enqueue body.
    const sendSrc = read("src/platform/communication-hub/sendCommunication.ts");
    expect(/metadata:\s*input\.metadata/.test(sendSrc)).toBe(true);
    expect(/preview_confirmed:\s*input\.preview_confirmed/.test(sendSrc)).toBe(
      false,
    );
  });

  // F3 ------------------------------------------------------------------
  describe("F3: client-side send-enable bypass", () => {
    const origLS = globalThis.localStorage;
    beforeEach(() => {
      try {
        globalThis.localStorage.clear();
      } catch { /* noop */ }
      delete (globalThis as any).__COMMUNICATION_HUB_SEND_ENABLED__;
    });
    afterEach(() => {
      try {
        globalThis.localStorage.clear();
      } catch { /* noop */ }
      delete (globalThis as any).__COMMUNICATION_HUB_SEND_ENABLED__;
      // Restore in case a test replaced it.
      (globalThis as any).localStorage = origLS;
    });

    it("localStorage.commHub.sendEnabled='true' flips the client gate to enabled", () => {
      expect(isCommunicationHubSendEnabled()).toBe(false);
      globalThis.localStorage.setItem("commHub.sendEnabled", "true");
      // Broken behavior: a browser value alone opens the gate.
      expect(isCommunicationHubSendEnabled()).toBe(true);
    });

    it("globalThis.__COMMUNICATION_HUB_SEND_ENABLED__ also flips the gate", () => {
      expect(isCommunicationHubSendEnabled()).toBe(false);
      (globalThis as any).__COMMUNICATION_HUB_SEND_ENABLED__ = true;
      expect(isCommunicationHubSendEnabled()).toBe(true);
    });
  });

  // F4 ------------------------------------------------------------------
  it("F4: ControlledLiveTestPage exposes a manual 'gates checked' checkbox that feeds canSend", () => {
    const src = read(
      "src/pages/admin/communicationHub/testing/ControlledLiveTestPage.tsx",
    );
    expect(/ckGatesChecked/.test(src)).toBe(true);
    expect(/I confirm live gates were checked/.test(src)).toBe(true);
    // canSend depends on allConfirmed which ORs the manual checkbox in.
    expect(/const\s+allConfirmed[\s\S]{0,200}ckGatesChecked/.test(src)).toBe(true);
    expect(/const\s+canSend[\s\S]{0,200}allConfirmed/.test(src)).toBe(true);
    // No wiring from the RuntimeGateParityPanel result into canSend yet.
    expect(/canSend[\s\S]{0,400}gateResult\.allowed/.test(src)).toBe(false);
    expect(/allConfirmed[\s\S]{0,200}gateResult\.allowed/.test(src)).toBe(false);
  });

  // F5 ------------------------------------------------------------------
  describe("F5: safety presets duplicate / emergency-stop trap", () => {
    it("three 'live' presets produce identical patches", () => {
      const s = baseSettings();
      const a = computePresetChanges("internal_live_testing", s).patch;
      const b = computePresetChanges("production_internal_live", s).patch;
      const c = computePresetChanges("external_live_controlled", s).patch;
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(JSON.stringify(b)).toBe(JSON.stringify(c));
    });

    it("emergency_stop → internal_live_testing does NOT restore dispatch_enabled", () => {
      // Simulate the stored state after emergency_stop was applied.
      const stopped: CommHubControlSettings = {
        ...baseSettings(),
        dispatch_enabled: false,
        dry_run_only: true,
        email_live_enabled: false,
        cron_desired_enabled: false,
      };
      const patch = computePresetChanges("internal_live_testing", stopped).patch;
      // Broken: the internal_live_testing preset never sets dispatch_enabled.
      expect(Object.prototype.hasOwnProperty.call(patch, "dispatch_enabled")).toBe(
        false,
      );
      const merged = { ...stopped, ...patch };
      expect(merged.dispatch_enabled).toBe(false);
    });
  });

  // F6 ------------------------------------------------------------------
  it("F6: sendCommunication masks every enqueue failure as COMM_HUB_ENQUEUE_FAILED", () => {
    const src = read("src/platform/communication-hub/sendCommunication.ts");
    const occurrences = src.match(/error:\s*['"]COMM_HUB_ENQUEUE_FAILED['"]/g) ?? [];
    // Both the structured-failure path and the thrown-path collapse to the
    // same literal. Server blockers[] never propagate to the caller.
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    expect(/blockers:\s*\(data as any\)\?\.blockers/.test(src)).toBe(false);
  });

  // F7 ------------------------------------------------------------------
  it("F7: three divergent recipient-allowlist consumers exist", () => {
    const dispatcher = read("supabase/functions/comm-hub-dispatch/index.ts");
    const testUi = read(
      "src/pages/admin/communicationHub/testing/ControlledLiveTestPage.tsx",
    );

    // Dispatcher consults env allowlist first.
    expect(/COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST/.test(dispatcher)).toBe(true);
    // Dispatcher also falls back to DB arrays.
    expect(/allowed_email_addresses[\s\S]{0,80}allowed_email_domains/.test(dispatcher))
      .toBe(true);

    // Test UI has its own address+domain check and ignores recipient_release_mode.
    expect(/isRecipientAllowed|recipientCheck/.test(testUi)).toBe(true);
    expect(/recipient_release_mode/.test(testUi)).toBe(false);
  });

  // F8 ------------------------------------------------------------------
  it("F8: recipient_release_mode is never consulted at runtime (code paths)", () => {
    const files = [
      "supabase/functions/comm-hub-dispatch/index.ts",
      "supabase/functions/comm-hub-enqueue/index.ts",
    ];
    // Strip //-style comment content before searching; the dispatcher has
    // one incidental mention inside a comment describing the source-of-truth.
    const stripComments = (s: string) =>
      s
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n");
    for (const f of files) {
      const src = stripComments(read(f));
      expect(
        /recipient_release_mode/.test(src),
        `${f} unexpectedly reads recipient_release_mode in code — F8 fix already partially landed?`,
      ).toBe(false);
    }
  });

  // F1-expanded ---------------------------------------------------------
  // FIXED by CH-SIMPLE-P1/P2 — every remaining singleton reader now targets
  // singleton_guard='primary' rather than relying on ORDER BY heuristics.
  it("F1a [FIXED]: no lingering singleton scan-by-ordering reader for control_settings", () => {
    const diag = read(
      "src/pages/admin/communicationHub/testDiagnostics/validateBusinessCommunication.ts",
    );
    // Must NOT rely on updated_at DESC to pick "the" row.
    expect(
      /communication_hub_control_settings[\s\S]{0,400}\.order\(\s*["']updated_at["'],\s*\{\s*ascending:\s*false/.test(
        diag,
      ),
    ).toBe(false);
  });

  // F9 --------------------------------------------------------------------
  // FIXED by CH-SIMPLE-P3B-R.2 — the enqueue path no longer performs an
  // independent global email_live check; the canonical send decision RPC now
  // owns that gate. The env var is no longer consulted in enqueue.
  it("F9 [FIXED]: enqueue does not re-implement the email_live gate", () => {
    const enqueue = read("supabase/functions/comm-hub-enqueue/index.ts");
    // Env flag is no longer read in enqueue.
    expect(/COMMUNICATION_HUB_EMAIL_LIVE(?!_ALLOWLIST)/.test(enqueue)).toBe(false);
    // No manual global_email_live_disabled blocker push in enqueue —
    // the canonical evaluator emits that when appropriate.
    expect(
      /globalBlockers\.push\(\s*["']global_email_live_disabled["']/.test(enqueue),
    ).toBe(false);
  });


  // F10 -------------------------------------------------------------------
  it("F10: per-policy max_recipients_per_send is not enforced at enqueue", () => {
    const enqueue = read("supabase/functions/comm-hub-enqueue/index.ts");
    // The hardcoded ceiling exists.
    expect(/MAX_RECIPIENTS\s*=\s*200/.test(enqueue)).toBe(true);
    // But max_recipients_per_send from the send policy is never read by the
    // enqueue function.
    expect(/max_recipients_per_send/.test(enqueue)).toBe(false);
  });

  // F12 -------------------------------------------------------------------
  it("F12: three producers/consumers disagree on preview_confirmed location", () => {
    const ui = read(
      "src/pages/admin/communicationHub/testing/ControlledLiveTestPage.tsx",
    );
    const enqueue = read("supabase/functions/comm-hub-enqueue/index.ts");

    // Frontend nests it under metadata.
    expect(/metadata:\s*{[\s\S]*preview_confirmed/.test(ui)).toBe(true);

    // Enqueue reads top-level preview_confirmed / review_context.
    expect(/payload\s+as\s+any\)\.preview_confirmed/.test(enqueue)).toBe(true);
    expect(/\(payload\s+as\s+any\)\.review_context/.test(enqueue)).toBe(true);

    // send_communication_v1 additionally reads `payload.context.*` — a
    // third root neither the frontend nor the enqueue function agree on
    // (verified via psql inspection; not asserted from source here).
  });
});

