import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const COUNTRY = "SKN";

export type SourceType = "OPERATIONAL" | "REFERRAL" | "EXTERNAL" | "LEGACY" | "MIGRATION";

export type SourceConfig = {
  id?: string;
  country_code: string;
  source_code: string;
  source_name: string;
  description: string | null;
  default_workbasket_code: string | null;
  default_team_code: string | null;
  default_stage_code: string | null;
  allow_manual_entry: boolean;
  is_active: boolean;
  display_order: number;
  source_type?: SourceType;
  enforce_case_type_restrictions?: boolean;
  enforce_stage_restrictions?: boolean;
  allow_historical_exceptions?: boolean;
};

export type SourceCaseType = {
  id?: string;
  country_code: string;
  source_code: string;
  case_type_code: string;
  default_stage_code: string | null;
  default_workbasket_code: string | null;
  default_team_code: string | null;
  priority_code: string | null;
  is_active: boolean;
};

export type SourceStage = {
  id?: string;
  country_code: string;
  source_code: string;
  stage_code: string;
  allowed_as_initial_stage: boolean;
  allowed_as_transition_stage: boolean;
  is_active: boolean;
};

export type SourceAllowance = {
  source: SourceConfig | null;
  caseTypes: SourceCaseType[];
  stages: SourceStage[];
};

export async function loadSourceConfig(source_code: string, country = COUNTRY): Promise<SourceAllowance> {
  const [src, ct, st] = await Promise.all([
    sb.from("lg_case_source_config").select("*").eq("country_code", country).eq("source_code", source_code).maybeSingle(),
    sb.from("lg_case_source_case_type").select("*").eq("country_code", country).eq("source_code", source_code).eq("is_active", true),
    sb.from("lg_case_source_stage").select("*").eq("country_code", country).eq("source_code", source_code).eq("is_active", true),
  ]);
  return {
    source: (src.data as SourceConfig) ?? null,
    caseTypes: (ct.data ?? []) as SourceCaseType[],
    stages: (st.data ?? []) as SourceStage[],
  };
}

export async function loadAllSources(country = COUNTRY): Promise<SourceConfig[]> {
  const { data } = await sb
    .from("lg_case_source_config")
    .select("*")
    .eq("country_code", country)
    .order("display_order", { ascending: true });
  return (data ?? []) as SourceConfig[];
}

export type CaseCreationCheck = {
  allowed: boolean;
  reason: string;
  blocked_by: "SOURCE_INACTIVE" | "SOURCE_NO_MANUAL" | "CASE_TYPE" | "STAGE" | null;
  default_stage_code: string | null;
  default_workbasket_code: string | null;
  default_team_code: string | null;
  default_priority_code: string | null;
};

/**
 * Validate that a source+case_type+stage combination is allowed for case creation.
 * Also returns the suggested defaults (stage/workbasket/team/priority) for that combo.
 */
export async function checkCaseCreation(input: {
  source_code: string;
  case_type_code?: string | null;
  stage_code?: string | null;
  manual?: boolean;
  country?: string;
}): Promise<CaseCreationCheck> {
  const { source, caseTypes, stages } = await loadSourceConfig(input.source_code, input.country ?? COUNTRY);

  const out: CaseCreationCheck = {
    allowed: true,
    reason: "All checks passed.",
    blocked_by: null,
    default_stage_code: source?.default_stage_code ?? null,
    default_workbasket_code: source?.default_workbasket_code ?? null,
    default_team_code: source?.default_team_code ?? null,
    default_priority_code: null,
  };

  if (!source || !source.is_active) {
    return { ...out, allowed: false, reason: `Source ${input.source_code} is not configured or is inactive.`, blocked_by: "SOURCE_INACTIVE" };
  }
  if (input.manual && !source.allow_manual_entry) {
    return { ...out, allowed: false, reason: `${source.source_name} does not allow manual entry.`, blocked_by: "SOURCE_NO_MANUAL" };
  }

  if (input.case_type_code) {
    const hit = caseTypes.find((c) => c.case_type_code === input.case_type_code);
    if (!hit) {
      return {
        ...out,
        allowed: false,
        reason: `Case type ${input.case_type_code} is not allowed for source ${source.source_name}.`,
        blocked_by: "CASE_TYPE",
      };
    }
    if (hit.default_stage_code) out.default_stage_code = hit.default_stage_code;
    if (hit.default_workbasket_code) out.default_workbasket_code = hit.default_workbasket_code;
    if (hit.default_team_code) out.default_team_code = hit.default_team_code;
    if (hit.priority_code) out.default_priority_code = hit.priority_code;
  }

  if (input.stage_code) {
    const hit = stages.find((s) => s.stage_code === input.stage_code);
    if (!hit || !hit.allowed_as_initial_stage) {
      return {
        ...out,
        allowed: false,
        reason: `Stage ${input.stage_code} is not allowed as an initial stage for ${source.source_name}.`,
        blocked_by: "STAGE",
      };
    }
  }

  return out;
}
