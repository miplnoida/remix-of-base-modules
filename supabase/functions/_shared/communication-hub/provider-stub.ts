/**
 * CH-SIMPLE-P3E-B — Deterministic Communication Hub provider STUB.
 *
 * This stub is the ONLY provider path invoked during P3E-B certification.
 * The first real provider call belongs to P3E-C.
 *
 * Activation: `COMM_HUB_PROVIDER_MODE=stub` (default is inactive so any
 * accidental production import fails closed).
 *
 * Outcome routing is driven by a convention on the recipient local-part:
 *
 *   accepted+*@...   → PROVIDER_ACCEPTED  (records a synthetic message id)
 *   delivered+*@...  → PROVIDER_ACCEPTED + follow-up webhook (P3E-C)
 *   rejected+*@...   → PROVIDER_REJECTED
 *   timeout+*@...    → DELIVERY_PENDING with provider_outcome_unconfirmed
 *   any other local-part → PROVIDER_ACCEPTED (safe default for
 *   Recipient-Policy-configured allowlisted fixtures)
 *
 * The stub NEVER hardcodes a real recipient address. Tests configure
 * addresses through `communication_hub_recipient_policy`.
 *
 * Exactly-once semantics: this module maintains an in-memory registry
 * keyed by `providerInvocationKey` inside a single Deno isolate. Combined
 * with the durable `communication_delivery_attempt.provider_invocation_key`
 * unique index, a retry can never produce a second provider invocation
 * for the same key.
 */

// deno-lint-ignore-file no-explicit-any

export type ProviderStubStatus =
  | "PROVIDER_ACCEPTED"
  | "PROVIDER_REJECTED"
  | "DELIVERY_PENDING";

export interface ProviderStubInput {
  recipient: string;
  providerInvocationKey: string;
  subject: string;
  bodyHash: string;
}

export interface ProviderStubOutcome {
  status: ProviderStubStatus;
  providerName: "comm-hub-stub";
  providerMessageId: string | null;
  providerResponseSafe: Record<string, unknown>;
  warnings: Array<{ code: string; message: string }>;
  duplicateCall: boolean;
}

const invocationRegistry = new Map<string, ProviderStubOutcome>();

/** Test-only reset. Never exported to production code. */
export function __resetProviderStubForTests(): void {
  invocationRegistry.clear();
}

function classify(recipient: string): ProviderStubStatus {
  const local = recipient.split("@")[0]?.toLowerCase() ?? "";
  if (local.startsWith("rejected+") || local === "rejected") return "PROVIDER_REJECTED";
  if (local.startsWith("timeout+") || local === "timeout") return "DELIVERY_PENDING";
  return "PROVIDER_ACCEPTED";
}

export function isProviderStubActive(): boolean {
  return (globalThis as any).Deno?.env?.get?.("COMM_HUB_PROVIDER_MODE") === "stub";
}

export function invokeProviderStub(input: ProviderStubInput): ProviderStubOutcome {
  if (!isProviderStubActive()) {
    throw new Error(
      "invokeProviderStub called with COMM_HUB_PROVIDER_MODE != 'stub'; real provider path is P3E-C only",
    );
  }
  if (!input.providerInvocationKey || input.providerInvocationKey.length < 8) {
    throw new Error("invokeProviderStub requires a stable providerInvocationKey");
  }

  const prior = invocationRegistry.get(input.providerInvocationKey);
  if (prior) {
    // Duplicate call — surface as evidence, do not invoke twice.
    return { ...prior, duplicateCall: true };
  }

  const status = classify(input.recipient);
  const providerMessageId =
    status === "PROVIDER_ACCEPTED" || status === "DELIVERY_PENDING"
      ? `stub-msg-${input.providerInvocationKey.slice(0, 12)}`
      : null;

  const warnings: ProviderStubOutcome["warnings"] = [];
  if (status === "DELIVERY_PENDING") {
    warnings.push({
      code: "provider_outcome_unconfirmed",
      message: "stub simulated an ambiguous provider timeout; no automatic retry",
    });
  }

  const providerResponseSafe: Record<string, unknown> = {
    provider: "comm-hub-stub",
    status,
    subject_length: input.subject.length,
    body_hash: input.bodyHash,
    invocation_key: input.providerInvocationKey,
    stub_note:
      status === "PROVIDER_REJECTED"
        ? "recipient classified as reject fixture"
        : status === "DELIVERY_PENDING"
        ? "recipient classified as timeout fixture"
        : "recipient classified as accepted fixture",
  };

  const outcome: ProviderStubOutcome = {
    status,
    providerName: "comm-hub-stub",
    providerMessageId,
    providerResponseSafe,
    warnings,
    duplicateCall: false,
  };

  invocationRegistry.set(input.providerInvocationKey, outcome);
  return outcome;
}
