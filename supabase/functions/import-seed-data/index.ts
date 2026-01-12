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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    // Accept both { data: seedData } and { seedData } formats
    const seedData = body.data || body.seedData || body;
    
    if (!seedData || !seedData.data || !seedData.tableOrder) {
      console.error("Invalid format received:", JSON.stringify(Object.keys(body)));
      return new Response(
        JSON.stringify({ error: "Invalid seed data format. Expected { tableOrder: [...], data: {...} }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { success: number; errors: string[] }> = {};
    const tableOrder = seedData.tableOrder;

    for (const tableName of tableOrder) {
      const tableData = seedData.data[tableName];
      
      if (!tableData || tableData.length === 0) {
        results[tableName] = { success: 0, errors: [] };
        continue;
      }

      results[tableName] = { success: 0, errors: [] };

      // Batch upsert with smaller chunks to avoid timeouts
      const batchSize = 100;
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

        if (error) {
          results[tableName].errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          results[tableName].success += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: "Import completed"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
