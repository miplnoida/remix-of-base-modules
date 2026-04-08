/**
 * Per-document override types and merge logic.
 * Overrides are ephemeral (not persisted) — they modify template output
 * for a single generation without changing the org-level defaults.
 *
 * ARCHITECTURE (Foundation-First):
 * ═══════════════════════════════
 * Overrides can only modify TEMPLATE-LEVEL settings (structure, content).
 * Foundation-owned settings (branding, typography, sign-off, draft rules)
 * CANNOT be overridden per-document — they are organization-wide.
 *
 * - ReportTemplateOverride: For Audit Reports (section visibility, content toggles)
 * - PlanTemplateOverride: For Audit Plans (section visibility, content toggles)
 */
import type {
  AuditReportTemplateConfig,
} from './documentTemplateDefaults';
import type {
  AuditPlanFullTemplateConfig,
  AuditPlanDocumentOverride,
} from './auditPlanTemplateTypes';

// ─── Report Overrides ───

export interface ReportTemplateOverride {
  /** Override cover subtitle visibility */
  showSubtitle?: boolean;
  /** Override cover subtitle text */
  subtitleText?: string;
  /** Override section visibility/order */
  sectionOverrides?: { id: string; enabled?: boolean; order?: number }[];
  /** Override action plan column visibility */
  actionPlanColumnOverrides?: { key: string; enabled: boolean }[];
  /** Force draft/final output mode */
  outputMode?: 'draft' | 'final' | 'auto';
  /** Override risk distribution visibility */
  riskDistributionEnabled?: boolean;
  /** Override action plan visibility */
  actionPlanVisibility?: AuditReportTemplateConfig['actionPlanSummary']['visibility'];
  /** Override inline management response display */
  showManagementResponseAfterRecommendation?: boolean;
}

export function applyReportOverrides(
  base: AuditReportTemplateConfig,
  overrides: ReportTemplateOverride | null | undefined
): AuditReportTemplateConfig {
  if (!overrides) return base;

  const merged: AuditReportTemplateConfig = JSON.parse(JSON.stringify(base));

  if (overrides.showSubtitle !== undefined) {
    merged.coverPage.showSubtitle = overrides.showSubtitle;
  }
  if (overrides.subtitleText !== undefined) {
    merged.coverPage.subtitleText = overrides.subtitleText;
  }

  if (overrides.sectionOverrides?.length) {
    const overrideMap = new Map(overrides.sectionOverrides.map((o) => [o.id, o]));
    const sections = merged.sectionRefs || merged.sections || [];
    const updated = sections.map((s) => {
      const ov = overrideMap.get(s.id);
      if (!ov) return s;
      return {
        ...s,
        enabled: ov.enabled !== undefined ? ov.enabled : s.enabled,
        order: ov.order !== undefined ? ov.order : s.order,
      };
    });
    merged.sectionRefs = updated;
    merged.sections = updated;
  }

  if (overrides.actionPlanColumnOverrides?.length) {
    const colMap = new Map(overrides.actionPlanColumnOverrides.map((c) => [c.key, c.enabled]));
    merged.actionPlanSummary.columns = merged.actionPlanSummary.columns.map((c) => ({
      ...c,
      enabled: colMap.has(c.key) ? colMap.get(c.key)! : c.enabled,
    }));
  }

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

  return merged;
}

// ─── Plan Overrides ───

// Re-export the canonical override type from auditPlanTemplateTypes
export type PlanTemplateOverride = AuditPlanDocumentOverride;

/**
 * Apply per-document overrides onto an org-default plan config.
 * Only modifies template-level (structure/content) settings.
 * Foundation formatting cannot be overridden.
 */
export function applyPlanOverrides(
  base: AuditPlanFullTemplateConfig,
  overrides: PlanTemplateOverride | null | undefined
): AuditPlanFullTemplateConfig {
  if (!overrides) return base;

  const merged: AuditPlanFullTemplateConfig = JSON.parse(JSON.stringify(base));

  // Cover page (template-owned)
  if (overrides.titleText !== undefined) {
    merged.coverPage.titleText = overrides.titleText;
  }
  if (overrides.fiscalYearMode !== undefined) {
    merged.coverPage.fiscalYearMode = overrides.fiscalYearMode;
  }

  // Signatories — these override the Foundation defaults at generation time only
  if (overrides.signatoryOverrides?.length) {
    merged.approval.signatories = merged.approval.signatories.map((sig, i) => {
      const ov = overrides.signatoryOverrides?.[i];
      if (!ov) return sig;
      return {
        label: ov.label ?? sig.label,
        defaultName: ov.defaultName ?? sig.defaultName,
        roleTitle: ov.roleTitle ?? sig.roleTitle,
      };
    });
  }

  // Output mode
  if (overrides.outputMode === 'draft') {
    merged.exportDefaults.draftWatermark = true;
  } else if (overrides.outputMode === 'final') {
    merged.exportDefaults.draftWatermark = false;
  }

  return merged;
}

// ─── Factory & Utility ───

export function createEmptyReportOverride(): ReportTemplateOverride {
  return {};
}

export function createEmptyPlanOverride(): PlanTemplateOverride {
  return {};
}

export function hasReportOverrides(ov: ReportTemplateOverride | null | undefined): boolean {
  if (!ov) return false;
  return Object.values(ov).some((v) => v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0));
}

export function hasPlanOverrides(ov: PlanTemplateOverride | null | undefined): boolean {
  if (!ov) return false;
  return Object.values(ov).some((v) => v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0));
}
