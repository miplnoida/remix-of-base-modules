/**
 * CH-SIMPLE-P3F-UX.4 — Resolve the test recipient for the Go Live readiness
 * check from the authoritative Recipient Policy.
 *
 * SAFETY:
 *  - Never uses hardcoded emails, env vars, browser storage, or defaults.
 *  - Only reads from the RecipientPolicy singleton already loaded from the
 *    canonical service.
 *  - Comparison is done using a normalized lower-cased trim.
 *
 * Resolution order (spec §3):
 *   1. Mode SINGLE_CONFIGURED_RECIPIENT → singleConfiguredAddress.
 *   2. Mode APPROVED_NAMED_RECIPIENTS   → first active named address.
 *   3. Mode APPROVED_DOMAINS            → cannot resolve a specific address;
 *                                         report `no_specific_address_in_domain_mode`.
 *   4. Mode DISABLED / CONTROLLED_EXTERNAL_RECIPIENTS → cannot resolve.
 */
import type { RecipientPolicy } from "@/platform/communication-hub/recipientPolicyService";

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
    | "no_specific_address_in_domain_mode"
    | "controlled_external_mode_not_permitted"
    | "unknown_mode";
  approvedForDisplay: string | null;
}

export function normalizeEmail(v: string | null | undefined): string {
  return String(v ?? "").trim().toLowerCase();
}

export function resolveTestRecipient(
  policy: RecipientPolicy | null,
): ResolvedTestRecipient {
  if (!policy) {
    return { address: null, source: null, reason: "policy_not_loaded", approvedForDisplay: null };
  }
  switch (policy.activeMode) {
    case "SINGLE_CONFIGURED_RECIPIENT": {
      const addr = normalizeEmail(policy.singleConfiguredAddress);
      if (!addr) {
        return {
          address: null,
          source: null,
          reason: "single_configured_missing",
          approvedForDisplay: null,
        };
      }
      return {
        address: addr,
        source: "single_configured_recipient",
        reason: "resolved",
        approvedForDisplay: addr,
      };
    }
    case "APPROVED_NAMED_RECIPIENTS": {
      const active = (policy.approvedNamedAddresses ?? []).find((e) => e.active && e.address);
      if (!active) {
        return {
          address: null,
          source: null,
          reason: "no_active_named_recipient",
          approvedForDisplay: null,
        };
      }
      const addr = normalizeEmail(active.address);
      return {
        address: addr,
        source: "approved_named_recipients",
        reason: "resolved",
        approvedForDisplay: addr,
      };
    }
    case "APPROVED_DOMAINS":
      return {
        address: null,
        source: null,
        reason: "no_specific_address_in_domain_mode",
        approvedForDisplay: null,
      };
    case "CONTROLLED_EXTERNAL_RECIPIENTS":
      return {
        address: null,
        source: null,
        reason: "controlled_external_mode_not_permitted",
        approvedForDisplay: null,
      };
    case "DISABLED":
      return { address: null, source: null, reason: "policy_disabled", approvedForDisplay: null };
    default:
      return { address: null, source: null, reason: "unknown_mode", approvedForDisplay: null };
  }
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
