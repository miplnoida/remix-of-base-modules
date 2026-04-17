// Shared helper for edge functions to resolve C3-Wizard config from c3_site_settings
// (with fallback to env vars for zero-downtime cutover).
//
// NOTE: edge functions cannot share imports across folders in Supabase deploys,
// so this file is duplicated inline in each function. Keep them in sync.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface WizConfig {
  baseUrl: string;
  adminApiKey: string;
  syncApiKey: string;
  environment: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { value: WizConfig; expiresAt: number } | null = null;

export function clearWizConfigCache() {
  cache = null;
}

export async function getWizConfig(opts?: {
  fallbackBaseUrl?: string;
  fallbackAdminKey?: string;
  fallbackSyncKey?: string;
}): Promise<WizConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const fallback: WizConfig = {
    environment: "Dev",
    baseUrl:
      opts?.fallbackBaseUrl ||
      Deno.env.get("WIZ_API_URL")?.replace(/\/wiz-admin-api\/?$/, "") ||
      Deno.env.get("C3_WIZARD_SYNC_URL")?.replace(/\/[^\/]+\/?$/, "") ||
      "https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1",
    adminApiKey:
      opts?.fallbackAdminKey ||
      Deno.env.get("WIZ_ADMIN_API_KEY") ||
      "uiop906754drd35fvg",
    syncApiKey:
      opts?.fallbackSyncKey ||
      Deno.env.get("C3_CONFIG_SYNC_API_KEY") ||
      "",
  };

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      cache = { value: fallback, expiresAt: now + CACHE_TTL_MS };
      return fallback;
    }
    const sb = createClient(url, key);

    const { data: envRow } = await sb
      .from("c3_site_settings")
      .select("setting_value")
      .eq("setting_key", "ACTIVE_ENVIRONMENT")
      .eq("is_deleted", false)
      .maybeSingle();
    const environment = (envRow?.setting_value || "Dev").trim();

    const { data: rows } = await sb
      .from("c3_site_settings")
      .select("setting_key, setting_value, environment")
      .in("setting_key", [
        "C3_WIZARD_BASE_URL",
        "OUTBOUND_ADMIN_API_KEY",
        "OUTBOUND_SYNC_API_KEY",
      ])
      .eq("is_deleted", false)
      .eq("is_active", true);

    const pick = (k: string): string | null => {
      if (!rows) return null;
      const ex = rows.find(
        (r: any) => r.setting_key === k && r.environment === environment
      );
      if (ex?.setting_value) return ex.setting_value;
      const both = rows.find((r: any) => r.setting_key === k && r.environment === "Both");
      return both?.setting_value || null;
    };

    const value: WizConfig = {
      environment,
      baseUrl: (pick("C3_WIZARD_BASE_URL") || fallback.baseUrl).replace(/\/+$/, ""),
      adminApiKey: pick("OUTBOUND_ADMIN_API_KEY") || fallback.adminApiKey,
      syncApiKey: pick("OUTBOUND_SYNC_API_KEY") || fallback.syncApiKey,
    };
    cache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch (err) {
    console.warn("[wizConfig] DB lookup failed, using fallback:", err);
    cache = { value: fallback, expiresAt: now + CACHE_TTL_MS };
    return fallback;
  }
}
