import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const COUNTRY = "SKN";

export type RoutingPolicy = {
  country_code: string;
  default_team_code: string | null;
  default_workbasket_code: string | null;
  default_strategy_code: string | null;
  default_priority_code: string | null;
  allow_manual_override: boolean;
  auto_assign_on_referral: boolean;
  auto_assign_on_manual: boolean;
  auto_assign_on_manual_case: boolean;
  escalate_unassigned_after_days: number;
  escalation_workbasket_code: string | null;
};

export type RoutingInput = {
  source_code?: string | null;
  case_type_code?: string | null;
  stage_code?: string | null;
};

export type PrecedenceRuleType =
  | "STAGE_CASE_TYPE"
  | "STAGE"
  | "CASE_TYPE"
  | "SOURCE_CASE_TYPE"
  | "SOURCE"
  | "GLOBAL_DEFAULT"
  | "FALLBACK";

export type RoutingDecision = {
  workbasket_code: string;
  team_code: string;
  priority_code: string | null;
  assignment_strategy: string | null;
  auto_assign: boolean;
  matched_rule: PrecedenceRuleType;
  matched_rule_label: string;
  used_fallback: boolean;
};

const FALLBACK_WORKBASKET = "LEGAL_MANAGER_REVIEW";
const FALLBACK_TEAM = "GENERAL_LEGAL";

export async function loadRoutingPolicy(): Promise<RoutingPolicy | null> {
  const { data } = await sb
    .from("lg_routing_policy")
    .select("*")
    .eq("country_code", COUNTRY)
    .maybeSingle();
  return data ?? null;
}

export async function loadPrecedence(country = COUNTRY): Promise<PrecedenceRuleType[]> {
  const { data } = await sb
    .from("lg_routing_precedence")
    .select("rule_type, priority_order, is_active")
    .eq("country_code", country)
    .eq("is_active", true)
    .order("priority_order", { ascending: true });
  const rows = (data ?? []) as Array<{ rule_type: PrecedenceRuleType }>;
  if (!rows.length) {
    // Safe order of last resort if DB is empty; admin should configure.
    return [
      "STAGE_CASE_TYPE",
      "STAGE",
      "CASE_TYPE",
      "SOURCE_CASE_TYPE",
      "SOURCE",
      "GLOBAL_DEFAULT",
      "FALLBACK",
    ];
  }
  return rows.map((r) => r.rule_type);
}

export async function resolveRouting(input: RoutingInput): Promise<RoutingDecision> {
  const [policy, precedence, stageRows, ctRows, srcRows] = await Promise.all([
    loadRoutingPolicy(),
    loadPrecedence(),
    sb.from("lg_routing_stage_override").select("*").eq("country_code", COUNTRY).eq("is_active", true),
    sb.from("lg_routing_case_type").select("*").eq("country_code", COUNTRY).eq("is_active", true),
    sb.from("lg_routing_source_map").select("*").eq("country_code", COUNTRY).eq("is_active", true),
  ]);
  const stages: any[] = stageRows.data ?? [];
  const types: any[] = ctRows.data ?? [];
  const sources: any[] = srcRows.data ?? [];

  const stage = (input.stage_code || "").toUpperCase() || null;
  const caseType = (input.case_type_code || "").toUpperCase() || null;
  const source = (input.source_code || "").toUpperCase() || null;

  for (const rule of precedence) {
    switch (rule) {
      case "STAGE_CASE_TYPE": {
        if (stage && caseType) {
          const hit = stages.find((r) => r.stage_code === stage && r.case_type_code === caseType);
          if (hit?.workbasket_code) return decision(hit, policy, rule, `Stage ${stage} for ${caseType}`);
        }
        break;
      }
      case "STAGE": {
        if (stage) {
          const hit = stages.find((r) => r.stage_code === stage && !r.case_type_code);
          if (hit?.workbasket_code) return decision(hit, policy, rule, `Stage ${stage}`);
        }
        break;
      }
      case "CASE_TYPE": {
        if (caseType) {
          const hit = types.find((r) => r.case_type_code === caseType);
          if (hit?.workbasket_code) return decision(hit, policy, rule, `Case type ${caseType}`);
        }
        break;
      }
      case "SOURCE_CASE_TYPE": {
        if (source && caseType) {
          const hit = sources.find((r) => r.source_code === source && r.case_type_code === caseType);
          if (hit?.workbasket_code) return decision(hit, policy, rule, `Source ${source} for ${caseType}`);
        }
        break;
      }
      case "SOURCE": {
        if (source) {
          const hit = sources.find((r) => r.source_code === source && !r.case_type_code);
          if (hit?.workbasket_code) return decision(hit, policy, rule, `Source ${source}`);
        }
        break;
      }
      case "GLOBAL_DEFAULT": {
        if (policy?.default_workbasket_code && policy?.default_team_code) {
          return {
            workbasket_code: policy.default_workbasket_code,
            team_code: policy.default_team_code,
            priority_code: policy.default_priority_code ?? null,
            assignment_strategy: policy.default_strategy_code ?? null,
            auto_assign:
              source === "COMPLIANCE_REFERRAL"
                ? !!policy.auto_assign_on_referral
                : !!(policy.auto_assign_on_manual_case ?? policy.auto_assign_on_manual),
            matched_rule: "GLOBAL_DEFAULT",
            matched_rule_label: "Global default",
            used_fallback: false,
          };
        }
        break;
      }
      case "FALLBACK": {
        return {
          workbasket_code: FALLBACK_WORKBASKET,
          team_code: FALLBACK_TEAM,
          priority_code: null,
          assignment_strategy: null,
          auto_assign: false,
          matched_rule: "FALLBACK",
          matched_rule_label: "Fallback (defaults invalid)",
          used_fallback: true,
        };
      }
    }
  }

  // Precedence exhausted with no FALLBACK rule — return hard fallback.
  return {
    workbasket_code: FALLBACK_WORKBASKET,
    team_code: FALLBACK_TEAM,
    priority_code: null,
    assignment_strategy: null,
    auto_assign: false,
    matched_rule: "FALLBACK",
    matched_rule_label: "Fallback (no matching precedence rule)",
    used_fallback: true,
  };
}

function decision(
  row: any,
  policy: RoutingPolicy | null,
  rule: PrecedenceRuleType,
  label: string,
): RoutingDecision {
  return {
    workbasket_code: row.workbasket_code,
    team_code: row.team_code || policy?.default_team_code || FALLBACK_TEAM,
    priority_code: row.priority_code ?? policy?.default_priority_code ?? null,
    assignment_strategy: row.assignment_strategy ?? policy?.default_strategy_code ?? null,
    auto_assign: row.auto_assign ?? true,
    matched_rule: rule,
    matched_rule_label: label,
    used_fallback: false,
  };
}
