/**
 * EPIC CH-P1 — Communication Hub Send Policy service layer.
 *
 * Reads/writes rows of `communication_hub_event_send_policy` and wraps the
 * `resolve_comm_hub_send_policy` / `evaluate_comm_hub_send_authorization` RPCs.
 *
 * Policy changes append audit rows to `communication_hub_control_audit`
 * (reusing the existing Control Center audit trail) — never writes to legacy
 * notification/logs tables and never sends any email.
 */
import { supabase } from "@/integrations/supabase/client";

export type SendPolicy =
  | "disabled"
  | "dry_run_only"
  | "prepare_only"
  | "manual_review"
  | "manual_live"
  | "auto_live_internal"
  | "auto_live_external";

export type RecipientPolicy =
  | "internal_only"
  | "external_allowed"
  | "mixed"
  | "system_only";

export interface CommHubEventSendPolicy {
  id: string;
  module_code: string;
  event_code: string;
  channel: string;
  send_policy: SendPolicy;
  environment_scope: string;
  recipient_policy: RecipientPolicy;
  requires_template_approval: boolean;
  requires_sender_verified: boolean;
  requires_recipient_validation: boolean;
  allow_internal_recipients: boolean;
  allow_external_recipients: boolean;
  allowed_internal_domains: string[];
  allowed_external_domains: string[];
  max_recipients_per_send: number;
  max_sends_per_entity_per_event: number;
  duplicate_window_minutes: number;
  require_preview_before_manual_send: boolean;
  require_typed_confirmation_for_send: boolean;
  require_typed_confirmation_for_policy_change: boolean;
  is_enabled: boolean;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSendPolicies(): Promise<CommHubEventSendPolicy[]> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_event_send_policy")
    .select("*")
    .order("module_code", { ascending: true })
    .order("event_code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommHubEventSendPolicy[];
}

export async function resolveSendPolicy(params: {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  environmentScope?: string;
}): Promise<any> {
  const { data, error } = await (supabase as any).rpc("resolve_comm_hub_send_policy", {
    p_module_code: params.moduleCode,
    p_event_code: params.eventCode,
    p_channel: params.channel ?? "email",
    p_environment_scope: params.environmentScope ?? "production",
  });
  if (error) throw error;
  return data;
}

export async function evaluateSendAuthorization(payload: {
  module_code: string;
  event_code: string;
  channel?: string;
  environment_scope?: string;
  recipients?: string[];
  entity_id?: string | null;
}): Promise<any> {
  const { data, error } = await (supabase as any).rpc("evaluate_comm_hub_send_authorization", {
    p_payload: payload,
  });
  if (error) throw error;
  return data;
}

/**
 * A change is "dangerous" (typed confirmation) when it EXPANDS blast radius.
 * Making a policy more restrictive never requires typed confirmation.
 */
export function isDangerousPolicyChange(
  before: Partial<CommHubEventSendPolicy>,
  after: Partial<CommHubEventSendPolicy>
): { dangerous: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const RANK: Record<SendPolicy, number> = {
    disabled: 0,
    dry_run_only: 1,
    prepare_only: 2,
    manual_review: 3,
    manual_live: 4,
    auto_live_internal: 5,
    auto_live_external: 6,
  };
  if (before.send_policy && after.send_policy && before.send_policy !== after.send_policy) {
    if (RANK[after.send_policy] > RANK[before.send_policy]) {
      reasons.push(`send_policy ${before.send_policy} → ${after.send_policy}`);
    }
  }
  if (!before.allow_external_recipients && after.allow_external_recipients) {
    reasons.push("enabling external recipients");
  }
  if (
    typeof before.max_recipients_per_send === "number" &&
    typeof after.max_recipients_per_send === "number" &&
    after.max_recipients_per_send > before.max_recipients_per_send
  ) {
    reasons.push("increasing max recipients");
  }
  if (
    typeof before.duplicate_window_minutes === "number" &&
    typeof after.duplicate_window_minutes === "number" &&
    after.duplicate_window_minutes < before.duplicate_window_minutes
  ) {
    reasons.push("shortening duplicate-prevention window");
  }
  return { dangerous: reasons.length > 0, reasons };
}

export interface UpdatePolicyParams {
  current: CommHubEventSendPolicy;
  patch: Partial<CommHubEventSendPolicy>;
  reason: string;
}

export async function updateSendPolicy(params: UpdatePolicyParams): Promise<CommHubEventSendPolicy> {
  const { current, patch, reason } = params;
  const changes = (Object.keys(patch) as (keyof CommHubEventSendPolicy)[]).filter(
    (k) => JSON.stringify((current as any)[k]) !== JSON.stringify((patch as any)[k])
  );
  if (changes.length === 0) return current;

  const { dangerous } = isDangerousPolicyChange(current, { ...current, ...patch });
  if ((dangerous || current.require_typed_confirmation_for_policy_change) && !reason.trim()) {
    throw new Error("A reason is required to change this policy.");
  }

  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;

  const { data: updated, error } = await (supabase as any)
    .from("communication_hub_event_send_policy")
    .update(patch)
    .eq("id", current.id)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  // Append audit rows to the existing Control Center audit trail.
  const auditRows = changes.map((k) => ({
    setting_key: `send_policy.${current.module_code}.${current.event_code}.${current.channel}.${String(k)}`,
    old_value: (current as any)[k] as any,
    new_value: (patch as any)[k] as any,
    reason: reason || null,
    changed_by: uid,
    source: "communication-hub-send-policy",
  }));
  const { error: auditErr } = await (supabase as any)
    .from("communication_hub_control_audit")
    .insert(auditRows);
  if (auditErr) console.error("[send-policy] audit insert failed", auditErr);

  return updated as CommHubEventSendPolicy;
}

export async function approveSendPolicy(policy: CommHubEventSendPolicy, notes: string): Promise<CommHubEventSendPolicy> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { data, error } = await (supabase as any)
    .from("communication_hub_event_send_policy")
    .update({ approved_by: uid, approved_at: new Date().toISOString(), approval_notes: notes || policy.approval_notes })
    .eq("id", policy.id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  await (supabase as any).from("communication_hub_control_audit").insert([{
    setting_key: `send_policy.${policy.module_code}.${policy.event_code}.${policy.channel}.approved`,
    old_value: { approved: false },
    new_value: { approved: true, notes },
    reason: notes || "Policy approved",
    changed_by: uid,
    source: "communication-hub-send-policy",
  }]);
  return data as CommHubEventSendPolicy;
}
