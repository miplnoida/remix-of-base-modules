/**
 * EPIC CH-TEST-3 — Canonical business communication validator.
 *
 * Runs strictly read-only checks against the same tables the send spine
 * consults. NEVER creates a communication_request / communication_message,
 * NEVER calls a provider, NEVER writes to communication_hub_trace.
 *
 * CH-TEST-3 changes:
 *  - Recipient Control Center allowlist and master live-email gate are
 *    surfaced as first-class readiness cards.
 *  - CONTROLLED_LIVE_E2E now pre-blocks when the selected recipient is not
 *    on the current Recipient Control Center allowlist.
 *  - `comm-hub-event-pilot` preflight compatibility check has been retired
 *    (parity confirmed). The edge function itself is left in place for
 *    legacy tooling — this validator no longer invokes it.
 */
import { supabase } from "@/integrations/supabase/client";

export type ValidationMode = "VALIDATE_ONLY" | "RENDER_PREVIEW" | "DRY_RUN" | "QUEUE_TEST" | "CONTROLLED_LIVE_E2E";
export type RecipientMode = "manual" | "resolved_business" | "resolved_with_override";

export type ReadinessStatus = "ready" | "warning" | "blocked" | "not_configured" | "unknown";

export interface ReadinessCheck {
  key: string;
  label: string;
  status: ReadinessStatus;
  message?: string;
  code?: string;
}

export interface ResolvedRecipientForValidate {
  ok: boolean;
  email: string | null;          // full email for allowlist/domain check (never rendered by validator)
  masked: string | null;
  domain: string | null;
  source: string | null;
  resolver_name: string | null;
  blockers?: string[];
}

export interface ValidateInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  entityType?: string | null;
  entityId?: string | null;
  referenceNo?: string | null;
  recipientMode: RecipientMode;
  recipientEmail?: string;
  /** CH-TEST-4: when recipientMode = resolved_business, pass the resolver output. */
  resolvedRecipient?: ResolvedRecipientForValidate | null;
  tokens?: Record<string, unknown>;
  mode: ValidationMode;
}

export interface ValidateResult {
  ready: boolean;
  /** True when the "run live" specific pre-checks pass (allowlist + master gate + live-window). */
  liveReady: boolean;
  checks: ReadinessCheck[];
  blockers: string[];
  warnings: string[];
}

const db: any = supabase;

async function checkMapping(input: ValidateInput): Promise<ReadinessCheck> {
  const { data } = await db.from("communication_hub_event_template_map")
    .select("template_code, active")
    .eq("module_code", input.moduleCode)
    .eq("event_code", input.eventCode)
    .eq("channel", input.channel ?? "email")
    .maybeSingle();
  if (!data) return { key: "event", label: "Event mapping", status: "blocked", code: "event_template_mapping_missing", message: "No active template mapping for this event." };
  if (!data.active) return { key: "event", label: "Event mapping", status: "blocked", code: "event_template_mapping_inactive", message: "Template mapping exists but is not active." };
  return { key: "event", label: "Event mapping", status: "ready", message: `Template ${data.template_code}` };
}

async function checkTemplate(templateCode: string | null): Promise<[ReadinessCheck, ReadinessCheck]> {
  if (!templateCode) {
    return [
      { key: "template", label: "Template", status: "not_configured" },
      { key: "sender", label: "Sender profile", status: "not_configured" },
    ];
  }
  const { data: tpl } = await db.from("core_template")
    .select("id, is_active, active_version_id, sender_profile_id")
    .eq("code", templateCode).maybeSingle();
  if (!tpl) return [
    { key: "template", label: "Template", status: "blocked", code: "template_not_found" },
    { key: "sender", label: "Sender profile", status: "unknown" },
  ];
  const tplCheck: ReadinessCheck = !tpl.is_active
    ? { key: "template", label: "Template", status: "blocked", code: "template_inactive" }
    : !tpl.active_version_id
      ? { key: "template", label: "Template", status: "blocked", code: "template_no_active_version" }
      : { key: "template", label: "Template", status: "ready" };
  let senderCheck: ReadinessCheck = { key: "sender", label: "Sender profile", status: "not_configured" };
  if (tpl.sender_profile_id) {
    const { data: sp } = await db.from("communication_hub_sender_profile")
      .select("is_enabled, is_verified, from_email").eq("id", tpl.sender_profile_id).maybeSingle();
    if (!sp) senderCheck = { key: "sender", label: "Sender profile", status: "blocked", code: "sender_profile_missing" };
    else if (!sp.is_enabled) senderCheck = { key: "sender", label: "Sender profile", status: "blocked", code: "sender_disabled" };
    else if (!sp.is_verified) senderCheck = { key: "sender", label: "Sender profile", status: "warning", code: "sender_unverified", message: `From ${sp.from_email}` };
    else senderCheck = { key: "sender", label: "Sender profile", status: "ready", message: `From ${sp.from_email}` };
  }
  return [tplCheck, senderCheck];
}

async function checkTokens(input: ValidateInput): Promise<ReadinessCheck> {
  const { data: reg } = await db.from("communication_hub_module_event_registry")
    .select("required_tokens").eq("module_code", input.moduleCode).eq("event_code", input.eventCode).maybeSingle();
  const required: string[] = Array.isArray(reg?.required_tokens) ? reg.required_tokens : [];
  const provided = new Set(Object.keys(input.tokens ?? {}));
  const missing = required.filter((t) => !provided.has(t) && !["request_no", "generated_at", "module_code", "event_code", "request_id"].includes(t));
  if (missing.length === 0) return { key: "tokens", label: "Tokens", status: "ready", message: `${required.length} required tokens present` };
  return { key: "tokens", label: "Tokens", status: "blocked", code: "required_tokens_missing", message: `Missing: ${missing.join(", ")}` };
}

function checkRecipient(input: ValidateInput): ReadinessCheck {
  if (input.recipientMode === "resolved_business") {
    const r = input.resolvedRecipient;
    if (!r) return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_resolver_missing", message: "Resolver not run for this event." };
    if (!r.ok || !r.email) {
      const code = (r.blockers && r.blockers[0]) || "recipient_not_found";
      return { key: "recipient", label: "Recipient", status: "blocked", code, message: r.masked ?? code };
    }
    return { key: "recipient", label: "Recipient", status: "ready", message: `${r.masked} · ${r.source ?? r.resolver_name ?? "resolved"}` };
  }
  if (input.recipientMode === "resolved_with_override") {
    return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_override_policy_missing", message: "Override policy not configured for this screen." };
  }
  const email = (input.recipientEmail ?? "").trim();
  if (!email) return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_email_missing" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_email_invalid" };
  return { key: "recipient", label: "Recipient", status: "ready", message: email };
}

/**
 * Recipient Control Center allowlist check — reads the singleton
 * `communication_hub_control_settings` row and matches the selected
 * recipient against `allowed_email_addresses` and `allowed_email_domains`.
 * Also surfaces the master live-email + dispatcher flags as a separate card.
 */
async function checkAllowlistAndMasterGate(input: ValidateInput): Promise<[ReadinessCheck, ReadinessCheck]> {
  const { data } = await db.from("communication_hub_control_settings")
    .select("email_live_enabled, dispatch_enabled, allowed_email_addresses, allowed_email_domains, recipient_release_mode")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const allowlist: ReadinessCheck = (() => {
    if (input.recipientMode !== "manual") {
      return { key: "allowlist", label: "Recipient allowlist", status: "unknown", message: "Only checked for the manual recipient mode." };
    }
    const email = (input.recipientEmail ?? "").trim().toLowerCase();
    if (!email) {
      return { key: "allowlist", label: "Recipient allowlist", status: "blocked", code: "recipient_email_missing" };
    }
    if (!data) {
      return { key: "allowlist", label: "Recipient allowlist", status: "warning", code: "recipient_control_unavailable", message: "Control settings not readable — server will re-check." };
    }
    const addresses: string[] = (data.allowed_email_addresses ?? []).map((a: string) => (a ?? "").toLowerCase());
    const domains: string[] = (data.allowed_email_domains ?? []).map((d: string) => (d ?? "").toLowerCase());
    const domain = email.split("@")[1] ?? "";
    const addrOk = addresses.includes(email);
    const domOk = domain.length > 0 && domains.includes(domain);
    if (addrOk || domOk) {
      const mode = data.recipient_release_mode ?? "single_recipient_pilot";
      return { key: "allowlist", label: "Recipient allowlist", status: "ready", message: `Allowed (${addrOk ? "address" : "domain"}) · mode ${mode}` };
    }
    return {
      key: "allowlist",
      label: "Recipient allowlist",
      status: "blocked",
      code: "recipient_not_allowlisted",
      message: `Not in Recipient Control Center allowlist (mode ${data.recipient_release_mode ?? "single_recipient_pilot"}).`,
    };
  })();

  const master: ReadinessCheck = (() => {
    if (!data) {
      return { key: "master_gate", label: "Master live gate", status: "warning", code: "master_gate_unknown", message: "Control settings not readable." };
    }
    if (!data.dispatch_enabled) {
      return { key: "master_gate", label: "Master live gate", status: "blocked", code: "dispatcher_disabled", message: "Dispatcher is disabled in Control Center." };
    }
    const channel = (input.channel ?? "email").toLowerCase();
    if (channel === "email" && !data.email_live_enabled) {
      return { key: "master_gate", label: "Master live gate", status: "warning", code: "email_live_disabled", message: "Email live send is disabled — dry-run allowed, live blocked." };
    }
    return { key: "master_gate", label: "Master live gate", status: "ready", message: "Dispatcher + channel live are enabled" };
  })();

  return [allowlist, master];
}

async function checkSendPolicy(input: ValidateInput): Promise<ReadinessCheck> {
  const { data } = await db.from("communication_hub_event_send_policy")
    .select("id").eq("module_code", input.moduleCode).eq("event_code", input.eventCode)
    .eq("channel", input.channel ?? "email").maybeSingle();
  if (!data) return { key: "policy", label: "Send policy", status: "warning", code: "send_policy_missing" };
  return { key: "policy", label: "Send policy", status: "ready" };
}

async function checkReviewPolicy(input: ValidateInput): Promise<ReadinessCheck> {
  const { data } = await db.from("communication_hub_event_review_policy")
    .select("review_mode, require_template_approval, approval_status")
    .eq("module_code", input.moduleCode).eq("event_code", input.eventCode)
    .eq("channel", input.channel ?? "email").maybeSingle();
  if (!data) return { key: "review", label: "Review policy", status: "warning", code: "review_policy_missing" };
  if (data.require_template_approval && !["approved_internal", "approved_external"].includes(data.approval_status)) {
    return { key: "review", label: "Review policy", status: "blocked", code: "template_not_approved" };
  }
  return { key: "review", label: "Review policy", status: "ready", message: data.review_mode };
}

async function checkLiveControl(input: ValidateInput): Promise<[ReadinessCheck, ReadinessCheck]> {
  const { data } = await db.from("communication_hub_event_live_control")
    .select("status").eq("module_code", input.moduleCode).eq("event_code", input.eventCode).maybeSingle();
  const live: ReadinessCheck = data
    ? { key: "live", label: "Live gates", status: data.status === "live_manual_only" ? "ready" : data.status === "dry_run_only" ? "warning" : "warning", message: data.status }
    : { key: "live", label: "Live gates", status: "not_configured" };
  const duplicate: ReadinessCheck = { key: "duplicate", label: "Duplicate policy", status: "ready", message: "Handled server-side" };
  return [live, duplicate];
}

function checkChannel(input: ValidateInput): ReadinessCheck {
  const ch = (input.channel ?? "email").toLowerCase();
  if (["email"].includes(ch)) return { key: "channel", label: "Channel", status: "ready", message: ch };
  return { key: "channel", label: "Channel", status: "warning", message: `Channel ${ch} — only email is validated client-side` };
}

async function checkProvider(): Promise<ReadinessCheck> {
  const { data } = await db.from("notification_providers")
    .select("id, is_active").eq("is_active", true).limit(1).maybeSingle();
  if (!data) return { key: "provider", label: "Provider", status: "warning", code: "provider_not_configured" };
  return { key: "provider", label: "Provider", status: "ready" };
}

export async function validateBusinessCommunication(input: ValidateInput): Promise<ValidateResult> {
  const checks: ReadinessCheck[] = [];
  const mapping = await checkMapping(input);
  checks.push(mapping);
  const templateCode = mapping.status === "ready" ? (mapping.message?.replace(/^Template\s+/, "") ?? null) : null;
  const [tpl, sender] = await checkTemplate(templateCode);
  const tokens = await checkTokens(input);
  const recipient = checkRecipient(input);
  const [allowlist, masterGate] = await checkAllowlistAndMasterGate(input);
  const policy = await checkSendPolicy(input);
  const review = await checkReviewPolicy(input);
  const [live, duplicate] = await checkLiveControl(input);
  const channel = checkChannel(input);
  const provider = await checkProvider();

  checks.push(tpl, tokens, recipient, sender, policy, review, duplicate, channel, provider, allowlist, masterGate, live);

  const blockers = checks.filter((c) => c.status === "blocked" && c.code).map((c) => c.code!) as string[];
  const warnings = checks.filter((c) => c.status === "warning" && c.code).map((c) => c.code!) as string[];

  // Live-specific pre-check: allowlist + master gate + live window must all be OK.
  const liveBlockers: string[] = [];
  if (allowlist.status === "blocked") liveBlockers.push(allowlist.code ?? "recipient_not_allowlisted");
  if (masterGate.status === "blocked") liveBlockers.push(masterGate.code ?? "master_gate_blocked");
  if (masterGate.status === "warning" && masterGate.code === "email_live_disabled") liveBlockers.push("email_live_disabled");
  if (live.status !== "ready" || live.message !== "live_manual_only") liveBlockers.push("live_gate_not_open");

  if (input.mode === "CONTROLLED_LIVE_E2E") {
    for (const b of liveBlockers) if (!blockers.includes(b)) blockers.push(b);
  }

  return {
    ready: blockers.length === 0,
    liveReady: liveBlockers.length === 0 && recipient.status === "ready" && sender.status !== "blocked" && tpl.status === "ready",
    checks,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  };
}
