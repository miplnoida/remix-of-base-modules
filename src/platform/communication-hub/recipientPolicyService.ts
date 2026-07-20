/**
 * CH-SIMPLE-P2B — Canonical Recipient Policy service (frontend surface).
 *
 * Single reader/writer for `communication_hub_recipient_policy` (the singleton
 * recipient-policy row) and thin wrapper around the canonical database
 * evaluator `evaluate_comm_hub_recipient_policy(p_payload jsonb)` and the
 * canonical writer `set_communication_recipient_policy`.
 *
 * SAFETY:
 *  - Never sends email, never enqueues a request, never writes legacy tables.
 *  - Never hardcodes recipient addresses or domains — every allowed identity
 *    comes exclusively from the recipient policy record.
 *  - Reads use `.eq('singleton_guard','primary')`. No `.order()` on the
 *    canonical settings/policy singletons anywhere in this file.
 *  - The env var `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` is retired as an
 *    authoriser (Prompt B6) — this policy is the only positive path.
 */
import { supabase } from "@/integrations/supabase/client";

export type RecipientPolicyMode =
  | "DISABLED"
  | "SINGLE_CONFIGURED_RECIPIENT"
  | "APPROVED_NAMED_RECIPIENTS"
  | "APPROVED_DOMAINS"
  | "CONTROLLED_EXTERNAL_RECIPIENTS";

export const RECIPIENT_POLICY_SINGLETON_GUARD = "primary" as const;

export interface RecipientPolicyNamedAddress {
  address: string;
  active: boolean;
  note?: string | null;
}
export interface RecipientPolicyDomain {
  domain: string;
  active: boolean;
  note?: string | null;
}

export interface RecipientPolicy {
  id: string;
  singletonGuard: "primary";
  activeMode: RecipientPolicyMode;

  singleConfiguredAddress: string | null;
  approvedNamedAddresses: RecipientPolicyNamedAddress[];
  approvedDomains: RecipientPolicyDomain[];

  maxRecipientsPerRequest: number;
  maxToRecipients: number;
  ccAllowed: boolean;
  maxCcRecipients: number;
  bccAllowed: boolean;
  maxBccRecipients: number;

  externalAddressesPermitted: boolean;
  subdomainsPermitted: boolean;

  policyVersion: number;
  configurationVersion: number;

  changeReason: string | null;
  changedBy: string | null;
  changedAt: string;
  updatedAt: string;
}

interface RecipientPolicyRow {
  id: string;
  singleton_guard: string;
  active_mode: RecipientPolicyMode;
  single_configured_address: string | null;
  approved_named_addresses: unknown;
  approved_domains: unknown;
  max_recipients_per_request: number;
  max_to_recipients: number;
  cc_allowed: boolean;
  max_cc_recipients: number;
  bcc_allowed: boolean;
  max_bcc_recipients: number;
  external_addresses_permitted: boolean;
  subdomains_permitted: boolean;
  policy_version: number;
  configuration_version: number;
  change_reason: string | null;
  changed_by: string | null;
  changed_at: string;
  updated_at: string;
}

function normNamed(x: unknown): RecipientPolicyNamedAddress[] {
  if (!Array.isArray(x)) return [];
  const out: RecipientPolicyNamedAddress[] = [];
  for (const raw of x) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const address = String(r.address ?? "").trim().toLowerCase();
    if (!address) continue;
    out.push({
      address,
      active: r.active === undefined ? true : Boolean(r.active),
      note: (r.note as string) ?? null,
    });
  }
  return out;
}
function normDomains(x: unknown): RecipientPolicyDomain[] {
  if (!Array.isArray(x)) return [];
  const out: RecipientPolicyDomain[] = [];
  for (const raw of x) {
    const r = (raw ?? {}) as Record<string, unknown>;
    let domain = String(r.domain ?? "").trim().toLowerCase();
    if (domain.startsWith("@")) domain = domain.slice(1);
    if (!domain) continue;
    out.push({
      domain,
      active: r.active === undefined ? true : Boolean(r.active),
      note: (r.note as string) ?? null,
    });
  }
  return out;
}

function fromRow(row: RecipientPolicyRow): RecipientPolicy {
  return {
    id: row.id,
    singletonGuard: "primary",
    activeMode: row.active_mode,
    singleConfiguredAddress: row.single_configured_address,
    approvedNamedAddresses: normNamed(row.approved_named_addresses),
    approvedDomains: normDomains(row.approved_domains),
    maxRecipientsPerRequest: Number(row.max_recipients_per_request ?? 1),
    maxToRecipients: Number(row.max_to_recipients ?? 1),
    ccAllowed: Boolean(row.cc_allowed),
    maxCcRecipients: Number(row.max_cc_recipients ?? 0),
    bccAllowed: Boolean(row.bcc_allowed),
    maxBccRecipients: Number(row.max_bcc_recipients ?? 0),
    externalAddressesPermitted: Boolean(row.external_addresses_permitted),
    subdomainsPermitted: Boolean(row.subdomains_permitted),
    policyVersion: Number(row.policy_version ?? 0),
    configurationVersion: Number(row.configuration_version ?? 0),
    changeReason: row.change_reason,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
    updatedAt: row.updated_at,
  };
}

/** Canonical singleton fetch. Never uses .order(); always filters singleton_guard. */
export async function fetchRecipientPolicy(): Promise<RecipientPolicy> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_recipient_policy")
    .select(
      "id, singleton_guard, active_mode, single_configured_address, approved_named_addresses, approved_domains, max_recipients_per_request, max_to_recipients, cc_allowed, max_cc_recipients, bcc_allowed, max_bcc_recipients, external_addresses_permitted, subdomains_permitted, policy_version, configuration_version, change_reason, changed_by, changed_at, updated_at"
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
  maxToRecipients?: number;
  maxCcRecipients?: number;
  maxBccRecipients?: number;
  maxTotalRecipients?: number;
}

export interface RecipientPolicyBlocker {
  code: string;
  address?: string;
  reason?: string;
  actual?: number;
  limit?: number;
  source?: string;
}

export interface RecipientPolicyEvaluation {
  allowed: boolean;
  releaseMode: RecipientPolicyMode;
  matchedRecipients: string[];
  blockedRecipients: string[];
  matchedBy: Record<string, string>;
  blockers: RecipientPolicyBlocker[];
  warnings: unknown[];
  configurationVersion: number;
  policyVersion: number;
  evaluatedAt: string;
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
  if (payload.maxToRecipients !== undefined) p_payload.max_to_recipients = payload.maxToRecipients;
  if (payload.maxCcRecipients !== undefined) p_payload.max_cc_recipients = payload.maxCcRecipients;
  if (payload.maxBccRecipients !== undefined) p_payload.max_bcc_recipients = payload.maxBccRecipients;
  if (payload.maxTotalRecipients !== undefined) p_payload.max_total_recipients = payload.maxTotalRecipients;

  const { data, error } = await (supabase.rpc as any)(
    "evaluate_comm_hub_recipient_policy",
    { p_payload }
  );
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    allowed: Boolean(row.allowed),
    releaseMode: (row.release_mode ?? "DISABLED") as RecipientPolicyMode,
    matchedRecipients: (row.matched_recipients as string[]) ?? [],
    blockedRecipients: (row.blocked_recipients as string[]) ?? [],
    matchedBy: (row.matched_by as Record<string, string>) ?? {},
    blockers: (row.blockers as RecipientPolicyBlocker[]) ?? [],
    warnings: (row.warnings as unknown[]) ?? [],
    configurationVersion: Number(row.configuration_version ?? 0),
    policyVersion: Number(row.policy_version ?? 0),
    evaluatedAt: String(row.evaluated_at ?? new Date().toISOString()),
  };
}

export interface UpdateRecipientPolicyInput {
  activeMode?: RecipientPolicyMode;
  /** Set to null to clear the single configured address explicitly. */
  singleConfiguredAddress?: string | null;
  approvedNamedAddresses?: RecipientPolicyNamedAddress[];
  approvedDomains?: RecipientPolicyDomain[];
  maxRecipientsPerRequest?: number;
  maxToRecipients?: number;
  ccAllowed?: boolean;
  maxCcRecipients?: number;
  bccAllowed?: boolean;
  maxBccRecipients?: number;
  externalAddressesPermitted?: boolean;
  subdomainsPermitted?: boolean;
  reason: string;
}

/**
 * Transactional recipient-policy update. Delegates to the
 * `set_communication_recipient_policy` RPC which validates every field,
 * normalises addresses/domains, writes per-field audit rows, and increments
 * both `policy_version` and `configuration_version` atomically.
 */
export async function updateRecipientPolicy(
  input: UpdateRecipientPolicyInput
): Promise<RecipientPolicy> {
  if (!input.reason?.trim()) {
    throw new Error("A reason is required when changing recipient policy.");
  }

  const clearSingle = input.singleConfiguredAddress === null;
  const singleValue =
    input.singleConfiguredAddress === undefined || input.singleConfiguredAddress === null
      ? null
      : input.singleConfiguredAddress.trim();

  const { data, error } = await (supabase.rpc as any)(
    "set_communication_recipient_policy",
    {
      p_active_mode: input.activeMode ?? null,
      p_single_configured_address: singleValue,
      p_clear_single_configured_address: clearSingle,
      p_approved_named_addresses: input.approvedNamedAddresses ?? null,
      p_approved_domains: input.approvedDomains ?? null,
      p_max_recipients_per_request: input.maxRecipientsPerRequest ?? null,
      p_max_to_recipients: input.maxToRecipients ?? null,
      p_cc_allowed: input.ccAllowed ?? null,
      p_max_cc_recipients: input.maxCcRecipients ?? null,
      p_bcc_allowed: input.bccAllowed ?? null,
      p_max_bcc_recipients: input.maxBccRecipients ?? null,
      p_external_addresses_permitted: input.externalAddressesPermitted ?? null,
      p_subdomains_permitted: input.subdomainsPermitted ?? null,
      p_reason: input.reason.trim(),
    }
  );
  if (error) throw error;

  // The RPC returns the new row shape; refetch to guarantee a clean view.
  const refreshed = await fetchRecipientPolicy();
  return refreshed;
}

export interface RecipientPolicyAuditEntry {
  id: string;
  policyId: string;
  changedField: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
  changedBy: string | null;
  changedAt: string;
  policyVersion: number;
  configurationVersion: number;
}

export async function fetchRecipientPolicyAudit(
  limit = 100
): Promise<RecipientPolicyAuditEntry[]> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_recipient_policy_audit")
    .select(
      "id, policy_id, changed_field, old_value, new_value, reason, changed_by, changed_at, policy_version, configuration_version"
    )
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    policyId: r.policy_id,
    changedField: r.changed_field,
    oldValue: r.old_value,
    newValue: r.new_value,
    reason: r.reason,
    changedBy: r.changed_by,
    changedAt: r.changed_at,
    policyVersion: Number(r.policy_version ?? 0),
    configurationVersion: Number(r.configuration_version ?? 0),
  }));
}
