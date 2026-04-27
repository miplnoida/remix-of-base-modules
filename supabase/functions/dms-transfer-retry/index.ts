// Drains the dms_transfer_queue.
//
// Queue rows reference MASTER document ids (ip_documents.id / er_documents.id),
// but the existing dms-transfer-single edge function operates on STAGING
// rows (ip_application_documents). To avoid duplicating 800+ lines of
// download/upload logic, this worker:
//   1. Loads the master row from ip_documents / er_documents
//   2. Resolves the originating staging row via master.source_document_id
//   3. For IP: invokes dms-transfer-single (proven path)
//   4. For ER: marks the row failed with a clear "not yet supported" error
//      (an explicit ER worker can be added later, or dms-transfer-single
//      generalised, without changing this contract)
//   5. Mirrors the result back onto the master row's transfer_status fields
//
// Triggered by pg_cron every few minutes. Can also be invoked manually from
// the admin "API Configuration → dms_service" screen.

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
  document_id: string; // master row id
  ssn: string | null;
  regno: string | null;
  attempts: number;
  max_attempts: number;
}

interface MasterRow {
  id: string;
  source_document_id: string | null;
  file_path: string | null;
  transfer_status: string | null;
  dms_document_id: string | null;
}

async function markMaster(
  supabase: ReturnType<typeof createClient>,
  scope: "ip" | "er",
  masterId: string,
  patch: Record<string, unknown>
) {
  const table = scope === "ip" ? "ip_documents" : "er_documents";
  await supabase.from(table).update(patch).eq("id", masterId);
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
      // ── ER scope: not yet wired into dms-transfer-single ─────────────────
      if (row.scope !== "ip") {
        const errMsg =
          "ER scope drain not yet supported by dms-transfer-single. " +
          "Document is mirrored to er_documents (master) and queued; an ER worker " +
          "will be added to perform the upload.";
        await markMaster(supabase, row.scope, row.document_id, {
          transfer_status: "Pending",
          transfer_error: errMsg,
        });
        await supabase.rpc("dms_queue_mark_result", {
          p_queue_id: row.id,
          p_success: false,
          p_error: errMsg,
        });
        results.push({
          queueId: row.id,
          documentId: row.document_id,
          scope: row.scope,
          success: false,
          error: "scope not supported",
        });
        failed++;
        continue;
      }

      // ── IP scope: resolve master → staging, then invoke dms-transfer-single ──
      const { data: master, error: masterErr } = await supabase
        .from("ip_documents")
        .select("id, source_document_id, file_path, transfer_status, dms_document_id")
        .eq("id", row.document_id)
        .maybeSingle<MasterRow>();

      if (masterErr || !master) {
        const errMsg = `Master ip_documents row ${row.document_id} not found: ${masterErr?.message ?? "no record"}`;
        await supabase.rpc("dms_queue_mark_result", {
          p_queue_id: row.id,
          p_success: false,
          p_error: errMsg,
        });
        results.push({
          queueId: row.id,
          documentId: row.document_id,
          scope: row.scope,
          success: false,
          error: errMsg,
        });
        failed++;
        continue;
      }

      // Idempotency: master already transferred
      if (master.transfer_status === "Transferred" && master.dms_document_id) {
        await supabase.rpc("dms_queue_mark_result", {
          p_queue_id: row.id,
          p_success: true,
          p_error: null,
        });
        results.push({
          queueId: row.id,
          documentId: row.document_id,
          scope: row.scope,
          success: true,
        });
        succeeded++;
        continue;
      }

      // Find the staging row that fed this master row.
      // Prefer source_document_id (set by convert_application_atomic);
      // fall back to file_path within the same SSN.
      let stagingId: string | null = null;
      if (master.source_document_id) {
        const { data: byId } = await supabase
          .from("ip_application_documents")
          .select("id")
          .eq("id", master.source_document_id)
          .maybeSingle<{ id: string }>();
        stagingId = byId?.id ?? null;
      }
      if (!stagingId && row.ssn && master.file_path) {
        const { data: byPath } = await supabase
          .from("ip_application_documents")
          .select("id")
          .eq("ssn", row.ssn)
          .eq("file_path", master.file_path)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string }>();
        stagingId = byPath?.id ?? null;
      }

      if (!stagingId || !row.ssn) {
        const errMsg = `Cannot resolve staging document for master ${master.id} (ssn=${row.ssn ?? "null"})`;
        await markMaster(supabase, "ip", master.id, {
          transfer_status: "Failed",
          transfer_error: errMsg,
        });
        await supabase.rpc("dms_queue_mark_result", {
          p_queue_id: row.id,
          p_success: false,
          p_error: errMsg,
        });
        results.push({
          queueId: row.id,
          documentId: row.document_id,
          scope: row.scope,
          success: false,
          error: errMsg,
        });
        failed++;
        continue;
      }

      const { data: invokeResult, error: invokeError } =
        await supabase.functions.invoke("dms-transfer-single", {
          body: {
            documentId: stagingId,
            ssn: row.ssn,
            userCode: "SYSTEM",
          },
        });

      const ok =
        !invokeError &&
        ((invokeResult as { success?: boolean })?.success !== false);

      const errMsg = invokeError
        ? invokeError.message
        : (invokeResult as { error?: string })?.error ?? null;
      const dmsDocId =
        (invokeResult as { dmsDocumentId?: string })?.dmsDocumentId ?? null;

      // Mirror result onto master row
      if (ok) {
        await markMaster(supabase, "ip", master.id, {
          transfer_status: "Transferred",
          transfer_error: null,
          dms_document_id: dmsDocId,
          dms_uploaded_at: new Date().toISOString(),
        });
      } else {
        await markMaster(supabase, "ip", master.id, {
          transfer_status: "Failed",
          transfer_error: errMsg,
        });
      }

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
