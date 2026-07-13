import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

/**
 * Reads real configuration counts + ce_settings flags driving the
 * Compliance & Enforcement Setup Wizard. No mock/fake data — if a
 * count cannot be retrieved (table missing, permission denied) the
 * step is reported as `unknown` so the wizard surfaces a Warning
 * instead of a false "Completed".
 */
export interface ComplianceSetupCounts {
  violationTypes: number | null;
  detectionRules: number | null;
  calculationRules: number | null;
  caseFamilies: number | null;
  workflowDefs: number | null;
  noticeTemplates: number | null;
  arrangementPolicies: number | null;
  legalEscalationPolicies: number | null;
  automationJobs: number | null;
  riskPriorityWeights: number | null;
  escalationRules: number | null;
  assignmentRoutingRules: number | null;
}

export interface ComplianceSetupFlags {
  activated: boolean;
  activatedAt: string | null;
  activatedBy: string | null;
  optionalFeatures: Record<string, boolean>;
  basicSettingsConfigured: boolean;
  rawSettings: Array<{ setting_key: string; setting_value: string | null; category: string | null; updated_at: string | null; updated_by: string | null }>;
}

export interface ComplianceSetupStatus {
  counts: ComplianceSetupCounts;
  flags: ComplianceSetupFlags;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const ZERO_COUNTS: ComplianceSetupCounts = {
  violationTypes: null,
  detectionRules: null,
  calculationRules: null,
  caseFamilies: null,
  workflowDefs: null,
  noticeTemplates: null,
  arrangementPolicies: null,
  legalEscalationPolicies: null,
  automationJobs: null,
  riskPriorityWeights: null,
  escalationRules: null,
  assignmentRoutingRules: null,
};

async function countOrNull(table: string): Promise<number | null> {
  try {
    const { count, error } = await (supabase as any)
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export function useComplianceSetupStatus(): ComplianceSetupStatus {
  const { isAuthReady, isAuthenticated } = useSupabaseAuth();

  const query = useQuery({
    queryKey: ["compliance-setup-status"],
    enabled: isAuthReady && isAuthenticated,
    queryFn: async () => {
      const [
        violationTypes,
        detectionRules,
        calculationRules,
        caseFamilies,
        workflowDefs,
        noticeTemplates,
        arrangementPolicies,
        legalEscalationPolicies,
        automationJobs,
        riskPriorityWeights,
        escalationRules,
        assignmentRoutingRules,
      ] = await Promise.all([
        countOrNull("ce_violation_types"),
        countOrNull("ce_detection_rules"),
        countOrNull("ce_calculation_rules"),
        countOrNull("ce_case_families"),
        countOrNull("workflow_definitions"),
        countOrNull("ce_notice_templates"),
        countOrNull("ce_arrangement_policies"),
        countOrNull("ce_legal_escalation_policies"),
        countOrNull("ce_automation_jobs"),
        countOrNull("ce_audit_priority_weights"),
        countOrNull("ce_escalation_rules"),
        countOrNull("ce_assignment_routing_rules"),
      ]);

      const counts: ComplianceSetupCounts = {
        violationTypes,
        detectionRules,
        calculationRules,
        caseFamilies,
        workflowDefs,
        noticeTemplates,
        arrangementPolicies,
        legalEscalationPolicies,
        automationJobs,
        riskPriorityWeights,
        escalationRules,
        assignmentRoutingRules,
      };

      const { data: settingsRows, error: settingsErr } = await supabase
        .from("ce_settings")
        .select("setting_key, setting_value, category, updated_at, updated_by")
        .like("setting_key", "compliance.%");

      const rows = settingsRows ?? [];
      const byKey = new Map(rows.map((r) => [r.setting_key, r]));

      const activatedRow = byKey.get("compliance.activated");
      const activated = activatedRow?.setting_value?.toLowerCase() === "true";

      // Optional features are owned by the feature_flags table (Feature Toggles
      // page). Legacy ce_settings.compliance.feature.* rows are still honoured
      // as an override for backward compatibility.
      const optionalFeatures: Record<string, boolean> = {};
      const { data: flagRows } = await (supabase as any)
        .from("feature_flags")
        .select("flag_key, is_enabled")
        .like("flag_key", "compliance.%");
      for (const f of flagRows ?? []) {
        optionalFeatures[f.flag_key] = !!f.is_enabled;
      }
      for (const r of rows) {
        if (r.setting_key.startsWith("compliance.feature.")) {
          optionalFeatures[r.setting_key.replace("compliance.feature.", "")] =
            r.setting_value?.toLowerCase() === "true";
        }
      }

      // Basic settings are owned by core_organization (country_code +
      // default_currency). Legacy compliance.basic.* keys still win if present.
      const legacyBasicKeys = [
        "compliance.basic.jurisdiction",
        "compliance.basic.fiscal_year_start",
        "compliance.basic.default_currency",
      ];
      const legacyBasicSet = legacyBasicKeys.every(
        (k) => (byKey.get(k)?.setting_value ?? "").trim().length > 0
      );
      let basicSettingsConfigured = legacyBasicSet;
      if (!basicSettingsConfigured) {
        const { data: orgRows, error: orgErr } = await (supabase as any)
          .from("core_organization")
          .select("country_code, default_currency")
          .limit(1);
        const orgRow = Array.isArray(orgRows) ? orgRows[0] : null;
        // eslint-disable-next-line no-console
        console.debug("[compliance-setup] core_organization probe", {
          orgErr,
          orgRow,
        });
        basicSettingsConfigured =
          !!orgRow &&
          ((orgRow.country_code ?? "") as string).trim().length > 0 &&
          ((orgRow.default_currency ?? "") as string).trim().length > 0;
      }

      if (settingsErr && rows.length === 0) {
        // fall through — flags below still populated from feature_flags + org
      }

      return {
        counts,
        flags: {
          activated,
          activatedAt: activatedRow?.updated_at ?? null,
          activatedBy: activatedRow?.updated_by ?? null,
          optionalFeatures,
          basicSettingsConfigured,
          rawSettings: rows,
        } as ComplianceSetupFlags,
      };
    },
  });

  return {
    counts: query.data?.counts ?? ZERO_COUNTS,
    flags:
      query.data?.flags ?? {
        activated: false,
        activatedAt: null,
        activatedBy: null,
        optionalFeatures: {},
        basicSettingsConfigured: false,
        rawSettings: [],
      },
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
