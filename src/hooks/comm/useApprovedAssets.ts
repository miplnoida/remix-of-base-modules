import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/** Returns approved + active comm_media_asset rows for the given categories. */
export function useApprovedAssetsByCategories(categories: string[]) {
  return useQuery({
    queryKey: ["comm_media_asset", "approved-by-categories", [...categories].sort().join(",")],
    enabled: categories.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_media_asset")
        .select("id,name,category,asset_code,approval_status,is_active,storage_path,external_url,source,is_system_default")
        .in("category", categories)
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .order("is_system_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Where-used aggregator for a given asset id. */
export function useAssetWhereUsed(assetId?: string | null) {
  return useQuery({
    queryKey: ["comm_asset_where_used", assetId],
    enabled: !!assetId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("comm_asset_where_used", { p_asset_id: assetId });
      if (error) throw error;
      return (data ?? []) as Array<{
        scope: string; ref_id: string; ref_code: string | null; ref_name: string | null; detail: string | null;
      }>;
    },
  });
}
