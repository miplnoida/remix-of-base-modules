/**
 * Per-document override types and merge logic.
 * Overrides are ephemeral (not persisted) — they modify template output
 * for a single generation without changing the org-level defaults.
 */
import type {
  AuditReportTemplateConfig,
  AuditPlanTemplateConfig,
  TemplateSection,
  TemplateSignatory,
  TemplateColumn,
} from './documentTemplateDefaults';

// ─── Allowed override fields (safe subset) ───

export interface ReportTemplateOverride {
  /** Override subtitle visibility */
  showSubtitle?: boolean;
  /** Override subtitle text */
  subtitleText?: string;
  /** Override section enabled/order (only id + enabled + order) */
  sectionOverrides?: { id: string; enabled?: boolean; order?: number }[];
  /** Override sign-off labels / names */
  signatoryOverrides?: Partial<TemplateSignatory>[];
  /** Override action plan column visibility */
  actionPlanColumnOverrides?: { key: string; enabled: boolean }[];
  /** Force draft or final mode regardless of report status */
  outputMode?: 'draft' | 'final' | 'auto';
  /** Override risk distribution visibility */
  riskDistributionEnabled?: boolean;
  /** Override action plan visibility */
  actionPlanVisibility?: AuditReportTemplateConfig['actionPlanSummary']['visibility'];
  /** Override management response inline setting */
  showManagementResponseAfterRecommendation?: boolean;
}

export interface PlanTemplateOverride {
  /** Override cover title */
  titleText?: string;
  /** Override fiscal year mode */
  fiscalYearMode?: 'single' | 'range';
  /** Override plan summary split */
  splitByType?: boolean;
  /** Override governance labels */
  preparedByLabel?: string;
  approvedByLabel?: string;
  /** Override risk coverage visibility */
  riskCoverageEnabled?: boolean;
  /** Override board line visibility */
  showBoardLine?: boolean;
}

// ─── Merge helpers ───

/**
 * Apply per-document overrides onto an org-default report config.
 * Returns a new config — does NOT mutate the input.
 */
export function applyReportOverrides(
  base: AuditReportTemplateConfig,
  overrides: ReportTemplateOverride | null | undefined
): AuditReportTemplateConfig {
  if (!overrides) return base;

  // Deep clone so we never mutate the cached default
  const merged: AuditReportTemplateConfig = JSON.parse(JSON.stringify(base));

  // Cover page overrides
  if (overrides.showSubtitle !== undefined) {
    merged.coverPage.showSubtitle = overrides.showSubtitle;
  }
  if (overrides.subtitleText !== undefined) {
    merged.coverPage.subtitleText = overrides.subtitleText;
  }

  // Section visibility/order overrides
  if (overrides.sectionOverrides?.length) {
    const overrideMap = new Map(overrides.sectionOverrides.map((o) => [o.id, o]));
    merged.sections = merged.sections.map((s) => {
      const ov = overrideMap.get(s.id);
      if (!ov) return s;
      return {
        ...s,
        enabled: ov.enabled !== undefined ? ov.enabled : s.enabled,
        order: ov.order !== undefined ? ov.order : s.order,
      };
    });
  }

  // Signatory overrides
  if (overrides.signatoryOverrides?.length) {
    merged.signOff.signatories = merged.signOff.signatories.map((sig, i) => {
      const ov = overrides.signatoryOverrides?.[i];
      if (!ov) return sig;
      return {
        label: ov.label ?? sig.label,
        defaultName: ov.defaultName ?? sig.defaultName,
        roleTitle: ov.roleTitle ?? sig.roleTitle,
      };
    });
  }

  // Action plan column overrides
  if (overrides.actionPlanColumnOverrides?.length) {
    const colMap = new Map(overrides.actionPlanColumnOverrides.map((c) => [c.key, c.enabled]));
    merged.actionPlanSummary.columns = merged.actionPlanSummary.columns.map((c) => ({
      ...c,
      enabled: colMap.has(c.key) ? colMap.get(c.key)! : c.enabled,
    }));
  }

  // Visibility overrides
  if (overrides.actionPlanVisibility) {
    merged.actionPlanSummary.visibility = overrides.actionPlanVisibility;
  }
  if (overrides.riskDistributionEnabled !== undefined) {
    merged.riskDistribution.enabled = overrides.riskDistributionEnabled;
  }
  if (overrides.showManagementResponseAfterRecommendation !== undefined) {
    merged.findingsLayout.showManagementResponseAfterRecommendation =
      overrides.showManagementResponseAfterRecommendation;
  }

  // Output mode overrides affect draft/final rules
  if (overrides.outputMode === 'draft') {
    merged.draftRules.showWatermark = true;
    merged.finalRules.showIssuedStamp = false;
  } else if (overrides.outputMode === 'final') {
    merged.draftRules.showWatermark = false;
    merged.finalRules.showIssuedStamp = true;
  }

  return merged;
}

/**
 * Apply per-document overrides onto an org-default plan config.
 */
export function applyPlanOverrides(
  base: AuditPlanTemplateConfig,
  overrides: PlanTemplateOverride | null | undefined
): AuditPlanTemplateConfig {
  if (!overrides) return base;

  const merged: AuditPlanTemplateConfig = JSON.parse(JSON.stringify(base));

  if (overrides.titleText !== undefined) {
    merged.coverPage.titleText = overrides.titleText;
  }
  if (overrides.fiscalYearMode !== undefined) {
    merged.coverPage.fiscalYearMode = overrides.fiscalYearMode;
  }
  if (overrides.splitByType !== undefined) {
    merged.planSummary.splitByType = overrides.splitByType;
  }
  if (overrides.preparedByLabel !== undefined) {
    merged.governance.preparedByLabel = overrides.preparedByLabel;
  }
  if (overrides.approvedByLabel !== undefined) {
    merged.governance.approvedByLabel = overrides.approvedByLabel;
  }
  if (overrides.riskCoverageEnabled !== undefined) {
    merged.riskCoverage.enabled = overrides.riskCoverageEnabled;
  }
  if (overrides.showBoardLine !== undefined) {
    merged.governance.showBoardLine = overrides.showBoardLine;
  }

  return merged;
}

/**
 * Create an empty report override (all fields undefined = no changes).
 */
export function createEmptyReportOverride(): ReportTemplateOverride {
  return {};
}

export function createEmptyPlanOverride(): PlanTemplateOverride {
  return {};
}

/**
 * Check if an override object has any actual changes.
 */
export function hasReportOverrides(ov: ReportTemplateOverride | null | undefined): boolean {
  if (!ov) return false;
  return Object.values(ov).some((v) => v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0));
}

export function hasPlanOverrides(ov: PlanTemplateOverride | null | undefined): boolean {
  if (!ov) return false;
  return Object.values(ov).some((v) => v !== undefined && v !== null);
}
