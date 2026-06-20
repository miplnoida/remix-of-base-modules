import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgStageTemplate {
  usage_id: string;
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

/**
 * List templates mapped to a given Legal stage (plus ANY_STAGE entries
 * such as fee notices, which are valid at every stage).
 */
export async function listTemplatesForStage(stage: string | null | undefined): Promise<LgStageTemplate[]> {
  if (!stage) return [];
  const { data, error } = await sb
    .from("core_template_usage")
    .select(`
      id, template_id, template_version_id, stage_code, usage_context,
      is_default, is_required, auto_generate_allowed, approval_required, sort_order,
      core_template:template_id ( code, name, template_type, status, active_version_id )
    `)
    .eq("module_code", "LEGAL")
    .eq("is_active", true)
    .or(`stage_code.eq.${stage},usage_context.eq.ANY_STAGE`)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  // Pull subject/body for the resolved active version for each unique version id
  const versionIds = Array.from(
    new Set(
      (data ?? [])
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

  return (data ?? []).map((r: any): LgStageTemplate => {
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
      usage_context: r.usage_context,
      is_default: !!r.is_default,
      is_required: !!r.is_required,
      auto_generate_allowed: !!r.auto_generate_allowed,
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
  const { data, error } = await sb.rpc("legal_stage_template_completeness");
  if (error) throw error;
  return (data ?? []) as LgStageCompleteness[];
}

/**
 * For a given case, return the required templates for its current stage
 * that have not yet been generated (no row in core_generated_document with
 * matching template_id + case_stage_code + entity_id).
 */
export async function listMissingRequiredForCase(
  caseId: string,
  stage: string,
): Promise<LgStageTemplate[]> {
  const templates = await listTemplatesForStage(stage);
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
