// CH-SIMPLE-P3D-B.1 — Canonical dry-run orchestrator (thin edge function).
//
// Authenticates the caller, forwards to `public.execute_comm_hub_dry_run(jsonb)`,
// and returns the stable envelope. All decision, snapshot match, decision
// evaluation, request/message/attempt/certification writes, permanent
// dry-run classification, idempotency scoping, and supersession are handled
// server-side in the RPC — this function does NOT reproduce any of those
// rules.
//
// Notes:
//   - This is the only supported dry-run execution path.
//   - Provider transport is never selected here; the RPC creates a dry-run
//     message with `send_context='dry_run'` and `dry_run_locked=true`.
//   - A successful response says: "Dry test passed — no real email was sent."
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j(405, { status: "BLOCKED", passed: false, error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return j(401, { status: "BLOCKED", passed: false,
      blockers: [{ code: "not_authenticated", stage: "auth", severity: "critical" }] });
  }

  // Verify caller identity with anon key + user JWT.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return j(401, { status: "BLOCKED", passed: false,
      blockers: [{ code: "not_authenticated", stage: "auth", severity: "critical" }] });
  }
  const uid = userData.user.id;

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return j(400, { status: "BLOCKED", passed: false,
      blockers: [{ code: "invalid_json", stage: "input", severity: "critical" }] });
  }

  // The RPC handles all validation. We only inject requested_by from the
  // verified JWT so the frontend cannot forge the operator identity.
  const rpcPayload = { ...payload, requested_by: uid };

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("execute_comm_hub_dry_run", { p_payload: rpcPayload });
  if (error) {
    return j(500, { status: "DRY_RUN_FAILED", passed: false,
      blockers: [{ code: "orchestrator_error", stage: "orchestrator", severity: "critical", message: error.message }] });
  }
  return j(200, data);
});
