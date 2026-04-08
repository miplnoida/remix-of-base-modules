/**
 * Audit Plan Typography & Layout Rendering Engine
 *
 * Computes CSS styles, DOCX formatting values, and PDF layout
 * parameters from the template configuration.
 */

import type {
  AuditPlanTypography,
  AuditPlanTableStyle,
  AuditPlanPageLayout,
  PageSize,
  TableAutoFitMode,
} from './auditPlanTemplateTypes';

// ─── Page Size Dimensions ───

/** DXA units (1440 DXA = 1 inch) */
export interface PageDimensionsDXA {
  width: number;
  height: number;
}

const PAGE_SIZES_DXA: Record<PageSize, PageDimensionsDXA> = {
  letter: { width: 12240, height: 15840 },   // 8.5 × 11 inches
  a4: { width: 11906, height: 16838 },       // 210 × 297 mm
  legal: { width: 12240, height: 20160 },     // 8.5 × 14 inches
};

/**
 * Returns page dimensions in DXA with orientation applied.
 */
export function getPageDimensions(layout: AuditPlanPageLayout): PageDimensionsDXA {
  const base = PAGE_SIZES_DXA[layout.pageSize];
  if (layout.orientation === 'landscape') {
    return { width: base.height, height: base.width };
  }
  return { ...base };
}

/**
 * Returns content width in DXA (page width minus left+right margins).
 */
export function getContentWidthDXA(layout: AuditPlanPageLayout): number {
  const dims = getPageDimensions(layout);
  const marginDXA = (layout.margins.left + layout.margins.right) * 1440;
  return dims.width - marginDXA;
}

/**
 * Returns margins in DXA.
 */
export function getMarginsDXA(layout: AuditPlanPageLayout) {
  return {
    top: Math.round(layout.margins.top * 1440),
    bottom: Math.round(layout.margins.bottom * 1440),
    left: Math.round(layout.margins.left * 1440),
    right: Math.round(layout.margins.right * 1440),
  };
}

// ─── CSS Style Generation ───

/**
 * Generates CSS custom properties for typography.
 */
export function generateTypographyCssVars(typo: AuditPlanTypography): Record<string, string> {
  return {
    '--ap-font-body': typo.fontFamily,
    '--ap-font-heading': typo.headingFont,
    '--ap-font-size-base': `${typo.baseFontSize}pt`,
    '--ap-font-size-h1': `${typo.h1Size}pt`,
    '--ap-font-size-h2': `${typo.h2Size}pt`,
    '--ap-font-size-h3': `${typo.h3Size}pt`,
    '--ap-color-heading': typo.headingColor,
    '--ap-color-body': typo.bodyColor,
    '--ap-line-height': String(typo.lineHeight),
    '--ap-spacing-before': `${typo.paragraphSpacingBefore}pt`,
    '--ap-spacing-after': `${typo.paragraphSpacingAfter}pt`,
  };
}

/**
 * Generates CSS rules for table styling.
 */
export function generateTableCss(table: AuditPlanTableStyle): string {
  const rules: string[] = [];

  rules.push(`
.ap-table {
  width: 100%;
  border-collapse: collapse;
  font-size: ${table.fontSize === 'small' ? '9pt' : '10pt'};
}
.ap-table th,
.ap-table td {
  border: 1px solid ${table.borderColor};
  padding: ${table.cellPadding}pt ${table.cellPadding + 2}pt;
}
.ap-table thead th {
  background-color: ${table.headerBackground};
  color: ${table.headerTextColor};
  font-weight: 600;
  text-align: left;
}
  `.trim());

  if (table.stripedRows) {
    rules.push(`.ap-table tbody tr:nth-child(even) { background-color: ${table.stripeColor}; }`);
  }

  if (table.boldTotalRows) {
    rules.push(`.ap-table tbody tr:last-child td { font-weight: 700; }`);
  }

  if (table.repeatHeaderOnPageBreak) {
    rules.push(`.ap-table thead { display: table-header-group; }`);
  }

  return rules.join('\n');
}

/**
 * Generates @page CSS for print/PDF.
 */
export function generatePageCss(layout: AuditPlanPageLayout): string {
  const dims = getPageDimensions(layout);
  const widthIn = (dims.width / 1440).toFixed(2);
  const heightIn = (dims.height / 1440).toFixed(2);

  return `
@page {
  size: ${widthIn}in ${heightIn}in;
  margin: ${layout.margins.top}in ${layout.margins.right}in ${layout.margins.bottom}in ${layout.margins.left}in;
}
  `.trim();
}

// ─── DOCX Helpers ───

/** Half-point conversions for DOCX (docx-js uses half-points for font sizes). */
export function ptToHalfPt(pt: number): number {
  return pt * 2;
}

/** DXA conversions for DOCX spacing (20 DXA = 1pt). */
export function ptToDxa(pt: number): number {
  return Math.round(pt * 20);
}

/**
 * Returns docx-js compatible table properties from config.
 */
export function getDocxTableProperties(table: AuditPlanTableStyle, contentWidthDXA: number) {
  const autoFitMap: Record<TableAutoFitMode, string> = {
    fixed: 'fixed',
    auto_fit_content: 'autofit',
    auto_fit_window: 'autofit',
  };

  return {
    width: table.autoFitMode === 'auto_fit_window' ? contentWidthDXA : undefined,
    layout: autoFitMap[table.autoFitMode],
    headerRow: table.repeatHeaderOnPageBreak,
    cellMargin: {
      top: ptToDxa(table.cellPadding),
      bottom: ptToDxa(table.cellPadding),
      left: ptToDxa(table.cellPadding + 2),
      right: ptToDxa(table.cellPadding + 2),
    },
  };
}

/**
 * Returns docx-js compatible typography style definitions.
 */
export function getDocxTypographyStyles(typo: AuditPlanTypography) {
  return {
    defaultStyle: {
      font: typo.fontFamily,
      size: ptToHalfPt(typo.baseFontSize),
      color: typo.bodyColor.replace('#', ''),
    },
    heading1: {
      font: typo.headingFont,
      size: ptToHalfPt(typo.h1Size),
      color: typo.headingColor.replace('#', ''),
      bold: true,
      spacing: {
        before: ptToDxa(typo.paragraphSpacingBefore + 6),
        after: ptToDxa(typo.paragraphSpacingAfter + 4),
      },
    },
    heading2: {
      font: typo.headingFont,
      size: ptToHalfPt(typo.h2Size),
      color: typo.headingColor.replace('#', ''),
      bold: true,
      spacing: {
        before: ptToDxa(typo.paragraphSpacingBefore + 4),
        after: ptToDxa(typo.paragraphSpacingAfter + 2),
      },
    },
    heading3: {
      font: typo.headingFont,
      size: ptToHalfPt(typo.h3Size),
      color: typo.headingColor.replace('#', ''),
      bold: true,
      spacing: {
        before: ptToDxa(typo.paragraphSpacingBefore + 2),
        after: ptToDxa(typo.paragraphSpacingAfter),
      },
    },
    paragraph: {
      spacing: {
        before: ptToDxa(typo.paragraphSpacingBefore),
        after: ptToDxa(typo.paragraphSpacingAfter),
        line: Math.round(typo.lineHeight * 240), // 240 = single spacing in DOCX
      },
    },
  };
}

// ─── Validation ───

export interface LayoutValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateLayoutConfig(
  typo: AuditPlanTypography,
  table: AuditPlanTableStyle,
  layout: AuditPlanPageLayout
): LayoutValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Margins
  const totalHMargin = layout.margins.left + layout.margins.right;
  const totalVMargin = layout.margins.top + layout.margins.bottom;
  const pageDims = getPageDimensions(layout);
  const pageWidthIn = pageDims.width / 1440;
  const pageHeightIn = pageDims.height / 1440;

  if (totalHMargin >= pageWidthIn - 2) {
    errors.push('Horizontal margins leave less than 2 inches of content width.');
  }
  if (totalVMargin >= pageHeightIn - 2) {
    errors.push('Vertical margins leave less than 2 inches of content height.');
  }

  // Font sizes
  if (typo.baseFontSize < 8 || typo.baseFontSize > 14) {
    warnings.push(`Base font size ${typo.baseFontSize}pt is outside the typical 8–14pt range.`);
  }
  if (typo.h1Size <= typo.h2Size) {
    warnings.push('H1 size should be larger than H2 for visual hierarchy.');
  }
  if (typo.h2Size <= typo.h3Size) {
    warnings.push('H2 size should be larger than H3 for visual hierarchy.');
  }

  // Table
  if (table.cellPadding < 2) {
    warnings.push('Very small cell padding may make tables difficult to read.');
  }

  // Hex validation
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  for (const [key, val] of Object.entries({
    headingColor: typo.headingColor,
    bodyColor: typo.bodyColor,
    headerBackground: table.headerBackground,
    headerTextColor: table.headerTextColor,
    stripeColor: table.stripeColor,
    borderColor: table.borderColor,
  })) {
    if (!hexPattern.test(val)) {
      errors.push(`Invalid hex color for ${key}: ${val}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
