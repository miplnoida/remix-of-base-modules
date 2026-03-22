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
    const batchSize: number = body.batchSize || 200;

    if (!tableName) {
      return new Response(
        JSON.stringify({ error: "tableName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow specific tables for safety
    const allowedTables = ["er_master", "ip_master", "cn_payer", "tb_bank_code", "tb_currencies"];
    if (!allowedTables.includes(tableName)) {
      return new Response(
        JSON.stringify({ error: `Table '${tableName}' is not allowed for bulk transfer. Allowed: ${allowedTables.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testClient = createClient(testUrl, testServiceKey);
    const liveClient = createClient(liveUrl, liveKey);

    let offset = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    // Get total count
    const { count } = await testClient
      .from(tableName)
      .select("*", { count: "exact", head: true });

    const totalRecords = count || 0;

    while (offset < totalRecords) {
      // Fetch batch from test
      const { data: records, error: fetchError } = await testClient
        .from(tableName)
        .select("*")
        .range(offset, offset + batchSize - 1);

      if (fetchError) {
        errors.push(`Fetch error at offset ${offset}: ${fetchError.message}`);
        break;
      }

      if (!records || records.length === 0) break;

      // Upsert batch into live
      const { error: upsertError } = await liveClient
        .from(tableName)
        .upsert(records as any[], { 
          onConflict: tableName === "er_master" ? "regno" : "id",
          ignoreDuplicates: false 
        });

      if (upsertError) {
        errors.push(`Upsert error at offset ${offset}: ${upsertError.message}`);
        // Try individual inserts for this batch
        for (const record of records) {
          const { error: singleError } = await liveClient
            .from(tableName)
            .upsert(record as any, { 
              onConflict: tableName === "er_master" ? "regno" : "id",
              ignoreDuplicates: false 
            });
          if (singleError) {
            totalErrors++;
            if (errors.length < 20) {
              errors.push(`Record error: ${singleError.message}`);
            }
          } else {
            totalInserted++;
          }
        }
      } else {
        totalInserted += records.length;
      }

      offset += batchSize;
    }

    return new Response(
      JSON.stringify({
        success: true,
        tableName,
        totalRecordsInTest: totalRecords,
        totalInserted,
        totalErrors,
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Transfer error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
