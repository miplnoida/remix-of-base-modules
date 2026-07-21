/**
 * CH-SIMPLE-P3F-UX.4 — Test recipient resolution & recipient context.
 */
import { describe, it, expect } from "vitest";
import {
  resolveTestRecipient,
  buildRecipientContext,
  normalizeEmail,
  maskEmailForDisplay,
} from "@/pages/admin/communicationHub/goLive/resolveTestRecipient";
import type { RecipientPolicy } from "@/platform/communication-hub/recipientPolicyService";

function baseP(overrides: Partial<RecipientPolicy> = {}): RecipientPolicy {
  return {
    id: "p-1",
    singletonGuard: "primary",
    activeMode: "SINGLE_CONFIGURED_RECIPIENT",
    singleConfiguredAddress: null,
    approvedNamedAddresses: [],
    approvedDomains: [],
    maxRecipientsPerRequest: 1,
    maxToRecipients: 1,
    ccAllowed: false,
    maxCcRecipients: 0,
    bccAllowed: false,
    maxBccRecipients: 0,
    externalAddressesPermitted: false,
    subdomainsPermitted: false,
    policyVersion: 1,
    configurationVersion: 1,
    changeReason: null,
    changedBy: null,
    changedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("resolveTestRecipient", () => {
  it("returns policy_not_loaded when policy is null", () => {
    expect(resolveTestRecipient(null).reason).toBe("policy_not_loaded");
  });

  it("resolves the single configured address (lower-cased/trimmed)", () => {
    const r = resolveTestRecipient(
      baseP({ activeMode: "SINGLE_CONFIGURED_RECIPIENT", singleConfiguredAddress: "  Rohit@Example.com " }),
    );
    expect(r.address).toBe("rohit@example.com");
    expect(r.source).toBe("single_configured_recipient");
    expect(r.reason).toBe("resolved");
  });

  it("returns single_configured_missing when the address is blank", () => {
    const r = resolveTestRecipient(
      baseP({ activeMode: "SINGLE_CONFIGURED_RECIPIENT", singleConfiguredAddress: "" }),
    );
    expect(r.address).toBeNull();
    expect(r.reason).toBe("single_configured_missing");
  });

  it("resolves the first active named recipient", () => {
    const r = resolveTestRecipient(
      baseP({
        activeMode: "APPROVED_NAMED_RECIPIENTS",
        approvedNamedAddresses: [
          { address: "inactive@example.com", active: false },
          { address: "Ok@Example.com", active: true },
        ],
      }),
    );
    expect(r.address).toBe("ok@example.com");
    expect(r.source).toBe("approved_named_recipients");
  });

  it("blocks when named list has no active entries", () => {
    const r = resolveTestRecipient(
      baseP({
        activeMode: "APPROVED_NAMED_RECIPIENTS",
        approvedNamedAddresses: [{ address: "x@example.com", active: false }],
      }),
    );
    expect(r.reason).toBe("no_active_named_recipient");
  });

  it("cannot resolve a specific address in APPROVED_DOMAINS mode", () => {
    const r = resolveTestRecipient(baseP({ activeMode: "APPROVED_DOMAINS" }));
    expect(r.reason).toBe("no_specific_address_in_domain_mode");
  });

  it("cannot resolve when policy is DISABLED", () => {
    const r = resolveTestRecipient(baseP({ activeMode: "DISABLED" }));
    expect(r.reason).toBe("policy_disabled");
  });
});

describe("buildRecipientContext", () => {
  it("reports a match when evaluated equals approved (normalized)", () => {
    const ctx = buildRecipientContext(
      baseP({ singleConfiguredAddress: "rohit@example.com" }),
      "ROHIT@example.com",
    );
    expect(ctx.normalizedMatch).toBe(true);
    expect(ctx.evaluatedMasked).toContain("@example.com");
    expect(ctx.approvedMasked).toContain("@example.com");
  });

  it("reports a mismatch when the evaluated recipient differs", () => {
    const ctx = buildRecipientContext(
      baseP({ singleConfiguredAddress: "rohit@example.com" }),
      "alice@example.com",
    );
    expect(ctx.normalizedMatch).toBe(false);
  });

  it("marks resolvedFromPolicy=false when no approved recipient exists", () => {
    const ctx = buildRecipientContext(baseP({ activeMode: "DISABLED" }), null);
    expect(ctx.resolvedFromPolicy).toBe(false);
    expect(ctx.approvedAddress).toBeNull();
  });
});

describe("email utilities", () => {
  it("normalizeEmail lower-cases and trims", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
    expect(normalizeEmail(null)).toBe("");
  });

  it("maskEmailForDisplay hides all but the first character of the local part", () => {
    expect(maskEmailForDisplay("rohit@example.com")).toBe("r****@example.com");
    expect(maskEmailForDisplay(null)).toBeNull();
  });
});

describe("no hardcoded recipients (source scan)", () => {
  it("resolveTestRecipient module contains no literal @ email", async () => {
    const src = await (
      await import("fs/promises")
    ).readFile("src/pages/admin/communicationHub/goLive/resolveTestRecipient.ts", "utf8");
    // Strip comments before scanning so documentation like resolver rules can
    // reference protocol names without tripping the guard.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(codeOnly)).toBe(false);
  });
});
