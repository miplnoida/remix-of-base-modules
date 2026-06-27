import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface AppModule {
  id: string;
  name: string;
  display_name: string | null;
  short_name: string | null;
  description: string | null;
  icon: string | null;
  route: string | null;
  parent_id: string | null;
  sort_order: number | null;
  is_enabled: boolean;
  owner_department_id: string | null;
  rollout_state: string | null;
  show_in_menu: boolean | null;
}

/** All modules from app_modules — single source of truth for module display names. */
export function useAppModules(opts?: { enabledOnly?: boolean; rootOnly?: boolean }) {
  return useQuery({
    queryKey: ["app_modules", "list", opts ?? {}],
    queryFn: async () => {
      let q = sb
        .from("app_modules")
        .select("id,name,display_name,short_name,description,icon,route,parent_id,sort_order,is_enabled,owner_department_id,rollout_state,show_in_menu")
        .order("sort_order", { ascending: true });
      if (opts?.enabledOnly) q = q.eq("is_enabled", true);
      if (opts?.rootOnly) q = q.is("parent_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AppModule[];
    },
    staleTime: 10 * 60_000,
  });
}

export function useModuleDisplayName(moduleCode?: string | null) {
  return useQuery({
    queryKey: ["app_modules", "display", moduleCode ?? "none"],
    enabled: !!moduleCode,
    queryFn: async () => {
      const { data } = await sb
        .from("app_modules")
        .select("display_name,short_name,name")
        .eq("name", moduleCode)
        .maybeSingle();
      return (data?.display_name ?? data?.short_name ?? data?.name ?? moduleCode) as string;
    },
    staleTime: 10 * 60_000,
  });
}

export function useUpdateAppModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<AppModule> & { id: string }) => {
      const { error } = await sb.from("app_modules").update(row).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_modules"] });
      toast.success("Module updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
}
