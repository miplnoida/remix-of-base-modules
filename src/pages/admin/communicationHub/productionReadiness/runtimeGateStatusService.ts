/**
 * EPIC PROD-2A — Frontend wrapper for the additive runtime gate parity RPC.
 *
 * READ-ONLY. Calls `public.evaluate_comm_hub_runtime_gate_status(jsonb)`.
 * Never sends email. Never enables live. Never mutates any gate.
 *
 * The RPC composes the existing legacy authorization + live gate + review
 * policy + module automation + event-mapped sender + template version +
 * bulk checks and returns a structured parity readout so the UI can show
 * frontend readiness vs server-side gate reality side by side.
 */
import { supabase } from "@/integrations/supabase/client";

export type RuntimeGateSeverity = "critical" | "high" | "medium" | "low";
export type RuntimeGateStatus = "pass" | "blocked" | "warning" | "skipped" | "unknown";

export interface RuntimeGateBlocker {
  code: string;
  severity: RuntimeGateSeverity;
  stage: string;
  message: string;
  fix_hint: string;
}
export interface RuntimeGateWarning {
  code: string;
  message: string;
}
export interface RuntimeGateResult {
  gate: string;
  status: RuntimeGateStatus;
  reason: string;
}
export interface RuntimeGateTraceContext {
  current_stage: string;
  blocked_stage: string | null;
  blocker_codes: string[];
}
export interface RuntimeGateNeedsReview {
  gate: string;
  reason: string;
}
export interface RuntimeGateStatusResult {
  allowed: boolean;
  source: string;
  legacy_authorization_allowed: boolean;
  send_mode: string;
  module_code: string;
  event_code: string;
  channel: string;
  recipient_count: number;
  preview_confirmed?: boolean;
  template_version_id?: string | null;
  blockers: RuntimeGateBlocker[];
  warnings: RuntimeGateWarning[];
  gate_results: RuntimeGateResult[];
  needs_review?: RuntimeGateNeedsReview[];
  trace_context: RuntimeGateTraceContext;
  evaluated_at: string;
}

export interface RuntimeGateStatusInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  sendMode?: "dry_run" | "live" | "auto_live_internal" | "cron" | "batch" | string;
  recipientEmail?: string | null;
  recipientCount?: number;
  previewConfirmed?: boolean;
  templateVersionId?: string | null;
}

export async function evaluateRuntimeGateStatus(
  input: RuntimeGateStatusInput,
): Promise<RuntimeGateStatusResult> {
  const payload: Record<string, unknown> = {
    module_code: input.moduleCode,
    event_code: input.eventCode,
    channel: input.channel ?? "email",
    send_mode: input.sendMode ?? "dry_run",
    recipient_email: input.recipientEmail ?? "",
    recipient_count:
      typeof input.recipientCount === "number"
        ? input.recipientCount
        : input.recipientEmail
          ? 1
          : 0,
    preview_confirmed: !!input.previewConfirmed,
  };
  if (input.templateVersionId) payload.template_version_id = input.templateVersionId;

  const { data, error } = await (supabase as any).rpc(
    "evaluate_comm_hub_runtime_gate_status",
    { p_payload: payload },
  );
  if (error) throw new Error(error.message ?? "evaluate_comm_hub_runtime_gate_status failed");

  const raw = (data ?? {}) as Partial<RuntimeGateStatusResult>;
  return {
    allowed: !!raw.allowed,
    source: raw.source ?? "evaluate_comm_hub_runtime_gate_status",
    legacy_authorization_allowed: !!raw.legacy_authorization_allowed,
    send_mode: raw.send_mode ?? String(payload.send_mode),
    module_code: raw.module_code ?? input.moduleCode,
    event_code: raw.event_code ?? input.eventCode,
    channel: raw.channel ?? String(payload.channel),
    recipient_count: raw.recipient_count ?? Number(payload.recipient_count) ?? 0,
    preview_confirmed: raw.preview_confirmed,
    template_version_id: raw.template_version_id ?? null,
    blockers: (raw.blockers as RuntimeGateBlocker[]) ?? [],
    warnings: (raw.warnings as RuntimeGateWarning[]) ?? [],
    gate_results: (raw.gate_results as RuntimeGateResult[]) ?? [],
    needs_review: (raw.needs_review as RuntimeGateNeedsReview[]) ?? [],
    trace_context:
      (raw.trace_context as RuntimeGateTraceContext) ?? {
        current_stage: "unknown",
        blocked_stage: null,
        blocker_codes: [],
      },
    evaluated_at: new Date().toISOString(),
  };
}
