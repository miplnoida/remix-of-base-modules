import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { softArchiveOrgEntity, OM3_EVENTS } from "@/platform/organization/orgMutations";
import { useMemo } from "react";

const sb = supabase as any;

export interface AssetCategoryRow {
  id: string;
  category_code: string;
  category_name: string;
  group_name: string;
  description: string | null;
  used_in: string[];
  recommended_size: string | null;
  accepted_file_types: string;
  max_file_size_kb: number;
  aspect: string;
  tips: string[];
  sort_order: number;
  is_active: boolean;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_ACCEPT = "image/*,.pdf,.svg,.webp";
const DEFAULT_MAX_KB = 2000;

function normalize(row: any): AssetCategoryRow {
  return {
    ...row,
    used_in: Array.isArray(row.used_in) ? row.used_in : (row.used_in ? JSON.parse(row.used_in) : []),
    tips: Array.isArray(row.tips) ? row.tips : (row.tips ? JSON.parse(row.tips) : []),
  };
}

export function useAssetCategories(opts?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["comm_asset_category_master", opts?.activeOnly ?? false],
    queryFn: async () => {
      let q = sb.from("comm_asset_category_master").select("*").order("sort_order", { ascending: true });
      if (opts?.activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(normalize) as AssetCategoryRow[];
    },
    staleTime: 60_000,
  });
}

export function useAssetCategoryMap() {
  const { data, isLoading } = useAssetCategories();
  const map = useMemo(() => {
    const m = new Map<string, AssetCategoryRow>();
    (data ?? []).forEach((c) => m.set(c.category_code, c));
    return m;
  }, [data]);
  return { map, list: data ?? [], isLoading };
}

export function getCategoryConfig(
  cat: AssetCategoryRow | null | undefined,
): { accept: string; maxFileSizeKb: number } {
  return {
    accept: cat?.accepted_file_types || DEFAULT_ACCEPT,
    maxFileSizeKb: cat?.max_file_size_kb ?? DEFAULT_MAX_KB,
  };
}

export function useSaveAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<AssetCategoryRow> & { id?: string }) => {
      const payload: any = { ...row };
      if (Array.isArray(payload.used_in)) payload.used_in = JSON.stringify(payload.used_in);
      if (Array.isArray(payload.tips)) payload.tips = JSON.stringify(payload.tips);
      if (row.id) {
        const { error } = await sb.from("comm_asset_category_master").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("comm_asset_category_master").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm_asset_category_master"] });
      toast.success("Category saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function useDeleteAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("comm_asset_category_master").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm_asset_category_master"] });
      toast.success("Category deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed — try deactivating instead"),
  });
}
