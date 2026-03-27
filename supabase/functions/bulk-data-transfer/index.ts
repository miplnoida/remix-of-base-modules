import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const liveUrl = Deno.env.get("LIVE_SUPABASE_URL");
    const liveKey = Deno.env.get("LIVE_SUPABASE_ANON_KEY");
    const testUrl = Deno.env.get("SUPABASE_URL")!;
    const testServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!liveUrl || !liveKey) {
      return new Response(
        JSON.stringify({ error: "Live database credentials not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const tableName: string = body.tableName;
    const offset: number = body.offset || 0;
    const limit: number = body.limit || 500;
    const conflictColumn: string = body.conflictColumn || "id";

    if (!tableName) {
      return new Response(
        JSON.stringify({ error: "tableName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read allowed tables from migration_analysis_tables
    const serviceClient = createClient(testUrl, testServiceKey);
    let allowedTables: string[] = [];

    try {
      const { data: configRows, error: configErr } = await serviceClient
        .from("migration_analysis_tables")
        .select("table_name");

      if (!configErr && configRows && configRows.length > 0) {
        allowedTables = configRows.map((r: any) => r.table_name);
      }
    } catch (_) {
      // fallback
    }

    // Fallback to hardcoded list if DB table is empty/missing
    if (allowedTables.length === 0) {
      allowedTables = ["er_master", "ip_master", "cn_payer", "tb_bank_code", "tb_currencies", "ip_depend", "ip_self_employ", "tb_levy_slabs", "tb_levy_slab_details"];
    }

    if (!allowedTables.includes(tableName)) {
      return new Response(
        JSON.stringify({ error: `Table '${tableName}' not allowed.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testClient = createClient(testUrl, testServiceKey);
    const liveClient = createClient(liveUrl, liveKey);

    // Fetch batch from test
    const { data: records, error: fetchError } = await testClient
      .from(tableName)
      .select("*")
      .range(offset, offset + limit - 1);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Fetch error: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No more records", inserted: 0, offset }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into live
    const { error: upsertError } = await liveClient
      .from(tableName)
      .upsert(records as any[], { onConflict: conflictColumn, ignoreDuplicates: false });

    if (upsertError) {
      // Fallback: individual upserts
      let ok = 0, fail = 0;
      const errs: string[] = [];
      for (const record of records) {
        const { error: e } = await liveClient
          .from(tableName)
          .upsert(record as any, { onConflict: conflictColumn, ignoreDuplicates: false });
        if (e) { fail++; if (errs.length < 5) errs.push(e.message); } else { ok++; }
      }
      return new Response(
        JSON.stringify({ success: true, offset, fetched: records.length, inserted: ok, failed: fail, errors: errs, nextOffset: offset + limit }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, offset, fetched: records.length, inserted: records.length, failed: 0, nextOffset: offset + limit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
