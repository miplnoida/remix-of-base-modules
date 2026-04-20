import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Compliance Employer Audit — Document Template hooks.
 * Strictly scoped to the ce_* tables. Do NOT mix with internal audit ia_* tables.
 */

export type CETemplateType =
  | "employer_audit_report"
  | "findings_memo"
  | "evidence_summary"
  | "violation_notice"
  | "enforcement_pack"
  | "management_summary";

export const CE_TEMPLATE_TYPES: { value: CETemplateType; label: string; description: string }[] = [
  { value: "employer_audit_report", label: "Employer Audit Report", description: "Primary report issued at the close of an employer compliance audit." },
  { value: "findings_memo", label: "Findings Memo", description: "Memo communicating audit findings to the employer." },
  { value: "evidence_summary", label: "Evidence Summary", description: "Summary of evidence gathered during the audit visit." },
  { value: "violation_notice", label: "Violation Notice", description: "Formal notice of violations under the Social Security Act." },
  { value: "enforcement_pack", label: "Legal / Enforcement Pack", description: "Bundle for legal escalation and enforcement." },
  { value: "management_summary", label: "Management Summary", description: "Internal summary for compliance management review." },
];

export function useComplianceFoundation() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ce_org_document_foundation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_org_document_foundation" as any)
        .select("*")
        .eq("foundation_key", "default")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase
        .from("ce_org_document_foundation" as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("foundation_key", "default");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ce_org_document_foundation"] });
      toast.success("Compliance foundation updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update foundation"),
  });

  return { ...query, update };
}

export function useComplianceSectionLibrary() {
  return useQuery({
    queryKey: ["ce_document_section_library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_document_section_library" as any)
        .select("*")
        .order("default_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useComplianceTemplates() {
  return useQuery({
    queryKey: ["ce_document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_document_templates" as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useComplianceTemplateSections(templateType: CETemplateType | null) {
  return useQuery({
    queryKey: ["ce_document_template_sections", templateType],
    enabled: !!templateType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_document_template_sections" as any)
        .select("*")
        .eq("template_type", templateType!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateComplianceTemplateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; template_type: string; [k: string]: any }) => {
      const { id, ...patch } = row;
      const { error } = await supabase
        .from("ce_document_template_sections" as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ce_document_template_sections", vars.template_type] });
      toast.success("Section updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update section"),
  });
}

export function useComplianceTemplateSettings(templateType: CETemplateType | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ce_document_template_settings", templateType],
    enabled: !!templateType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_document_template_settings" as any)
        .select("*")
        .eq("template_type", templateType!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (config_json: Record<string, any>) => {
      const { error } = await supabase
        .from("ce_document_template_settings" as any)
        .update({ config_json, updated_at: new Date().toISOString() })
        .eq("template_type", templateType!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ce_document_template_settings", templateType] });
      toast.success("Template settings saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save settings"),
  });

  return { ...query, update };
}
