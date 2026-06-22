import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgStageTemplate {
  usage_id: string; // mapping id
  template_id: string;
  template_version_id: string | null;
  code: string;
  name: string;
  template_type: string | null;
  subject: string | null;
  body: string | null;
  stage_code: string;
  usage_context: string | null;
  is_default: boolean;
  is_required: boolean;
  auto_generate_allowed: boolean;
  approval_required: boolean;
  sort_order: number;
}

const COUNTRY = "KN";

/**
 * List templates mapped to a Legal stage from lg_stage_template_mapping (new
 * stage automation table). Falls back to legacy core_template_usage rows for
 * ANY_STAGE entries (cross-stage utilities like fee notices).
 */
export async function listTemplatesForStage(
  stage: string | null | undefined,
  caseTypeCode: string | null = null,
): Promise<LgStageTemplate[]> {
  if (!stage) return [];

  // Primary source: lg_stage_template_mapping
  const ctf = caseTypeCode ? ["ANY", caseTypeCode] : ["ANY"];
  const { data: rows, error } = await sb
    .from("lg_stage_template_mapping")
    .select(`
      id, template_id, template_version_id, stage_code,
      is_default, is_required, auto_generate_allowed, approval_required, sort_order,
      core_template:template_id ( code, name, template_type, status, active_version_id )
    `)
    .eq("country_code", COUNTRY)
    .eq("is_active", true)
    .eq("stage_code", stage)
    .in("case_type_code", ctf)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  // Cross-stage entries from legacy core_template_usage (ANY_STAGE context)
  const { data: anyRows } = await sb
    .from("core_template_usage")
    .select(`
      id, template_id, template_version_id, stage_code, usage_context,
      is_default, is_required, auto_generate_allowed, approval_required, sort_order,
      core_template:template_id ( code, name, template_type, status, active_version_id )
    `)
    .eq("module_code", "LEGAL")
    .eq("is_active", true)
    .eq("usage_context", "ANY_STAGE");

  const combined = [...(rows ?? []), ...(anyRows ?? [])];

  const versionIds = Array.from(
    new Set(
      combined
        .map((r: any) => r.template_version_id || r.core_template?.active_version_id)
        .filter(Boolean),
    ),
  );
  let versionMap = new Map<string, { subject: string | null; body: string | null }>();
  if (versionIds.length) {
    const { data: vs } = await sb
      .from("core_template_version")
      .select("id, subject, body")
      .in("id", versionIds);
    versionMap = new Map((vs ?? []).map((v: any) => [v.id, { subject: v.subject, body: v.body }]));
  }

  return combined.map((r: any): LgStageTemplate => {
    const vId = r.template_version_id || r.core_template?.active_version_id || null;
    const v = vId ? versionMap.get(vId) : undefined;
    return {
      usage_id: r.id,
      template_id: r.template_id,
      template_version_id: vId,
      code: r.core_template?.code ?? "",
      name: r.core_template?.name ?? "",
      template_type: r.core_template?.template_type ?? null,
      subject: v?.subject ?? null,
      body: v?.body ?? null,
      stage_code: r.stage_code,
      usage_context: r.usage_context ?? null,
      is_default: !!r.is_default,
      is_required: !!r.is_required,
      auto_generate_allowed: r.auto_generate_allowed !== false,
      approval_required: !!r.approval_required,
      sort_order: r.sort_order ?? 100,
    };
  });
}

export interface LgStageCompleteness {
  stage_code: string;
  total_required: number;
  total_mapped: number;
  missing_required: string[];
}

export async function getStageCompleteness(): Promise<LgStageCompleteness[]> {
  // Compute from the new mapping table.
  const { data, error } = await sb
    .from("lg_stage_template_mapping")
    .select("stage_code, is_required, is_active")
    .eq("country_code", COUNTRY);
  if (error) throw error;
  const grouped = new Map<string, { total: number; required: number }>();
  for (const r of data ?? []) {
    if (!r.is_active) continue;
    const g = grouped.get(r.stage_code) ?? { total: 0, required: 0 };
    g.total += 1;
    if (r.is_required) g.required += 1;
    grouped.set(r.stage_code, g);
  }
  return Array.from(grouped.entries()).map(([stage_code, g]) => ({
    stage_code,
    total_required: g.required,
    total_mapped: g.total,
    missing_required: [],
  }));
}

export async function listMissingRequiredForCase(
  caseId: string,
  stage: string,
  caseTypeCode: string | null = null,
): Promise<LgStageTemplate[]> {
  const templates = await listTemplatesForStage(stage, caseTypeCode);
  const required = templates.filter((t) => t.is_required && t.stage_code === stage);
  if (!required.length) return [];

  const { data } = await sb
    .from("core_generated_document")
    .select("template_id, case_stage_code")
    .eq("entity_type", "lg_case")
    .eq("entity_id", caseId)
    .eq("case_stage_code", stage);

  const generated = new Set((data ?? []).map((d: any) => d.template_id));
  return required.filter((t) => !generated.has(t.template_id));
}

export interface LgTransitionValidation {
  ok: boolean;
  severity: "WARN" | "BLOCK";
  from_stage: string | null;
  to_stage: string;
  missing_templates: string[];
  missing_documents: string[];
  missing_references: string[];
  error?: string;
}

export async function validateStageTransition(
  caseId: string,
  targetStage: string,
): Promise<LgTransitionValidation> {
  const { data, error } = await sb.rpc("lg_validate_stage_transition", {
    p_case_id: caseId,
    p_target_stage: targetStage,
  });
  if (error) throw error;
  return data as LgTransitionValidation;
}
