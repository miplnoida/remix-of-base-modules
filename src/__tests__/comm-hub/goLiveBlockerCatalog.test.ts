/**
 * CH-SIMPLE-P3F-UX.2 — Blocker catalogue tests.
 *
 * These tests protect the operator experience of the Go Live page. They
 * assert that every canonical blocker code returned by the send-decision
 * evaluator has a plain-language mapping, that recipient_policy_denied
 * points at the Recipient Policy fix route, and that unknown codes fall
 * back to the safe reference-code message (never "not yet mapped").
 */
import { describe, it, expect } from "vitest";
import {
  FIX_ROUTES,
  catalogueSize,
  pickNextAction,
  resolveBlocker,
  resolveBlockers,
  resolveCanonicalBlocker,
} from "@/pages/admin/communicationHub/goLive/canonicalBlockerCatalog";
import { isDiagnosticEvent } from "@/pages/admin/communicationHub/goLive/moduleEventDirectoryService";

describe("canonicalBlockerCatalog", () => {
  it("maps recipient_policy_denied to Recipient Policy", () => {
    const b = resolveBlocker({ code: "recipient_policy_denied" } as any);
    expect(b.isUnknown).toBe(false);
    expect(b.title).toMatch(/recipient/i);
    expect(b.fixRoute).toBe(FIX_ROUTES.recipientPolicy);
    expect(b.group).toBe("platform");
  });

  it("aliases legacy recipient codes to the canonical entry", () => {
    for (const c of [
      "recipient_not_allowlisted",
      "recipient_domain_not_allowlisted",
      "single_recipient_required",
    ]) {
      const b = resolveCanonicalBlocker(c);
      expect(b?.code).toBe("recipient_policy_denied");
    }
  });

  it("maps template / sender / provider / preview / dry-run / operating-mode / emergency-stop", () => {
    expect(resolveCanonicalBlocker("template_not_mapped")?.group).toBe("event");
    expect(resolveCanonicalBlocker("sender_not_ready")?.group).toBe("platform");
    expect(resolveCanonicalBlocker("provider_not_ready")?.group).toBe("platform");
    expect(resolveCanonicalBlocker("preview_approval_required")?.group).toBe("test");
    expect(resolveCanonicalBlocker("dry_run_certification_required")?.group).toBe("test");
    expect(resolveCanonicalBlocker("operating_mode_denied")?.group).toBe("platform");
    expect(resolveCanonicalBlocker("emergency_stop_active")?.severity).toBe("critical");
  });

  it("has a safe fallback for unknown codes (never 'not yet mapped')", () => {
    const b = resolveBlocker({ code: "some_unmapped_code_xyz" } as any);
    expect(b.isUnknown).toBe(true);
    expect(b.explanation).not.toMatch(/not yet mapped/i);
    expect(b.explanation.toLowerCase()).toContain("reference code");
  });

  it("prefers server-supplied message for unknown codes", () => {
    const b = resolveBlocker({
      code: "some_new_code",
      message: "The dispatcher is temporarily paused for maintenance.",
    } as any);
    expect(b.explanation).toContain("dispatcher");
  });

  it("dedupes blockers by canonical code", () => {
    const rs = resolveBlockers([
      { code: "recipient_not_allowlisted" } as any,
      { code: "single_recipient_required" } as any,
      { code: "recipient_policy_denied" } as any,
    ]);
    expect(rs).toHaveLength(1);
    expect(rs[0].code).toBe("recipient_policy_denied");
  });

  it("pickNextAction prefers platform > event > test, then severity", () => {
    const rs = resolveBlockers([
      { code: "preview_approval_required" } as any,
      { code: "recipient_policy_denied" } as any,
      { code: "template_not_mapped" } as any,
    ]);
    const next = pickNextAction(rs);
    expect(next?.code).toBe("recipient_policy_denied");
  });

  it("catalogue size looks sensible", () => {
    const { canonical, aliases } = catalogueSize();
    expect(canonical).toBeGreaterThanOrEqual(10);
    expect(aliases).toBeGreaterThanOrEqual(10);
  });
});

describe("isDiagnosticEvent", () => {
  it("flags Admin Test Notice as diagnostic", () => {
    expect(
      isDiagnosticEvent({
        eventCode: "ADMIN_TEST_NOTICE",
        moduleCode: "COMM_HUB",
        eventName: "Admin Test Notice",
      } as any),
    ).toBe(true);
  });
  it("treats regular business events as non-diagnostic", () => {
    expect(
      isDiagnosticEvent({
        eventCode: "APPEAL_ACKNOWLEDGED",
        moduleCode: "BN_APPEALS",
        eventName: "Appeal acknowledged",
      } as any),
    ).toBe(false);
  });
});
