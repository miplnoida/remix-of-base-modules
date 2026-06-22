import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface StageTemplateMappingRow {
  id: string;
  country_code: string;
  case_type_code: string;
  stage_code: string;
  template_id: string;
  template_version_id: string | null;
  trigger_event: string | null;
  is_required: boolean;
  is_default: boolean;
  auto_generate_allowed: boolean;
  approval_required: boolean;
  sort_order: number;
  is_active: boolean;
  template_code?: string;
  template_name?: string;
}

export interface StageReferenceMappingRow {
  id: string;
  country_code: string;
  case_type_code: string;
  stage_code: string;
  legal_reference_id: string;
  is_required: boolean;
  display_order: number;
  usage_note: string | null;
  is_active: boolean;
  reference_code?: string;
  reference_title?: string;
}

export async function listStageTemplateMappings(): Promise<StageTemplateMappingRow[]> {
  const { data, error } = await sb
    .from("lg_stage_template_mapping")
    .select(`
      id, country_code, case_type_code, stage_code, template_id, template_version_id,
      trigger_event, is_required, is_default, auto_generate_allowed, approval_required,
      sort_order, is_active,
      core_template:template_id ( code, name )
    `)
    .order("stage_code", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    template_code: r.core_template?.code,
    template_name: r.core_template?.name,
  }));
}

export async function upsertStageTemplateMapping(
  row: Partial<StageTemplateMappingRow> & { id?: string },
  userCode: string,
) {
  const payload = {
    ...row,
    country_code: row.country_code ?? "KN",
    case_type_code: row.case_type_code ?? "ANY",
    updated_by: userCode,
    created_by: row.id ? undefined : userCode,
  };
  const { data, error } = row.id
    ? await sb.from("lg_stage_template_mapping").update(payload).eq("id", row.id).select().single()
    : await sb.from("lg_stage_template_mapping").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStageTemplateMapping(id: string) {
  const { error } = await sb.from("lg_stage_template_mapping").delete().eq("id", id);
  if (error) throw error;
}

export async function listStageReferenceMappings(): Promise<StageReferenceMappingRow[]> {
  const { data, error } = await sb
    .from("lg_stage_reference_mapping")
    .select(`
      id, country_code, case_type_code, stage_code, legal_reference_id,
      is_required, display_order, usage_note, is_active,
      core_legal_reference:legal_reference_id ( code, title )
    `)
    .order("stage_code", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    reference_code: r.core_legal_reference?.code,
    reference_title: r.core_legal_reference?.title,
  }));
}

export async function upsertStageReferenceMapping(
  row: Partial<StageReferenceMappingRow> & { id?: string },
  userCode: string,
) {
  const payload = {
    ...row,
    country_code: row.country_code ?? "KN",
    case_type_code: row.case_type_code ?? "ANY",
    updated_by: userCode,
    created_by: row.id ? undefined : userCode,
  };
  const { data, error } = row.id
    ? await sb.from("lg_stage_reference_mapping").update(payload).eq("id", row.id).select().single()
    : await sb.from("lg_stage_reference_mapping").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStageReferenceMapping(id: string) {
  const { error } = await sb.from("lg_stage_reference_mapping").delete().eq("id", id);
  if (error) throw error;
}

export const LEGAL_STAGES = [
  "REFERRAL_RECEIVED",
  "LEGAL_REVIEW",
  "INFORMATION_REQUESTED",
  "DEMAND_NOTICE",
  "FINAL_DEMAND",
  "PAYMENT_PLAN_NEGOTIATION",
  "SETTLEMENT_NEGOTIATION",
  "COURT_PREPARATION",
  "COURT_FILING",
  "HEARING_SCHEDULED",
  "HEARING_COMPLETED",
  "JUDGMENT_PENDING",
  "JUDGMENT_GRANTED",
  "ENFORCEMENT",
  "RECOVERY_MONITORING",
  "SATISFIED",
  "WITHDRAWN",
  "CLOSED",
] as const;
export type LegalStage = (typeof LEGAL_STAGES)[number];
