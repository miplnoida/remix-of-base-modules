/**
 * Loads Legal document/notice types from `core_template_category` (module_code=LEGAL).
 * Eliminates hardcoded type lists in IssueNoticeDialog / GenerateTemplateDialog.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LegalDocumentType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export function useLegalDocumentTypes() {
  return useQuery<LegalDocumentType[]>({
    queryKey: ["legal", "document-types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("core_template_category")
        .select("id, code, name, description, sort_order")
        .eq("module_code", "LEGAL")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LegalDocumentType[];
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Published / active Legal templates, optionally filtered by category code.
 */
export function useLegalPublishedTemplates(categoryCode?: string | null) {
  return useQuery({
    queryKey: ["legal", "published-templates", categoryCode ?? "ALL"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("core_template")
        .select(`
          id, code, name, template_type, status, category_id, module_code,
          core_template_category!core_template_category_id_fkey(code, name)
        `)
        .eq("module_code", "LEGAL")
        .in("status", ["ACTIVE", "PUBLISHED"])
        .eq("is_active", true)
        .order("name", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      return categoryCode
        ? rows.filter((r) => r.core_template_category?.code === categoryCode)
        : rows;
    },
    staleTime: 60_000,
  });
}
