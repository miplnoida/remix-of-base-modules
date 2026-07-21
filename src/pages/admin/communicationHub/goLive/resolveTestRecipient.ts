/**
 * CH-SIMPLE-P3F-UX.4 / UX.5 — Resolve the test recipient for the Go Live
 * readiness check from the authoritative Recipient Policy.
 *
 * SAFETY:
 *  - Never uses hardcoded emails, env vars, browser storage, or defaults.
 *  - Only reads from the RecipientPolicy singleton already loaded from the
 *    canonical service.
 *  - Comparison is done using a normalized lower-cased trim.
 *
 * UX.5 correction: the frontend must NOT synthesise anything that looks
 * like the canonical server send-decision envelope. Instead we return a
 * separate discriminated-union `GoLiveRecipientResolution` result that
 * the UI layer renders directly as a blocker card. The canonical
 * evaluator is only called once a concrete recipient exists.
 */
import type { RecipientPolicy } from "@/platform/communication-hub/recipientPolicyService";

// ---------------------------------------------------------------------------
// UX.5 — Authoritative resolution result (discriminated union)
// ---------------------------------------------------------------------------

export type GoLiveRecipientSource =
  | "single_configured_recipient"
  | "approved_named_recipient"
  | "operator_selected_approved_recipient";

export type GoLiveRecipientBlockerReason =
  | "policy_not_loaded"
  | "single_configured_missing"
  | "no_active_named_recipient"
  | "multiple_named_recipients_require_selection"
  | "no_specific_address_in_domain_mode"
  | "policy_disabled"
  | "controlled_external_mode_not_permitted";

export type GoLiveRecipientResolution =
  | {
      resolved: true;
      recipient: string;
      source: GoLiveRecipientSource;
      /** Available approved candidates the operator could pick from. Empty
       *  when the mode has only a single implicit candidate. */
      candidates: string[];
    }
  | {
      resolved: false;
      blockerCode: "test_recipient_not_resolved";
      reason: GoLiveRecipientBlockerReason;
      /** Candidates the operator can choose from — only populated when the
       *  reason is `multiple_named_recipients_require_selection`. */
      candidates: string[];
    };

export function normalizeEmail(v: string | null | undefined): string {
  return String(v ?? "").trim().toLowerCase();
}

/** Extract the normalized list of active approved named addresses. */
function activeNamed(policy: RecipientPolicy): string[] {
  return (policy.approvedNamedAddresses ?? [])
    .filter((e) => e && e.active && e.address)
    .map((e) => normalizeEmail(e.address))
    .filter((v) => v.length > 0);
}

/**
 * UX.5 canonical resolver. Returns a discriminated result — never a fake
 * send-decision envelope. `operatorSelectedAddress` (optional) is the
 * address the operator picked from the approved named list.
 */
export function resolveGoLiveRecipient(
  policy: RecipientPolicy | null,
  operatorSelectedAddress?: string | null,
): GoLiveRecipientResolution {
  if (!policy) {
    return {
      resolved: false,
      blockerCode: "test_recipient_not_resolved",
      reason: "policy_not_loaded",
      candidates: [],
    };
  }

  switch (policy.activeMode) {
    case "SINGLE_CONFIGURED_RECIPIENT": {
      const addr = normalizeEmail(policy.singleConfiguredAddress);
      if (!addr) {
        return {
          resolved: false,
          blockerCode: "test_recipient_not_resolved",
          reason: "single_configured_missing",
          candidates: [],
        };
      }
      return {
        resolved: true,
        recipient: addr,
        source: "single_configured_recipient",
        candidates: [],
      };
    }

    case "APPROVED_NAMED_RECIPIENTS": {
      const list = activeNamed(policy);
      if (list.length === 0) {
        return {
          resolved: false,
          blockerCode: "test_recipient_not_resolved",
          reason: "no_active_named_recipient",
          candidates: [],
        };
      }
      const picked = normalizeEmail(operatorSelectedAddress);
      if (picked && list.includes(picked)) {
        return {
          resolved: true,
          recipient: picked,
          source: "operator_selected_approved_recipient",
          candidates: list,
        };
      }
      if (list.length === 1) {
        return {
          resolved: true,
          recipient: list[0],
          source: "approved_named_recipient",
          candidates: list,
        };
      }
      return {
        resolved: false,
        blockerCode: "test_recipient_not_resolved",
        reason: "multiple_named_recipients_require_selection",
        candidates: list,
      };
    }

    case "APPROVED_DOMAINS":
      return {
        resolved: false,
        blockerCode: "test_recipient_not_resolved",
        reason: "no_specific_address_in_domain_mode",
        candidates: [],
      };

    case "CONTROLLED_EXTERNAL_RECIPIENTS":
      return {
        resolved: false,
        blockerCode: "test_recipient_not_resolved",
        reason: "controlled_external_mode_not_permitted",
        candidates: [],
      };

    case "DISABLED":
    default:
      return {
        resolved: false,
        blockerCode: "test_recipient_not_resolved",
        reason: "policy_disabled",
        candidates: [],
      };
  }
}

// ---------------------------------------------------------------------------
// UX.4 back-compat surface (kept because callers/tests still consume it).
// This is a thin projection over `resolveGoLiveRecipient`.
// ---------------------------------------------------------------------------

export interface ResolvedTestRecipient {
  address: string | null;
  source:
    | "single_configured_recipient"
    | "approved_named_recipients"
    | null;
  reason:
    | "resolved"
    | "policy_not_loaded"
    | "policy_disabled"
    | "single_configured_missing"
    | "no_active_named_recipient"
    | "multiple_named_recipients_require_selection"
    | "no_specific_address_in_domain_mode"
    | "controlled_external_mode_not_permitted"
    | "unknown_mode";
  approvedForDisplay: string | null;
}

export function resolveTestRecipient(
  policy: RecipientPolicy | null,
): ResolvedTestRecipient {
  const r = resolveGoLiveRecipient(policy, null);
  if (r.resolved === true) {
    return {
      address: r.recipient,
      source:
        r.source === "single_configured_recipient"
          ? "single_configured_recipient"
          : "approved_named_recipients",
      reason: "resolved",
      approvedForDisplay: r.recipient,
    };
  }
  const reason: ResolvedTestRecipient["reason"] = r.reason;
  return {
    address: null,
    source: null,
    reason,
    approvedForDisplay: null,
  };
}

export function maskEmailForDisplay(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, Math.min(1, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${domain}`;
}

export interface RecipientMatchContext {
  policyMode: string;
  evaluatedAddress: string | null;
  evaluatedMasked: string | null;
  approvedAddress: string | null;
  approvedMasked: string | null;
  resolvedFromPolicy: boolean;
  normalizedMatch: boolean | null;
  reason: ResolvedTestRecipient["reason"];
}

export function buildRecipientContext(
  policy: RecipientPolicy | null,
  evaluatedAddress: string | null,
): RecipientMatchContext {
  const resolved = resolveTestRecipient(policy);
  const evaluated = normalizeEmail(evaluatedAddress) || null;
  const approved = resolved.approvedForDisplay;
  let match: boolean | null = null;
  if (evaluated && approved) match = evaluated === approved;
  return {
    policyMode: policy?.activeMode ?? "UNKNOWN",
    evaluatedAddress: evaluated,
    evaluatedMasked: maskEmailForDisplay(evaluated),
    approvedAddress: approved,
    approvedMasked: maskEmailForDisplay(approved),
    resolvedFromPolicy: resolved.reason === "resolved",
    normalizedMatch: match,
    reason: resolved.reason,
  };
}
