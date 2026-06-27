/**
 * Phase 11 — Portal Branding Resolver
 *
 * Reads portal/public-facing branding from `core_organization` + comm
 * assets (`comm_media_asset` via the canonical asset resolver) +
 * `app_themes`. No new tables — this is a read-only composition layer.
 */

import { supabase } from "@/integrations/supabase/client";
import { resolveCommAssets } from "@/lib/comm/assetResolver";

export interface PortalBranding {
  organizationId: string | null;
  organizationName: string | null;
  shortName: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  website: string | null;
  logoUrl: string | null;
  secondaryLogoUrl: string | null;
  faviconUrl: string | null;
  loginBannerUrl: string | null;
  theme: {
    key: string | null;
    label: string | null;
    cssVars: Record<string, string>;
    darkCssVars: Record<string, string>;
  } | null;
}

export async function resolvePortalBranding(opts?: {
  departmentCode?: string | null;
}): Promise<PortalBranding> {
  const client = supabase as any;

  // 1. Organization (first row by created_at).
  const { data: org } = await client
    .from("core_organization")
    .select(
      "id, legal_name, short_name, main_email, main_phone, website, primary_logo_url, secondary_logo_url",
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 2. Canonical asset bundle for PORTAL channel.
  const assets = (await resolveCommAssets({
    moduleCode: "PORTAL",
    departmentCode: opts?.departmentCode ?? null,
    channels: ["PORTAL"],
  } as any).catch(() => ({}))) as Record<string, { url?: string | null }>;

  const getUrl = (k: string) => assets[k]?.url ?? null;

  // 3. Default enabled theme (no per-org pointer yet — pick first enabled).
  const { data: theme } = await client
    .from("app_themes")
    .select("theme_key, label, css_vars, dark_css_vars")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    organizationId: org?.id ?? null,
    organizationName: org?.legal_name ?? null,
    shortName: org?.short_name ?? null,
    supportEmail: org?.main_email ?? null,
    supportPhone: org?.main_phone ?? null,
    website: org?.website ?? null,
    logoUrl: getUrl("PRIMARY_LOGO") ?? org?.primary_logo_url ?? null,
    secondaryLogoUrl:
      getUrl("SECONDARY_LOGO") ?? org?.secondary_logo_url ?? null,
    faviconUrl: getUrl("FAVICON"),
    loginBannerUrl: getUrl("LOGIN_BANNER"),
    theme: theme
      ? {
          key: theme.theme_key ?? null,
          label: theme.label ?? null,
          cssVars: (theme.css_vars as Record<string, string>) ?? {},
          darkCssVars: (theme.dark_css_vars as Record<string, string>) ?? {},
        }
      : null,
  };
}
