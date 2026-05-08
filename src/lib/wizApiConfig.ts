/**
 * Resolves C3-Wizard API base URL + outbound API keys from c3_site_settings.
 *
 * Source of truth: c3_site_settings rows
 *   - C3_WIZARD_BASE_URL        (setting_type = 'URL')
 *   - OUTBOUND_ADMIN_API_KEY    (setting_type = 'OUTBOUND_AUTH')
 *   - OUTBOUND_SYNC_API_KEY     (setting_type = 'OUTBOUND_AUTH')
 *
 * Selection: by ACTIVE_ENVIRONMENT (SYSTEM row, value 'Dev' | 'Production').
 *
 * Falls back to legacy hardcoded values if rows are missing — preserves
 * zero-downtime cutover. 5-minute in-memory cache.
 */
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_BASE_URL = "https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1";
const FALLBACK_SYNC_KEY = "";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface WizConfig {
  baseUrl: string;
  adminApiKey: string;
  syncApiKey: string;
  environment: string;
}

interface CacheEntry {
  value: WizConfig;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<WizConfig> | null = null;

/** Force a refresh on next call (used after settings save/publish). */
export function clearWizConfigCache(): void {
  cache = null;
  inflight = null;
}

async function loadConfig(): Promise<WizConfig> {
  // 1. Resolve active environment
  const { data: envRow } = await supabase
    .from("c3_site_settings")
    .select("setting_value")
    .eq("setting_key", "ACTIVE_ENVIRONMENT")
    .eq("is_deleted", false)
    .maybeSingle();

  const environment = (envRow?.setting_value || "Dev").trim();

  // 2. Pull URL + outbound keys for that environment (fall back to 'Both')
  const { data: rows } = await supabase
    .from("c3_site_settings")
    .select("setting_key, setting_value, environment")
    .in("setting_key", [
      "C3_WIZARD_BASE_URL",
      "OUTBOUND_ADMIN_API_KEY",
      "OUTBOUND_SYNC_API_KEY",
    ])
    .eq("is_deleted", false)
    .eq("is_active", true);

  const pick = (key: string): string | null => {
    if (!rows) return null;
    const exact = rows.find((r) => r.setting_key === key && r.environment === environment);
    if (exact?.setting_value) return exact.setting_value;
    const both = rows.find((r) => r.setting_key === key && r.environment === "Both");
    if (both?.setting_value) return both.setting_value;
    return null;
  };

  const adminKey = pick("OUTBOUND_ADMIN_API_KEY");
  if (!adminKey) {
    throw new Error(
      "OUTBOUND_ADMIN_API_KEY is not configured in c3_site_settings. " +
      "Please configure it in Settings → C3-Wizard Configuration."
    );
  }

  return {
    environment,
    baseUrl: (pick("C3_WIZARD_BASE_URL") || FALLBACK_BASE_URL).replace(/\/+$/, ""),
    adminApiKey: adminKey,
    syncApiKey: pick("OUTBOUND_SYNC_API_KEY") || FALLBACK_SYNC_KEY,
  };
}

async function getWizConfig(): Promise<WizConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const value = await loadConfig();
      cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    } catch (err) {
      // Hard failure → return fallback so the app keeps working
      console.warn("[wizApiConfig] Falling back to defaults:", err);
      return {
        environment: "Dev",
        baseUrl: FALLBACK_BASE_URL,
        adminApiKey: FALLBACK_ADMIN_KEY,
        syncApiKey: FALLBACK_SYNC_KEY,
      };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Returns base URL + admin key for calling wiz-admin-api. */
export async function getWizAdminConfig(): Promise<{ baseUrl: string; apiKey: string }> {
  const cfg = await getWizConfig();
  return { baseUrl: cfg.baseUrl, apiKey: cfg.adminApiKey };
}

/** Returns the full URL of the wiz-admin-api endpoint. */
export async function getWizAdminApiUrl(): Promise<string> {
  const { baseUrl } = await getWizAdminConfig();
  return `${baseUrl}/wiz-admin-api`;
}
