/**
 * CH-SIMPLE-P2 — Canonical Recipient Policy service (frontend surface).
 *
 * Single reader/writer for `communication_hub_recipient_policy` (the singleton
 * recipient-policy row) and thin wrapper around the canonical database
 * evaluator `evaluate_comm_hub_recipient_policy(p_payload jsonb)`.
 *
 * SAFETY:
 *  - Never sends email, never enqueues a request, never writes legacy tables.
 *  - Never hardcodes recipient addresses or domains.
 *  - The active recipient identity (single/named/domain) comes exclusively
 *    from configuration data, not from application code.
 *  - The env var `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` is retired as an
 *    authoriser (Prompt B6) — this service is the only positive path.
 */
import { supabase } from "@/integrations/supabase/client";

export type RecipientPolicyMode =
  | "SINGLE_CONFIGURED_RECIPIENT"
  | "APPROVED_NAMED_RECIPIENTS"
  | "APPROVED_DOMAINS"
  | "CONTROLLED_EXTERNAL_RECIPIENTS"
  | "DISABLED";

export const RECIPIENT_POLICY_SINGLETON_GUARD = "primary" as const;

export interface RecipientPolicy {
  id: string;
  singletonGuard: "primary";
  activeMode: RecipientPolicyMode;
  singleConfiguredRecipient: string | null;
  approvedNamedRecipients: string[];
  approvedDomains: string[];
  controlledExternalRecipients: string[];
  maxRecipientsPerSend: number;
  maxTotalRecipientsPerSend: number;
  allowCc: boolean;
  allowBcc: boolean;
  configurationVersion: number;
  updatedAt: string;
  updatedBy: string | null;
  updateReason: string | null;
}

interface RecipientPolicyRow {
  id: string;
  singleton_guard: string;
  active_mode: RecipientPolicyMode;
  single_configured_recipient: string | null;
  approved_named_recipients: string[] | null;
  approved_domains: string[] | null;
  controlled_external_recipients: string[] | null;
  max_recipients_per_send: number;
  max_total_recipients_per_send: number;
  allow_cc: boolean;
  allow_bcc: boolean;
  configuration_version: number;
  updated_at: string;
  updated_by: string | null;
  update_reason: string | null;
}

function fromRow(row: RecipientPolicyRow): RecipientPolicy {
  return {
    id: row.id,
    singletonGuard: "primary",
    activeMode: row.active_mode,
    singleConfiguredRecipient: row.single_configured_recipient,
    approvedNamedRecipients: row.approved_named_recipients ?? [],
    approvedDomains: row.approved_domains ?? [],
    controlledExternalRecipients: row.controlled_external_recipients ?? [],
    maxRecipientsPerSend: Number(row.max_recipients_per_send ?? 1),
    maxTotalRecipientsPerSend: Number(row.max_total_recipients_per_send ?? 1),
    allowCc: Boolean(row.allow_cc),
    allowBcc: Boolean(row.allow_bcc),
    configurationVersion: Number(row.configuration_version ?? 0),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    updateReason: row.update_reason,
  };
}

/** Canonical singleton fetch. Never uses .order(); always filters singleton_guard. */
export async function fetchRecipientPolicy(): Promise<RecipientPolicy> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_recipient_policy")
    .select(
      "id, singleton_guard, active_mode, single_configured_recipient, approved_named_recipients, approved_domains, controlled_external_recipients, max_recipients_per_send, max_total_recipients_per_send, allow_cc, allow_bcc, configuration_version, updated_at, updated_by, update_reason"
    )
    .eq("singleton_guard", RECIPIENT_POLICY_SINGLETON_GUARD)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("recipient policy singleton is missing");
  return fromRow(data as RecipientPolicyRow);
}

export interface RecipientPolicyEvaluationPayload {
  moduleCode?: string;
  eventCode?: string;
  channel?: "email" | "sms" | "whatsapp" | "print" | "letter";
  to?: string[];
  cc?: string[];
  bcc?: string[];
}

export interface RecipientPolicyBlocker {
  code: string;
  message: string;
  field?: string;
}

export interface RecipientPolicyEvaluation {
  allowed: boolean;
  mode: RecipientPolicyMode;
  effective: { to: string[]; cc: string[]; bcc: string[] };
  blockers: RecipientPolicyBlocker[];
  limits: {
    maxRecipientsPerSend: number;
    maxTotalRecipientsPerSend: number;
    allowCc: boolean;
    allowBcc: boolean;
  };
}

/** Canonical, DB-backed recipient authoriser. */
export async function evaluateRecipientPolicy(
  payload: RecipientPolicyEvaluationPayload
): Promise<RecipientPolicyEvaluation> {
  const p_payload: Record<string, unknown> = {};
  if (payload.moduleCode) p_payload.module_code = payload.moduleCode;
  if (payload.eventCode) p_payload.event_code = payload.eventCode;
  if (payload.channel) p_payload.channel = payload.channel;
  if (payload.to) p_payload.to = payload.to;
  if (payload.cc) p_payload.cc = payload.cc;
  if (payload.bcc) p_payload.bcc = payload.bcc;

  const { data, error } = await (supabase.rpc as any)(
    "evaluate_comm_hub_recipient_policy",
    { p_payload }
  );
  if (error) throw error;
  const row = data as any;
  return {
    allowed: Boolean(row?.allowed),
    mode: (row?.mode ?? "DISABLED") as RecipientPolicyMode,
    effective: {
      to: (row?.effective?.to ?? []) as string[],
      cc: (row?.effective?.cc ?? []) as string[],
      bcc: (row?.effective?.bcc ?? []) as string[],
    },
    blockers: ((row?.blockers ?? []) as RecipientPolicyBlocker[]).map((b) => ({
      code: b.code,
      message: b.message,
      field: b.field,
    })),
    limits: {
      maxRecipientsPerSend: Number(row?.limits?.max_recipients_per_send ?? 1),
      maxTotalRecipientsPerSend: Number(row?.limits?.max_total_recipients_per_send ?? 1),
      allowCc: Boolean(row?.limits?.allow_cc),
      allowBcc: Boolean(row?.limits?.allow_bcc),
    },
  };
}

export interface UpdateRecipientPolicyInput {
  activeMode?: RecipientPolicyMode;
  singleConfiguredRecipient?: string | null;
  approvedNamedRecipients?: string[];
  approvedDomains?: string[];
  controlledExternalRecipients?: string[];
  maxRecipientsPerSend?: number;
  maxTotalRecipientsPerSend?: number;
  allowCc?: boolean;
  allowBcc?: boolean;
  updateReason: string;
}

/**
 * Transactional recipient-policy update. Goes through the
 * `set_communication_recipient_policy` RPC which validates,
 * writes the audit row, and bumps configuration_version atomically.
 */
export async function updateRecipientPolicy(
  input: UpdateRecipientPolicyInput
): Promise<RecipientPolicy> {
  if (!input.updateReason?.trim()) {
    throw new Error("A reason is required when changing recipient policy.");
  }
  const { data, error } = await (supabase.rpc as any)(
    "set_communication_recipient_policy",
    {
      p_active_mode: input.activeMode ?? null,
      p_single_configured_recipient: input.singleConfiguredRecipient ?? null,
      p_approved_named_recipients: input.approvedNamedRecipients ?? null,
      p_approved_domains: input.approvedDomains ?? null,
      p_controlled_external_recipients: input.controlledExternalRecipients ?? null,
      p_max_recipients_per_send: input.maxRecipientsPerSend ?? null,
      p_max_total_recipients_per_send: input.maxTotalRecipientsPerSend ?? null,
      p_allow_cc: input.allowCc ?? null,
      p_allow_bcc: input.allowBcc ?? null,
      p_reason: input.updateReason.trim(),
    }
  );
  if (error) throw error;
  return fromRow(data as RecipientPolicyRow);
}
