// EPIC CH-TRACE-2 — Shared trace helper for edge functions.
// Best-effort. Never throws to caller. Never exposes secrets.
// Recipient emails are masked before persisting.
// Trace ID is extracted from any of:
//   payload.trace.trace_id
//   payload.trace_id
//   payload.context.trace.trace_id
//   traceId / trace_id top-level string

import type { TraceStage, TraceStepStatus } from "./commHubTraceStages.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface TraceStepInput {
  stage_code: TraceStage | string;
  stage_name?: string;
  status: TraceStepStatus;
  blocker_codes?: string[];
  warnings?: string[];
  plain_summary?: string;
  fix_href?: string;
  request_id?: string | null;
  message_id?: string | null;
  payload?: Record<string, unknown>;
  set_current_stage?: string;
  set_status?: string;
  set_blocked_stage?: string;
}

export function resolveTraceId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, any>;
  const cand =
    p?.trace?.trace_id ??
    p?.trace_id ??
    p?.context?.trace?.trace_id ??
    p?.traceId ??
    null;
  return typeof cand === "string" && cand ? cand : null;
}

export function resolveTraceNo(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, any>;
  const cand =
    p?.trace?.trace_no ??
    p?.trace_no ??
    p?.context?.trace?.trace_no ??
    null;
  return typeof cand === "string" && cand ? cand : null;
}

export function maskEmail(addr: string | null | undefined): string | null {
  if (!addr || typeof addr !== "string") return null;
  const at = addr.indexOf("@");
  if (at <= 0) return "***";
  const local = addr.slice(0, at);
  const dom = addr.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${dom}`;
}

export async function appendTraceStepSafe(
  admin: Admin,
  traceId: string | null | undefined,
  step: TraceStepInput,
): Promise<void> {
  try {
    // Mask any recipient email embedded in step.payload before persisting.
    const rawPayload = step.payload ?? {};
    const safePayload: Record<string, unknown> = { ...rawPayload };
    for (const key of ["recipient_email", "to", "email"]) {
      if (typeof safePayload[key] === "string") {
        safePayload[`${key}_masked`] = maskEmail(safePayload[key] as string);
        delete safePayload[key];
      }
    }
    // Never log secrets even if a caller accidentally puts them in payload.
    for (const key of Object.keys(safePayload)) {
      if (/secret|api_key|token|password|authorization/i.test(key)) {
        delete safePayload[key];
      }
    }
    console.log(
      `[commHubTrace] stage=${step.stage_code} status=${step.status} trace=${traceId ?? "-"}`,
    );
    if (!traceId) return;
    await admin.rpc("append_comm_hub_trace_step", {
      p_trace_id: traceId,
      p_payload: {
        stage_code: step.stage_code,
        stage_name: step.stage_name ?? step.stage_code,
        status: step.status,
        blocker_codes: step.blocker_codes ?? [],
        warnings: step.warnings ?? [],
        plain_summary: step.plain_summary ?? null,
        fix_href: step.fix_href ?? null,
        request_id: step.request_id ?? null,
        message_id: step.message_id ?? null,
        payload: safePayload,
        set_current_stage: step.set_current_stage ?? step.stage_code,
        set_status: step.set_status ?? null,
        set_blocked_stage: step.set_blocked_stage ?? null,
      },
    });
  } catch {
    /* swallow — tracing must never break business flow */
  }
}

export async function completeTraceSafe(
  admin: Admin,
  traceId: string | null | undefined,
  status: string,
  blockedStage?: string | null,
  extras: Record<string, unknown> = {},
): Promise<void> {
  if (!traceId) return;
  try {
    await admin.rpc("complete_comm_hub_trace", {
      p_trace_id: traceId,
      p_status: status,
      p_payload: { blocked_stage: blockedStage ?? null, ...extras },
    });
  } catch { /* swallow */ }
}

export async function linkTraceRequestSafe(
  admin: Admin,
  traceId: string | null | undefined,
  requestId: string | null | undefined,
  requestNo: string | null | undefined,
): Promise<void> {
  if (!traceId || !requestId) return;
  try {
    await admin.rpc("link_comm_hub_trace_request", {
      p_trace_id: traceId,
      p_request_id: requestId,
      p_request_no: requestNo ?? null,
    });
  } catch { /* swallow */ }
}

export async function linkTraceMessageSafe(
  admin: Admin,
  traceId: string | null | undefined,
  messageId: string | null | undefined,
): Promise<void> {
  if (!traceId || !messageId) return;
  try {
    await admin.rpc("link_comm_hub_trace_message", {
      p_trace_id: traceId,
      p_message_id: messageId,
    });
  } catch { /* swallow */ }
}

/** Build a response body enriched with trace + stage context. */
export function withTraceContext(
  base: Record<string, unknown>,
  ctx: {
    stage?: string;
    trace_id?: string | null;
    trace_no?: string | null;
    current_stage?: string | null;
    blocked_stage?: string | null;
  },
): Record<string, unknown> {
  return {
    ...base,
    stage: ctx.stage ?? base.stage ?? null,
    trace_id: ctx.trace_id ?? null,
    trace_no: ctx.trace_no ?? null,
    current_stage: ctx.current_stage ?? ctx.stage ?? null,
    blocked_stage: ctx.blocked_stage ?? null,
  };
}
