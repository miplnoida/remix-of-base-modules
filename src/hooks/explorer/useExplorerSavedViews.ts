import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExplorerViewState } from "@/components/explorer/types";

export interface ExplorerSavedView {
  id: string;
  dataset_key: string;
  name: string;
  description: string | null;
  scope: "personal" | "role" | "global";
  owner_user_id: string | null;
  owner_user_code: string | null;
  role_code: string | null;
  view_state: ExplorerViewState;
  is_default: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useExplorerSavedViews(datasetKey: string) {
  return useQuery({
    queryKey: ["explorer-saved-views", datasetKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("explorer_saved_view")
        .select("*")
        .eq("dataset_key", datasetKey)
        .order("is_pinned", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as ExplorerSavedView[];
    },
    staleTime: 30_000,
  });
}

export function useSaveExplorerView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Partial<ExplorerSavedView> & { dataset_key: string; name: string; view_state: ExplorerViewState }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        dataset_key: v.dataset_key,
        name: v.name,
        description: v.description ?? null,
        scope: v.scope ?? "personal",
        owner_user_id: user?.id ?? null,
        owner_user_code: (user?.user_metadata?.user_code as string) ?? null,
        role_code: v.role_code ?? null,
        view_state: v.view_state as any,
        is_default: v.is_default ?? false,
        is_pinned: v.is_pinned ?? false,
        created_by: (user?.user_metadata?.user_code as string) ?? null,
        updated_by: (user?.user_metadata?.user_code as string) ?? null,
      };
      if (v.id) {
        const { error } = await (supabase as any).from("explorer_saved_view").update(payload).eq("id", v.id);
        if (error) throw error;
        return v.id;
      }
      const { data, error } = await (supabase as any).from("explorer_saved_view").insert(payload).select("id").single();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: (_id, vars) => qc.invalidateQueries({ queryKey: ["explorer-saved-views", vars.dataset_key] }),
  });
}

export function useDeleteExplorerView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dataset_key }: { id: string; dataset_key: string }) => {
      const { error } = await (supabase as any).from("explorer_saved_view").delete().eq("id", id);
      if (error) throw error;
      return { id, dataset_key };
    },
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ["explorer-saved-views", r.dataset_key] }),
  });
}
