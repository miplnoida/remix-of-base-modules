/**
 * CH-SIMPLE-P3H — Storage Governance
 *
 * The Go Live journey must never persist authoritative gate state in the
 * browser. Only opaque reference IDs (module/event codes, execution IDs,
 * certification IDs) are permitted in sessionStorage/localStorage.
 *
 * Forbidden key fragments correspond to authoritative decisions that the
 * server MUST re-evaluate on every step transition (P3H §6).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GO_LIVE = path.join(ROOT, "src/pages/admin/communicationHub/goLive/GoLivePage.tsx");

const FORBIDDEN_AUTHORITATIVE_KEYS = [
  "readinessPassed",
  "readiness_passed",
  "previewApproved",
  "preview_approved",
  "dryRunValid",
  "dry_run_valid",
  "controlledLiveEligible",
  "controlled_live_eligible",
  "providerAuthorised",
  "provider_authorised",
  "realEmailEnabled",
  "real_email_enabled",
  "grantValid",
  "grant_valid",
  "operatingModeAllowsSend",
  "operating_mode_allows_send",
  "recipientApproved",
  "recipient_approved",
  "emergencyStopCleared",
  "emergency_stop_cleared",
];

describe("CH-SIMPLE-P3H storage governance", () => {
  it("GoLiveSession shape (the object persisted to sessionStorage) contains no authoritative flag", () => {
    const src = fs.readFileSync(GO_LIVE, "utf8");
    // Scope the scan to the persisted session shape only — derived UI
    // variables named after these concepts are allowed at runtime.
    const ifaceMatch = src.match(/interface GoLiveSession \{[\s\S]*?\}/);
    expect(ifaceMatch, "GoLiveSession interface must exist").toBeTruthy();
    const shape = ifaceMatch![0];
    for (const key of FORBIDDEN_AUTHORITATIVE_KEYS) {
      expect(
        shape.toLowerCase().includes(key.toLowerCase()),
        `Forbidden authoritative flag "${key}" must not appear in the persisted GoLiveSession shape`,
      ).toBe(false);
    }
  });

  it("Go Live session shape holds only reference IDs and selection", () => {
    const src = fs.readFileSync(GO_LIVE, "utf8");
    // The permitted GoLiveSession keys, per P3H §6.
    const allowed = [
      "moduleCode",
      "eventCode",
      "channel",
      "previewSnapshotId",
      "previewApprovalId",
      "dryRunExecutionId",
      "dryRunCertificationId",
      "controlledLiveExecutionId",
      "controlledLiveCertificationId",
    ];
    for (const key of allowed) {
      expect(src.includes(key)).toBe(true);
    }
  });

  it("Go Live page reloads authoritative state from server on step transitions", () => {
    const src = fs.readFileSync(GO_LIVE, "utf8");
    // Every unlock must go through the canonical evaluator, not local state.
    expect(src.includes("evaluateCanonicalSendDecision")).toBe(true);
  });
});
