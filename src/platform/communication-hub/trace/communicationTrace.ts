/**
 * EPIC CH-TRACE-1 — Universal Communication Trace helpers (client-side).
 *
 * Best-effort by design. Every function returns quickly and NEVER throws to
 * the caller — a failure to record trace must never block a real send.
 */
import { supabase } from "@/integrations/supabase/client";

export interface StartTraceInput {
  moduleCode?: string | null;
  eventCode?: string | null;
  channel?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  referenceNo?: string | null;
  sourceModule?: string | null;
  sourceScreen?: string | null;
  sourceAction?: string | null;
  recipientEmail?: string | null;
  correlationId?: string | null;
  currentStage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TraceHandle {
  trace_id: string;
  trace_no: string;
}

export interface AppendStepInput {
  stageCode: string;
  stageName?: string;
  status: "passed" | "blocked" | "warning" | "skipped" | "failed" | "info";
  blockerCodes?: string[];
  warnings?: string[];
  plainSummary?: string;
  fixHref?: string;
  requestId?: string | null;
  messageId?: string | null;
  payload?: Record<string, unknown>;
  setCurrentStage?: string;
  setStatus?: string;
  setBlockedStage?: string;
}

const rpc = supabase as any;

export async function startBusinessCommunicationTrace(
  input: StartTraceInput
): Promise<TraceHandle | null> {
  try {
    const { data, error } = await rpc.rpc("start_comm_hub_trace", {
      p_payload: {
        module_code: input.moduleCode ?? null,
        event_code: input.eventCode ?? null,
        channel: input.channel ?? "email",
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        reference_no: input.referenceNo ?? null,
        source_module: input.sourceModule ?? null,
        source_screen: input.sourceScreen ?? null,
        source_action: input.sourceAction ?? null,
        recipient_email: input.recipientEmail ?? null,
        correlation_id: input.correlationId ?? null,
        current_stage: input.currentStage ?? "EVENT_INITIATED",
        metadata: input.metadata ?? {},
      },
    });
    if (error || !data?.ok) return null;
    return { trace_id: data.trace_id as string, trace_no: data.trace_no as string };
  } catch {
    return null;
  }
}

export async function appendTraceStep(traceId: string | null | undefined, step: AppendStepInput): Promise<void> {
  if (!traceId) return;
  try {
    await rpc.rpc("append_comm_hub_trace_step", {
      p_trace_id: traceId,
      p_payload: {
        stage_code: step.stageCode,
        stage_name: step.stageName ?? step.stageCode,
        status: step.status,
        blocker_codes: step.blockerCodes ?? [],
        warnings: step.warnings ?? [],
        plain_summary: step.plainSummary ?? null,
        fix_href: step.fixHref ?? null,
        request_id: step.requestId ?? null,
        message_id: step.messageId ?? null,
        payload: step.payload ?? {},
        set_current_stage: step.setCurrentStage ?? null,
        set_status: step.setStatus ?? null,
        set_blocked_stage: step.setBlockedStage ?? null,
      },
    });
  } catch {
    /* swallow */
  }
}

export async function linkTraceRequest(traceId: string | null | undefined, requestId: string | null, requestNo: string | null): Promise<void> {
  if (!traceId || !requestId) return;
  try {
    await rpc.rpc("link_comm_hub_trace_request", { p_trace_id: traceId, p_request_id: requestId, p_request_no: requestNo });
  } catch { /* swallow */ }
}

export async function linkTraceMessage(traceId: string | null | undefined, messageId: string | null): Promise<void> {
  if (!traceId || !messageId) return;
  try {
    await rpc.rpc("link_comm_hub_trace_message", { p_trace_id: traceId, p_message_id: messageId });
  } catch { /* swallow */ }
}

export async function completeTrace(traceId: string | null | undefined, status: string, payload: Record<string, unknown> = {}): Promise<void> {
  if (!traceId) return;
  try {
    await rpc.rpc("complete_comm_hub_trace", { p_trace_id: traceId, p_status: status, p_payload: payload });
  } catch { /* swallow */ }
}

/** Build the standard trace-context object to forward to edge functions / RPCs. */
export function toTraceContext(h: TraceHandle | null, extras?: Partial<StartTraceInput>): Record<string, unknown> | undefined {
  if (!h) return undefined;
  return {
    trace_id: h.trace_id,
    trace_no: h.trace_no,
    source_module: extras?.sourceModule ?? null,
    source_screen: extras?.sourceScreen ?? null,
    source_action: extras?.sourceAction ?? null,
    correlation_id: extras?.correlationId ?? null,
  };
}
