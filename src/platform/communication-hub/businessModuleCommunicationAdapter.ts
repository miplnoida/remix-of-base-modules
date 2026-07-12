/**
 * EPIC 4C — Business Module Communication Adapter (dry-run only).
 *
 * Shared foundation used by module-specific adapters (Legal, Insured Person,
 * Benefits, Employer Registration, Compliance, ...) to send Communication Hub
 * requests via the CANONICAL façade only.
 *
 * Canonical path (unchanged):
 *   moduleAdapter → sendBusinessModuleCommunicationDryRun()
 *     → supabase.functions.invoke("comm-hub-event-pilot", { action: "dry_run", ... })
 *       → send_communication_v1 (test_mode=true)
 *         → comm-hub-dispatch (targetMode, provider stub "dry-run:")
 *
 * HARD SAFETY (EPIC 4C):
 *   - testMode = true ALWAYS
 *   - recipientEmail = rohit@mishainfotech.com (locked)
 *   - channel = email only
 *   - never called from cron
 *   - never writes notification_queue / notification_logs / bn_communication_log / ce_audit_communications
 *   - never invokes a provider directly
 *
 * Server enforces the same gates; this layer is a typed, module-friendly wrapper.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  startBusinessCommunicationTrace,
  appendTraceStep,
  completeTrace,
  toTraceContext,
} from "@/platform/communication-hub/trace/communicationTrace";

export const DRY_RUN_LOCKED_RECIPIENT = "rohit@mishainfotech.com";
export const MODULE_ADAPTER_TYPED_CONFIRMATION = "SEND MODULE DRY RUN";

/** Tokens the server injects — module adapters must NOT supply these. */
const SERVER_PROVIDED_TOKENS = new Set([
  "request_no",
  "request_id",
  "generated_at",
  "module_code",
  "event_code",
]);

export interface BusinessModuleDryRunInput {
  moduleCode: string;
  eventCode: string;
  templateCode?: string; // resolved server-side when omitted
  entityType?: string | null;
  entityId?: string | null;
  referenceNo?: string | null;
  recipientName: string;
  tokens: Record<string, string>;
  reason: string;
  /** Which adapter/screen triggered this send (for audit trace). */
  source: string;
  /** Callers may set explicit idempotency; default is auto-generated. */
  idempotencyKey?: string;
}

export interface BusinessModuleDryRunResult {
  ok: boolean;
  requestId?: string | null;
  requestNo?: string | null;
  messageId?: string | null;
  providerMessageId?: string | null;
  templateCode?: string | null;
  templateVersionId?: string | null;
  raw?: unknown;
  error?: string;
  blockers?: string[];
}

function assertNonEmpty(name: string, v: unknown) {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`${name} is required`);
  }
}

function stripServerTokens(tokens: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens || {})) {
    if (SERVER_PROVIDED_TOKENS.has(k)) continue;
    out[k] = String(v ?? "");
  }
  return out;
}

/**
 * Send a Communication Hub DRY-RUN message on behalf of a business module.
 *
 * Never sends a live email. Recipient is locked. Uses the canonical
 * `comm-hub-event-pilot` façade so that all governance, template resolution,
 * lifecycle logging, and dispatcher stubbing behave identically to the
 * Generic Event Pilot.
 */
export async function sendBusinessModuleCommunicationDryRun(
  input: BusinessModuleDryRunInput,
): Promise<BusinessModuleDryRunResult> {
  assertNonEmpty("moduleCode", input.moduleCode);
  assertNonEmpty("eventCode", input.eventCode);
  assertNonEmpty("recipientName", input.recipientName);
  assertNonEmpty("reason", input.reason);
  assertNonEmpty("source", input.source);

  const safeTokens = stripServerTokens(input.tokens || {});
  // Every template we seed expects recipient_name; guarantee it.
  if (!safeTokens.recipient_name) safeTokens.recipient_name = input.recipientName;

  const idempotencyKey =
    input.idempotencyKey ??
    `module-adapter-${input.moduleCode}-${input.eventCode}-${crypto.randomUUID()}`;

  // CH-TRACE-2: start a universal trace so every module attempt is visible
  // in the Trace Center regardless of downstream success.
  const trace = await startBusinessCommunicationTrace({
    moduleCode: input.moduleCode,
    eventCode: input.eventCode,
    channel: "email",
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    referenceNo: input.referenceNo ?? null,
    sourceModule: input.moduleCode.toLowerCase(),
    sourceScreen: input.source,
    sourceAction: "sendBusinessModuleCommunicationDryRun",
    recipientEmail: DRY_RUN_LOCKED_RECIPIENT,
    currentStage: "EVENT_INITIATED",
  });
  await appendTraceStep(trace?.trace_id, {
    stageCode: "EVENT_INITIATED", status: "info",
    plainSummary: `${input.moduleCode}/${input.eventCode} dry-run initiated`,
  });
  await appendTraceStep(trace?.trace_id, {
    stageCode: "SOURCE_CONTEXT_CAPTURED", status: "passed",
    plainSummary: `source=${input.source}`,
    payload: { adapter: "businessModuleCommunicationAdapter", entity_type: input.entityType ?? null, reference_no: input.referenceNo ?? null },
  });
  await appendTraceStep(trace?.trace_id, {
    stageCode: "RECIPIENT_RESOLUTION_STARTED", status: "info",
    plainSummary: "resolving locked dry-run recipient",
  });
  await appendTraceStep(trace?.trace_id, {
    stageCode: "RECIPIENT_RESOLVED", status: "passed",
    plainSummary: "locked to dry-run pilot recipient",
  });

  const body: Record<string, unknown> = {
    action: "dry_run",
    moduleCode: input.moduleCode,
    eventCode: input.eventCode,
    templateCode: input.templateCode,
    recipientEmail: DRY_RUN_LOCKED_RECIPIENT,
    recipientName: input.recipientName,
    tokens: safeTokens,
    reason: `[adapter:${input.source}] ${input.reason}`,
    typedConfirmation: "SEND GENERIC EVENT DRY RUN", // required by underlying façade
    idempotencyKey,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    referenceNo: input.referenceNo ?? null,
    adapterSource: input.source,
    // Forward trace context so every downstream layer writes into the same timeline.
    trace: toTraceContext(trace, { sourceModule: input.moduleCode.toLowerCase(), sourceScreen: input.source }),
  };

  const { data, error } = await (supabase as any).functions.invoke(
    "comm-hub-event-pilot",
    { body },
  );

  if (error) {
    await appendTraceStep(trace?.trace_id, {
      stageCode: "DISPATCH_INVOKED", status: "failed",
      blockerCodes: ["dispatch_invoke_failed"],
      plainSummary: (error as any)?.message ?? "invoke_failed",
    });
    await completeTrace(trace?.trace_id, "failed", { blocked_stage: "DISPATCH_INVOKED" });
    return { ok: false, error: (error as any)?.message ?? "invoke_failed" };
  }
  const d = (data ?? {}) as any;
  if (!d.ok) {
    await appendTraceStep(trace?.trace_id, {
      stageCode: d.stage ?? "DISPATCH_INVOKED", status: "blocked",
      blockerCodes: Array.isArray(d.blockers) ? d.blockers : [d.error ?? "unknown"],
      plainSummary: d.error ?? "dry_run_failed",
    });
    await completeTrace(trace?.trace_id, "blocked", { blocked_stage: d.blocked_stage ?? d.stage ?? "DISPATCH_INVOKED" });
    return {
      ok: false,
      error: d.error ?? "dry_run_failed",
      blockers: Array.isArray(d.blockers) ? d.blockers : undefined,
      raw: d,
    };
  }
  await completeTrace(trace?.trace_id, "sent", {
    request_id: d.requestId ?? null,
    message_id: d.messageId ?? null,
  });
  return {
    ok: true,
    requestId: d.requestId ?? d.request?.id ?? null,
    requestNo: d.requestNo ?? d.request?.request_no ?? null,
    messageId: d.messageId ?? d.message?.id ?? null,
    providerMessageId: d.providerMessageId ?? d.dispatch?.response?.provider_message_id ?? null,
    templateCode: d.templateCode ?? null,
    templateVersionId: d.templateVersionId ?? null,
    raw: d,
  };
}
