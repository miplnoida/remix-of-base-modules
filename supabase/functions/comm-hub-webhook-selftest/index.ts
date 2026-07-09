// TEMPORARY self-test for comm-hub-resend-webhook (B8-E.1 recheck). Deleted after run.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const SIGNING_SECRET = Deno.env.get("COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

function b64ToBytes(b64: string): Uint8Array { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
function bytesToB64(b: Uint8Array): string { let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }

async function sign(secret: string, id: string, ts: string, body: string): Promise<string> {
  const s = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey("raw", b64ToBytes(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return `v1,${bytesToB64(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (!SIGNING_SECRET) return new Response(JSON.stringify({ error: "no_secret" }), { status: 503 });
  const { event_type, provider_message_id, svix_id: svixIdIn } = await req.json().catch(() => ({}));
  const et = event_type ?? "email.delivered";
  const pmid = provider_message_id ?? "resend-test-webhook-b8e1-recheck-001";
  const svixId = svixIdIn ?? `msg_${crypto.randomUUID()}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const nowIso = new Date().toISOString();
  const payload = { type: et, created_at: nowIso, data: { email_id: pmid, to: ["rohit@mishainfotech.com"], from: "noreply@secureserve.biz", subject: "selftest", created_at: nowIso, ...(et === "email.bounced" ? { bounce: { type: "hard", message: "selftest" } } : {}) } };
  const body = JSON.stringify(payload);
  const sig = await sign(SIGNING_SECRET, svixId, ts, body);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/comm-hub-resend-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "svix-id": svixId, "svix-timestamp": ts, "svix-signature": sig }, body });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text, svix_id: svixId, provider_message_id: pmid, event_type: et }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
});
