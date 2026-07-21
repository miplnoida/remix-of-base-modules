/**
 * CH-SIMPLE-P3F-UX.5 — Authoritative Go Live recipient resolution.
 *
 * Verifies that:
 *  - Every unresolved outcome returns a discriminated result, NOT a fake
 *    canonical send-decision envelope.
 *  - Multiple active named recipients require operator selection.
 *  - Operator selection is honoured only when the address is in the
 *    approved list (normalized).
 *  - Domain / disabled / controlled-external / policy-not-loaded modes
 *    surface the correct reason codes.
 */
import { describe, it, expect } from "vitest";
import {
  resolveGoLiveRecipient,
  type GoLiveRecipientResolution,
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

function assertUnresolved(
  r: GoLiveRecipientResolution,
): asserts r is Extract<GoLiveRecipientResolution, { resolved: false }> {
  expect(r.resolved).toBe(false);
}
function assertResolved(
  r: GoLiveRecipientResolution,
): asserts r is Extract<GoLiveRecipientResolution, { resolved: true }> {
  expect(r.resolved).toBe(true);
}

describe("resolveGoLiveRecipient — unresolved reasons", () => {
  it("policy_not_loaded when policy is null", () => {
    const r = resolveGoLiveRecipient(null);
    assertUnresolved(r);
    expect(r.reason).toBe("policy_not_loaded");
    expect(r.blockerCode).toBe("test_recipient_not_resolved");
  });

  it("single_configured_missing when address blank", () => {
    const r = resolveGoLiveRecipient(
      baseP({ activeMode: "SINGLE_CONFIGURED_RECIPIENT", singleConfiguredAddress: "" }),
    );
    assertUnresolved(r);
    expect(r.reason).toBe("single_configured_missing");
  });

  it("no_active_named_recipient when list has no active entries", () => {
    const r = resolveGoLiveRecipient(
      baseP({
        activeMode: "APPROVED_NAMED_RECIPIENTS",
        approvedNamedAddresses: [{ address: "x@example.com", active: false }],
      }),
    );
    assertUnresolved(r);
    expect(r.reason).toBe("no_active_named_recipient");
  });

  it("multiple_named_recipients_require_selection when 2+ active and no operator pick", () => {
    const r = resolveGoLiveRecipient(
      baseP({
        activeMode: "APPROVED_NAMED_RECIPIENTS",
        approvedNamedAddresses: [
          { address: "a@example.com", active: true },
          { address: "b@example.com", active: true },
        ],
      }),
    );
    assertUnresolved(r);
    expect(r.reason).toBe("multiple_named_recipients_require_selection");
    expect(r.candidates).toEqual(["a@example.com", "b@example.com"]);
  });

  it("no_specific_address_in_domain_mode for APPROVED_DOMAINS", () => {
    const r = resolveGoLiveRecipient(baseP({ activeMode: "APPROVED_DOMAINS" }));
    assertUnresolved(r);
    expect(r.reason).toBe("no_specific_address_in_domain_mode");
  });

  it("controlled_external_mode_not_permitted for CONTROLLED_EXTERNAL_RECIPIENTS", () => {
    const r = resolveGoLiveRecipient(baseP({ activeMode: "CONTROLLED_EXTERNAL_RECIPIENTS" }));
    assertUnresolved(r);
    expect(r.reason).toBe("controlled_external_mode_not_permitted");
  });

  it("policy_disabled for DISABLED", () => {
    const r = resolveGoLiveRecipient(baseP({ activeMode: "DISABLED" }));
    assertUnresolved(r);
    expect(r.reason).toBe("policy_disabled");
  });
});

describe("resolveGoLiveRecipient — resolved outcomes", () => {
  it("single_configured_recipient normalized", () => {
    const r = resolveGoLiveRecipient(
      baseP({
        activeMode: "SINGLE_CONFIGURED_RECIPIENT",
        singleConfiguredAddress: "  Rohit@Example.com ",
      }),
    );
    assertResolved(r);
    expect(r.recipient).toBe("rohit@example.com");
    expect(r.source).toBe("single_configured_recipient");
  });

  it("approved_named_recipient when exactly one active entry", () => {
    const r = resolveGoLiveRecipient(
      baseP({
        activeMode: "APPROVED_NAMED_RECIPIENTS",
        approvedNamedAddresses: [
          { address: "inactive@example.com", active: false },
          { address: "Ok@Example.com", active: true },
        ],
      }),
    );
    assertResolved(r);
    expect(r.recipient).toBe("ok@example.com");
    expect(r.source).toBe("approved_named_recipient");
  });

  it("operator_selected_approved_recipient when operator picks an approved address", () => {
    const policy = baseP({
      activeMode: "APPROVED_NAMED_RECIPIENTS",
      approvedNamedAddresses: [
        { address: "a@example.com", active: true },
        { address: "b@example.com", active: true },
      ],
    });
    const r = resolveGoLiveRecipient(policy, "B@Example.com");
    assertResolved(r);
    expect(r.recipient).toBe("b@example.com");
    expect(r.source).toBe("operator_selected_approved_recipient");
    expect(r.candidates).toEqual(["a@example.com", "b@example.com"]);
  });

  it("operator selection is ignored when address is not in approved list", () => {
    const policy = baseP({
      activeMode: "APPROVED_NAMED_RECIPIENTS",
      approvedNamedAddresses: [
        { address: "a@example.com", active: true },
        { address: "b@example.com", active: true },
      ],
    });
    const r = resolveGoLiveRecipient(policy, "mallory@evil.tld");
    assertUnresolved(r);
    expect(r.reason).toBe("multiple_named_recipients_require_selection");
  });
});

describe("no synthetic canonical decision envelope leaks into the resolver", () => {
  it("unresolved outcomes carry only the discriminated shape (no gate_results, no allowed field)", () => {
    const r = resolveGoLiveRecipient(baseP({ activeMode: "DISABLED" }));
    assertUnresolved(r);
    expect(Object.keys(r).sort()).toEqual(
      ["blockerCode", "candidates", "reason", "resolved"].sort(),
    );
  });
});
