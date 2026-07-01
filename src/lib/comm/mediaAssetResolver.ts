/**
 * Central resolver for Media Library assets referenced by asset_code.
 *
 * Any preview / renderer that has a `*_asset_code` field on a letterhead,
 * template or design_config MUST route the code through this helper — never
 * use the raw code as an image `src`. Handles:
 *   - active row lookup by asset_code
 *   - signed URL for `storage_path` (private `comm-assets` bucket)
 *   - direct URL for `external_url` / `preview_url`
 *   - graceful "missing" result so the UI can surface a warning badge
 *     instead of a broken image icon.
 */
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

export interface ResolvedMediaAsset {
  code: string;
  found: boolean;
  is_active: boolean;
  id?: string;
  name?: string;
  category?: string;
  mime_type?: string;
  width_px?: number | null;
  height_px?: number | null;
  usage_slot?: string | null;
  url: string; // empty when not resolvable
  source?: "external" | "storage" | "preview";
}

const MISSING = (code: string): ResolvedMediaAsset => ({
  code, found: false, is_active: false, url: "",
});

async function toUrl(row: any): Promise<{ url: string; source?: ResolvedMediaAsset["source"] }> {
  if (row.external_url) return { url: row.external_url, source: "external" };
  if (row.preview_url && /^https?:\/\//i.test(row.preview_url)) {
    return { url: row.preview_url, source: "preview" };
  }
  if (row.storage_path) {
    try {
      const signed = await getSignedUrl(row.storage_path, 3600);
      if (signed) return { url: signed, source: "storage" };
    } catch (e) {
      console.warn("[resolveMediaAssetByCode] signing failed", row.asset_code, e);
    }
  }
  return { url: "" };
}

export async function resolveMediaAssetByCode(code?: string | null): Promise<ResolvedMediaAsset> {
  if (!code) return MISSING("");
  // Prefer active row, fall back to any row (so we can flag "inactive").
  const { data } = await sb.from("comm_media_asset")
    .select("id, asset_code, name, category, mime_type, width_px, height_px, usage_slot, is_active, storage_path, external_url, preview_url")
    .eq("asset_code", code)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return MISSING(code);
  const { url, source } = await toUrl(data);
  return {
    code,
    found: true,
    is_active: !!data.is_active,
    id: data.id,
    name: data.name,
    category: data.category,
    mime_type: data.mime_type,
    width_px: data.width_px,
    height_px: data.height_px,
    usage_slot: data.usage_slot,
    url,
    source,
  };
}

export async function resolveMediaAssetsByCodes(
  codes: (string | null | undefined)[],
): Promise<Record<string, ResolvedMediaAsset>> {
  const uniq = Array.from(new Set(codes.filter((c): c is string => !!c)));
  const results = await Promise.all(uniq.map(resolveMediaAssetByCode));
  return Object.fromEntries(results.map((r) => [r.code, r]));
}
