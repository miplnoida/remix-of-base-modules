/**
 * EPIC CH-TEST-2 — Canonical business communication validator.
 *
 * Runs strictly read-only checks against the same tables the send spine
 * consults. NEVER creates a communication_request / communication_message,
 * NEVER calls a provider, NEVER writes to communication_hub_trace.
 *
 * The `comm-hub-event-pilot` preflight edge function is invoked in
 * `compatibility` mode as a secondary check while its checks are being
 * migrated into this service. Both result sets are merged into a single
 * shape the Test & Diagnostics screen can render without extra plumbing.
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

export interface ValidateInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  entityType?: string | null;
  entityId?: string | null;
  referenceNo?: string | null;
  recipientMode: RecipientMode;
  recipientEmail?: string;
  tokens?: Record<string, unknown>;
  mode: ValidationMode;
}

export interface ValidateResult {
  ready: boolean;
  checks: ReadinessCheck[];
  blockers: string[];
  warnings: string[];
  compatibility?: {
    source: "comm-hub-event-pilot";
    ready: boolean;
    blockers: string[];
    warnings: string[];
    note: string;
  };
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
    // Resolver not yet wired from Test & Diagnostics.
    return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_resolver_missing", message: "Resolved business recipient is not yet available from this screen." };
  }
  if (input.recipientMode === "resolved_with_override") {
    return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_override_policy_missing", message: "Override policy not configured for this screen." };
  }
  const email = (input.recipientEmail ?? "").trim();
  if (!email) return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_email_missing" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { key: "recipient", label: "Recipient", status: "blocked", code: "recipient_email_invalid" };
  return { key: "recipient", label: "Recipient", status: "ready", message: email };
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
  const policy = await checkSendPolicy(input);
  const review = await checkReviewPolicy(input);
  const [live, duplicate] = await checkLiveControl(input);
  const channel = checkChannel(input);
  const provider = await checkProvider();

  checks.push(tpl, tokens, recipient, sender, policy, review, duplicate, channel, provider, live);

  const blockers = checks.filter((c) => c.status === "blocked" && c.code).map((c) => c.code!) as string[];
  const warnings = checks.filter((c) => c.status === "warning" && c.code).map((c) => c.code!) as string[];

  // Compatibility validation via legacy pilot preflight.
  let compatibility: ValidateResult["compatibility"];
  try {
    const { data: pilot, error } = await db.functions.invoke("comm-hub-event-pilot", {
      body: {
        action: "preflight",
        moduleCode: input.moduleCode,
        eventCode: input.eventCode,
        recipientEmail: input.recipientEmail ?? "",
        recipientName: "",
        tokens: input.tokens ?? {},
      },
    });
    if (!error && pilot) {
      compatibility = {
        source: "comm-hub-event-pilot",
        ready: !!pilot.ready,
        blockers: Array.isArray(pilot.blockers) ? pilot.blockers : [],
        warnings: Array.isArray(pilot.warnings) ? pilot.warnings : [],
        note: "Compatibility validation — pending migration into canonical validator (NEEDS_REVIEW).",
      };
    }
  } catch {
    /* pilot compatibility check is best-effort */
  }

  // If controlled live requested, add hard gates the client can pre-check.
  if (input.mode === "CONTROLLED_LIVE_E2E") {
    if (live.status !== "ready" || live.message !== "live_manual_only") {
      blockers.push("live_gate_not_open");
    }
  }

  return {
    ready: blockers.length === 0,
    checks,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    compatibility,
  };
}
