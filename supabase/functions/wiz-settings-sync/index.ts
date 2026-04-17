import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getWizConfig } from "../_shared/wizConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ id: string; key: string; error: string }>;
}

interface WizRowResult {
  template_key?: string;
  config_key?: string;
  setting_key?: string;
  status?: string; // "inserted" | "updated" | "error" | "skipped"
  error?: string;
}

interface WizApiResponse {
  status: string; // "success" | "partial" | "error"
  error?: string;
  data?: {
    synced?: boolean;
    error?: string;
    upserted?: number;
    failed?: number;
    results?: WizRowResult[];
  };
}

async function callWizApi(
  action: string,
  params: Record<string, unknown>
): Promise<WizApiResponse> {
  const { baseUrl, adminApiKey } = await getWizConfig();
  const res = await fetch(`${baseUrl}/wiz-admin-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-api-key": adminApiKey,
    },
    body: JSON.stringify({ action, params }),
  });
  return (await res.json()) as WizApiResponse;
}

/**
 * Determine whether the Wizard call was a true success.
 * Treats top-level "success" with data.error or data.synced=false as a failure
 * (this catches legacy "Unknown action" style responses).
 * For the new richer shape, "success" means all rows upserted; "partial" means
 * we must read per-row results to know which rows failed.
 */
function classifyResponse(apiRes: WizApiResponse): {
  ok: boolean;
  globalError?: string;
} {
  if (apiRes.status === "success") {
    if (apiRes.data?.error) return { ok: false, globalError: apiRes.data.error };
    if (apiRes.data?.synced === false)
      return { ok: false, globalError: apiRes.data?.error || "Sync reported failure" };
    return { ok: true };
  }
  if (apiRes.status === "partial") {
    // Not a global failure — per-row results decide
    return { ok: true };
  }
  return {
    ok: false,
    globalError: apiRes.error || apiRes.data?.error || "Unknown API error",
  };
}

/** Index per-row results by key (template_key / config_key / setting_key). */
function indexResultsByKey(
  results: WizRowResult[] | undefined,
  keyField: "template_key" | "config_key" | "setting_key"
): Map<string, WizRowResult> {
  const map = new Map<string, WizRowResult>();
  if (!results) return map;
  for (const r of results) {
    const k = r[keyField];
    if (k) map.set(k, r);
  }
  return map;
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
      const templatesResult = await syncEmailTemplates(supabaseAdmin);

      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            site_settings: settingsResult,
            email_config: emailResult,
            email_templates: templatesResult,
          },
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

    if (action === "retry_email_template" && id) {
      const result = await retryEmailTemplate(supabaseAdmin, id);
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

// ─── Mark a row synced or failed in a given table ───
async function markRow(
  supabase: ReturnType<typeof createClient>,
  table: string,
  id: string,
  ok: boolean,
  errMsg: string | null
) {
  if (ok) {
    await supabase
      .from(table)
      .update({
        is_synced: true,
        sync_error: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", id);
  } else {
    await supabase
      .from(table)
      .update({ is_synced: false, sync_error: errMsg })
      .eq("id", id);
  }
}

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
    const { ok, globalError } = classifyResponse(apiRes);
    const perRow = indexResultsByKey(apiRes.data?.results, "setting_key");

    if (!ok) {
      const errMsg = globalError || "Unknown API error";
      for (const row of rows) {
        await markRow(supabase, "c3_site_settings", row.id, false, errMsg);
        result.failed++;
        result.errors.push({ id: row.id, key: row.setting_key, error: errMsg });
      }
    } else {
      for (const row of rows) {
        const r = perRow.get(row.setting_key);
        const rowOk = !r || (r.status !== "error" && r.status !== "skipped");
        const errMsg = rowOk ? null : r?.error || "Row failed";
        await markRow(supabase, "c3_site_settings", row.id, rowOk, errMsg);
        if (rowOk) {
          result.synced++;
        } else {
          result.failed++;
          result.errors.push({
            id: row.id,
            key: row.setting_key,
            error: errMsg!,
          });
        }
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    for (const row of rows) {
      await markRow(supabase, "c3_site_settings", row.id, false, errMsg);
      result.failed++;
      result.errors.push({ id: row.id, key: row.setting_key, error: errMsg });
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
    const { ok, globalError } = classifyResponse(apiRes);
    const perRow = indexResultsByKey(apiRes.data?.results, "config_key");

    if (!ok) {
      const errMsg = globalError || "Unknown API error";
      for (const row of rows) {
        await markRow(supabase, "c3_email_config", row.id, false, errMsg);
        result.failed++;
        result.errors.push({ id: row.id, key: row.config_key, error: errMsg });
      }
    } else {
      for (const row of rows) {
        const r = perRow.get(row.config_key);
        const rowOk = !r || (r.status !== "error" && r.status !== "skipped");
        const errMsg = rowOk ? null : r?.error || "Row failed";
        await markRow(supabase, "c3_email_config", row.id, rowOk, errMsg);
        if (rowOk) {
          result.synced++;
        } else {
          result.failed++;
          result.errors.push({
            id: row.id,
            key: row.config_key,
            error: errMsg!,
          });
        }
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    for (const row of rows) {
      await markRow(supabase, "c3_email_config", row.id, false, errMsg);
      result.failed++;
      result.errors.push({ id: row.id, key: row.config_key, error: errMsg });
    }
  }

  return result;
}

// ─── Sync all unsynced email templates ───
async function syncEmailTemplates(
  supabase: ReturnType<typeof createClient>
): Promise<SyncResult> {
  const { data: rows, error } = await supabase
    .from("c3_email_templates")
    .select("*")
    .eq("is_synced", false);
  // Note: include deleted rows too so deletes propagate via is_deleted=true

  if (error) throw new Error(`Failed to read email templates: ${error.message}`);
  if (!rows || rows.length === 0)
    return { total: 0, synced: 0, failed: 0, errors: [] };

  const result: SyncResult = {
    total: rows.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  const templatesPayload = rows.map((row) => ({
    template_key: row.template_key,
    template_name: row.template_name,
    subject: row.subject,
    html_body: row.html_body,
    text_body: row.text_body,
    from_module: row.from_module,
    variables: row.variables,
    is_active: row.is_active,
    is_deleted: row.is_deleted,
  }));

  try {
    const apiRes = await callWizApi("sync_email_templates", {
      templates: templatesPayload,
    });
    const { ok, globalError } = classifyResponse(apiRes);
    const perRow = indexResultsByKey(apiRes.data?.results, "template_key");

    if (!ok) {
      const errMsg = globalError || "Unknown API error";
      for (const row of rows) {
        await markRow(supabase, "c3_email_templates", row.id, false, errMsg);
        result.failed++;
        result.errors.push({
          id: row.id,
          key: row.template_key,
          error: errMsg,
        });
      }
    } else {
      for (const row of rows) {
        const r = perRow.get(row.template_key);
        const rowOk = !r || (r.status !== "error" && r.status !== "skipped");
        const errMsg = rowOk ? null : r?.error || "Row failed";
        await markRow(supabase, "c3_email_templates", row.id, rowOk, errMsg);
        if (rowOk) {
          result.synced++;
        } else {
          result.failed++;
          result.errors.push({
            id: row.id,
            key: row.template_key,
            error: errMsg!,
          });
        }
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    for (const row of rows) {
      await markRow(supabase, "c3_email_templates", row.id, false, errMsg);
      result.failed++;
      result.errors.push({
        id: row.id,
        key: row.template_key,
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

  const apiRes = await callWizApi("sync_site_settings", { settings: [payload] });
  const { ok, globalError } = classifyResponse(apiRes);
  const perRow = indexResultsByKey(apiRes.data?.results, "setting_key");
  const r = perRow.get(row.setting_key);

  let rowOk = ok;
  let errMsg = globalError || null;
  if (ok && r && (r.status === "error" || r.status === "skipped")) {
    rowOk = false;
    errMsg = r.error || "Row failed";
  }

  await markRow(supabase, "c3_site_settings", id, rowOk, errMsg);
  return rowOk ? { synced: true } : { synced: false, error: errMsg };
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

  const apiRes = await callWizApi("sync_email_config", { configs: [payload] });
  const { ok, globalError } = classifyResponse(apiRes);
  const perRow = indexResultsByKey(apiRes.data?.results, "config_key");
  const r = perRow.get(row.config_key);

  let rowOk = ok;
  let errMsg = globalError || null;
  if (ok && r && (r.status === "error" || r.status === "skipped")) {
    rowOk = false;
    errMsg = r.error || "Row failed";
  }

  await markRow(supabase, "c3_email_config", id, rowOk, errMsg);
  return rowOk ? { synced: true } : { synced: false, error: errMsg };
}

// ─── Retry single email template ───
async function retryEmailTemplate(
  supabase: ReturnType<typeof createClient>,
  id: string
) {
  const { data: row, error } = await supabase
    .from("c3_email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row)
    throw new Error(`Email template not found: ${error?.message || id}`);

  const payload = {
    template_key: row.template_key,
    template_name: row.template_name,
    subject: row.subject,
    html_body: row.html_body,
    text_body: row.text_body,
    from_module: row.from_module,
    variables: row.variables,
    is_active: row.is_active,
    is_deleted: row.is_deleted,
  };

  const apiRes = await callWizApi("sync_email_templates", {
    templates: [payload],
  });
  const { ok, globalError } = classifyResponse(apiRes);
  const perRow = indexResultsByKey(apiRes.data?.results, "template_key");
  const r = perRow.get(row.template_key);

  let rowOk = ok;
  let errMsg = globalError || null;
  if (ok && r && (r.status === "error" || r.status === "skipped")) {
    rowOk = false;
    errMsg = r.error || "Row failed";
  }

  await markRow(supabase, "c3_email_templates", id, rowOk, errMsg);
  return rowOk ? { synced: true } : { synced: false, error: errMsg };
}
