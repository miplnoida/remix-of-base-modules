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

/**
 * Preview the next auto-generated text_block_code without consuming it.
 * Uses the central numbering engine (core_number_sequence: CORE / TEXT_BLOCK).
 */
export async function previewNextTextBlockCode(moduleCode?: string | null): Promise<string | null> {
  const dept = (moduleCode?.trim() || "SHARED").toUpperCase();
  const { data, error } = await sb.rpc("core_preview_next_number", {
    p_module_code: "CORE",
    p_entity_type: "TEXT_BLOCK",
    p_country_code: "SKN",
    p_branch_code: null,
    p_department_code: dept,
  });
  if (error) return null;
  return (data as string) ?? null;
}

export function useSaveTextBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<TextBlock> & { id?: string }) => {
      if (row.id) {
        const { error } = await sb.from("core_text_block").update(row).eq("id", row.id);
        if (error) throw error;
        return;
      }

      // NEW: auto-generate text_block_code via central numbering engine when not supplied.
      let payload: any = { ...row };
      if (!payload.text_block_code?.trim()) {
        const dept = (payload.module_code?.trim() || "SHARED").toUpperCase();
        const { data: gen, error: genErr } = await sb.rpc("core_generate_number", {
          p_module_code: "CORE",
          p_entity_type: "TEXT_BLOCK",
          p_country_code: "SKN",
          p_branch_code: null,
          p_department_code: dept,
          p_user_code: null,
        });
        if (genErr) throw genErr;
        const generated = Array.isArray(gen) ? gen[0]?.generated_number : (gen as any)?.generated_number;
        if (!generated) throw new Error("Failed to generate text block code");
        payload.text_block_code = generated;
      }

      const { error } = await sb.from("core_text_block").insert(payload);
      if (error) throw error;
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
