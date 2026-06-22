import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Surface shape used by Legal UI. Mapped from the central
 * `core_dms_document_type` table (which uses `document_*` column names).
 */
export interface DmsDocumentType {
  id: string;
  module_code: string;
  type_code: string;          // ← document_type_code
  type_name: string;          // ← document_type_name
  category_code: string | null;
  description: string | null;
  allowed_extensions: string[] | null;
  max_size_mb: number | null;          // ← max_file_size_mb
  is_active: boolean;
  retention_years: number | null;
  requires_confidential: boolean | null; // ← is_confidential_default
}

export function useDmsDocumentTypes(moduleCode = "LEGAL") {
  return useQuery<DmsDocumentType[]>({
    queryKey: ["core_dms_document_type", moduleCode],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_dms_document_type")
        .select(
          "id, module_code, document_type_code, document_type_name, description, allowed_extensions, max_file_size_mb, is_active, retention_years, is_confidential_default, sort_order"
        )
        .eq("module_code", moduleCode)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("document_type_code", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        module_code: r.module_code,
        type_code: r.document_type_code,
        type_name: r.document_type_name,
        category_code: null, // category is not stored on the catalogue; chosen per-link
        description: r.description ?? null,
        allowed_extensions: r.allowed_extensions ?? null,
        max_size_mb: r.max_file_size_mb ?? null,
        is_active: !!r.is_active,
        retention_years: r.retention_years ?? null,
        requires_confidential: r.is_confidential_default ?? false,
      })) as DmsDocumentType[];
    },
    staleTime: 5 * 60_000,
  });
}
