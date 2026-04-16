import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WIZ_API_URL =
  Deno.env.get("WIZ_API_URL") ||
  "https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api";
const WIZ_ADMIN_API_KEY =
  Deno.env.get("WIZ_ADMIN_API_KEY") || "uiop906754drd35fvg";

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ id: string; key: string; error: string }>;
}

async function callWizApi(
  action: string,
  params: Record<string, unknown>
): Promise<{ status: string; error?: string }> {
  const res = await fetch(WIZ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-api-key": WIZ_ADMIN_API_KEY,
    },
    body: JSON.stringify({ action, params }),
  });
  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, id } = body;

    if (action === "publish_all") {
      const settingsResult = await syncSiteSettings(supabaseAdmin);
      const emailResult = await syncEmailConfig(supabaseAdmin);

      return new Response(
        JSON.stringify({
          status: "success",
          data: { site_settings: settingsResult, email_config: emailResult },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "retry_setting" && id) {
      const result = await retrySiteSetting(supabaseAdmin, id);
      return new Response(
        JSON.stringify({ status: "success", data: result }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "retry_email" && id) {
      const result = await retryEmailConfig(supabaseAdmin, id);
      return new Response(
        JSON.stringify({ status: "success", data: result }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", error: "Invalid action" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  } catch (err) {
    console.error("wiz-settings-sync error:", err);
    return new Response(
      JSON.stringify({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// ─── Sync all unsynced site settings ───
async function syncSiteSettings(
  supabase: ReturnType<typeof createClient>
): Promise<SyncResult> {
  const { data: rows, error } = await supabase
    .from("c3_site_settings")
    .select("*")
    .eq("is_synced", false)
    .eq("is_deleted", false);

  if (error) throw new Error(`Failed to read site settings: ${error.message}`);
  if (!rows || rows.length === 0)
    return { total: 0, synced: 0, failed: 0, errors: [] };

  const result: SyncResult = {
    total: rows.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  // Build settings array for batch API call
  const settingsPayload = rows.map((row) => ({
    setting_key: row.setting_key,
    setting_value: row.setting_value,
    setting_type: row.setting_type,
    description: row.description,
    environment: row.environment,
    is_active: row.is_active,
  }));

  try {
    const apiRes = await callWizApi("sync_site_settings", {
      settings: settingsPayload,
    });

    if (apiRes.status === "success") {
      // Mark all rows as synced
      for (const row of rows) {
        await supabase
          .from("c3_site_settings")
          .update({
            is_synced: true,
            sync_error: null,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        result.synced++;
      }
    } else {
      const errMsg = apiRes.error || "Unknown API error";
      for (const row of rows) {
        await supabase
          .from("c3_site_settings")
          .update({ sync_error: errMsg })
          .eq("id", row.id);
        result.failed++;
        result.errors.push({
          id: row.id,
          key: row.setting_key,
          error: errMsg,
        });
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    for (const row of rows) {
      await supabase
        .from("c3_site_settings")
        .update({ sync_error: errMsg })
        .eq("id", row.id);
      result.failed++;
      result.errors.push({
        id: row.id,
        key: row.setting_key,
        error: errMsg,
      });
    }
  }

  return result;
}

// ─── Sync all unsynced email configs ───
async function syncEmailConfig(
  supabase: ReturnType<typeof createClient>
): Promise<SyncResult> {
  const { data: rows, error } = await supabase
    .from("c3_email_config")
    .select("*")
    .eq("is_synced", false)
    .eq("is_active", true);

  if (error) throw new Error(`Failed to read email config: ${error.message}`);
  if (!rows || rows.length === 0)
    return { total: 0, synced: 0, failed: 0, errors: [] };

  const result: SyncResult = {
    total: rows.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  // Build configs array for batch API call
  const configsPayload = rows.map((row) => ({
    config_key: row.config_key,
    config_value: row.config_value,
    config_group: row.config_group,
    description: row.description,
  }));

  try {
    const apiRes = await callWizApi("sync_email_config", {
      configs: configsPayload,
    });

    if (apiRes.status === "success") {
      for (const row of rows) {
        await supabase
          .from("c3_email_config")
          .update({
            is_synced: true,
            sync_error: null,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        result.synced++;
      }
    } else {
      const errMsg = apiRes.error || "Unknown API error";
      for (const row of rows) {
        await supabase
          .from("c3_email_config")
          .update({ sync_error: errMsg })
          .eq("id", row.id);
        result.failed++;
        result.errors.push({
          id: row.id,
          key: row.config_key,
          error: errMsg,
        });
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    for (const row of rows) {
      await supabase
        .from("c3_email_config")
        .update({ sync_error: errMsg })
        .eq("id", row.id);
      result.failed++;
      result.errors.push({
        id: row.id,
        key: row.config_key,
        error: errMsg,
      });
    }
  }

  return result;
}

// ─── Retry single site setting ───
async function retrySiteSetting(
  supabase: ReturnType<typeof createClient>,
  id: string
) {
  const { data: row, error } = await supabase
    .from("c3_site_settings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row)
    throw new Error(`Setting not found: ${error?.message || id}`);

  const payload = {
    setting_key: row.setting_key,
    setting_value: row.setting_value,
    setting_type: row.setting_type,
    description: row.description,
    environment: row.environment,
    is_active: row.is_active,
  };

  const apiRes = await callWizApi("sync_site_settings", {
    settings: [payload],
  });

  if (apiRes.status === "success") {
    await supabase
      .from("c3_site_settings")
      .update({
        is_synced: true,
        sync_error: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", id);
    return { synced: true };
  } else {
    const errMsg = apiRes.error || "Unknown API error";
    await supabase
      .from("c3_site_settings")
      .update({ sync_error: errMsg })
      .eq("id", id);
    return { synced: false, error: errMsg };
  }
}

// ─── Retry single email config ───
async function retryEmailConfig(
  supabase: ReturnType<typeof createClient>,
  id: string
) {
  const { data: row, error } = await supabase
    .from("c3_email_config")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row)
    throw new Error(`Email config not found: ${error?.message || id}`);

  const payload = {
    config_key: row.config_key,
    config_value: row.config_value,
    config_group: row.config_group,
    description: row.description,
  };

  const apiRes = await callWizApi("sync_email_config", {
    configs: [payload],
  });

  if (apiRes.status === "success") {
    await supabase
      .from("c3_email_config")
      .update({
        is_synced: true,
        sync_error: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", id);
    return { synced: true };
  } else {
    const errMsg = apiRes.error || "Unknown API error";
    await supabase
      .from("c3_email_config")
      .update({ sync_error: errMsg })
      .eq("id", id);
    return { synced: false, error: errMsg };
  }
}
