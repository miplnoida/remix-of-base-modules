// Enterprise Communication Hub — async dispatcher (Phase 1C-B3-B).
//
// Dry-run remains the default. A LIVE email path is added but is gated behind
// FOUR independent checks — any single failure keeps the message in dry-run
// or requeues it without a provider call:
//
//   1. Correct `x-comm-hub-dispatch-secret` header.
//   2. `COMMUNICATION_HUB_DISPATCH_ENABLED=true`.
//   3. `COMMUNICATION_HUB_EMAIL_LIVE=true`.
//   4. `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` configured AND recipient matches.
//
// Only when ALL four pass AND the message row is
//   origin='comm_hub' AND channel='email' AND status='queued' AND test_mode=false
// does the dispatcher hit a real provider.
//
// test_mode=true rows always go through the existing dry-run path.
//
// This function still does NOT read notification_queue / notification_logs /
// bn_communication_log / ce_notice_delivery_log / ce_audit_communications,
// and does NOT call send-email-campaign / send-notification /
// process-pending-notifications.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  lookupActiveEmailProvider,
  redactProviderForLog,
  type CommHubEmailProvider,
} from "../_shared/communication-hub/provider-lookup.ts";
import {
  sendEmailViaProvider,
  type CommHubTransportResult,
} from "../_shared/communication-hub/transport-email.ts";
import { decideRetry, loadRetryPolicy } from "../_shared/communication-hub/retry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-comm-hub-dispatch-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const DEFAULT_BATCH_SIZE = 25;
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 50;

function flag(name: string): boolean {
  const v = (Deno.env.get(name) ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function clampBatchSize(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return DEFAULT_BATCH_SIZE;
  if (n < MIN_BATCH_SIZE) return DEFAULT_BATCH_SIZE;
  if (n > MAX_BATCH_SIZE) return MAX_BATCH_SIZE;
  return n;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function maskEmail(addr: string | null | undefined): string | null {
  if (!addr || typeof addr !== "string") return null;
  const at = addr.indexOf("@");
  if (at <= 0) return "***";
  const local = addr.slice(0, at);
  const dom = addr.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${dom}`;
}

/**
 * Parse COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST env into normalized entries.
 * Entries are comma-separated; each is either:
 *   - a full email  (exact match, case-insensitive)
 *   - a domain rule beginning with '@' (e.g. '@mishainfotech.com')
 */
function parseAllowlist(raw: string | undefined): {
  emails: Set<string>;
  domains: Set<string>;
  count: number;
} {
  const emails = new Set<string>();
  const domains = new Set<string>();
  if (!raw) return { emails, domains, count: 0 };
  for (const part of raw.split(",")) {
    const t = part.trim().toLowerCase();
    if (!t) continue;
    if (t.startsWith("@")) domains.add(t.slice(1));
    else if (t.includes("@")) emails.add(t);
  }
  return { emails, domains, count: emails.size + domains.size };
}

function isEmailAllowlisted(
  email: string | null | undefined,
  list: { emails: Set<string>; domains: Set<string> },
): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return false;
  if (list.emails.has(e)) return true;
  const dom = e.slice(e.indexOf("@") + 1);
  return list.domains.has(dom);
}

/* ── DB Control Center settings (Phase 1C-B7-B) ───────────────────────── */

interface CommHubControlSettings {
  dispatch_enabled: boolean;
  dry_run_only: boolean;
  email_live_enabled: boolean;
  allowed_email_addresses: string[];
  allowed_email_domains: string[];
  batch_size: number;
  max_attempts: number;
  retry_base_seconds: number;
  retry_max_seconds: number;
  live_eligible_after: string | null;
  live_eligible_max_age_minutes: number;
}

interface DbAllowlist {
  emails: Set<string>;
  domains: Set<string>;
  emailCount: number;
  domainCount: number;
}

function buildDbAllowlist(s: CommHubControlSettings): DbAllowlist {
  const emails = new Set<string>();
  const domains = new Set<string>();
  for (const e of s.allowed_email_addresses ?? []) {
    const v = (e ?? "").trim().toLowerCase();
    if (v && v.includes("@")) emails.add(v);
  }
  for (const d of s.allowed_email_domains ?? []) {
    let v = (d ?? "").trim().toLowerCase();
    if (v.startsWith("@")) v = v.slice(1);
    if (v && v.includes(".") && !v.includes("*")) domains.add(v);
  }
  return { emails, domains, emailCount: emails.size, domainCount: domains.size };
}

function isEmailDbAllowlisted(email: string | null | undefined, list: DbAllowlist): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const at = e.indexOf("@");
  if (at <= 0) return false;
  if (list.emails.has(e)) return true;
  const dom = e.slice(at + 1);
  return list.domains.has(dom);
}

// deno-lint-ignore no-explicit-any
async function loadCommunicationHubControlSettings(admin: any): Promise<
  { ok: true; settings: CommHubControlSettings } | { ok: false; error: string }
> {
  try {
    const { data, error } = await admin
      .from("communication_hub_control_settings")
      .select("dispatch_enabled, dry_run_only, email_live_enabled, allowed_email_addresses, allowed_email_domains, batch_size, max_attempts, retry_base_seconds, retry_max_seconds, live_eligible_after, live_eligible_max_age_minutes")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: `settings_query_failed: ${error.message}` };
    if (!data) return { ok: false, error: "settings_row_missing" };
    return { ok: true, settings: data as CommHubControlSettings };
  } catch (e: any) {
    return { ok: false, error: `settings_exception: ${(e?.message ?? String(e)).slice(0, 200)}` };
  }
}


interface CommMessage {
  id: string;
  request_id: string;
  recipient_id: string | null;
  channel: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  status: string;
  attempt_count: number;
  test_mode: boolean;
  origin: string | null;
}

// deno-lint-ignore no-explicit-any
type Admin = ReturnType<typeof createClient<any, any, any>>;

/** Cleanly release the row lock so a future dispatcher can retry. */
async function clearLock(admin: Admin, id: string, workerId: string) {
  await admin.from("communication_message").update({
    locked_at: null,
    locked_by: null,
  }).eq("id", id).eq("locked_by", workerId);
}

serve(async (req) => {
  // 1. Method + env + secret gating (unchanged from 1C-B2.1).
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({
      ok: false, error: "supabase_env_missing",
      note: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — no processing.",
    }, 503);
  }

  const expectedSecret = Deno.env.get("COMMUNICATION_HUB_DISPATCH_SECRET") ?? "";
  if (!expectedSecret) {
    return json({
      ok: false, error: "dispatch_secret_not_configured",
      note: "COMMUNICATION_HUB_DISPATCH_SECRET is not set — no processing.",
    }, 503);
  }
  const providedSecret = req.headers.get("x-comm-hub-dispatch-secret") ?? "";
  if (!providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const dispatchEnabledEnv = flag("COMMUNICATION_HUB_DISPATCH_ENABLED");
  const emailLiveEnv = flag("COMMUNICATION_HUB_EMAIL_LIVE");
  const allowlist = parseAllowlist(Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST"));
  const envAllowlistConfigured = allowlist.count > 0;
  const workerId = `comm-hub-dispatch:${crypto.randomUUID().slice(0, 8)}`;
  const warnings: string[] = [];

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Load DB Control Center settings — fail closed if missing/unavailable.
  const settingsRes = await loadCommunicationHubControlSettings(admin);
  if (!settingsRes.ok) {
    return json({
      ok: false,
      error: "control_settings_unavailable",
      detail: settingsRes.error,
      envDispatchEnabled: dispatchEnabledEnv,
      envEmailLive: emailLiveEnv,
      envAllowlistConfigured,
      envAllowlistCount: allowlist.count,
      workerId,
      claimed: 0, processed: 0, sentLive: 0, sentDryRun: 0,
      failed: 0, retried: 0, skipped: 0,
      warnings,
      note: "Communication Hub Control Center settings could not be loaded — no processing.",
    }, 503);
  }
  const settings = settingsRes.settings;
  const dbAllowlist = buildDbAllowlist(settings);
  const dbAllowlistConfigured = dbAllowlist.emailCount + dbAllowlist.domainCount > 0;

  const effectiveDispatchEnabled = dispatchEnabledEnv && settings.dispatch_enabled === true;

  // Live gating: env hard-gate AND DB soft-gates AND both allowlists AND
  // live eligibility window (Phase 1C-B8-B).
  const liveEligibleAfter = settings.live_eligible_after; // ISO string or null
  const liveEligibleMaxAgeMinutes = settings.live_eligible_max_age_minutes ?? 30;
  const liveEligibleAfterSet = liveEligibleAfter !== null && liveEligibleAfter !== undefined;

  // Phase 1C-B9-Control-Hardening: explicit window-expiry guard so an
  // accidentally-open DB gate can't authorise live sends past the wall clock.
  let liveWindowExpired = false;
  let liveWindowExpiresAt: string | null = null;
  if (liveEligibleAfterSet) {
    const startMs = new Date(liveEligibleAfter as string).getTime();
    const expiresMs = startMs + liveEligibleMaxAgeMinutes * 60_000;
    liveWindowExpiresAt = new Date(expiresMs).toISOString();
    liveWindowExpired = Date.now() > expiresMs;
  }

  // CH-RECIPIENT-1: env allowlist is now OPTIONAL. The DB Recipient Control
  // Center settings (allowed_email_addresses / allowed_email_domains, driven
  // by the active recipient_release_mode) are the source of truth. If the env
  // allowlist is ALSO configured, it acts as a redundant belt-and-braces
  // filter (see live-path check below). Empty env allowlist no longer blocks.
  const liveGatesRaw =
    emailLiveEnv &&
    settings.email_live_enabled === true &&
    settings.dry_run_only === false &&
    dbAllowlistConfigured;

  const liveAllowed = liveGatesRaw && liveEligibleAfterSet && !liveWindowExpired;

  let liveWindowReason: string | null = null;
  if (!emailLiveEnv) liveWindowReason = "env_email_live_off";
  else if (!settings.email_live_enabled) liveWindowReason = "db_email_live_off";
  else if (settings.dry_run_only) liveWindowReason = "db_dry_run_only";
  else if (!dbAllowlistConfigured) liveWindowReason = "db_allowlist_empty";
  else if (!liveEligibleAfterSet) liveWindowReason = "live_eligible_after_missing";
  else if (liveWindowExpired) liveWindowReason = "live_window_expired";
  else liveWindowReason = "open";

  if (settings.email_live_enabled && !dbAllowlistConfigured) {
    warnings.push("DB email_live_enabled=true but DB allowlist is empty — no live sending.");
  }
  if (emailLiveEnv && !envAllowlistConfigured) {
    warnings.push("COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST env not set — using DB Recipient Control Center allowlist as source of truth.");
  }
  if (liveGatesRaw && !liveEligibleAfterSet) {
    warnings.push("live_eligible_after_missing — all gates open but no live window start recorded; historical rows will not be claimed.");
  }
  if (liveGatesRaw && liveWindowExpired) {
    warnings.push(`live_window_expired at ${liveWindowExpiresAt} — refusing live sends until window is reopened.`);
  }
  const includeLive = liveAllowed;
  const liveWindowOpen = liveAllowed;

  if (!effectiveDispatchEnabled) {
    return json({
      ok: true,
      envDispatchEnabled: dispatchEnabledEnv,
      dbDispatchEnabled: settings.dispatch_enabled,
      effectiveDispatchEnabled,
      envEmailLive: emailLiveEnv,
      dbEmailLive: settings.email_live_enabled,
      dbDryRunOnly: settings.dry_run_only,
      envAllowlistConfigured,
      dbAllowlistConfigured,
      envAllowlistCount: allowlist.count,
      dbAllowedEmailCount: dbAllowlist.emailCount,
      dbAllowedDomainCount: dbAllowlist.domainCount,
      liveEligibleAfterSet,
      liveEligibleAfter,
      liveEligibleMaxAgeMinutes,
      liveWindowOpen,
      liveWindowReason,
      includeLive,
      workerId,
      claimed: 0, processed: 0, sentLive: 0, sentDryRun: 0,
      failed: 0, retried: 0, skipped: 0,
      errors: [], warnings,
      note: "Dispatch is disabled (env or DB) — no processing.",
    });
  }

  // 3. Batch size — use smaller/safer of request body and DB, both clamped.
  //    Also parse targetMessageId for one-message targeted mode (Phase 1C-B8-C).
  let requestedBatchSize: unknown = undefined;
  let targetMessageId: string | null = null;
  let manualFlag = false;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object") {
      requestedBatchSize = (body as any).batchSize;
      const t = (body as any).targetMessageId;
      if (typeof t === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
        targetMessageId = t;
      }
      manualFlag = (body as any).manual === true;
    }
  } catch { /* ignore */ }
  const dbBatch = clampBatchSize(settings.batch_size);
  const batchSize = targetMessageId
    ? 1
    : (requestedBatchSize === undefined
        ? dbBatch
        : Math.min(clampBatchSize(requestedBatchSize), dbBatch));

  // 4. Claim batch (or one targeted message). Live rows require
  //    p_include_live=true AND live eligibility window (Phase 1C-B8-B/C).
  let claimed: any = null;
  let claimErr: any = null;
  let targetNoClaimReason: string | null = null;
  if (targetMessageId) {
    // Pre-check the row to give a precise "why not claimed" reason without
    // exposing internals. Then attempt the atomic single-row claim.
    const { data: peek } = await admin
      .from("communication_message")
      .select("id, status, origin, channel, test_mode, created_at, next_attempt_at, locked_at")
      .eq("id", targetMessageId)
      .maybeSingle();
    if (!peek) {
      targetNoClaimReason = "target_not_found";
      claimed = [];
    } else if ((peek as any).origin !== "comm_hub" || (peek as any).channel !== "email") {
      targetNoClaimReason = "target_not_eligible_origin_or_channel";
      claimed = [];
    } else if ((peek as any).status !== "queued") {
      targetNoClaimReason = "target_not_queued";
      claimed = [];
    } else if ((peek as any).test_mode === false) {
      if (!liveAllowed) {
        targetNoClaimReason = "target_outside_live_window";
        claimed = [];
      }
    }
    if (claimed === null) {
      const res = await admin.rpc("claim_comm_hub_message_by_id", {
        p_message_id: targetMessageId,
        p_worker_id: workerId,
        p_include_live: includeLive,
        p_live_eligible_after: includeLive ? liveEligibleAfter : null,
        p_live_max_age_minutes: liveEligibleMaxAgeMinutes,
      });
      claimed = res.data;
      claimErr = res.error;
      if (!claimErr && (!claimed || (Array.isArray(claimed) && claimed.length === 0))) {
        targetNoClaimReason = targetNoClaimReason ?? "target_not_claimable";
      }
    }
  } else {
    const claimArgs: Record<string, unknown> = {
      p_batch_size: batchSize,
      p_worker_id: workerId,
      p_include_live: includeLive,
    };
    if (includeLive) {
      claimArgs.p_live_eligible_after = liveEligibleAfter;
      claimArgs.p_live_max_age_minutes = liveEligibleMaxAgeMinutes;
    }
    const res = await admin.rpc("claim_comm_hub_messages", claimArgs);
    claimed = res.data;
    claimErr = res.error;
  }
  if (claimErr) {
    return json({
      ok: false,
      envDispatchEnabled: dispatchEnabledEnv, dbDispatchEnabled: settings.dispatch_enabled,
      effectiveDispatchEnabled, envEmailLive: emailLiveEnv, dbEmailLive: settings.email_live_enabled,
      dbDryRunOnly: settings.dry_run_only, envAllowlistConfigured, dbAllowlistConfigured,
      envAllowlistCount: allowlist.count, dbAllowedEmailCount: dbAllowlist.emailCount,
      dbAllowedDomainCount: dbAllowlist.domainCount,
      liveEligibleAfterSet, liveEligibleAfter, liveEligibleMaxAgeMinutes,
      liveWindowOpen, liveWindowReason, includeLive,
      targetMode: !!targetMessageId, targetMessageId, manual: manualFlag,
      workerId, effectiveBatchSize: batchSize,
      claimed: 0, processed: 0, sentLive: 0, sentDryRun: 0,
      failed: 0, retried: 0, skipped: 0,
      errors: [`claim_failed: ${claimErr.message}`], warnings,
    }, 500);
  }



  const rows = (claimed ?? []) as CommMessage[];
  const errors: string[] = [];
  let processed = 0;
  let sentLive = 0;
  let sentDryRun = 0;
  let failed = 0;
  let retried = 0;
  let skipped = 0;
  const counters = { postProviderAuditFailures: 0, messageUpdateFailures: 0 };
  const touchedRequests = new Set<string>();

  // Cache provider lookup for this batch (one active provider per run).
  let providerCache: CommHubEmailProvider | null | undefined = undefined;
  const getProvider = async (): Promise<CommHubEmailProvider | null> => {
    if (providerCache !== undefined) return providerCache;
    const res = await lookupActiveEmailProvider(admin);
    providerCache = res.ok ? res.provider : null;
    return providerCache;
  };

  for (const msg of rows) {
    processed++;
    touchedRequests.add(msg.request_id);

    // Defensive: only comm_hub email is eligible on either path.
    if (msg.origin !== "comm_hub" || msg.channel !== "email") {
      skipped++;
      await admin.from("communication_message").update({
        status: "queued", locked_at: null, locked_by: null,
      }).eq("id", msg.id);
      await admin.from("communication_event_log").insert({
        request_id: msg.request_id, message_id: msg.id,
        event_type: "queued", source: "comm-hub-dispatch",
        payload: {
          stage: "SKIPPED_NOT_ELIGIBLE",
          origin: msg.origin, channel: msg.channel, test_mode: msg.test_mode,
        },
      });
      continue;
    }

    // Route per-row: live requires ALL gates. Otherwise dry-run path.
    let eligibleForLive = liveAllowed && msg.test_mode === false;

    // Event-level live status gate (Phase 1C-B9-B-A-2).
    // Look up request's module/event and require the event to permit live
    // for this dispatch mode. Manual dispatch (targetMode) allows both
    // live_manual_only and live_cron_allowed; scheduled/cron/batch allows
    // ONLY live_cron_allowed.
    let eventLiveStatus: string | null = null;
    let eventModuleCode: string | null = null;
    let eventEventCode: string | null = null;
    if (eligibleForLive) {
      const { data: reqRow } = await admin
        .from("communication_request")
        .select("module_code, event_code")
        .eq("id", msg.request_id).maybeSingle();
      eventModuleCode = (reqRow as any)?.module_code ?? null;
      eventEventCode  = (reqRow as any)?.event_code  ?? null;
      if (eventModuleCode && eventEventCode) {
        const { data: es } = await admin.rpc("get_event_live_status", {
          p_module_code: eventModuleCode, p_event_code: eventEventCode,
        });
        eventLiveStatus = typeof es === "string" ? es : null;
      }
      const manualOk = eventLiveStatus === "live_manual_only" || eventLiveStatus === "live_cron_allowed";
      const cronOk   = eventLiveStatus === "live_cron_allowed";
      const gateOk = manualFlag ? manualOk : cronOk;
      if (!gateOk) {
        eligibleForLive = false;
        skipped++;
        await admin.from("communication_message").update({
          status: "queued", locked_at: null, locked_by: null,
        }).eq("id", msg.id);
        await admin.from("communication_event_log").insert({
          request_id: msg.request_id, message_id: msg.id,
          event_type: "queued", source: "comm-hub-dispatch",
          payload: {
            stage: "SKIPPED_EVENT_LIVE_STATUS",
            module_code: eventModuleCode, event_code: eventEventCode,
            event_live_status: eventLiveStatus, manual: manualFlag,
          },
        });
        continue;
      }
    }

    if (eligibleForLive) {
      const outcome = await processLiveMessage(
        admin, msg, workerId, allowlist, dbAllowlist, getProvider, counters,
      );
      if (outcome === "sent") sentLive++;
      else if (outcome === "retried") retried++;
      else if (outcome === "skipped") skipped++;
      else failed++;
      if (outcome === "error") errors.push(`live_error:${msg.id}`);
    } else {

      // Dry-run branch — preserves 1C-B2 behavior. Any test_mode=false row
      // that leaked into the batch when live is not fully allowed is safely
      // requeued without a provider call.
      if (msg.test_mode !== true) {
        skipped++;
        await admin.from("communication_message").update({
          status: "queued", locked_at: null, locked_by: null,
        }).eq("id", msg.id);
        await admin.from("communication_event_log").insert({
          request_id: msg.request_id, message_id: msg.id,
          event_type: "queued", source: "comm-hub-dispatch",
          payload: {
            stage: "SKIPPED_LIVE_NOT_ALLOWED",
            reason: liveAllowed ? "unknown" : "live_gating_failed",
            test_mode: msg.test_mode,
          },
        });
        continue;
      }
      const outcome = await processDryRunMessage(admin, msg, workerId);
      if (outcome === "sent") sentDryRun++;
      else failed++;
    }
  }

  for (const reqId of touchedRequests) {
    const { error: rollErr } = await admin.rpc(
      "recompute_communication_request_status",
      { p_request_id: reqId },
    );
    if (rollErr) errors.push(`recompute_failed:${reqId}:${rollErr.message}`);
  }

  return json({
    ok: true,
    envDispatchEnabled: dispatchEnabledEnv,
    dbDispatchEnabled: settings.dispatch_enabled,
    effectiveDispatchEnabled,
    envEmailLive: emailLiveEnv,
    dbEmailLive: settings.email_live_enabled,
    dbDryRunOnly: settings.dry_run_only,
    envAllowlistConfigured,
    dbAllowlistConfigured,
    envAllowlistCount: allowlist.count,
    dbAllowedEmailCount: dbAllowlist.emailCount,
    dbAllowedDomainCount: dbAllowlist.domainCount,
    liveEligibleAfterSet,
    liveEligibleAfter,
    liveEligibleMaxAgeMinutes,
    liveWindowOpen,
    liveWindowReason,
    includeLive,
    targetMode: !!targetMessageId,
    targetMessageId,
    manual: manualFlag,
    targetNoClaimReason,
    workerId,
    effectiveBatchSize: batchSize,
    claimed: rows.length,
    processed,
    sentLive,
    sentDryRun,
    failed,
    retried,
    skipped,
    postProviderAuditFailures: counters.postProviderAuditFailures,
    messageUpdateFailures: counters.messageUpdateFailures,
    errors,
    warnings,
  });
});


/* ── Dry-run path (unchanged behavior from 1C-B2) ─────────────────────── */

async function processDryRunMessage(
  admin: Admin, msg: CommMessage, workerId: string,
): Promise<"sent" | "failed"> {
  const attemptNo = msg.attempt_count;

  let toEmail: string | null = null;
  if (msg.recipient_id) {
    const { data: rec } = await admin.from("communication_recipient")
      .select("email").eq("id", msg.recipient_id).maybeSingle();
    toEmail = (rec as any)?.email ?? null;
  }

  const startedAt = new Date().toISOString();
  await admin.from("communication_event_log").insert([
    { request_id: msg.request_id, message_id: msg.id, event_type: "queued", source: "comm-hub-dispatch",
      payload: { stage: "DISPATCH_STARTED", worker_id: workerId, attempt_no: attemptNo, test_mode: true } },
    { request_id: msg.request_id, message_id: msg.id, event_type: "queued", source: "comm-hub-dispatch",
      payload: { stage: "PROVIDER_SELECTED", provider_code: "dry-run", live_email: false } },
    { request_id: msg.request_id, message_id: msg.id, event_type: "queued", source: "comm-hub-dispatch",
      payload: { stage: "SEND_STARTED", dry_run: true } },
  ]);

  const providerMessageId = `dry-run:${msg.id}:${attemptNo}`;
  const finishedAt = new Date().toISOString();

  const { error: attErr } = await admin.from("communication_delivery_attempt").insert({
    message_id: msg.id, attempt_no: attemptNo, provider_id: null,
    started_at: startedAt, finished_at: finishedAt,
    status: "skipped", provider_message_id: providerMessageId,
    provider_response: {
      request: {
        to_masked: maskEmail(toEmail),
        subject_length: msg.subject ? msg.subject.length : 0,
        body_html_size: msg.body_html ? msg.body_html.length : 0,
        body_text_size: msg.body_text ? msg.body_text.length : 0,
        channel: msg.channel, test_mode: msg.test_mode,
      },
      response: { dry_run: true, live_email: false, provider_code: "dry-run" },
    },
    error_code: null, error_message: null, retry_reason: null,
  });

  if (attErr) {
    await admin.from("communication_message").update({
      status: "failed",
      error_code: "DRY_RUN_ATTEMPT_INSERT_FAILED",
      error_message: attErr.message,
      locked_at: null, locked_by: null,
    }).eq("id", msg.id);
    await admin.from("communication_event_log").insert({
      request_id: msg.request_id, message_id: msg.id,
      event_type: "failed", source: "comm-hub-dispatch",
      payload: { stage: "FAILED", error: attErr.message, dry_run: true },
    });
    return "failed";
  }

  const now = new Date().toISOString();
  const { error: updErr } = await admin.from("communication_message").update({
    status: "sent", sent_at: now, provider_message_id: providerMessageId,
    locked_at: null, locked_by: null, error_code: null, error_message: null,
  }).eq("id", msg.id);

  if (updErr) {
    await clearLock(admin, msg.id, workerId);
    await admin.from("communication_event_log").insert({
      request_id: msg.request_id, message_id: msg.id,
      event_type: "failed", source: "comm-hub-dispatch",
      payload: { stage: "MESSAGE_UPDATE_FAILED", error: updErr.message, dry_run: true },
    });
    return "failed";
  }

  await admin.from("communication_event_log").insert([
    { request_id: msg.request_id, message_id: msg.id, event_type: "sent", source: "comm-hub-dispatch",
      payload: { stage: "PROVIDER_ACCEPTED", dry_run: true, provider_message_id: providerMessageId } },
    { request_id: msg.request_id, message_id: msg.id, event_type: "sent", source: "comm-hub-dispatch",
      payload: { stage: "SENT", dry_run: true, provider_code: "dry-run" } },
  ]);
  return "sent";
}

/* ── Live path (NEW in 1C-B3-B, allowlist-gated) ──────────────────────── */

async function processLiveMessage(
  admin: Admin,
  msg: CommMessage,
  workerId: string,
  allowlist: { emails: Set<string>; domains: Set<string> },
  dbAllowlist: DbAllowlist,
  getProvider: () => Promise<CommHubEmailProvider | null>,
  counters: { postProviderAuditFailures: number; messageUpdateFailures: number },
): Promise<"sent" | "retried" | "failed" | "skipped" | "error"> {
  const attemptNo = msg.attempt_count;
  const startedAt = new Date().toISOString();

  // Load recipient email — required.
  let toEmail: string | null = null;
  if (msg.recipient_id) {
    const { data: rec } = await admin.from("communication_recipient")
      .select("email").eq("id", msg.recipient_id).maybeSingle();
    toEmail = (rec as any)?.email ?? null;
  }

  await admin.from("communication_event_log").insert({
    request_id: msg.request_id, message_id: msg.id,
    event_type: "queued", source: "comm-hub-dispatch",
    payload: { stage: "DISPATCH_STARTED", worker_id: workerId, attempt_no: attemptNo, test_mode: false, live: true },
  });

  // Missing recipient email — non-retryable failure.
  if (!toEmail) {
    await recordSkippedAttempt(admin, msg, attemptNo, startedAt, "RECIPIENT_EMAIL_MISSING",
      "recipient_email_missing", "communication_recipient has no email");
    await failMessage(admin, msg, workerId, "recipient_email_missing",
      "communication_recipient has no email", "RECIPIENT_EMAIL_MISSING");
    return "failed";
  }

  // DB allowlist check (Phase 1C-B7-B) — must pass before env allowlist.
  if (!isEmailDbAllowlisted(toEmail, dbAllowlist)) {
    await recordSkippedAttempt(admin, msg, attemptNo, startedAt,
      "LIVE_RECIPIENT_NOT_DB_ALLOWLISTED", "recipient_not_db_allowlisted",
      "Recipient email not in Control Center DB allowlist",
      { to_masked: maskEmail(toEmail) });
    await admin.from("communication_message").update({
      status: "suppressed",
      error_code: "recipient_not_db_allowlisted",
      error_message: "Blocked by DB Control Center allowlist",
      locked_at: null, locked_by: null,
    }).eq("id", msg.id);
    await admin.from("communication_event_log").insert({
      request_id: msg.request_id, message_id: msg.id,
      event_type: "suppressed", source: "comm-hub-dispatch",
      payload: { stage: "LIVE_RECIPIENT_NOT_DB_ALLOWLISTED", to_masked: maskEmail(toEmail) },
    });
    return "skipped";
  }

  // Env allowlist check.
  if (!isEmailAllowlisted(toEmail, allowlist)) {
    await recordSkippedAttempt(admin, msg, attemptNo, startedAt,
      "LIVE_RECIPIENT_NOT_ALLOWLISTED", "recipient_not_allowlisted",
      "Recipient email not in COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST",
      { to_masked: maskEmail(toEmail) });
    await admin.from("communication_message").update({
      status: "suppressed",
      error_code: "recipient_not_allowlisted",
      error_message: "Blocked by live allowlist",
      locked_at: null, locked_by: null,
    }).eq("id", msg.id);
    await admin.from("communication_event_log").insert({
      request_id: msg.request_id, message_id: msg.id,
      event_type: "suppressed", source: "comm-hub-dispatch",
      payload: { stage: "LIVE_RECIPIENT_NOT_ALLOWLISTED", to_masked: maskEmail(toEmail) },
    });
    return "skipped";
  }

  // Content sanity.
  if (!msg.subject || msg.subject.trim().length === 0) {
    await recordSkippedAttempt(admin, msg, attemptNo, startedAt, "SUBJECT_MISSING",
      "subject_missing", "Message subject is empty");
    await failMessage(admin, msg, workerId, "subject_missing", "Message subject is empty", "SUBJECT_MISSING");
    return "failed";
  }
  if (!msg.body_html && !msg.body_text) {
    await recordSkippedAttempt(admin, msg, attemptNo, startedAt, "BODY_MISSING",
      "body_missing", "Message has no html or text body");
    await failMessage(admin, msg, workerId, "body_missing", "Message has no html or text body", "BODY_MISSING");
    return "failed";
  }

  // Provider lookup.
  const provider = await getProvider();
  if (!provider) {
    await recordSkippedAttempt(admin, msg, attemptNo, startedAt,
      "PROVIDER_CONFIG_MISSING", "provider_config_missing",
      "No active default email provider in notification_providers");
    // Provider config missing is transient (admin can add one); use retry helper.
    return await applyFailureDecision(admin, msg, workerId, {
      ok: false, providerCode: "resend", providerMessageId: null,
      statusCode: null, rawStatus: "failed", retryable: true,
      errorCode: "provider_config_missing",
      errorMessage: "No active default email provider",
      providerResponseSafe: null,
    }, null);
  }

  await admin.from("communication_event_log").insert([
    { request_id: msg.request_id, message_id: msg.id,
      event_type: "queued", source: "comm-hub-dispatch",
      payload: { stage: "PROVIDER_SELECTED", live_email: true, provider: redactProviderForLog(provider) } },
    { request_id: msg.request_id, message_id: msg.id,
      event_type: "queued", source: "comm-hub-dispatch",
      payload: { stage: "SEND_STARTED", live_email: true, to_masked: maskEmail(toEmail) } },
  ]);

  // Live send. EPIC CH-S1 — apply sender snapshot from message row if present.
  let senderOverride: { from_email?: string | null; from_display_name?: string | null; reply_to_email?: string | null } = {};
  try {
    const { data: snap } = await admin.from("communication_message")
      .select("from_email, from_display_name, reply_to_email")
      .eq("id", msg.id).maybeSingle();
    senderOverride = snap ?? {};
  } catch { /* non-fatal */ }
  let transport: CommHubTransportResult;
  try {
    transport = await sendEmailViaProvider(provider, {
      to: toEmail,
      subject: msg.subject!,
      html: msg.body_html ?? "",
      text: msg.body_text ?? undefined,
      fromEmail: senderOverride.from_email ?? undefined,
      fromName: senderOverride.from_display_name ?? undefined,
      replyTo: senderOverride.reply_to_email ?? undefined,
    } as any, { fallbackResendKey: Deno.env.get("RESEND_API_KEY") ?? undefined });
  } catch (err: any) {
    transport = {
      ok: false, providerCode: provider.type, providerMessageId: null,
      statusCode: null, rawStatus: "failed", retryable: true,
      errorCode: "transport_exception",
      errorMessage: (err?.message || String(err)).slice(0, 500),
      providerResponseSafe: null,
    };
  }

  const finishedAt = new Date().toISOString();

  // Record attempt.
  const attemptStatus =
    transport.ok ? "success" :
    transport.errorCode === "timeout" || /timeout/i.test(transport.errorMessage ?? "") ? "timeout" :
    transport.statusCode === 429 ? "throttled" : "failure";

  const { error: attErr } = await admin.from("communication_delivery_attempt").insert({
    message_id: msg.id,
    attempt_no: attemptNo,
    provider_id: provider.providerId,
    started_at: startedAt,
    finished_at: finishedAt,
    status: attemptStatus,
    provider_message_id: transport.providerMessageId,
    provider_response: {
      request: {
        to_masked: maskEmail(toEmail),
        subject_length: msg.subject!.length,
        body_html_size: msg.body_html ? msg.body_html.length : 0,
        body_text_size: msg.body_text ? msg.body_text.length : 0,
        channel: msg.channel, test_mode: false, live_email: true,
      },
      response: {
        providerCode: transport.providerCode,
        statusCode: transport.statusCode,
        rawStatus: transport.rawStatus,
        safe: transport.providerResponseSafe,
      },
    },
    error_code: transport.errorCode ?? null,
    error_message: transport.errorMessage ? transport.errorMessage.slice(0, 500) : null,
    retry_reason: transport.ok ? null : (transport.retryable ? "provider_retryable_failure" : "provider_non_retryable"),
  });
  if (attErr) {
    // Attempt audit insert failed AFTER a real provider call. We must never
    // leave the message stuck in status='sending', and we must NOT requeue
    // (that could double-send). Mark a safe terminal state per transport.ok.
    counters.postProviderAuditFailures++;
    if (transport.ok) {
      const now = new Date().toISOString();
      const { error: rescueErr } = await admin.from("communication_message").update({
        status: "sent",
        sent_at: now,
        provider_message_id: transport.providerMessageId,
        error_code: "ATTEMPT_INSERT_FAILED_AFTER_PROVIDER",
        error_message: (attErr.message ?? "attempt insert failed").slice(0, 500),
        locked_at: null, locked_by: null,
      }).eq("id", msg.id);
      if (rescueErr) {
        counters.messageUpdateFailures++;
        await clearLock(admin, msg.id, workerId);
      }
      await admin.from("communication_event_log").insert({
        request_id: msg.request_id, message_id: msg.id,
        event_type: "sent", source: "comm-hub-dispatch",
        payload: {
          stage: "ATTEMPT_INSERT_FAILED_AFTER_PROVIDER",
          live: true, provider_ok: true,
          provider_code: transport.providerCode,
          provider_message_id: transport.providerMessageId,
          status_code: transport.statusCode,
          error: (attErr.message ?? "").slice(0, 500),
          note: "Provider accepted the message; audit row could not be written. No automatic retry.",
        },
      });
      return "sent";
    } else {
      const { error: rescueErr } = await admin.from("communication_message").update({
        status: "failed",
        next_attempt_at: null,
        error_code: "ATTEMPT_INSERT_FAILED_AFTER_PROVIDER_FAILURE",
        error_message: (transport.errorMessage ?? attErr.message ?? "provider failure").slice(0, 500),
        locked_at: null, locked_by: null,
      }).eq("id", msg.id);
      if (rescueErr) {
        counters.messageUpdateFailures++;
        await clearLock(admin, msg.id, workerId);
      }
      await admin.from("communication_event_log").insert({
        request_id: msg.request_id, message_id: msg.id,
        event_type: "failed", source: "comm-hub-dispatch",
        payload: {
          stage: "ATTEMPT_INSERT_FAILED_AFTER_PROVIDER_FAILURE",
          live: true, provider_ok: false,
          provider_code: transport.providerCode,
          status_code: transport.statusCode,
          error_code: transport.errorCode ?? null,
          audit_error: (attErr.message ?? "").slice(0, 500),
          note: "Provider call failed and audit row missing. No automatic retry.",
        },
      });
      return "failed";
    }
  }

  if (transport.ok) {
    const now = new Date().toISOString();
    const { error: updErr } = await admin.from("communication_message").update({
      status: "sent", sent_at: now,
      provider_message_id: transport.providerMessageId,
      locked_at: null, locked_by: null,
      error_code: null, error_message: null,
    }).eq("id", msg.id);
    if (updErr) {
      // Provider accepted but the status update failed. Do NOT requeue
      // (double-send risk). Try a minimal rescue update that marks the
      // message reviewable and clears the lock. If even that fails, at
      // least clear the lock so the row is not stuck.
      counters.messageUpdateFailures++;
      const { error: rescueErr } = await admin.from("communication_message").update({
        status: "sent",
        sent_at: now,
        provider_message_id: transport.providerMessageId,
        error_code: "MESSAGE_UPDATE_FAILED_AFTER_PROVIDER_SUCCESS",
        error_message: (updErr.message ?? "message update failed").slice(0, 500),
        locked_at: null, locked_by: null,
      }).eq("id", msg.id);
      if (rescueErr) {
        await clearLock(admin, msg.id, workerId);
      }
      await admin.from("communication_event_log").insert({
        request_id: msg.request_id, message_id: msg.id,
        event_type: "sent", source: "comm-hub-dispatch",
        payload: {
          stage: "MESSAGE_UPDATE_FAILED_AFTER_PROVIDER_SUCCESS",
          live: true,
          provider_code: transport.providerCode,
          provider_message_id: transport.providerMessageId,
          status_code: transport.statusCode,
          error: (updErr.message ?? "").slice(0, 500),
          note: "Provider accepted the message; row status update failed. Lock cleared. No automatic retry.",
        },
      });
      return "error";
    }
    await admin.from("communication_event_log").insert([
      { request_id: msg.request_id, message_id: msg.id,
        event_type: "sent", source: "comm-hub-dispatch",
        payload: { stage: "PROVIDER_ACCEPTED", live: true, provider_message_id: transport.providerMessageId, provider_code: transport.providerCode } },
      { request_id: msg.request_id, message_id: msg.id,
        event_type: "sent", source: "comm-hub-dispatch",
        payload: { stage: "SENT", live: true, provider_code: transport.providerCode } },
    ]);
    return "sent";
  }

  return await applyFailureDecision(admin, msg, workerId, transport, provider);
}

/**
 * Insert a delivery attempt row for a case where the provider was NOT called
 * (missing recipient, allowlist block, subject/body missing, provider config
 * missing). Uses status='skipped'.
 */
async function recordSkippedAttempt(
  admin: Admin,
  msg: CommMessage,
  attemptNo: number,
  startedAt: string,
  stage: string,
  errorCode: string,
  errorMessage: string,
  extraRequest: Record<string, unknown> = {},
) {
  const finishedAt = new Date().toISOString();
  await admin.from("communication_delivery_attempt").insert({
    message_id: msg.id,
    attempt_no: attemptNo,
    provider_id: null,
    started_at: startedAt,
    finished_at: finishedAt,
    status: "skipped",
    provider_message_id: null,
    provider_response: {
      request: {
        subject_length: msg.subject ? msg.subject.length : 0,
        body_html_size: msg.body_html ? msg.body_html.length : 0,
        body_text_size: msg.body_text ? msg.body_text.length : 0,
        channel: msg.channel, test_mode: msg.test_mode, live_email: true,
        ...extraRequest,
      },
      response: { skipped: true, stage },
    },
    error_code: errorCode,
    error_message: errorMessage.slice(0, 500),
    retry_reason: null,
  });
  await admin.from("communication_event_log").insert({
    request_id: msg.request_id, message_id: msg.id,
    event_type: "suppressed", source: "comm-hub-dispatch",
    payload: { stage, live: true, error_code: errorCode },
  });
}

async function failMessage(
  admin: Admin, msg: CommMessage, workerId: string,
  code: string, message: string, stage: string,
) {
  await admin.from("communication_message").update({
    status: "failed",
    error_code: code,
    error_message: message.slice(0, 500),
    locked_at: null, locked_by: null,
  }).eq("id", msg.id);
  await admin.from("communication_event_log").insert({
    request_id: msg.request_id, message_id: msg.id,
    event_type: "failed", source: "comm-hub-dispatch",
    payload: { stage, live: true, error_code: code },
  });
  // clearLock is a no-op when the update above already cleared it.
  await clearLock(admin, msg.id, workerId);
}

async function applyFailureDecision(
  admin: Admin,
  msg: CommMessage,
  workerId: string,
  transport: CommHubTransportResult,
  provider: CommHubEmailProvider | null,
): Promise<"retried" | "failed"> {
  const policy = await loadRetryPolicy(admin, { channel: "email" });
  const decision = decideRetry({
    attemptCount: msg.attempt_count,
    retryable: transport.retryable,
    policy,
  });

  const safeErr = {
    code: transport.errorCode ?? "provider_error",
    message: (transport.errorMessage ?? "provider_error").slice(0, 500),
  };

  if (decision.shouldRetry && decision.nextAttemptAt) {
    await admin.from("communication_message").update({
      status: "queued",
      next_attempt_at: decision.nextAttemptAt,
      locked_at: null, locked_by: null,
      error_code: safeErr.code,
      error_message: safeErr.message,
    }).eq("id", msg.id);
    await admin.from("communication_event_log").insert([
      { request_id: msg.request_id, message_id: msg.id,
        event_type: "failed", source: "comm-hub-dispatch",
        payload: { stage: "FAILED", live: true, error_code: safeErr.code, status_code: transport.statusCode, provider_code: transport.providerCode } },
      { request_id: msg.request_id, message_id: msg.id,
        event_type: "retried", source: "comm-hub-dispatch",
        payload: {
          stage: "RETRY_SCHEDULED", live: true,
          next_attempt_at: decision.nextAttemptAt,
          next_attempt_count: decision.nextAttemptCount,
          reason: decision.reason,
          provider: provider ? redactProviderForLog(provider) : null,
        } },
    ]);
    await clearLock(admin, msg.id, workerId);
    return "retried";
  }

  await admin.from("communication_message").update({
    status: "failed",
    next_attempt_at: null,
    locked_at: null, locked_by: null,
    error_code: safeErr.code,
    error_message: safeErr.message,
  }).eq("id", msg.id);
  await admin.from("communication_event_log").insert({
    request_id: msg.request_id, message_id: msg.id,
    event_type: "failed", source: "comm-hub-dispatch",
    payload: {
      stage: "FAILED", live: true,
      error_code: safeErr.code, status_code: transport.statusCode,
      provider_code: transport.providerCode, reason: decision.reason,
    },
  });
  await clearLock(admin, msg.id, workerId);
  return "failed";
}
