/**
 * EPIC CH-TRACE-1 — Operator-facing diagnosis synthesized from a trace row.
 */
import type { TraceUnifiedRow } from "./traceService";
import { explainBlocker } from "../safety/plainLanguageBlockers";

export interface TraceDiagnosis {
  headline: string;
  detail: string;
  tone: "success" | "warning" | "error" | "info";
  fixHref?: string;
}

export function buildTraceDiagnosis(t: TraceUnifiedRow | null): TraceDiagnosis {
  if (!t) return { headline: "Trace not found", detail: "This trace does not exist or has been removed.", tone: "info" };

  const firstBlocker = t.blocker_codes?.[0];
  const stage = t.blocked_stage ?? t.current_stage ?? "";

  if (t.status === "blocked" || t.status === "suppressed" || t.status === "failed") {
    const exp = firstBlocker ? explainBlocker(firstBlocker) : null;

    if (stage === "AUTOMATION_CHECKED" && firstBlocker === "automation_prepare_only") {
      return { headline: "Blocked before request creation: automation is prepare-only.", detail: "The module is set to only prepare notices, not send them.", tone: "warning", fixHref: "/admin/communication-hub/governance/automation-settings" };
    }
    if (stage === "SEND_POLICY_CHECKED") {
      return { headline: `Blocked by send policy: ${exp?.headline ?? firstBlocker ?? "policy denied"}.`, detail: exp?.message ?? "The send policy rejected this attempt.", tone: "error", fixHref: exp?.fixHref ?? "/admin/communication-hub/governance/send-policies" };
    }
    if (stage === "REVIEW_POLICY_CHECKED") {
      return { headline: "Blocked by review policy.", detail: exp?.message ?? "This event requires review before it can be sent.", tone: "error", fixHref: exp?.fixHref };
    }
    if (firstBlocker === "recipient_not_db_allowlisted" || firstBlocker === "recipient_not_allowlisted" || firstBlocker === "recipient_domain_not_allowlisted") {
      return { headline: "Suppressed by dispatcher: recipient was not in the DB allowlist.", detail: "Add the recipient or their domain in the Recipient Control Center.", tone: "warning", fixHref: "/admin/communication-hub/recipient-control" };
    }
    if (firstBlocker === "provider_config_missing") {
      return { headline: "Provider not called: active email provider is missing.", detail: "Configure an active email provider in Design → Provider Settings.", tone: "error", fixHref: "/admin/communication-hub/design/sender-profiles" };
    }
    if (firstBlocker === "provider_send_failed") {
      return { headline: "Provider called but failed.", detail: "The email provider rejected or errored on the send. See delivery attempts for details.", tone: "error" };
    }
    if (firstBlocker === "target_outside_live_window") {
      return { headline: "Queued but not dispatched: live window expired before dispatcher claimed the message.", detail: "Open a new live window in Control Center.", tone: "warning", fixHref: "/admin/communication-hub/control-center" };
    }
    return { headline: exp?.headline ?? "Blocked", detail: exp?.message ?? (firstBlocker ? `Blocker: ${firstBlocker}` : "No blocker detail available."), tone: "error", fixHref: exp?.fixHref };
  }

  if (t.status === "queued" || t.status === "dispatching") {
    return { headline: "Queued — awaiting dispatch.", detail: "The message is queued and will be picked up by the dispatcher on the next run.", tone: "info" };
  }
  if (t.status === "sent" || t.status === "delivered" || t.status === "completed") {
    return { headline: "Delivered.", detail: "The provider accepted the message.", tone: "success" };
  }
  if (t.status === "retry_scheduled") {
    return { headline: "Retry scheduled.", detail: "A retry attempt is pending per the retry policy.", tone: "info" };
  }
  return { headline: `Status: ${t.status}`, detail: t.current_stage ? `Current stage: ${t.current_stage}` : "No details available.", tone: "info" };
}
