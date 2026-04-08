/**
 * Audit Plan Pagination & TOC Rendering Engine
 *
 * Handles page numbering, TOC generation, and section break logic
 * for PDF/DOCX/print export of audit plans.
 */

import type {
  AuditPlanTocConfig,
  AuditPlanPaginationConfig,
  AuditPlanSection,
  NumberingStyle,
} from './auditPlanTemplateTypes';
import type { ResolvedSection, ResolvedSectionList } from './auditPlanSectionEngine';

// ─── Page Number Formatting ───

/**
 * Converts a page number to the specified style string.
 */
export function formatPageNumber(page: number, style: NumberingStyle): string {
  switch (style) {
    case 'roman':
      return toRoman(page);
    case 'alpha':
      return String.fromCharCode(64 + ((page - 1) % 26) + 1);
    case 'arabic':
      return String(page);
    case 'none':
      return '';
  }
}

function toRoman(num: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result.toLowerCase();
}

// ─── Document Zones ───

export type DocumentZone = 'front_matter' | 'body' | 'appendix';

/** IDs considered front matter (before main body content). */
const FRONT_MATTER_IDS = new Set([
  'cover_page',
  'document_control',
  'approval_signoff',
  'table_of_contents',
]);

/** IDs considered appendix material. */
const APPENDIX_IDS = new Set(['appendices']);

/**
 * Determines which document zone a section belongs to.
 */
export function getSectionZone(sectionId: string): DocumentZone {
  if (FRONT_MATTER_IDS.has(sectionId)) return 'front_matter';
  if (APPENDIX_IDS.has(sectionId)) return 'appendix';
  return 'body';
}

// ─── Page Number Assignment ───

export interface PageNumberAssignment {
  sectionId: string;
  label: string;
  zone: DocumentZone;
  /** Raw page index within zone (1-based) */
  rawPage: number;
  /** Formatted page number string */
  formattedPage: string;
  /** Whether to suppress display (e.g. cover) */
  hidden: boolean;
  /** Whether a page break occurs before this section */
  pageBreakBefore: boolean;
}

/**
 * Assigns page numbers to each resolved section based on pagination config.
 *
 * This is a logical assignment — actual page numbers in PDF depend on
 * content length. This provides the numbering scheme and format for
 * each zone, and identifies which pages should be hidden or break.
 */
export function assignPageNumbers(
  resolved: ResolvedSectionList,
  pagination: AuditPlanPaginationConfig
): PageNumberAssignment[] {
  const zoneCounters: Record<DocumentZone, number> = {
    front_matter: 0,
    body: 0,
    appendix: 0,
  };

  const assignments: PageNumberAssignment[] = [];

  for (const section of resolved.sections) {
    const zone = getSectionZone(section.id);
    zoneCounters[zone]++;
    const rawPage = zoneCounters[zone];

    const style = getStyleForZone(zone, pagination);
    const formattedPage = formatPageNumber(rawPage, style);

    const isCover = section.id === 'cover_page';
    const hidden =
      !pagination.showPageNumbers ||
      (isCover && pagination.hideOnCover) ||
      style === 'none';

    const pageBreakBefore =
      section.startNewPage ||
      (pagination.pageBreakBetweenSections && zone === 'body' && rawPage > 1);

    assignments.push({
      sectionId: section.id,
      label: section.label,
      zone,
      rawPage,
      formattedPage,
      hidden,
      pageBreakBefore,
    });
  }

  return assignments;
}

function getStyleForZone(zone: DocumentZone, pagination: AuditPlanPaginationConfig): NumberingStyle {
  switch (zone) {
    case 'front_matter':
      return pagination.frontMatterStyle;
    case 'body':
      return pagination.bodyStyle;
    case 'appendix':
      return pagination.appendixStyle;
  }
}

// ─── TOC Entry Generation ───

export interface TocEntry {
  /** Section ID */
  id: string;
  /** Display label */
  label: string;
  /** Heading depth (1 = top-level) */
  depth: number;
  /** Formatted page number (or empty if hidden) */
  pageNumber: string;
  /** Section numbering (e.g. "1", "2", "3") — excludes cover/TOC */
  sectionNumber: string;
}

/**
 * Generates TOC entries from resolved sections and pagination config.
 * Respects TOC depth, page number visibility, and section filtering.
 */
export function generateTocEntries(
  resolved: ResolvedSectionList,
  tocConfig: AuditPlanTocConfig,
  pagination: AuditPlanPaginationConfig
): TocEntry[] {
  if (!tocConfig.enabled) return [];

  const pageAssignments = assignPageNumbers(resolved, pagination);
  const pageMap = new Map(pageAssignments.map((a) => [a.sectionId, a]));

  // Section numbering (excludes cover, TOC, doc control, approval)
  const excludeFromNumbering = new Set(['cover_page', 'table_of_contents', 'document_control', 'approval_signoff']);
  let sectionCounter = 0;
  const sectionNumbers = new Map<string, string>();
  for (const section of resolved.sections) {
    if (!excludeFromNumbering.has(section.id)) {
      sectionCounter++;
      sectionNumbers.set(section.id, String(sectionCounter));
    }
  }

  const entries: TocEntry[] = [];

  for (const section of resolved.tocEntries) {
    // All TOC entries are depth 1 at section level
    const depth = 1;
    if (depth > tocConfig.depth) continue;

    const assignment = pageMap.get(section.id);
    const pageNumber = tocConfig.showPageNumbers && assignment
      ? assignment.formattedPage
      : '';

    entries.push({
      id: section.id,
      label: section.label,
      depth,
      pageNumber,
      sectionNumber: sectionNumbers.get(section.id) || '',
    });
  }

  return entries;
}

// ─── CSS Print Styles Generation ───

/**
 * Generates CSS rules for print/PDF page numbering and section breaks.
 */
export function generatePrintStyles(
  pagination: AuditPlanPaginationConfig,
  pageBreakSectionIds: string[]
): string {
  const rules: string[] = [];

  // Page number position
  if (pagination.showPageNumbers) {
    const posMap: Record<string, string> = {
      'bottom-center': 'center',
      'bottom-right': 'right',
      'top-right': 'right',
    };
    const position = posMap[pagination.position] || 'center';
    const isTop = pagination.position === 'top-right';

    rules.push(`
@page {
  @${isTop ? 'top' : 'bottom'}-${position} {
    content: counter(page);
    font-size: 9pt;
    color: #666;
  }
}
    `.trim());

    if (pagination.hideOnCover) {
      rules.push(`
@page :first {
  @${isTop ? 'top' : 'bottom'}-${position} {
    content: none;
  }
}
      `.trim());
    }
  }

  // Section page breaks
  for (const id of pageBreakSectionIds) {
    rules.push(`[data-section-id="${id}"] { page-break-before: always; }`);
  }

  return rules.join('\n\n');
}

// ─── DOCX Field Helpers ───

/**
 * Returns the DOCX TOC field instruction string for the given depth.
 * Used by the docx export engine to insert a Word TOC field.
 */
export function getDocxTocFieldInstruction(tocConfig: AuditPlanTocConfig): string {
  if (!tocConfig.enabled) return '';
  // \\o "1-N" controls heading levels, \\h makes hyperlinks, \\p uses leader dots
  const depth = tocConfig.depth;
  const parts = [`TOC \\o "1-${depth}" \\h`];
  if (tocConfig.showLeaderDots) {
    parts.push('\\p " "');
  }
  return parts.join(' ');
}

// ─── Validation ───

export interface PaginationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates TOC and pagination configuration for consistency.
 */
export function validateTocPaginationConfig(
  tocConfig: AuditPlanTocConfig,
  pagination: AuditPlanPaginationConfig,
  sections: AuditPlanSection[]
): PaginationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // TOC validation
  if (tocConfig.enabled) {
    if (!tocConfig.title || tocConfig.title.trim().length === 0) {
      errors.push('TOC title cannot be empty when TOC is enabled.');
    }
    if (tocConfig.title && tocConfig.title.length > 60) {
      warnings.push('TOC title exceeds 60 characters — may truncate in export.');
    }
    if (tocConfig.showPageNumbers && !pagination.showPageNumbers) {
      warnings.push('TOC shows page numbers but pagination is disabled — page numbers will be empty.');
    }
    // Check if the TOC section is enabled in sections
    const tocSection = sections.find((s) => s.id === 'table_of_contents');
    if (tocSection && !tocSection.enabled) {
      warnings.push('TOC is configured but the Table of Contents section is disabled in section configuration.');
    }
    // Check if any sections have inToc=true
    const tocSections = sections.filter((s) => s.enabled && s.inToc);
    if (tocSections.length === 0) {
      warnings.push('TOC is enabled but no sections are marked to appear in the TOC.');
    }
  }

  // Pagination validation
  if (pagination.showPageNumbers) {
    if (pagination.frontMatterStyle === 'none' && pagination.bodyStyle === 'arabic' && pagination.appendixStyle === 'none') {
      // Valid but unusual
    }
  }

  // Page break consistency
  if (!pagination.pageBreakBetweenSections) {
    const manualBreaks = sections.filter((s) => s.enabled && s.startNewPage);
    if (manualBreaks.length > 0) {
      // Not an error — individual overrides still apply
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
