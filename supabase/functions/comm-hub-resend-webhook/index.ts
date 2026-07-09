// Phase 1C-B8-E — Resend webhook receiver for Communication Hub.
//
// Receives Resend delivery lifecycle events (Svix-signed) and updates the
// matching communication_message + writes an event_log row. Idempotent via
// communication_hub_delivery_event.provider_event_id.
//
// Safety:
//  - NEVER sends email.
//  - NEVER reads or logs the webhook secret.
//  - Rejects unsigned/invalid requests. Returns 503 if secret not configured.
//  - Sanitizes payload before storing (no raw headers, no full body).
//
// Endpoint: POST /functions/v1/comm-hub-resend-webhook
// Configure in Resend dashboard → Webhooks; use env
// COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET (whsec_...).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNING_SECRET = Deno.env.get("COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function maskEmail(e: string | null | undefined): string | null {
  if (!e) return null;
  const [l, d] = e.split("@");
  if (!d) return "***";
  const head = l.slice(0, Math.min(2, l.length));
  return `${head}${"*".repeat(Math.max(1, l.length - head.length))}@${d}`;
}

// Constant-time compare
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// Svix signature: HMAC-SHA256(secretBytes, `${id}.${ts}.${body}`) base64.
// Header value: space-separated list of "v1,<sig>" entries.
async function verifySvix(
  secret: string,
  svixId: string,
  svixTs: string,
  svixSig: string,
  rawBody: string,
): Promise<boolean> {
  if (!secret || !svixId || !svixTs || !svixSig) return false;
  const secretB64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let keyBytes: Uint8Array;
  try { keyBytes = b64ToBytes(secretB64); } catch { return false; }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const toSign = `${svixId}.${svixTs}.${rawBody}`;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(toSign)));
  const expected = bytesToB64(sig);
  // Reject if timestamp too old (5 min tolerance)
  const tsNum = Number(svixTs);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;
  for (const part of svixSig.split(" ")) {
    const [ver, val] = part.split(",");
    if (ver === "v1" && val && timingSafeEqual(val, expected)) return true;
  }
  return false;
}

// Map Resend event → (event_log event_type in constrained set, delivery_status, stage tag)
const EVENT_MAP: Record<string, { logType: string; deliveryStatus: string | null; stage: string }> = {
  "email.sent":              { logType: "sent",       deliveryStatus: "sent",      stage: "PROVIDER_SENT" },
  "email.delivered":         { logType: "delivered",  deliveryStatus: "delivered", stage: "DELIVERED" },
  "email.delivery_delayed":  { logType: "retried",    deliveryStatus: "delayed",   stage: "DELIVERY_DELAYED" },
  "email.bounced":           { logType: "bounced",    deliveryStatus: "bounced",   stage: "BOUNCED" },
  "email.complained":        { logType: "complained", deliveryStatus: "complained",stage: "COMPLAINED" },
  "email.opened":            { logType: "opened",     deliveryStatus: null,        stage: "OPENED" },
  "email.clicked":           { logType: "clicked",    deliveryStatus: null,        stage: "CLICKED" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!SIGNING_SECRET) {
    return json({
      error: "webhook_secret_missing",
      message: "COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET not configured; webhook disabled.",
    }, 503);
  }

  const svixId = req.headers.get("svix-id") ?? "";
  const svixTs = req.headers.get("svix-timestamp") ?? "";
  const svixSig = req.headers.get("svix-signature") ?? "";
  const rawBody = await req.text();

  const ok = await verifySvix(SIGNING_SECRET, svixId, svixTs, svixSig, rawBody);
  if (!ok) return json({ error: "invalid_signature" }, 401);

  let evt: any;
  try { evt = JSON.parse(rawBody); } catch { return json({ error: "invalid_json" }, 400); }

  const eventType: string = evt?.type ?? "";
  const mapping = EVENT_MAP[eventType];
  if (!mapping) {
    // Accept but ignore unknown event types (Resend may add new ones).
    return json({ accepted: true, ignored: true, reason: "unknown_event_type" });
  }

  const providerEventId: string = svixId || evt?.data?.email_id || `${eventType}-${svixTs}`;
  const providerMessageId: string | null = evt?.data?.email_id ?? null;
  const occurredAtIso: string = evt?.created_at ?? new Date().toISOString();
  const recipients: string[] = Array.isArray(evt?.data?.to) ? evt.data.to
    : (typeof evt?.data?.to === "string" ? [evt.data.to] : []);
  const recipientMasked = recipients.length > 0 ? maskEmail(recipients[0]) : null;

  const payloadSummary = {
    provider_message_id: providerMessageId,
    event_type: eventType,
    occurred_at: occurredAtIso,
    recipient_masked: recipientMasked,
    subject: typeof evt?.data?.subject === "string" ? evt.data.subject.slice(0, 200) : null,
    from_masked: typeof evt?.data?.from === "string" ? maskEmail(evt.data.from) : null,
    bounce_type: evt?.data?.bounce?.type ?? evt?.data?.bounce_type ?? null,
    bounce_message: typeof evt?.data?.bounce?.message === "string"
      ? evt.data.bounce.message.slice(0, 300) : null,
    click_link: typeof evt?.data?.click?.link === "string" ? evt.data.click.link.slice(0, 300) : null,
  };

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Locate message via provider_message_id (may be null for stray events)
  let messageRow: any = null;
  if (providerMessageId) {
    const { data } = await db
      .from("communication_message")
      .select("id, request_id, status, delivery_status, delivered_at, bounced_at, complained_at")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();
    messageRow = data ?? null;
  }

  // 2. Idempotent insert into delivery_event (unique on provider_event_id)
  const { error: insErr } = await db
    .from("communication_hub_delivery_event")
    .insert({
      provider: "resend",
      provider_event_id: providerEventId,
      provider_message_id: providerMessageId,
      event_type: eventType,
      occurred_at: occurredAtIso,
      message_id: messageRow?.id ?? null,
      payload_summary: payloadSummary,
    });
  const alreadyProcessed = !!insErr && /duplicate|unique/i.test(insErr.message ?? "");
  if (insErr && !alreadyProcessed) {
    console.error("[comm-hub-resend-webhook] delivery_event insert failed", insErr.message);
  }

  if (alreadyProcessed) {
    return json({ accepted: true, deduped: true, event_type: eventType });
  }

  // 3. Update message delivery fields (never downgrade status; sent stays sent)
  if (messageRow) {
    const patch: Record<string, unknown> = {
      delivery_last_event_at: occurredAtIso,
      delivery_last_event_type: eventType,
    };
    if (mapping.deliveryStatus) patch.delivery_status = mapping.deliveryStatus;
    if (eventType === "email.delivered" && !messageRow.delivered_at) patch.delivered_at = occurredAtIso;
    if (eventType === "email.bounced" && !messageRow.bounced_at) {
      patch.bounced_at = occurredAtIso;
      patch.error_code = payloadSummary.bounce_type ?? "bounced";
      patch.error_message = payloadSummary.bounce_message ?? null;
    }
    if (eventType === "email.complained" && !messageRow.complained_at) patch.complained_at = occurredAtIso;

    const { error: updErr } = await db
      .from("communication_message")
      .update(patch)
      .eq("id", messageRow.id);
    if (updErr) console.error("[comm-hub-resend-webhook] message update failed", updErr.message);

    // 4. Event log (constrained event_type set; stage on payload)
    const { error: logErr } = await db
      .from("communication_event_log")
      .insert({
        message_id: messageRow.id,
        request_id: messageRow.request_id,
        event_type: mapping.logType,
        source: "resend-webhook",
        payload: { stage: mapping.stage, ...payloadSummary },
      });
    if (logErr) console.error("[comm-hub-resend-webhook] event_log insert failed", logErr.message);
  }

  return json({
    accepted: true,
    matched_message: !!messageRow,
    event_type: eventType,
    delivery_status: mapping.deliveryStatus,
  });
});
