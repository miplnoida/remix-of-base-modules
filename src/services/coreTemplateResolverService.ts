import { supabase } from "@/integrations/supabase/client";
import type { CoreTemplate, CoreTemplateVersion } from "./coreTemplateService";

/**
 * Country pack resolver.
 * Returns the most specific active template for a given code+country:
 *   1) COUNTRY-scoped template (e.g., KN override)
 *   2) GLOBAL base template (parent)
 *
 * Uses the DB function core_resolve_template; falls back to a client-side
 * query if the RPC is not yet available.
 */
export const coreTemplateResolverService = {
  async resolveTemplate(code: string, country: string = "KN"): Promise<CoreTemplate | null> {
    const { data, error } = await (supabase as any).rpc("core_resolve_template", {
      p_code: code, p_country: country,
    });
    if (!error && data) return Array.isArray(data) ? data[0] : data;

    // fallback path
    const { data: rows } = await (supabase as any)
      .from("core_template").select("*")
      .eq("code", code).eq("is_active", true);
    if (!rows?.length) return null;
    const country_match = rows.find((r: any) => r.scope === "COUNTRY" && r.country_code === country);
    return (country_match || rows.find((r: any) => r.scope === "GLOBAL") || null) as CoreTemplate | null;
  },

  async resolveActiveVersion(code: string, country: string = "KN"): Promise<CoreTemplateVersion | null> {
    const { data, error } = await (supabase as any).rpc("core_resolve_template_version", {
      p_code: code, p_country: country,
    });
    if (!error && data) return Array.isArray(data) ? data[0] : data;
    const tpl = await this.resolveTemplate(code, country);
    if (!tpl?.active_version_id) return null;
    const { data: ver } = await (supabase as any)
      .from("core_template_version").select("*")
      .eq("id", tpl.active_version_id).maybeSingle();
    return (ver || null) as CoreTemplateVersion | null;
  },
};
