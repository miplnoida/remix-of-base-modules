/**
 * EPIC 2C — Safe operator actions for the Communication Hub Failed &
 * Retry Queue. Thin wrappers around admin-only SECURITY DEFINER RPCs.
 * No direct DB writes, no provider calls.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DeliveryMonitorRow } from "./operationsService";

export type OperatorActionKind = "cancel" | "clear_lock" | "retry_dry_run";

export interface OperatorActionSpec {
  kind: OperatorActionKind;
  label: string;
  confirmationPhrase: string;
  danger: boolean;
  description: string;
}

export const ACTION_SPECS: Record<OperatorActionKind, OperatorActionSpec> = {
  cancel: {
    kind: "cancel",
    label: "Cancel message",
    confirmationPhrase: "CANCEL MESSAGE",
    danger: true,
    description:
      "Marks this one message as cancelled. No provider call. Audited. Recompute request status.",
  },
  clear_lock: {
    kind: "clear_lock",
    label: "Clear stale lock",
    confirmationPhrase: "CLEAR STALE LOCK",
    danger: false,
    description:
      "Clears a stale sending lock (>10 minutes) and requeues for the dispatcher. Audited.",
  },
  retry_dry_run: {
    kind: "retry_dry_run",
    label: "Retry (dry-run)",
    confirmationPhrase: "RETRY DRY RUN MESSAGE",
    danger: false,
    description:
      "Requeues a failed dry-run (test_mode=true) message. Attempt history is preserved. Audited. Live retries not allowed in this phase.",
  },
};

const STALE_LOCK_MS = 10 * 60 * 1000;

export function eligibleActionsFor(row: DeliveryMonitorRow): OperatorActionKind[] {
  const out: OperatorActionKind[] = [];
  const status = row.message_status;
  const isTest = row.test_mode === true;

  // Cancel: queued/sending/failed/suppressed. For live rows, only allow when
  // status is queued/failed/suppressed (no cancelling a live message that is
  // actively sending — leave that to a wider governance flow).
  if (["queued", "sending", "failed", "suppressed"].includes(status)) {
    if (isTest || status !== "sending") out.push("cancel");
  }

  // Clear stale lock: only sending + lock older than 10m.
  if (
    status === "sending" &&
    row.locked_at &&
    Date.now() - new Date(row.locked_at).getTime() > STALE_LOCK_MS
  ) {
    out.push("clear_lock");
  }

  // Retry dry-run: failed + test_mode=true only in this phase.
  if (status === "failed" && isTest) out.push("retry_dry_run");

  return out;
}

export async function runOperatorAction(params: {
  kind: OperatorActionKind;
  messageId: string;
  reason: string;
}): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const { kind, messageId, reason } = params;
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  if (!uid) return { ok: false, error: "Not signed in." };

  const fn =
    kind === "cancel"
      ? "cancel_comm_hub_message"
      : kind === "clear_lock"
      ? "clear_comm_hub_message_lock"
      : "retry_comm_hub_message";

  const { data, error } = await (supabase as any).rpc(fn, {
    p_message_id: messageId,
    p_reason: reason,
    p_actor_user_id: uid,
  });
  if (error) return { ok: false, error: error.message ?? String(error) };
  return { ok: true, result: data };
}
