// Drains the dms_transfer_queue by invoking dms-transfer-single per pending row.
// Designed to be triggered by pg_cron every few minutes; can also be invoked manually
// from the admin "API Configuration → dms_service" screen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface QueueRow {
  id: string;
  scope: "ip" | "er";
  document_id: string;
  ssn: string | null;
  regno: string | null;
  attempts: number;
  max_attempts: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let body: { batchSize?: number } = {};
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json();
    }
  } catch {
    /* ignore */
  }
  const batchSize = Math.max(1, Math.min(50, Number(body.batchSize ?? 10)));

  // Claim a batch of pending rows
  const { data: claimed, error: claimErr } = await supabase.rpc(
    "dms_queue_claim_batch",
    { p_limit: batchSize }
  );

  if (claimErr) {
    console.error("[dms-transfer-retry] claim error:", claimErr);
    return new Response(
      JSON.stringify({ success: false, error: claimErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rows: QueueRow[] = (claimed as QueueRow[]) ?? [];
  if (rows.length === 0) {
    return new Response(
      JSON.stringify({ success: true, processed: 0, message: "Queue empty" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[dms-transfer-retry] claimed ${rows.length} row(s)`);

  let succeeded = 0;
  let failed = 0;
  const results: Array<{
    queueId: string;
    documentId: string;
    scope: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const row of rows) {
    try {
      const { data: invokeResult, error: invokeError } =
        await supabase.functions.invoke("dms-transfer-single", {
          body: {
            scope: row.scope,
            documentId: row.document_id,
            ssn: row.ssn,
            regno: row.regno,
            triggeredBy: "dms-transfer-retry",
          },
        });

      const ok =
        !invokeError &&
        ((invokeResult as { success?: boolean })?.success !== false);

      const errMsg = invokeError
        ? invokeError.message
        : (invokeResult as { error?: string })?.error ?? null;

      await supabase.rpc("dms_queue_mark_result", {
        p_queue_id: row.id,
        p_success: ok,
        p_error: ok ? null : errMsg,
      });

      results.push({
        queueId: row.id,
        documentId: row.document_id,
        scope: row.scope,
        success: ok,
        error: ok ? undefined : errMsg ?? undefined,
      });

      if (ok) succeeded++;
      else failed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[dms-transfer-retry] row ${row.id} error:`, msg);
      await supabase.rpc("dms_queue_mark_result", {
        p_queue_id: row.id,
        p_success: false,
        p_error: msg,
      });
      results.push({
        queueId: row.id,
        documentId: row.document_id,
        scope: row.scope,
        success: false,
        error: msg,
      });
      failed++;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: rows.length,
      succeeded,
      failed,
      results,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
