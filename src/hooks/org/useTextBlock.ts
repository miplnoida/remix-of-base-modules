import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface TextBlock {
  id: string;
  text_block_code: string;
  name: string;
  category: string | null;
  module_code: string | null;
  department_code: string | null;
  language_code: string;
  version_no: number;
  content_html: string | null;
  content_text: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** List all text blocks (optionally filtered). */
export function useTextBlocks(filters?: { moduleCode?: string; languageCode?: string; activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["core_text_block", "list", filters ?? {}],
    queryFn: async () => {
      let q = sb.from("core_text_block").select("*").order("text_block_code", { ascending: true }).order("version_no", { ascending: false });
      if (filters?.moduleCode) q = q.eq("module_code", filters.moduleCode);
      if (filters?.languageCode) q = q.eq("language_code", filters.languageCode);
      if (filters?.activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TextBlock[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Resolve a single text block by code+language, returning the latest active effective version. */
export function useTextBlock(code?: string | null, languageCode = "en") {
  return useQuery({
    queryKey: ["core_text_block", "resolve", code ?? "none", languageCode],
    enabled: !!code,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await sb
        .from("core_text_block")
        .select("*")
        .eq("text_block_code", code)
        .eq("language_code", languageCode)
        .eq("is_active", true)
        .or(`effective_from.is.null,effective_from.lte.${today}`)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order("version_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TextBlock | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useSaveTextBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<TextBlock> & { id?: string }) => {
      if (row.id) {
        const { error } = await sb.from("core_text_block").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("core_text_block").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["core_text_block"] });
      toast.success("Text block saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function useDeleteTextBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("core_text_block").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["core_text_block"] });
      toast.success("Text block deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}
