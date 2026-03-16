import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncItem {
  tableName: string;
  recordId: string;
  type: "missing_in_live" | "mismatch";
  testRecord: Record<string, unknown>;
}

interface SyncResult {
  tableName: string;
  recordId: string;
  success: boolean;
  action: "insert" | "update";
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const liveUrl = Deno.env.get("LIVE_SUPABASE_URL");
    const liveKey = Deno.env.get("LIVE_SUPABASE_ANON_KEY");
    const testUrl = Deno.env.get("SUPABASE_URL")!;
    const testKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!liveUrl || !liveKey) {
      return new Response(
        JSON.stringify({ error: "Live database credentials not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const items: SyncItem[] = body.items;
    const userId: string = body.userId || "unknown";
    const userCode: string = body.userCode || "SYS";

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided for sync." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const liveClient = createClient(liveUrl, liveKey);
    const testClient = createClient(testUrl, testKey);

    const results: SyncResult[] = [];
    const syncedTables = new Set<string>();

    // Group items by table for batch operations
    const byTable = new Map<string, SyncItem[]>();
    for (const item of items) {
      const list = byTable.get(item.tableName) || [];
      list.push(item);
      byTable.set(item.tableName, list);
    }

    for (const [tableName, tableItems] of byTable) {
      syncedTables.add(tableName);

      // Batch upsert per table
      const records = tableItems.map(item => item.testRecord);
      
      try {
        const { error } = await liveClient
          .from(tableName)
          .upsert(records as any[], { onConflict: "id", ignoreDuplicates: false });

        if (error) {
          // Fall back to individual upserts
          for (const item of tableItems) {
            try {
              const { error: itemError } = await liveClient
                .from(tableName)
                .upsert(item.testRecord as any, { onConflict: "id", ignoreDuplicates: false });

              results.push({
                tableName,
                recordId: item.recordId,
                success: !itemError,
                action: item.type === "missing_in_live" ? "insert" : "update",
                error: itemError?.message,
              });
            } catch (e: any) {
              results.push({
                tableName,
                recordId: item.recordId,
                success: false,
                action: item.type === "missing_in_live" ? "insert" : "update",
                error: e.message,
              });
            }
          }
        } else {
          // Batch succeeded
          for (const item of tableItems) {
            results.push({
              tableName,
              recordId: item.recordId,
              success: true,
              action: item.type === "missing_in_live" ? "insert" : "update",
            });
          }
        }
      } catch (e: any) {
        for (const item of tableItems) {
          results.push({
            tableName,
            recordId: item.recordId,
            success: false,
            action: item.type === "missing_in_live" ? "insert" : "update",
            error: e.message,
          });
        }
      }
    }

    // Log audit trail in test DB
    try {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      await testClient.from("system_audit_trail").insert({
        user_id: userId,
        user_name: userCode,
        action: "env_sync_push",
        entity_type: "data_migration",
        entity_id: `sync-${Date.now()}`,
        module: "admin",
        description: `Environment sync: ${successCount} records synced to live, ${failCount} failed. Tables: ${[...syncedTables].join(", ")}`,
        payload_json: {
          totalItems: items.length,
          successCount,
          failCount,
          tables: [...syncedTables],
        },
        severity: failCount > 0 ? "warning" : "info",
      });
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        syncedAt: new Date().toISOString(),
        summary: {
          totalItems: items.length,
          successCount,
          failCount,
          tablesAffected: [...syncedTables],
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
