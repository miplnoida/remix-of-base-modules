/**
 * Audit Plan Section Configuration Engine
 *
 * Resolves, filters, orders, and validates section configurations
 * for audit plan generation (PDF/DOCX/print).
 */

import type {
  AuditPlanSection,
  AuditPlanFullTemplateConfig,
  AuditPlanDocumentOverride,
  SectionDisplayMode,
} from './auditPlanTemplateTypes';
import { AUDIT_PLAN_SECTION_LIBRARY } from './auditPlanTemplateTypes';

// ─── Resolved Section (ready for rendering) ───

export interface ResolvedSection {
  id: string;
  /** Final display label (override > template label > library default) */
  label: string;
  order: number;
  inToc: boolean;
  startNewPage: boolean;
  displayMode: SectionDisplayMode;
  mandatory: boolean;
}

// ─── Resolved Section List ───

export interface ResolvedSectionList {
  /** Sections to render, sorted by order */
  sections: ResolvedSection[];
  /** TOC entries only (filtered from sections where inToc=true) */
  tocEntries: ResolvedSection[];
  /** Count of enabled sections */
  enabledCount: number;
  /** Count of total available sections */
  totalCount: number;
}

// ─── Core Resolution Logic ───

/**
 * Resolves template sections + optional per-document overrides into
 * a final ordered list of sections ready for rendering.
 *
 * Resolution order:
 * 1. Start with template section config
 * 2. Apply per-document overrides (visibility, order)
 * 3. Enforce mandatory sections (cannot be disabled)
 * 4. Filter to enabled only
 * 5. Sort by order
 */
export function resolveSections(
  templateConfig: AuditPlanFullTemplateConfig,
  overrides?: AuditPlanDocumentOverride
): ResolvedSectionList {
  // Start with template sections
  let sections = templateConfig.sections.map((s) => ({ ...s }));

  // Apply per-document overrides
  if (overrides?.sectionOverrides) {
    for (const ov of overrides.sectionOverrides) {
      const idx = sections.findIndex((s) => s.id === ov.id);
      if (idx >= 0) {
        if (ov.enabled !== undefined) sections[idx].enabled = ov.enabled;
        if (ov.order !== undefined) sections[idx].order = ov.order;
      }
    }
  }

  // Enforce mandatory sections — cannot be disabled
  sections = sections.map((s) => {
    if (s.mandatory && !s.enabled) {
      return { ...s, enabled: true };
    }
    return s;
  });

  // Filter to enabled + sort by order
  const enabled = sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const resolved: ResolvedSection[] = enabled.map((s) => ({
    id: s.id,
    label: s.labelOverride || s.label,
    order: s.order,
    inToc: s.inToc,
    startNewPage: s.startNewPage,
    displayMode: s.displayMode,
    mandatory: s.mandatory,
  }));

  const tocEntries = resolved.filter((s) => s.inToc);

  return {
    sections: resolved,
    tocEntries,
    enabledCount: resolved.length,
    totalCount: sections.length,
  };
}

// ─── Validation ───

export interface SectionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a section configuration for completeness and consistency.
 */
export function validateSectionConfig(
  sections: AuditPlanSection[]
): SectionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate IDs
  const ids = sections.map((s) => s.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    errors.push(`Duplicate section IDs: ${[...new Set(dupes)].join(', ')}`);
  }

  // Check for duplicate order values among enabled sections
  const enabledOrders = sections.filter((s) => s.enabled).map((s) => s.order);
  const orderDupes = enabledOrders.filter((o, i) => enabledOrders.indexOf(o) !== i);
  if (orderDupes.length > 0) {
    warnings.push(`Duplicate order values found: ${[...new Set(orderDupes)].join(', ')}. Sections may render in unexpected order.`);
  }

  // Check mandatory sections are enabled
  const disabledMandatory = sections.filter((s) => s.mandatory && !s.enabled);
  if (disabledMandatory.length > 0) {
    errors.push(`Mandatory sections cannot be disabled: ${disabledMandatory.map((s) => s.label).join(', ')}`);
  }

  // Check that audit_objective and audit_scope exist
  const requiredIds = ['audit_objective', 'audit_scope'];
  for (const rid of requiredIds) {
    if (!sections.find((s) => s.id === rid)) {
      errors.push(`Missing required section: ${rid}`);
    }
  }

  // Warn if cover_page is not order 1
  const cover = sections.find((s) => s.id === 'cover_page');
  if (cover && cover.order !== 1) {
    warnings.push('Cover Page is not in position 1. This may produce unexpected output.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Reordering Helpers ───

/**
 * Moves a section up or down in the order, re-normalizing order values.
 */
export function reorderSection(
  sections: AuditPlanSection[],
  sectionId: string,
  direction: 'up' | 'down'
): AuditPlanSection[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === sectionId);
  if (idx < 0) return sections;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sorted.length) return sections;

  // Swap orders
  const temp = sorted[idx].order;
  sorted[idx] = { ...sorted[idx], order: sorted[targetIdx].order };
  sorted[targetIdx] = { ...sorted[targetIdx], order: temp };

  return sorted;
}

/**
 * Normalizes section order values to sequential 1..N.
 */
export function normalizeSectionOrder(sections: AuditPlanSection[]): AuditPlanSection[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  return sorted.map((s, i) => ({ ...s, order: i + 1 }));
}

/**
 * Resets sections to a given template preset's defaults.
 */
export function resetToPresetSections(presetSections: AuditPlanSection[]): AuditPlanSection[] {
  return presetSections.map((s) => ({ ...s }));
}

// ─── Export Rendering Helpers ───

/**
 * Returns the list of sections that should generate page breaks before them.
 */
export function getPageBreakSections(resolved: ResolvedSectionList): string[] {
  return resolved.sections.filter((s) => s.startNewPage).map((s) => s.id);
}

/**
 * Returns section IDs grouped by display mode for the export engine.
 */
export function getSectionsByDisplayMode(
  resolved: ResolvedSectionList
): Record<SectionDisplayMode, string[]> {
  const result: Record<SectionDisplayMode, string[]> = {
    narrative: [],
    table: [],
    auto: [],
  };
  for (const s of resolved.sections) {
    result[s.displayMode].push(s.id);
  }
  return result;
}

/**
 * Generates a section numbering map (e.g., "1", "2", "3"...) for TOC entries.
 * Respects the resolved order. Cover and TOC pages are excluded from numbering.
 */
export function generateSectionNumbering(
  resolved: ResolvedSectionList
): Record<string, string> {
  const numbering: Record<string, string> = {};
  const excludeFromNumbering = new Set(['cover_page', 'table_of_contents']);
  let counter = 1;
  for (const s of resolved.sections) {
    if (!excludeFromNumbering.has(s.id)) {
      numbering[s.id] = String(counter);
      counter++;
    }
  }
  return numbering;
}
