/**
 * EPIC CH-S1 — Sender Profile service.
 *
 * Centralized From-Email governance for the Communication Hub.
 * All writes go through SECURITY DEFINER RPCs (admin-only, audited).
 * No secrets, no sending logic.
 */
import { supabase } from "@/integrations/supabase/client";

const client = supabase as any;

export interface SenderProfile {
  id: string;
  profile_code: string;
  profile_name: string;
  from_email: string;
  display_name: string;
  reply_to_email: string | null;
  sender_category: string;
  audience_type: "internal" | "external" | "mixed";
  risk_level: "low" | "medium" | "high";
  provider_code: string;
  provider_identity_status: "pending" | "verified" | "rejected" | "disabled";
  domain_verified: boolean;
  is_enabled: boolean;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedSender {
  ok: boolean;
  source: "event_mapping" | "system_default" | "none";
  sender_profile_id?: string;
  from_email?: string;
  from_display_name?: string;
  reply_to_email?: string | null;
  is_enabled?: boolean;
  provider_identity_status?: string;
  domain_verified?: boolean;
  audience_type?: string;
  sender_category?: string;
  reason?: string;
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const REQUIRED_DOMAIN = "secureserve.biz";

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isRequiredDomain(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@" + REQUIRED_DOMAIN);
}

export async function listSenderProfiles(): Promise<SenderProfile[]> {
  const { data, error } = await client
    .from("communication_hub_sender_profile")
    .select("*")
    .order("sender_category")
    .order("from_email");
  if (error) throw error;
  return (data ?? []) as SenderProfile[];
}

export async function createSenderProfile(input: {
  profile_code: string;
  profile_name: string;
  from_email: string;
  display_name: string;
  reply_to_email?: string | null;
  sender_category: string;
  audience_type: string;
  risk_level?: string;
  notes?: string | null;
}) {
  if (!isValidEmail(input.from_email)) throw new Error("Invalid from_email");
  if (!isRequiredDomain(input.from_email)) {
    throw new Error(`from_email must be @${REQUIRED_DOMAIN} in this phase`);
  }
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await client.rpc("upsert_comm_hub_sender_profile", {
    p_id: null,
    p_profile_code: input.profile_code.trim(),
    p_profile_name: input.profile_name.trim(),
    p_from_email: input.from_email.trim().toLowerCase(),
    p_display_name: input.display_name.trim(),
    p_reply_to_email: input.reply_to_email ?? null,
    p_sender_category: input.sender_category,
    p_audience_type: input.audience_type,
    p_risk_level: input.risk_level ?? "low",
    p_notes: input.notes ?? null,
    p_actor_user_id: uid,
  });
  if (error) throw error;
  return data;
}

export async function updateSenderProfile(id: string, input: {
  profile_code: string;
  profile_name: string;
  from_email: string;
  display_name: string;
  reply_to_email?: string | null;
  sender_category: string;
  audience_type: string;
  risk_level?: string;
  notes?: string | null;
}) {
  if (!isValidEmail(input.from_email)) throw new Error("Invalid from_email");
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await client.rpc("upsert_comm_hub_sender_profile", {
    p_id: id,
    p_profile_code: input.profile_code.trim(),
    p_profile_name: input.profile_name.trim(),
    p_from_email: input.from_email.trim().toLowerCase(),
    p_display_name: input.display_name.trim(),
    p_reply_to_email: input.reply_to_email ?? null,
    p_sender_category: input.sender_category,
    p_audience_type: input.audience_type,
    p_risk_level: input.risk_level ?? "low",
    p_notes: input.notes ?? null,
    p_actor_user_id: uid,
  });
  if (error) throw error;
  return data;
}

async function setFlags(
  id: string,
  reason: string,
  flags: {
    is_enabled?: boolean;
    provider_identity_status?: string;
    domain_verified?: boolean;
    is_default?: boolean;
  },
) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await client.rpc("set_comm_hub_sender_profile_flags", {
    p_id: id,
    p_is_enabled: flags.is_enabled ?? null,
    p_provider_identity_status: flags.provider_identity_status ?? null,
    p_domain_verified: flags.domain_verified ?? null,
    p_is_default: flags.is_default ?? null,
    p_reason: reason,
    p_actor_user_id: uid,
  });
  if (error) throw error;
  return data;
}

export const enableSenderProfile = (id: string, reason: string) =>
  setFlags(id, reason, { is_enabled: true });
export const disableSenderProfile = (id: string, reason: string) =>
  setFlags(id, reason, { is_enabled: false });
export const setDefaultSenderProfile = (id: string, reason: string) =>
  setFlags(id, reason, { is_default: true });
export const setSenderIdentityStatus = (id: string, status: string, reason: string) =>
  setFlags(id, reason, { provider_identity_status: status });
export const setSenderDomainVerified = (id: string, verified: boolean, reason: string) =>
  setFlags(id, reason, { domain_verified: verified });

export async function resolveSenderForEvent(
  moduleCode: string,
  eventCode: string,
  channel: string = "email",
): Promise<ResolvedSender> {
  const { data, error } = await client.rpc("resolve_comm_hub_sender_for_event", {
    p_module_code: moduleCode,
    p_event_code: eventCode,
    p_channel: channel,
  });
  if (error) throw error;
  return (data ?? { ok: false, source: "none", reason: "no_response" }) as ResolvedSender;
}

/**
 * Enumerate live-readiness blockers for a sender assignment.
 * Returns empty array when sender is fully usable for live external sends.
 */
export function validateSenderForLive(
  sender: ResolvedSender | null | undefined,
  opts: { external: boolean; eventRiskLevel?: string | null; eventCode?: string },
): string[] {
  const blockers: string[] = [];
  if (!sender || sender.ok !== true || !sender.sender_profile_id) {
    blockers.push("sender_profile_missing");
    return blockers;
  }
  if (sender.is_enabled === false) blockers.push("sender_disabled");
  if (opts.external) {
    if (sender.provider_identity_status !== "verified") blockers.push("sender_not_verified");
    if (sender.domain_verified !== true) blockers.push("sender_domain_not_verified");
  }
  if (
    (opts.eventRiskLevel === "high" || opts.eventRiskLevel === "sensitive") &&
    sender.sender_category === "notifications"
  ) {
    blockers.push("sender_category_mismatch");
  }
  return blockers;
}

export const SENDER_CATEGORY_OPTIONS = [
  "registration", "identity", "notifications", "contributions", "finance",
  "compliance", "benefits", "claims", "medical", "doctors",
  "internal", "workflow", "legal", "audit", "reports",
] as const;

export const SENDER_AUDIENCE_OPTIONS = ["internal", "external", "mixed"] as const;
export const SENDER_RISK_OPTIONS = ["low", "medium", "high"] as const;
export const SENDER_IDENTITY_STATUS_OPTIONS = ["pending", "verified", "rejected", "disabled"] as const;
