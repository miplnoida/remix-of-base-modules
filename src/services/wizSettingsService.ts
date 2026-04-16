import { supabase } from "@/integrations/supabase/client";

// ─── Site Settings CRUD ───

export async function fetchSiteSettings(settingType?: string) {
  let query = supabase
    .from("c3_site_settings")
    .select("*")
    .eq("is_deleted", false)
    .order("setting_key");

  if (settingType) {
    query = query.eq("setting_type", settingType);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveSiteSetting(
  id: string,
  updates: { setting_value?: string; description?: string; environment?: string },
  userCode: string
) {
  const { error } = await supabase
    .from("c3_site_settings")
    .update({
      ...updates,
      is_synced: false,
      sync_error: null,
      updated_by: userCode,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Email Config CRUD ───

export async function fetchEmailConfig(configGroup?: string) {
  let query = supabase
    .from("c3_email_config")
    .select("*")
    .order("config_key");

  if (configGroup) {
    query = query.eq("config_group", configGroup);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveEmailConfig(
  id: string,
  updates: { config_value?: string; description?: string; is_active?: boolean }
) {
  const { error } = await supabase
    .from("c3_email_config")
    .update({
      ...updates,
      is_synced: false,
      sync_error: null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Edge Function Calls ───

export async function publishAll() {
  const { data, error } = await supabase.functions.invoke("wiz-settings-sync", {
    body: { action: "publish_all" },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function retrySync(table: "setting" | "email", id: string) {
  const action = table === "setting" ? "retry_setting" : "retry_email";
  const { data, error } = await supabase.functions.invoke("wiz-settings-sync", {
    body: { action, id },
  });

  if (error) throw new Error(error.message);
  return data;
}
