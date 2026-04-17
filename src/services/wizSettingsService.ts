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
  updates: { setting_value?: string; description?: string; environment?: string; is_active?: boolean },
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

// ─── Email Templates CRUD ───

export interface EmailTemplateRow {
  id: string;
  template_key: string;
  template_name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  from_module: string;
  variables: string[] | unknown;
  is_active: boolean;
  is_deleted: boolean;
  is_synced: boolean;
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export async function fetchEmailTemplates(fromModule?: string) {
  let query = supabase
    .from("c3_email_templates" as any)
    .select("*")
    .eq("is_deleted", false)
    .order("template_key");

  if (fromModule) {
    query = query.eq("from_module", fromModule);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as EmailTemplateRow[]) || [];
}

export interface EmailTemplateUpdate {
  template_name?: string;
  subject?: string;
  html_body?: string;
  text_body?: string | null;
  from_module?: string;
  variables?: string[];
  is_active?: boolean;
}

export async function saveEmailTemplate(
  id: string,
  updates: EmailTemplateUpdate,
  userCode: string
) {
  const { error } = await supabase
    .from("c3_email_templates" as any)
    .update({
      ...updates,
      is_synced: false,
      sync_error: null,
      updated_by: userCode,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export interface EmailTemplateCreate {
  template_key: string;
  template_name: string;
  subject: string;
  html_body: string;
  text_body?: string | null;
  from_module: string;
  variables?: string[];
  is_active?: boolean;
}

export async function createEmailTemplate(
  payload: EmailTemplateCreate,
  userCode: string
) {
  const { error } = await supabase
    .from("c3_email_templates" as any)
    .insert({
      ...payload,
      variables: payload.variables ?? [],
      is_active: payload.is_active ?? true,
      is_synced: false,
      created_by: userCode,
      updated_by: userCode,
    });

  if (error) throw new Error(error.message);
}

export async function softDeleteEmailTemplate(id: string, userCode: string) {
  const { error } = await supabase
    .from("c3_email_templates" as any)
    .update({
      is_deleted: true,
      is_active: false,
      is_synced: false,
      updated_by: userCode,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function toggleEmailTemplateActive(
  id: string,
  isActive: boolean,
  userCode: string
) {
  const { error } = await supabase
    .from("c3_email_templates" as any)
    .update({
      is_active: isActive,
      is_synced: false,
      updated_by: userCode,
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

export async function retrySync(table: "setting" | "email" | "template", id: string) {
  const action =
    table === "setting"
      ? "retry_setting"
      : table === "email"
      ? "retry_email"
      : "retry_email_template";
  const { data, error } = await supabase.functions.invoke("wiz-settings-sync", {
    body: { action, id },
  });

  if (error) throw new Error(error.message);
  return data;
}

// ─── Sandbox Test-Send ───

export interface TestEmailPayload {
  template_id: string;
  recipient_email: string;
  variables: Record<string, string>;
}

export interface TestEmailResult {
  success: boolean;
  resend_id?: string;
  recipient?: string;
  error?: string;
}

export async function sendTestEmail(payload: TestEmailPayload): Promise<TestEmailResult> {
  const { data, error } = await supabase.functions.invoke("c3-template-test-send", {
    body: payload,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  return (data as TestEmailResult) ?? { success: false, error: "Empty response" };
}
