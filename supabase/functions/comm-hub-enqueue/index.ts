// Enterprise Communication Hub — secure server-side enqueue (Phase 1C-B1).
//
// Authenticated entry point that validates a caller and forwards to the
// SECURITY DEFINER RPC `public.send_communication_v1`. This function does
// NOT dispatch to providers, NOT touch provider secrets, NOT write to
// notification_queue / notification_logs. It only enqueues records into
// the canonical communication_* spine.
//
// Auth: requires a valid JWT (Authorization: Bearer <token>). The caller's
// user id is added to the payload as `callerUserId` and, when not supplied
// by the caller, as `requestedBy` so RLS-relevant fields are populated.
//
// Response: passes through the JSON returned by send_communication_v1.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const ALLOWED_CHANNELS = new Set([
  "email", "sms", "push", "in_app", "letter", "print", "whatsapp",
]);
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB safety cap.
const MAX_RECIPIENTS = 200;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function normalizeChannel(ch: unknown): string | null {
  if (typeof ch !== "string") return null;
  const c = ch.toLowerCase();
  if (ALLOWED_CHANNELS.has(c)) return c;
  const upper = ch.toUpperCase();
  if (upper === "EMAIL") return "email";
  if (upper === "SMS") return "sms";
  if (upper === "PUSH") return "push";
  if (upper === "IN_APP" || upper === "PORTAL") return "in_app";
  if (upper === "WHATSAPP") return "whatsapp";
  if (upper === "PRINT") return "print";
  if (upper === "DOCUMENT" || upper === "PDF" || upper === "LETTER") return "letter";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // 1. Authenticate caller.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ ok: false, error: "missing_authorization" }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "invalid_token" }, 401);
  const callerUserId = userRes.user.id;

  // 2. Parse + size-limit body.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }
  let payload: Record<string, unknown>;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // 3. Validate shape.
  const moduleCode = payload.moduleCode ?? (payload as any).module_code;
  const eventCode = payload.eventCode ?? (payload as any).event_code;
  if (!moduleCode || typeof moduleCode !== "string") {
    return json({ ok: false, error: "moduleCode_required" }, 400);
  }
  if (!eventCode || typeof eventCode !== "string") {
    return json({ ok: false, error: "eventCode_required" }, 400);
  }

  const rawRecipients = payload.recipients ?? (payload as any).recipient;
  const recipients = Array.isArray(rawRecipients)
    ? rawRecipients
    : rawRecipients && typeof rawRecipients === "object"
      ? [rawRecipients]
      : [];
  if (recipients.length === 0) {
    return json({ ok: false, error: "recipient_required" }, 400);
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return json({ ok: false, error: "too_many_recipients" }, 400);
  }

  const rawChannels = Array.isArray(payload.channels) ? payload.channels : ["email"];
  const channels: string[] = [];
  for (const c of rawChannels) {
    const n = normalizeChannel(c);
    if (!n) return json({ ok: false, error: "unsupported_channel", channel: c }, 400);
    channels.push(n);
  }

  // 4. Inject caller context. Never trust caller-supplied callerUserId.
  const rpcPayload = {
    ...payload,
    channels,
    recipients,
    origin: "comm_hub",
    callerUserId,
    requestedBy: (payload as any).requestedBy ?? callerUserId,
  };

  // 5. EPIC CH-P2 — Send Policy authorization for live sends.
  // Test-mode enqueue is dry-run and skips policy authorization (only warns).
  // Any non-test-mode enqueue MUST be authorized by event send policy.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const isTestMode = (payload as any).testMode === true;
  if (!isTestMode) {
    try {
      const recipientEmails = recipients
        .map((r: any) => (typeof r === "string" ? r : r?.email))
        .filter((x: any) => typeof x === "string" && x.length > 0);
      const { data: authz } = await admin.rpc("evaluate_comm_hub_send_authorization", {
        p_payload: {
          module_code: moduleCode,
          event_code: eventCode,
          channel: channels[0] ?? "email",
          environment_scope: "production",
          recipients: recipientEmails,
          entity_id: (payload as any)?.reference?.entityId ?? (payload as any)?.entityId ?? null,
        },
      });
      const authorized = !!(authz as any)?.authorized;
      // Audit every live-send authorization attempt.
      await admin.from("communication_hub_control_audit").insert({
        setting_key: `send_policy_runtime:${moduleCode}:${eventCode}`,
        old_value: null,
        new_value: {
          module_code: moduleCode, event_code: eventCode,
          recipient_count: recipientEmails.length,
          authorized,
          mode: (authz as any)?.mode ?? null,
          required_action: (authz as any)?.required_action ?? null,
          blockers: (authz as any)?.blockers ?? [],
          via: "comm-hub-enqueue",
        },
        reason: "live send authorization",
        changed_by: callerUserId,
        source: "communication-hub-send-policy-runtime",
      });
      if (!authorized) {
        return json({
          ok: false,
          error: "send_policy_denied",
          blockers: (authz as any)?.blockers ?? [],
          required_action: (authz as any)?.required_action ?? null,
          policy: (authz as any)?.policy ?? null,
        }, 403);
      }
    } catch (e) {
      // Fail closed
      return json({ ok: false, error: "send_policy_check_failed", detail: String((e as any)?.message ?? e) }, 500);
    }
  }


  // 5. Invoke RPC via service-role client (bypasses RLS on communication_*).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc("send_communication_v1", { payload: rpcPayload });
  if (error) {
    return json({ ok: false, error: "rpc_failed", message: error.message }, 500);
  }
  return json(data);
});
