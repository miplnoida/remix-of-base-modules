/**
 * Audit Plan Render Engine
 *
 * Orchestrates the full rendering pipeline:
 *   Template Config + Profile + Overrides → Resolved → Mapped → Render-ready structure
 *
 * Consumed by:
 * - LiveDocumentPreview (React preview)
 * - PDF export (jsPDF)
 * - DOCX export (docx-js)
 * - Print view (CSS @page)
 *
 * ARCHITECTURE:
 * ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────────┐
 * │  Template    │───▶│  Resolver    │───▶│  Mapper     │───▶│  Render Plan   │
 * │  + Profile   │    │  (sections,  │    │  (cover,    │    │  (pages,       │
 * │  + Overrides │    │   TOC, etc.) │    │   fiscal yr)│    │   numbering)   │
 * └─────────────┘    └──────────────┘    └─────────────┘    └────────────────┘
 */

import type { AuditPlanFullTemplateConfig, AuditPlanDocumentOverride } from './auditPlanTemplateTypes';
import type { ResolvedPlanOutput } from './documentTemplateResolver';
import { resolvePlanTemplate } from './documentTemplateResolver';
import { mapPlanOutput, type MappedPlanOutput } from './planOutputMapper';
import {
  assignPageNumbers,
  generateTocEntries,
  type PageNumberAssignment,
  type TocEntry,
  getSectionZone,
  type DocumentZone,
} from './auditPlanPaginationEngine';
import { generateSectionNumbering } from './auditPlanSectionEngine';
import {
  generateTypographyCssVars,
  generateTableCss,
  generatePageCss,
  getPageDimensions,
  getContentWidthDXA,
} from './auditPlanLayoutEngine';

// ─── Render Plan (the final render-ready structure) ───

export interface RenderPage {
  /** Unique page key */
  key: string;
  /** Section ID this page belongs to */
  sectionId: string;
  /** Display label */
  label: string;
  /** Document zone */
  zone: DocumentZone;
  /** Formatted page number */
  pageNumber: string;
  /** Whether page number is hidden */
  pageNumberHidden: boolean;
  /** Whether to insert a page break before this section */
  pageBreakBefore: boolean;
  /** Section numbering (e.g. "1", "2") — empty for front matter */
  sectionNumber: string;
  /** Display mode hint */
  displayMode: 'narrative' | 'table' | 'auto';
  /** Whether this is a mandatory section */
  mandatory: boolean;
}

export interface RenderPlan {
  /** Mapped output (cover, sections, styling) */
  mapped: MappedPlanOutput;
  /** Ordered pages with numbering and zone info */
  pages: RenderPage[];
  /** TOC entries */
  tocEntries: TocEntry[];
  /** Page number assignments */
  pageAssignments: PageNumberAssignment[];
  /** CSS custom properties for typography */
  typographyCssVars: Record<string, string>;
  /** Generated table CSS */
  tableCss: string;
  /** Generated @page CSS */
  pageCss: string;
  /** Content width in DXA (for DOCX) */
  contentWidthDXA: number;
  /** Page dimensions in DXA */
  pageDimensionsDXA: { width: number; height: number };
  /** Whether watermark should be shown */
  showWatermark: boolean;
  /** Watermark text */
  watermarkText: string;
  /** Output mode */
  outputMode: 'draft' | 'final';
  /** Section numbering map */
  sectionNumbering: Record<string, string>;
}

// ─── Pipeline ───

export interface RenderPipelineInput {
  /** Template config (from DB or preset) */
  templateConfig: AuditPlanFullTemplateConfig;
  /** Per-document overrides (optional) */
  overrides?: AuditPlanDocumentOverride;
  /** Raw plan data (fiscal_year, entity, etc.) */
  planData?: Record<string, any>;
  /** Force output mode */
  outputMode?: 'draft' | 'final';
  /**
   * DB-driven section overrides from ia_document_template_sections.
   * When provided, each entry's enabled/required/order/label/inToc/startNewPage
   * values override the corresponding template section before resolution.
   */
  dbSectionOverrides?: Array<{
    id: string;
    enabled: boolean;
    required?: boolean;
    order?: number;
    label?: string;
    inToc?: boolean;
    startNewPage?: boolean;
  }>;
}

/**
 * Executes the full rendering pipeline:
 * 1. Apply DB section overrides to template config
 * 2. Resolve template config with overrides
 * 3. Map to cover/section structure
 * 4. Assign page numbers and TOC entries
 * 5. Generate CSS/layout values
 * 6. Build ordered render pages
 */
export function buildRenderPlan(input: RenderPipelineInput): RenderPlan {
  const {
    templateConfig: rawTemplateConfig,
    overrides,
    planData = {},
    outputMode: forcedMode,
    dbSectionOverrides,
  } = input;

  // Apply DB section overrides to template sections before resolution
  let templateConfig = rawTemplateConfig;
  if (dbSectionOverrides && dbSectionOverrides.length > 0) {
    const overrideMap = new Map(dbSectionOverrides.map((o) => [o.id, o]));
    const updatedSections = templateConfig.sections.map((s) => {
      const dbOv = overrideMap.get(s.id);
      if (!dbOv) return s;
      return {
        ...s,
        enabled: dbOv.enabled,
        mandatory: dbOv.required ?? s.mandatory,
        order: dbOv.order ?? s.order,
        label: dbOv.label ?? s.label,
        inToc: dbOv.inToc ?? s.inToc,
        startNewPage: dbOv.startNewPage ?? s.startNewPage,
      };
    });
    templateConfig = { ...templateConfig, sections: updatedSections };
  }

  // Step 1: Resolve
  const resolved: ResolvedPlanOutput = resolvePlanTemplate(templateConfig, overrides);

  // Step 2: Map
  const mapped: MappedPlanOutput = mapPlanOutput(resolved, planData);

  // Step 3: Pagination
  const pageAssignments = assignPageNumbers(
    resolved.resolvedSections,
    resolved.pagination
  );
  const tocEntries = generateTocEntries(
    resolved.resolvedSections,
    resolved.toc,
    resolved.pagination
  );
  const sectionNumbering = generateSectionNumbering(resolved.resolvedSections);

  // Step 4: Layout & styles
  const typographyCssVars = generateTypographyCssVars(resolved.typography);
  const tableCss = generateTableCss(resolved.tableStyle);
  const pageCss = generatePageCss(resolved.pageLayout);
  const contentWidthDXA = getContentWidthDXA(resolved.pageLayout);
  const pageDimensionsDXA = getPageDimensions(resolved.pageLayout);

  // Step 5: Build render pages
  const assignmentMap = new Map(pageAssignments.map((a) => [a.sectionId, a]));
  const pages: RenderPage[] = resolved.resolvedSections.sections.map((section) => {
    const assignment = assignmentMap.get(section.id);
    return {
      key: `page-${section.id}`,
      sectionId: section.id,
      label: section.label,
      zone: getSectionZone(section.id),
      pageNumber: assignment?.formattedPage ?? '',
      pageNumberHidden: assignment?.hidden ?? true,
      pageBreakBefore: assignment?.pageBreakBefore ?? false,
      sectionNumber: sectionNumbering[section.id] ?? '',
      displayMode: section.displayMode,
      mandatory: section.mandatory,
    };
  });

  // Determine output mode
  const effectiveMode: 'draft' | 'final' =
    forcedMode ??
    (overrides?.outputMode === 'draft' ? 'draft' :
     overrides?.outputMode === 'final' ? 'final' :
     resolved.showWatermark ? 'draft' : 'final');

  return {
    mapped,
    pages,
    tocEntries,
    pageAssignments,
    typographyCssVars,
    tableCss,
    pageCss,
    contentWidthDXA,
    pageDimensionsDXA,
    showWatermark: resolved.showWatermark,
    watermarkText: resolved.watermarkText,
    outputMode: effectiveMode,
    sectionNumbering,
  };
}

// ─── Fallback Behavior ───

/**
 * Returns a safe render plan using the provided template config with
 * all defaults applied. Used when profile or overrides are incomplete.
 */
export function buildFallbackRenderPlan(
  templateConfig: AuditPlanFullTemplateConfig,
  planData?: Record<string, any>
): RenderPlan {
  return buildRenderPlan({
    templateConfig,
    planData: planData ?? { fiscal_year: new Date().getFullYear() },
  });
}

// ─── CSS Bundle (for preview/print) ───

/**
 * Generates a complete CSS bundle for the audit plan preview or print view.
 */
export function generatePreviewCss(plan: RenderPlan): string {
  const vars = Object.entries(plan.typographyCssVars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  return `
/* Audit Plan Preview Styles */
.audit-plan-preview {
${vars}
  font-family: var(--ap-font-body);
  font-size: var(--ap-font-size-base);
  color: var(--ap-color-body);
  line-height: var(--ap-line-height);
}

.audit-plan-preview h1 {
  font-family: var(--ap-font-heading);
  font-size: var(--ap-font-size-h1);
  color: var(--ap-color-heading);
  font-weight: 700;
  margin-top: var(--ap-spacing-before);
  margin-bottom: var(--ap-spacing-after);
}

.audit-plan-preview h2 {
  font-family: var(--ap-font-heading);
  font-size: var(--ap-font-size-h2);
  color: var(--ap-color-heading);
  font-weight: 600;
  margin-top: var(--ap-spacing-before);
  margin-bottom: var(--ap-spacing-after);
}

.audit-plan-preview h3 {
  font-family: var(--ap-font-heading);
  font-size: var(--ap-font-size-h3);
  color: var(--ap-color-heading);
  font-weight: 600;
  margin-top: var(--ap-spacing-before);
  margin-bottom: var(--ap-spacing-after);
}

.audit-plan-preview p {
  margin-top: var(--ap-spacing-before);
  margin-bottom: var(--ap-spacing-after);
}

/* Watermark */
.audit-plan-watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 72pt;
  font-weight: 700;
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
  white-space: nowrap;
}

/* Page break markers */
.audit-plan-page-break {
  page-break-before: always;
  break-before: page;
}

/* Section containers */
.audit-plan-section {
  position: relative;
  z-index: 1;
}

${plan.tableCss}

${plan.pageCss}
  `.trim();
}

// ─── Section Content Placeholders ───

/** 
 * Returns placeholder/sample content for a section (used in preview mode).
 * In real export, actual plan data would replace these.
 */
export function getSectionPlaceholder(sectionId: string): string {
  const placeholders: Record<string, string> = {
    cover_page: '',
    document_control: 'Version control and document history.',
    approval_signoff: 'Approval signatures and dates.',
    table_of_contents: '',
    executive_summary: 'This audit plan outlines the planned assurance and advisory engagements for the current fiscal period, based on the organization\'s risk assessment and strategic priorities.',
    audit_background: 'The Internal Audit function operates under the authority of the Board of Directors and in accordance with the International Standards for the Professional Practice of Internal Auditing.',
    audit_objective: 'To provide independent and objective assurance that the organization\'s risk management, governance, and internal control processes are operating effectively.',
    audit_scope: 'The audit plan covers all departments, functions, and processes within the organization for the fiscal period.',
    audit_criteria: 'Audit criteria include applicable laws, regulations, organizational policies, and industry best practices.',
    risk_assessment_summary: 'Risk-based prioritization of auditable entities.',
    focus_areas: 'Key audit questions and areas of focus for each engagement.',
    methodology: 'Audits will be conducted using a risk-based approach in accordance with IIA standards.',
    planned_procedures: 'Detailed procedures and work program outline.',
    sampling_strategy: 'Statistical and judgmental sampling approaches.',
    information_required: 'Documents and data needed from auditees.',
    resource_plan: 'Staffing allocation and audit day budget.',
    timeline_milestones: 'Quarterly milestones and key deliverable dates.',
    deliverables: 'Audit reports, management letters, and committee presentations.',
    communication_protocol: 'Reporting cadence and escalation procedures.',
    independence_statement: 'The internal audit function maintains organizational independence and individual objectivity in accordance with IIA standards.',
    limitations: 'Any scope limitations or assumptions affecting planned coverage.',
    appendices: 'Supporting schedules, risk matrices, and reference materials.',
  };
  return placeholders[sectionId] ?? 'Section content will appear here.';
}
