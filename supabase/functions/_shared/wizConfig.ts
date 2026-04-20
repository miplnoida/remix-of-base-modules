// Shared helper for edge functions to resolve C3-Wizard config from c3_site_settings.
//
// DB is the single source of truth — no env-var fallbacks for outbound URL/keys.
// A last-resort hardcoded baseUrl is kept ONLY so a misconfigured DB does not
// brick the deployment instantly; admin/sync keys MUST come from the DB.
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
const LAST_RESORT_BASE_URL = "https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1";
let cache: { value: WizConfig; expiresAt: number } | null = null;

export function clearWizConfigCache() {
  cache = null;
}

export async function getWizConfig(): Promise<WizConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  // Last-resort defaults (used only if the DB lookup itself fails).
  const lastResort: WizConfig = {
    environment: "Dev",
    baseUrl: LAST_RESORT_BASE_URL,
    adminApiKey: "",
    syncApiKey: "",
  };

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      console.warn("[wizConfig] Missing Supabase service credentials — returning last-resort defaults.");
      cache = { value: lastResort, expiresAt: now + CACHE_TTL_MS };
      return lastResort;
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
      baseUrl: (pick("C3_WIZARD_BASE_URL") || LAST_RESORT_BASE_URL).replace(/\/+$/, ""),
      adminApiKey: pick("OUTBOUND_ADMIN_API_KEY") || "",
      syncApiKey: pick("OUTBOUND_SYNC_API_KEY") || "",
    };
    cache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch (err) {
    console.warn("[wizConfig] DB lookup failed, using last-resort defaults:", err);
    cache = { value: lastResort, expiresAt: now + CACHE_TTL_MS };
    return lastResort;
  }
}
