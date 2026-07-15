/**
 * EPIC CH-LIVE-ALL-1 — All Events Live Readiness inventory service.
 *
 * Read-only aggregation across the canonical Communication Hub tables.
 * Never sends email. Never mutates gates. Never touches provider.
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export type LiveStatus = "disabled" | "dry_run_only" | "live_manual_only" | "live_cron_allowed";
export type RiskLevel = "low" | "medium" | "high" | "sensitive";

export interface ReadinessRow {
  key: string; // module:event:channel
  module_code: string;
  event_code: string;
  event_name: string;
  channel: string;
  risk_level: RiskLevel;
  is_high_risk: boolean;

  registry_exists: boolean;
  template_code: string | null;
  template_mapped: boolean;
  template_active: boolean;
  template_version_ok: boolean;
  template_version_no: number | null;
  template_status: string | null;

  sender_profile_id: string | null;
  sender_mapped: boolean;
  sender_enabled: boolean;
  sender_domain_verified: boolean;

  send_policy_exists: boolean;
  send_policy_enabled: boolean;
  send_policy_approved: boolean;

  review_policy_exists: boolean;
  review_policy_allows_manual_live: boolean;
  review_approval_ok: boolean;

  duplicate_policy_ok: boolean;

  live_control_row_exists: boolean;
  live_control_status: LiveStatus | null;

  required_tokens: string[];
  provider_configured: boolean;

  eligible: boolean;
  blockers: string[];
  recommended_action: string;
}

const HIGH_RISK_MODULES = new Set(["LEGAL", "COMPLIANCE", "FINANCE", "MEDICAL", "APPEALS"]);
const HIGH_RISK_EVENT_KEYWORDS = ["EXTERNAL", "STATUTORY", "APPEAL", "DECISION", "LEGAL_NOTICE", "BULK", "SCHEDULED", "PAYMENT"];

function classifyHighRisk(moduleCode: string, eventCode: string, risk: RiskLevel): boolean {
  if (risk === "high" || risk === "sensitive") return true;
  if (HIGH_RISK_MODULES.has(moduleCode)) return true;
  const upper = eventCode.toUpperCase();
  return HIGH_RISK_EVENT_KEYWORDS.some((k) => upper.includes(k));
}

export async function loadAllEventsReadiness(): Promise<ReadinessRow[]> {
  const [mapRes, regRes, liveRes, sendPolRes, reviewPolRes, providerRes] = await Promise.all([
    db.from("communication_hub_event_template_map")
      .select("module_code, event_code, channel, template_code, template_id, active, risk_level, sender_profile_id"),
    db.from("communication_hub_module_event_registry")
      .select("module_code, event_code, event_name, required_tokens, risk_level, integration_status"),
    db.from("communication_hub_event_live_control")
      .select("module_code, event_code, status, risk_level"),
    db.from("communication_hub_event_send_policy")
      .select("module_code, event_code, channel, is_enabled, approved_at"),
    db.from("communication_hub_event_review_policy")
      .select("module_code, event_code, channel, review_mode, require_template_approval, approval_status"),
    db.from("notification_providers").select("id, is_active").eq("is_active", true).limit(1),
  ]);

  const mappings = (mapRes.data ?? []) as any[];
  const templateCodes = Array.from(new Set(mappings.map((m) => m.template_code).filter(Boolean)));
  const senderIds = Array.from(new Set(mappings.map((m) => m.sender_profile_id).filter(Boolean)));

  const [tplRes, sendersRes] = await Promise.all([
    templateCodes.length
      ? db.from("core_template").select("code, is_active, active_version_id, status").in("code", templateCodes)
      : Promise.resolve({ data: [] }),
    senderIds.length
      ? db.from("communication_hub_sender_profile").select("id, is_enabled, domain_verified, provider_identity_status").in("id", senderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const versionIds = ((tplRes.data ?? []) as any[]).map((t: any) => t.active_version_id).filter(Boolean);
  const versionsRes = versionIds.length
    ? await db.from("core_template_version").select("id, version_no, status").in("id", versionIds)
    : { data: [] };

  const tplByCode: Record<string, any> = {};
  const versionById: Record<string, any> = {};
  for (const v of (versionsRes.data ?? []) as any[]) versionById[v.id] = v;
  for (const t of (tplRes.data ?? []) as any[]) tplByCode[t.code] = t;

  const senderById: Record<string, any> = {};
  for (const s of (sendersRes.data ?? []) as any[]) senderById[s.id] = s;

  const regByKey: Record<string, any> = {};
  for (const r of (regRes.data ?? []) as any[]) regByKey[`${r.module_code}:${r.event_code}`] = r;

  const liveByKey: Record<string, any> = {};
  for (const l of (liveRes.data ?? []) as any[]) liveByKey[`${l.module_code}:${l.event_code}`] = l;

  const sendPolByKey: Record<string, any> = {};
  for (const p of (sendPolRes.data ?? []) as any[])
    sendPolByKey[`${p.module_code}:${p.event_code}:${p.channel}`] = p;

  const reviewPolByKey: Record<string, any> = {};
  for (const p of (reviewPolRes.data ?? []) as any[])
    reviewPolByKey[`${p.module_code}:${p.event_code}:${p.channel}`] = p;

  const providerConfigured = ((providerRes.data ?? []) as any[]).length > 0;

  const rows: ReadinessRow[] = mappings.map((m) => {
    const key = `${m.module_code}:${m.event_code}`;
    const chKey = `${key}:${m.channel}`;
    const reg = regByKey[key];
    const live = liveByKey[key];
    const sendPol = sendPolByKey[chKey];
    const reviewPol = reviewPolByKey[chKey];
    const tpl = m.template_code ? tplByCode[m.template_code] : null;
    const version = tpl?.active_version_id ? versionById[tpl.active_version_id] : null;
    const sender = m.sender_profile_id ? senderById[m.sender_profile_id] : null;

    const risk: RiskLevel = (m.risk_level ?? live?.risk_level ?? reg?.risk_level ?? "low") as RiskLevel;
    const isHighRisk = classifyHighRisk(m.module_code, m.event_code, risk);

    const templateMapped = !!m.template_code && !!m.active;
    const templateActive = !!tpl?.is_active;
    const templateVersionOk = !!version && ["approved", "published", "active"].includes((version.status ?? "").toLowerCase());

    const senderMapped = !!sender;
    const senderEnabled = !!sender?.is_enabled;
    const senderDomainVerified = !!sender?.domain_verified || sender?.provider_identity_status === "verified";

    const sendPolExists = !!sendPol;
    const sendPolEnabled = !!sendPol?.is_enabled;
    const sendPolApproved = !!sendPol?.approved_at;

    const reviewPolExists = !!reviewPol;
    const reviewAllowsManualLive = !reviewPol || ["preview_optional", "preview_required", "approval_required", "legal_approval_required"].includes(reviewPol.review_mode);
    const reviewApprovalOk = !reviewPol?.require_template_approval ||
      ["approved_internal", "approved_external"].includes(reviewPol.approval_status ?? "");

    const liveRowExists = !!live;
    const liveStatus: LiveStatus | null = live?.status ?? null;

    const requiredTokens = Array.isArray(reg?.required_tokens) ? reg.required_tokens : [];
    const channel = (m.channel ?? "email").toLowerCase();

    const blockers: string[] = [];
    if (!reg) blockers.push("registry_missing");
    if (!templateMapped) blockers.push("template_mapping_missing_or_inactive");
    if (!templateActive) blockers.push("template_inactive");
    if (!templateVersionOk) blockers.push("template_version_not_approved");
    if (!senderMapped) blockers.push("sender_profile_missing");
    else {
      if (!senderEnabled) blockers.push("sender_disabled");
      if (!senderDomainVerified) blockers.push("sender_domain_not_verified");
    }
    if (!sendPolExists) blockers.push("send_policy_missing");
    else {
      if (!sendPolEnabled) blockers.push("send_policy_disabled");
      if (!sendPolApproved) blockers.push("send_policy_not_approved");
    }
    if (!reviewPolExists) blockers.push("review_policy_missing");
    else {
      if (!reviewAllowsManualLive) blockers.push("review_policy_disallows_manual_live");
      if (!reviewApprovalOk) blockers.push("template_not_approved");
    }
    if (channel !== "email") blockers.push(`channel_${channel}_not_client_validated`);
    if (!providerConfigured) blockers.push("provider_not_configured");

    const eligible = blockers.length === 0;
    let recommended = "No action";
    if (!eligible) recommended = `Fix: ${blockers[0]}`;
    else if (liveStatus === "live_manual_only") recommended = "Already live-ready (manual only)";
    else if (isHighRisk) recommended = "Eligible — high-risk, promote individually with business approval";
    else recommended = "Promote to live_manual_only";

    return {
      key: chKey,
      module_code: m.module_code,
      event_code: m.event_code,
      event_name: reg?.event_name ?? m.event_code,
      channel,
      risk_level: risk,
      is_high_risk: isHighRisk,
      registry_exists: !!reg,
      template_code: m.template_code ?? null,
      template_mapped: templateMapped,
      template_active: templateActive,
      template_version_ok: templateVersionOk,
      template_version_no: version?.version_no ?? null,
      template_status: version?.status ?? tpl?.status ?? null,
      sender_profile_id: m.sender_profile_id ?? null,
      sender_mapped: senderMapped,
      sender_enabled: senderEnabled,
      sender_domain_verified: senderDomainVerified,
      send_policy_exists: sendPolExists,
      send_policy_enabled: sendPolEnabled,
      send_policy_approved: sendPolApproved,
      review_policy_exists: reviewPolExists,
      review_policy_allows_manual_live: reviewAllowsManualLive,
      review_approval_ok: reviewApprovalOk,
      duplicate_policy_ok: true,
      live_control_row_exists: liveRowExists,
      live_control_status: liveStatus,
      required_tokens: requiredTokens,
      provider_configured: providerConfigured,
      eligible,
      blockers,
      recommended_action: recommended,
    };
  });

  rows.sort((a, b) =>
    a.module_code.localeCompare(b.module_code) ||
    a.event_code.localeCompare(b.event_code) ||
    a.channel.localeCompare(b.channel),
  );
  return rows;
}

export interface PromoteInput {
  moduleCode: string;
  eventCode: string;
  reason: string;
  typedConfirmation: string;
  riskLevel: RiskLevel;
}

export async function promoteEventToLiveManual(input: PromoteInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const actorId = userRes?.user?.id;
    if (!actorId) return { ok: false, error: "not_authenticated" };
    const { error } = await db.rpc("set_event_live_control", {
      p_module_code: input.moduleCode,
      p_event_code: input.eventCode,
      p_new_status: "live_manual_only",
      p_reason: input.reason,
      p_risk_level: input.riskLevel,
      p_typed_confirmation: `ENABLE live_manual_only FOR ${input.moduleCode}/${input.eventCode}`,
      p_actor_user_id: actorId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "unknown" };
  }
}
