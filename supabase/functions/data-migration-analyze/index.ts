import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecordDiff {
  id: string;
  type: "missing_in_live" | "missing_in_test" | "mismatch";
  testRecord?: Record<string, unknown>;
  liveRecord?: Record<string, unknown>;
  changedFields?: { field: string; testValue: unknown; liveValue: unknown }[];
}

interface TableAnalysis {
  tableName: string;
  testCount: number;
  liveCount: number;
  missingInLive: number;
  missingInTest: number;
  mismatches: number;
  diffs: RecordDiff[];
  error?: string;
}

// Fallback tables if migration_analysis_tables is empty
const DEFAULT_TABLES = [
  "app_modules", "roles", "role_permissions", "departments", "designations",
  "office_management", "workflow_definitions", "workflow_steps", "notification_templates",
  "tb_payment_type", "tb_country", "tb_parish", "tb_village", "tb_occupation",
  "tb_industrial_classification", "tb_relation", "tb_sector", "tb_benefit_type",
  "tb_income_code", "tb_income_category", "c3_config_details", "c3_calculation_config",
  "c3_bonus_policy_default", "c3_levy_slabs", "sep_contribution_rates",
  "payment_module_config", "password_policy", "mfa_settings", "api_settings",
  "api_registry", "api_rate_limit_policies", "data_scope_rules", "field_security_rules",
  "document_purposes", "fee_configurations", "security_policy_config", "ip_access_rules",
  "app_lockdown_state", "tb_levy_slab_details",
];

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return String(a) === String(b);
  
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  
  for (const key of keys) {
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

const IGNORE_FIELDS = new Set([
  "created_at", "updated_at", "modified_on", "created_on",
  "last_published_at", "last_synced_at"
]);

function getRecordDiffs(
  testRecord: Record<string, unknown>,
  liveRecord: Record<string, unknown>
): { field: string; testValue: unknown; liveValue: unknown }[] {
  const diffs: { field: string; testValue: unknown; liveValue: unknown }[] = [];
  const allKeys = new Set([...Object.keys(testRecord), ...Object.keys(liveRecord)]);
  
  for (const key of allKeys) {
    if (IGNORE_FIELDS.has(key)) continue;
    if (!deepEqual(testRecord[key], liveRecord[key])) {
      diffs.push({
        field: key,
        testValue: testRecord[key],
        liveValue: liveRecord[key],
      });
    }
  }
  return diffs;
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
    const testUrl = Deno.env.get("SUPABASE_URL")!;
    const testKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const testServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const liveUrl = Deno.env.get("LIVE_SUPABASE_URL");
    const liveKey = Deno.env.get("LIVE_SUPABASE_ANON_KEY");

    if (!liveUrl || !liveKey) {
      return new Response(
        JSON.stringify({ error: "Live database credentials not configured. Please add LIVE_SUPABASE_URL and LIVE_SUPABASE_ANON_KEY secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Fetch table list from migration_analysis_tables
    const serviceClient = createClient(testUrl, testServiceKey);
    let tables: { name: string; pkField: string }[] = [];

    try {
      const { data: configRows, error: configErr } = await serviceClient
        .from("migration_analysis_tables")
        .select("table_name, primary_key_field")
        .order("table_name");

      if (!configErr && configRows && configRows.length > 0) {
        tables = configRows.map((r: any) => ({ name: r.table_name, pkField: r.primary_key_field || "id" }));
      }
    } catch (_) {
      // table might not exist yet
    }

    // Fallback
    if (tables.length === 0) {
      tables = DEFAULT_TABLES.map(t => ({ name: t, pkField: "id" }));
    }

    // Allow override from request body
    if (body.tables && Array.isArray(body.tables) && body.tables.length > 0) {
      const pkField = body.primaryKeyField || "id";
      tables = body.tables.map((t: string) => ({ name: t, pkField }));
    }

    const testClient = createClient(testUrl, testKey);
    const liveClient = createClient(liveUrl, liveKey);

    const results: TableAnalysis[] = [];

    for (const tableConfig of tables) {
      const tableName = tableConfig.name;
      try {
        let testData: Record<string, unknown>[];
        let liveData: Record<string, unknown>[];
        
        try {
          testData = await fetchAllRows(testClient, tableName);
        } catch (e: any) {
          results.push({ tableName, testCount: 0, liveCount: 0, missingInLive: 0, missingInTest: 0, mismatches: 0, diffs: [], error: `Test DB error: ${e.message}` });
          continue;
        }

        try {
          liveData = await fetchAllRows(liveClient, tableName);
        } catch (e: any) {
          results.push({ tableName, testCount: testData.length, liveCount: 0, missingInLive: 0, missingInTest: 0, mismatches: 0, diffs: [], error: `Live DB error: ${e.message}` });
          continue;
        }

        // Use PK from config, with fallback
        let pkField = tableConfig.pkField;
        if (testData.length > 0 && !(pkField in testData[0])) {
          const candidates = ["id", "name", "key", "code", "config_key"];
          pkField = candidates.find(c => c in testData[0]) || Object.keys(testData[0])[0];
        }

        const testMap = new Map<string, Record<string, unknown>>();
        const liveMap = new Map<string, Record<string, unknown>>();

        for (const row of testData) {
          const key = String(row[pkField] ?? JSON.stringify(row));
          testMap.set(key, row);
        }
        for (const row of liveData) {
          const key = String(row[pkField] ?? JSON.stringify(row));
          liveMap.set(key, row);
        }

        const diffs: RecordDiff[] = [];

        for (const [key, testRow] of testMap) {
          const liveRow = liveMap.get(key);
          if (!liveRow) {
            diffs.push({ id: key, type: "missing_in_live", testRecord: testRow });
          } else {
            const changedFields = getRecordDiffs(testRow, liveRow);
            if (changedFields.length > 0) {
              diffs.push({ id: key, type: "mismatch", testRecord: testRow, liveRecord: liveRow, changedFields });
            }
          }
        }

        for (const [key, liveRow] of liveMap) {
          if (!testMap.has(key)) {
            diffs.push({ id: key, type: "missing_in_test", liveRecord: liveRow });
          }
        }

        results.push({
          tableName,
          testCount: testData.length,
          liveCount: liveData.length,
          missingInLive: diffs.filter(d => d.type === "missing_in_live").length,
          missingInTest: diffs.filter(d => d.type === "missing_in_test").length,
          mismatches: diffs.filter(d => d.type === "mismatch").length,
          diffs,
        });
      } catch (e: any) {
        results.push({ tableName, testCount: 0, liveCount: 0, missingInLive: 0, missingInTest: 0, mismatches: 0, diffs: [], error: e.message });
      }
    }

    const totalDiffs = results.reduce((sum, r) => sum + r.diffs.length, 0);
    const tablesWithDiffs = results.filter(r => r.diffs.length > 0).length;
    const tablesWithErrors = results.filter(r => r.error).length;

    return new Response(
      JSON.stringify({
        success: true,
        analyzedAt: new Date().toISOString(),
        summary: { tablesAnalyzed: results.length, tablesWithDiffs, tablesWithErrors, totalDiffs },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
