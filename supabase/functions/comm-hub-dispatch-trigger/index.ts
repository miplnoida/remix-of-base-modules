// TEMPORARY bootstrap trigger for the first controlled live email test
// (Phase 1C-B3 dry-run cutover). Reads COMMUNICATION_HUB_DISPATCH_SECRET
// from its own env and forwards a single dispatch call to
// comm-hub-dispatch with the correct secret header. Never returns or
// logs the secret value.
//
// Requires header:  x-trigger-token: <service role key value>
// Body (optional):  {"batchSize": 1}
//
// This function should be DELETED after the controlled live test.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-trigger-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "content-type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const apikey = req.headers.get("apikey") ?? "";
  const trig = req.headers.get("x-trigger-token") ?? "";

  function claimRole(jwt: string): string | null {
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
      const payload = JSON.parse(atob(pad));
      return typeof payload.role === "string" ? payload.role : null;
    } catch {
      return null;
    }
  }

  const authRole = auth ? claimRole(auth) : null;
  const apikeyRole = apikey ? claimRole(apikey) : null;
  const ok = !!svc && (
    trig === svc || auth === svc || apikey === svc ||
    authRole === "service_role" || apikeyRole === "service_role"
  );
  if (!ok) {
    return json({
      ok: false,
      error: "unauthorized",
      debug: { authRole, apikeyRole, hasAuth: !!auth, hasApikey: !!apikey },
    }, 401);
  }



  const secret = Deno.env.get("COMMUNICATION_HUB_DISPATCH_SECRET") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (!secret || !url) return json({ ok: false, error: "config_missing" }, 503);

  let body: any = { batchSize: 1 };
  try {
    const b = await req.json();
    if (b && typeof b === "object") body = { batchSize: b.batchSize ?? 1 };
  } catch { /* ignore */ }

  const resp = await fetch(`${url}/functions/v1/comm-hub-dispatch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-comm-hub-dispatch-secret": secret,
      "authorization": `Bearer ${svc}`,
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { ...cors, "content-type": "application/json" },
  });
});
