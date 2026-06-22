import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgStageDocumentRule {
  id: string;
  country_code: string;
  case_type_code: string;
  stage_code: string;
  document_type_code: string | null;
  document_category_code: string | null;
  is_required: boolean;
  min_count: number;
  allow_generated: boolean;
  allow_upload: boolean;
  allow_link_existing: boolean;
  is_active: boolean;
  notes: string | null;
  sort_order?: number | null;
}

export function useLgStageDocumentRules(stageCode: string | null | undefined, caseTypeCode?: string | null) {
  return useQuery<LgStageDocumentRule[]>({
    queryKey: ["lg_stage_document_rule", stageCode, caseTypeCode],
    enabled: !!stageCode,
    queryFn: async () => {
      let q = sb.from("lg_stage_document_rule").select("*").eq("is_active", true).eq("stage_code", stageCode);
      const { data, error } = await q.order("sort_order", { ascending: true, nullsFirst: true });
      if (error) throw error;
      const rows = (data ?? []) as LgStageDocumentRule[];
      // Filter case_type_code (ANY matches all)
      return rows.filter(r => !caseTypeCode || r.case_type_code === "ANY" || r.case_type_code === caseTypeCode);
    },
  });
}

export interface DocumentCompletenessRow {
  rule: LgStageDocumentRule;
  matched: number;
  missing: number;
  satisfied: boolean;
}

export function summariseCompleteness(
  rules: LgStageDocumentRule[] | undefined,
  links: { document_type_code?: string | null; document_category_code?: string | null }[] | undefined,
): DocumentCompletenessRow[] {
  if (!rules) return [];
  const list = links ?? [];
  return rules.map(rule => {
    const matched = list.filter(d => {
      if (rule.document_type_code && d.document_type_code === rule.document_type_code) return true;
      if (!rule.document_type_code && rule.document_category_code &&
          d.document_category_code === rule.document_category_code) return true;
      return false;
    }).length;
    const need = Math.max(1, rule.min_count || 1);
    const missing = Math.max(0, need - matched);
    return {
      rule,
      matched,
      missing,
      satisfied: !rule.is_required || matched >= need,
    };
  });
}
