import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mapUdtName(udt: string): string {
  const map: Record<string, string> = {
    uuid: "UUID", text: "TEXT", varchar: "VARCHAR",
    int4: "INTEGER", int8: "BIGINT", int2: "SMALLINT",
    float4: "REAL", float8: "DOUBLE PRECISION",
    bool: "BOOLEAN", timestamptz: "TIMESTAMPTZ",
    timestamp: "TIMESTAMP", date: "DATE", time: "TIME", timetz: "TIMETZ",
    jsonb: "JSONB", json: "JSON", bytea: "BYTEA",
    serial4: "SERIAL", serial8: "BIGSERIAL",
  };
  return map[udt] || udt.toUpperCase();
}

function buildColumnType(col: any): string {
  const { data_type, udt_name, character_maximum_length, numeric_precision, numeric_scale } = col;

  if (data_type === "ARRAY" && udt_name.startsWith("_")) {
    const el = udt_name.substring(1);
    return `${mapUdtName(el)}[]`;
  }

  if (data_type === "USER-DEFINED") {
    return `public."${udt_name}"`;
  }

  if (udt_name === "varchar" && character_maximum_length) {
    return `VARCHAR(${character_maximum_length})`;
  }

  if (udt_name === "numeric" && numeric_precision) {
    return numeric_scale
      ? `NUMERIC(${numeric_precision},${numeric_scale})`
      : `NUMERIC(${numeric_precision})`;
  }

  return mapUdtName(udt_name);
}

function buildCreateTableDDL(schemaInfo: any): string {
  const tableName = schemaInfo.table_name;
  const columns = schemaInfo.columns || [];
  const pkCols: string[] = schemaInfo.primary_key_columns || [];

  const colDefs = columns.map((col: any) => {
    let def = `"${col.column_name}" ${buildColumnType(col)}`;
    if (col.column_default) def += ` DEFAULT ${col.column_default}`;
    if (col.is_nullable === "NO") def += " NOT NULL";
    return def;
  });

  if (pkCols.length > 0) {
    colDefs.push(`PRIMARY KEY (${pkCols.map((k: string) => `"${k}"`).join(", ")})`);
  }

  return `CREATE TABLE public."${tableName}" (\n  ${colDefs.join(",\n  ")}\n)`;
}

async function fetchAllRows(
  client: ReturnType<typeof createClient>,
  tableName: string
): Promise<Record<string, unknown>[]> {
  const allRows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await client
      .from(tableName)
      .select("*")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      offset += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }
  return allRows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tableName, sourceEnv, includeData } = body;

    if (!tableName || !sourceEnv) {
      return new Response(
        JSON.stringify({ error: "tableName and sourceEnv are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["test", "live"].includes(sourceEnv)) {
      return new Response(
        JSON.stringify({ error: "sourceEnv must be 'test' or 'live'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testUrl = Deno.env.get("SUPABASE_URL")!;
    const testServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const liveUrl = Deno.env.get("LIVE_SUPABASE_URL");
    const liveKey = Deno.env.get("LIVE_SUPABASE_ANON_KEY");

    if (!liveUrl || !liveKey) {
      return new Response(
        JSON.stringify({ error: "Live database credentials not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testClient = createClient(testUrl, testServiceKey);
    const liveClient = createClient(liveUrl, liveKey);

    // Source = where table exists, Target = where table is missing
    const sourceClient = sourceEnv === "test" ? testClient : liveClient;
    const targetClient = sourceEnv === "test" ? liveClient : testClient;
    const targetLabel = sourceEnv === "test" ? "Live" : "Test";

    // Step 1: Get table schema from source
    const { data: schemaData, error: schemaError } = await sourceClient.rpc(
      "get_table_ddl_info" as any,
      { p_table_name: tableName }
    );

    if (schemaError) {
      return new Response(
        JSON.stringify({
          error: `Failed to read schema from ${sourceEnv}: ${schemaError.message}. Make sure the helper functions are deployed (publish required for live).`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!schemaData || schemaData.error) {
      return new Response(
        JSON.stringify({ error: schemaData?.error || "Table not found on source" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const columns = schemaData.columns;
    if (!columns || columns.length === 0) {
      return new Response(
        JSON.stringify({ error: "No columns found for table" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Create enum types if needed
    const enums = schemaData.enums || [];
    const enumResults: { name: string; result: any }[] = [];

    for (const enumDef of enums) {
      if (!enumDef?.enum_name || !enumDef?.enum_values) continue;

      const { data: enumResult, error: enumError } = await targetClient.rpc(
        "admin_create_enum_if_not_exists" as any,
        { p_enum_name: enumDef.enum_name, p_values: enumDef.enum_values }
      );

      if (enumError) {
        enumResults.push({ name: enumDef.enum_name, result: { success: false, error: enumError.message } });
      } else {
        enumResults.push({ name: enumDef.enum_name, result: enumResult });
      }
    }

    // Check if any enum creation failed fatally
    const enumFailures = enumResults.filter((r) => r.result && !r.result.success);
    if (enumFailures.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Failed to create enum types on ${targetLabel}: ${enumFailures.map((f) => `${f.name}: ${f.result.error}`).join("; ")}`,
          enumResults,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Build and execute CREATE TABLE DDL
    const ddl = buildCreateTableDDL(schemaData);

    const { data: ddlResult, error: ddlError } = await targetClient.rpc(
      "admin_execute_ddl" as any,
      { p_sql: ddl }
    );

    if (ddlError) {
      return new Response(
        JSON.stringify({
          error: `Failed to create table on ${targetLabel}: ${ddlError.message}. Make sure the helper functions are deployed (publish required for live).`,
          ddl,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ddlResult?.success) {
      return new Response(
        JSON.stringify({
          error: `DDL execution failed on ${targetLabel}: ${ddlResult?.error || "Unknown error"}`,
          ddl,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Copy data if requested
    let dataResult = null;
    if (includeData) {
      try {
        const allData = await fetchAllRows(sourceClient, tableName);

        if (allData.length > 0) {
          // Batch insert via RPC in chunks of 100
          const batchSize = 100;
          let totalInserted = 0;
          let totalFailed = 0;
          const allErrors: string[] = [];

          for (let i = 0; i < allData.length; i += batchSize) {
            const batch = allData.slice(i, i + batchSize);
            const { data: insertResult, error: insertError } = await targetClient.rpc(
              "admin_bulk_insert_jsonb" as any,
              { p_table_name: tableName, p_records: batch }
            );

            if (insertError) {
              totalFailed += batch.length;
              if (allErrors.length < 5) allErrors.push(insertError.message);
            } else if (insertResult) {
              totalInserted += insertResult.inserted || 0;
              totalFailed += insertResult.failed || 0;
              if (insertResult.errors) {
                for (const e of insertResult.errors) {
                  if (e && allErrors.length < 5) allErrors.push(e);
                }
              }
            }
          }

          dataResult = {
            totalRecords: allData.length,
            inserted: totalInserted,
            failed: totalFailed,
            errors: allErrors.filter(Boolean),
          };
        } else {
          dataResult = { totalRecords: 0, inserted: 0, failed: 0, errors: [] };
        }
      } catch (dataErr: any) {
        dataResult = { totalRecords: 0, inserted: 0, failed: 0, errors: [dataErr.message] };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tableName,
        targetEnvironment: targetLabel,
        schemaCreated: true,
        ddl,
        enumResults,
        dataResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("create-missing-table error:", error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
