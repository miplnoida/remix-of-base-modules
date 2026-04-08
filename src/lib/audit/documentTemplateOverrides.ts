/**
 * Per-document override types and merge logic.
 * Overrides are ephemeral (not persisted) — they modify template output
 * for a single generation without changing the org-level defaults.
 *
 * ARCHITECTURE:
 * - ReportTemplateOverride: For Audit Reports (status-aware, signatory-level)
 * - PlanTemplateOverride: For Audit Plans — now covers the full
 *   AuditPlanFullTemplateConfig surface (branding, TOC, pagination, etc.)
 *
 * Both use the same pattern: deep-clone base → selectively patch → return new config.
 */
import type {
  AuditReportTemplateConfig,
  TemplateSignatory,
} from './documentTemplateDefaults';
import type {
  AuditPlanFullTemplateConfig,
  AuditPlanDocumentOverride,
  AuditPlanSignatory,
  CoverStyle,
  NumberingStyle,
} from './auditPlanTemplateTypes';

// ─── Report Overrides (unchanged) ───

export interface ReportTemplateOverride {
  showSubtitle?: boolean;
  subtitleText?: string;
  sectionOverrides?: { id: string; enabled?: boolean; order?: number }[];
  signatoryOverrides?: Partial<TemplateSignatory>[];
  actionPlanColumnOverrides?: { key: string; enabled: boolean }[];
  outputMode?: 'draft' | 'final' | 'auto';
  riskDistributionEnabled?: boolean;
  actionPlanVisibility?: AuditReportTemplateConfig['actionPlanSummary']['visibility'];
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

  if (overrides.outputMode === 'draft') {
    merged.draftRules.showWatermark = true;
    merged.finalRules.showIssuedStamp = false;
  } else if (overrides.outputMode === 'final') {
    merged.draftRules.showWatermark = false;
    merged.finalRules.showIssuedStamp = true;
  }

  return merged;
}

// ─── Plan Overrides (extended for full config) ───

// Re-export the canonical override type from auditPlanTemplateTypes
export type PlanTemplateOverride = AuditPlanDocumentOverride;

/**
 * Apply per-document overrides onto an org-default plan config.
 * Now handles the full AuditPlanFullTemplateConfig surface.
 */
export function applyPlanOverrides(
  base: AuditPlanFullTemplateConfig,
  overrides: PlanTemplateOverride | null | undefined
): AuditPlanFullTemplateConfig {
  if (!overrides) return base;

  const merged: AuditPlanFullTemplateConfig = JSON.parse(JSON.stringify(base));

  // Cover page
  if (overrides.titleText !== undefined) {
    merged.coverPage.titleText = overrides.titleText;
  }
  if (overrides.fiscalYearMode !== undefined) {
    merged.coverPage.fiscalYearMode = overrides.fiscalYearMode;
  }

  // Branding
  if (overrides.confidentialLabel !== undefined) {
    merged.branding.confidentialLabel = overrides.confidentialLabel;
  }
  if (overrides.watermarkText !== undefined) {
    merged.branding.watermarkText = overrides.watermarkText;
    merged.exportDefaults.draftWatermarkText = overrides.watermarkText;
  }

  // Sections (delegated to section engine at resolve time, but stored here)
  // The sectionOverrides are passed through to resolveSections() at generation time.

  // Signatories
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
    merged.branding.showWatermark = true;
    merged.exportDefaults.draftWatermark = true;
  } else if (overrides.outputMode === 'final') {
    merged.branding.showWatermark = false;
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
