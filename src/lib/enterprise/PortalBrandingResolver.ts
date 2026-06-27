/**
 * Phase 11 — Portal Branding Resolver
 *
 * Reads portal/public-facing branding from `core_organization` + comm
 * assets (`comm_media_asset`) + `app_themes`. No new tables — this is a
 * read-only composition layer. Department overrides are honored when
 * the relevant `core_department_profile` row sets `portal_*` fields.
 */

import { supabase } from "@/integrations/supabase/client";
import { resolveCommAssets } from "@/lib/comm/assetResolver";

export interface PortalBranding {
  organizationId: string | null;
  organizationName: string | null;
  shortName: string | null;
  tagline: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  website: string | null;
  /** Primary logo (full color) URL */
  logoUrl: string | null;
  /** Secondary / monochrome / mobile logo URL */
  secondaryLogoUrl: string | null;
  /** Favicon URL */
  faviconUrl: string | null;
  /** Login screen hero / banner URL */
  loginBannerUrl: string | null;
  /** Active theme (CSS variables map) */
  theme: {
    code: string | null;
    name: string | null;
    tokens: Record<string, string>;
  } | null;
}

export async function resolvePortalBranding(opts?: {
  departmentCode?: string | null;
}): Promise<PortalBranding> {
  // 1. Organization
  const { data: org } = await supabase
    .from("core_organization")
    .select(
      "id, name, short_name, tagline, support_email, support_phone, website, active_theme_code",
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 2. Resolve canonical asset bundle for PORTAL channel.
  const assets = await resolveCommAssets({
    moduleCode: "PORTAL",
    departmentCode: opts?.departmentCode ?? null,
    channels: ["PORTAL"],
  } as any).catch(() => ({}) as Record<string, { url?: string | null }>);

  const getUrl = (k: string) =>
    (assets as Record<string, { url?: string | null }>)[k]?.url ?? null;

  // 3. Theme
  let theme: PortalBranding["theme"] = null;
  if (org?.active_theme_code) {
    const { data: t } = await supabase
      .from("app_themes")
      .select("code, name, tokens")
      .eq("code", org.active_theme_code)
      .maybeSingle();
    if (t) {
      theme = {
        code: t.code,
        name: t.name,
        tokens: (t.tokens as Record<string, string>) ?? {},
      };
    }
  }

  return {
    organizationId: org?.id ?? null,
    organizationName: org?.name ?? null,
    shortName: org?.short_name ?? null,
    tagline: (org as any)?.tagline ?? null,
    supportEmail: org?.support_email ?? null,
    supportPhone: org?.support_phone ?? null,
    website: org?.website ?? null,
    logoUrl: getUrl("PRIMARY_LOGO"),
    secondaryLogoUrl: getUrl("SECONDARY_LOGO"),
    faviconUrl: getUrl("FAVICON"),
    loginBannerUrl: getUrl("LOGIN_BANNER"),
    theme,
  };
}
