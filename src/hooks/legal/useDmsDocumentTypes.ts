import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface DmsDocumentType {
  id: string;
  module_code: string;
  type_code: string;
  type_name: string;
  category_code: string | null;
  description: string | null;
  allowed_extensions: string[] | null;
  max_size_mb: number | null;
  is_active: boolean;
  retention_years: number | null;
  requires_confidential: boolean | null;
}

export function useDmsDocumentTypes(moduleCode = "LEGAL") {
  return useQuery<DmsDocumentType[]>({
    queryKey: ["core_dms_document_type", moduleCode],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_dms_document_type")
        .select("*")
        .eq("module_code", moduleCode)
        .eq("is_active", true)
        .order("type_code");
      if (error) throw error;
      return (data ?? []) as DmsDocumentType[];
    },
    staleTime: 5 * 60_000,
  });
}
