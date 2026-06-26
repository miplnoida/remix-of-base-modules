import { supabase } from "@/integrations/supabase/client";
import type { CommAssetCategory } from "@/hooks/comm/useMediaAssets";
import { getSignedUrl } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

export interface ResolvedAsset {
  asset_id: string;
  asset_name: string;
  source: "upload" | "external_url";
  storage_path: string | null;
  external_url: string | null;
  resolved_via: "communication_type" | "module" | "department" | "organization" | "location" | "global" | "system_default";
  is_fallback: boolean;
  /** Ready-to-use URL: signed for uploads, direct for external. Empty string if nothing resolved. */
  url: string;
}

export interface ResolveOptions {
  organizationId?: string | null;
  departmentCode?: string | null;
  moduleCode?: string | null;
  locationId?: string | null;
  communicationType?: string | null;
}

/**
 * Resolves a single communication asset using DB-side priority:
 * communication_type → module → department → organization → location → global/system_default.
 * Never throws — returns a fallback (placeholder) if nothing matches so PDF/email generation
 * never fails on a missing asset.
 */
export async function resolveCommAsset(
  category: CommAssetCategory,
  opts: ResolveOptions = {},
): Promise<ResolvedAsset | null> {
  const { data, error } = await sb.rpc("resolve_comm_asset", {
    p_category: category,
    p_organization_id: opts.organizationId ?? null,
    p_department_code: opts.departmentCode ?? null,
    p_module_code: opts.moduleCode ?? null,
    p_location_id: opts.locationId ?? null,
    p_communication_type: opts.communicationType ?? null,
  });
  if (error) {
    console.warn("[resolveCommAsset] failed", category, error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  let url = "";
  if (row.source === "external_url") {
    url = row.external_url ?? "";
  } else if (row.storage_path) {
    url = (await getSignedUrl(row.storage_path)) ?? "";
  }
  return { ...row, url };
}

/** Resolve many categories in parallel. Keys preserved in the returned object. */
export async function resolveCommAssets(
  categories: CommAssetCategory[],
  opts: ResolveOptions = {},
): Promise<Record<string, ResolvedAsset | null>> {
  const results = await Promise.all(categories.map((c) => resolveCommAsset(c, opts)));
  return Object.fromEntries(categories.map((c, i) => [c, results[i]]));
}
