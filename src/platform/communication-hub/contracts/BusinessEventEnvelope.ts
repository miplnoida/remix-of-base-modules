/**
 * PHASE_4B3 — Unified Go-Live Certification Foundation
 * Canonical Business Event Envelope
 *
 * Every business module must build one of these envelopes and hand it to the
 * Hub façade. The Hub then decides template, sender, recipient, dispatch,
 * approval and audit. Business modules never resolve any of those themselves.
 *
 * Contract version: business-event-envelope/1
 */

export const BUSINESS_EVENT_ENVELOPE_VERSION = "business-event-envelope/1" as const;

export type BusinessEventChannel = "email" | "sms" | "letter" | "in_app";

export interface BusinessEventReference {
  /** Fully qualified reference of the source business entity, e.g. "APPEALS/APPEAL/APL-2026-0001". */
  qualified: string;
  entityType: string;
  entityId: string;
  correlationId?: string;
}

export interface BusinessEventRecipientHint {
  /**
   * Business-side recipient hint. The Hub is the sole authority for the
   * effective recipient — it applies the recipient policy on top of this hint.
   */
  displayName?: string;
  personId?: string;
  channel: BusinessEventChannel;
}

export interface BusinessEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  envelopeVersion: typeof BUSINESS_EVENT_ENVELOPE_VERSION;
  moduleCode: string;
  eventCode: string;
  channel: BusinessEventChannel;
  reference: BusinessEventReference;
  recipient: BusinessEventRecipientHint;
  /**
   * Event payload — MUST match the enforced payload schema for
   * (moduleCode, eventCode). Flat template-alias keys are rejected by the
   * certification runner.
   */
  payload: TPayload;
  /** Idempotency key for the business action. Never a message-level id. */
  idempotencyKey: string;
  /** Optional stage hint. If absent the Hub picks the current live mode. */
  targetStage?: "PREVIEW_TEST" | "DRY_RUN" | "CONTROLLED_STUB" | "PRODUCTION";
}

export interface BusinessEventEnvelopeValidationError {
  code: string;
  message: string;
  path?: string;
}

export function validateBusinessEventEnvelope(
  input: unknown,
): { ok: true; envelope: BusinessEventEnvelope } | { ok: false; errors: BusinessEventEnvelopeValidationError[] } {
  const errors: BusinessEventEnvelopeValidationError[] = [];
  if (!input || typeof input !== "object") {
    return { ok: false, errors: [{ code: "envelope_not_object", message: "envelope must be an object" }] };
  }
  const e = input as Record<string, unknown>;
  const require = (path: string, cond: boolean, code: string) => {
    if (!cond) errors.push({ code, message: `${path} is required`, path });
  };
  require("envelopeVersion", e.envelopeVersion === BUSINESS_EVENT_ENVELOPE_VERSION, "envelope_version_mismatch");
  require("moduleCode", typeof e.moduleCode === "string" && !!e.moduleCode, "module_code_required");
  require("eventCode", typeof e.eventCode === "string" && !!e.eventCode, "event_code_required");
  require("channel", typeof e.channel === "string" && ["email","sms","letter","in_app"].includes(e.channel as string), "channel_invalid");
  require("reference", !!e.reference && typeof e.reference === "object", "reference_required");
  require("recipient", !!e.recipient && typeof e.recipient === "object", "recipient_required");
  require("payload", !!e.payload && typeof e.payload === "object", "payload_required");
  require("idempotencyKey", typeof e.idempotencyKey === "string" && !!e.idempotencyKey, "idempotency_key_required");

  // Reject business modules trying to pre-decide platform concerns.
  const reserved = ["templateId", "templateVersionId", "senderProfileId", "recipientEmail", "recipientOverride", "subject", "bodyHtml", "bodyText"];
  for (const k of reserved) {
    if (k in e) errors.push({ code: "reserved_platform_field", message: `envelope must not include ${k}; the Hub decides`, path: k });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, envelope: e as unknown as BusinessEventEnvelope };
}
