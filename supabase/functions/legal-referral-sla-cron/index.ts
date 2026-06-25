// Lovable-managed edge function — runs the Legal Referral SLA processor.
// Can be invoked manually or scheduled via pg_cron / external scheduler.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data, error } = await sb.rpc("legal_referral_process_sla");
    if (error) throw error;
    console.log("[legal-referral-sla-cron] result", data, `(${Date.now() - started}ms)`);
    return new Response(JSON.stringify({ ok: true, result: data, duration_ms: Date.now() - started }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[legal-referral-sla-cron] error", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
