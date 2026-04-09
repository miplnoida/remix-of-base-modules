/**
 * Unified Audit Export Primitives
 *
 * Centralized PDF helpers for ALL Internal Audit exports.
 * All audit reports (Audit Report, Management Response, Board Pack, Audit Plan)
 * consume these primitives to ensure consistent branding, colors, typography,
 * page structure, headers, footers, tables, and watermarks.
 *
 * ARCHITECTURE: Export branding should be resolved from the Document Foundation.
 * Use `brandingFromFoundation()` to convert Foundation config into ExportBranding.
 * The `DEFAULT_AUDIT_BRANDING` constant is a fallback only — Foundation is the
 * single source of truth for organization-wide formatting.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocumentFoundationConfig } from './documentFoundationTypes';

// ─── Branding Config (resolved from template) ───

export interface ExportBranding {
  orgName: string;
  country: string;
  department: string;
  address: string;
  phone: string;
  website?: string;
  /** Primary color as RGB tuple */
  primaryColor: [number, number, number];
  /** Secondary/accent color as RGB tuple */
  accentColor: [number, number, number];
  /** Table alternate row fill */
  altRowColor: [number, number, number];
  /** White */
  white: [number, number, number];
  /** Light gray for subtle backgrounds */
  lightGray: [number, number, number];
  /** Dark text color */
  darkText: [number, number, number];
  /** Muted/secondary text */
  mutedText: [number, number, number];
  /** Confidentiality label */
  confidentialityText: string;
  /** Logo base64 data URL (optional) */
  logoBase64?: string | null;
  /** Gap analysis / warning table header color (defaults to red) */
  gapHeaderColor: [number, number, number];
}

/**
 * @deprecated Use `brandingFromFoundation()` instead.
 * Hardcoded fallback — Foundation is the single source of truth.
 */
export const DEFAULT_AUDIT_BRANDING: ExportBranding = {
  orgName: 'Social Security Board',
  country: 'St. Kitts and Nevis',
  department: 'Internal Audit Department',
  address: 'Bay Road, P.O. Box 79, Basseterre, St. Kitts',
  phone: '(869) 465-2521',
  website: 'www.socialsecurity.kn',
  primaryColor: [14, 95, 58],        // #0E5F3A — SSB Green
  accentColor: [196, 167, 86],       // #C4A756 — Gold
  altRowColor: [240, 248, 244],      // Light green tint
  white: [255, 255, 255],
  lightGray: [248, 250, 252],
  darkText: [26, 26, 26],
  mutedText: [128, 128, 128],
  confidentialityText: 'CONFIDENTIAL — This document contains information intended solely for the use of the addressee.',
  logoBase64: null,
  gapHeaderColor: [183, 28, 28],     // #B71C1C — Dark red
};

/**
 * Build ExportBranding from the Document Foundation config.
 * This is the PREFERRED factory — Foundation is the single source of truth.
 */
export function brandingFromFoundation(foundation: DocumentFoundationConfig): ExportBranding {
  return {
    orgName: foundation.branding.orgName || DEFAULT_AUDIT_BRANDING.orgName,
    country: foundation.branding.country || DEFAULT_AUDIT_BRANDING.country,
    department: 'Internal Audit Department',
    address: foundation.branding.address || DEFAULT_AUDIT_BRANDING.address,
    phone: foundation.branding.phone || DEFAULT_AUDIT_BRANDING.phone,
    website: DEFAULT_AUDIT_BRANDING.website,
    primaryColor: hexToRgb(foundation.colorPalette.primary),
    accentColor: hexToRgb(foundation.colorPalette.gold || foundation.colorPalette.secondary),
    altRowColor: hexToRgb(foundation.tableStyle.stripeColor),
    white: [255, 255, 255],
    lightGray: [248, 250, 252],
    darkText: hexToRgb(foundation.colorPalette.text),
    mutedText: [128, 128, 128],
    confidentialityText: foundation.branding.confidentialLabel || DEFAULT_AUDIT_BRANDING.confidentialityText,
    logoBase64: foundation.branding.logoSource !== 'default' ? foundation.branding.logoSource : null,
    gapHeaderColor: foundation.colorPalette.gapAnalysisHeader
      ? hexToRgb(foundation.colorPalette.gapAnalysisHeader)
      : DEFAULT_AUDIT_BRANDING.gapHeaderColor,
  };
}

/**
 * @deprecated Use `brandingFromFoundation()` instead.
 * This function bypasses Foundation and builds branding from a report config fragment.
 * Kept only for backward compatibility with legacy callers.
 */
export function brandingFromReportConfig(branding: {
  orgName?: string;
  country?: string;
  address?: string;
  phone?: string;
}): ExportBranding {
  return {
    ...DEFAULT_AUDIT_BRANDING,
    orgName: branding.orgName || DEFAULT_AUDIT_BRANDING.orgName,
    country: branding.country || DEFAULT_AUDIT_BRANDING.country,
    address: branding.address || DEFAULT_AUDIT_BRANDING.address,
    phone: branding.phone || DEFAULT_AUDIT_BRANDING.phone,
  };
}

/**
 * @deprecated Use `brandingFromFoundation()` instead.
 * This function bypasses Foundation and builds branding from plan config fragments.
 * Kept only for backward compatibility with legacy callers.
 */
export function brandingFromPlanConfig(config: {
  orgName?: string;
  colorPalette?: { primary?: string; secondary?: string; accent?: string; text?: string };
}): ExportBranding {
  const palette = config.colorPalette || {};
  return {
    ...DEFAULT_AUDIT_BRANDING,
    orgName: config.orgName || DEFAULT_AUDIT_BRANDING.orgName,
    primaryColor: palette.primary ? hexToRgb(palette.primary) : DEFAULT_AUDIT_BRANDING.primaryColor,
    accentColor: palette.secondary || palette.accent
      ? hexToRgb(palette.secondary || palette.accent || '#C4A756')
      : DEFAULT_AUDIT_BRANDING.accentColor,
  };
}

// ─── Cover Page ───

export interface CoverPageOptions {
  title: string;
  subtitle?: string;
  fiscalYear?: string;
  version?: string;
  status?: string;
  preparedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  showConfidentiality?: boolean;
  /** Full-page colored cover (board pack style) vs band header */
  fullPageCover?: boolean;
  metadata?: { label: string; value: string }[];
}

/**
 * Renders a branded cover page.
 * Returns the Y position after the cover content.
 */
export function renderCoverPage(
  doc: jsPDF,
  branding: ExportBranding,
  options: CoverPageOptions
): number {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 16;

  if (options.fullPageCover) {
    return renderFullCoverPage(doc, branding, options);
  }

  // Band-style cover
  doc.setFillColor(...branding.primaryColor);
  doc.rect(0, 0, pw, 42, 'F');
  doc.setFillColor(...branding.accentColor);
  doc.rect(0, 42, pw, 2.5, 'F');

  // Org name
  doc.setTextColor(...branding.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.orgName.toUpperCase(), margin, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(branding.country, margin, 24);
  doc.text(branding.department, margin, 32);

  // Address right
  doc.setFontSize(7);
  doc.text(branding.address, pw - margin, 16, { align: 'right' });
  doc.text(`Tel: ${branding.phone}`, pw - margin, 22, { align: 'right' });

  // Logo
  if (branding.logoBase64) {
    try {
      doc.addImage(branding.logoBase64, 'PNG', pw - margin - 30, 8, 26, 26);
    } catch { /* ignore logo errors */ }
  }

  // Title
  let y = 64;
  doc.setTextColor(...branding.primaryColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(options.title, pw - margin * 2);
  doc.text(titleLines, pw / 2, y, { align: 'center' });
  y += titleLines.length * 10 + 8;

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...branding.mutedText);
    doc.text(options.subtitle, pw / 2, y, { align: 'center' });
    y += 14;
  }

  // Metadata grid
  const allMeta = options.metadata || [];
  if (options.fiscalYear) allMeta.unshift({ label: 'Fiscal Year', value: options.fiscalYear });
  if (options.version) allMeta.push({ label: 'Version', value: options.version });
  if (options.status) allMeta.push({ label: 'Status', value: options.status });
  if (options.preparedBy) allMeta.push({ label: 'Prepared By', value: options.preparedBy });

  if (allMeta.length > 0) {
    y += 4;
    doc.setFontSize(8);
    const colWidth = (pw - margin * 2) / 2;
    allMeta.forEach((meta, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const xPos = margin + col * colWidth;
      const yPos = y + row * 12;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...branding.mutedText);
      doc.text(meta.label, xPos, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...branding.darkText);
      doc.text(meta.value, xPos, yPos + 5);
    });
    y += Math.ceil(allMeta.length / 2) * 12 + 10;
  }

  // Confidentiality
  if (options.showConfidentiality !== false) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 6;
    doc.setFontSize(6.5);
    doc.setTextColor(...branding.mutedText);
    doc.setFont('helvetica', 'normal');
    doc.text(branding.confidentialityText, pw / 2, y, { align: 'center' });
  }

  return y + 10;
}

function renderFullCoverPage(
  doc: jsPDF,
  branding: ExportBranding,
  options: CoverPageOptions
): number {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Full background
  doc.setFillColor(...branding.primaryColor);
  doc.rect(0, 0, pw, ph, 'F');

  // Logo
  if (branding.logoBase64) {
    try {
      doc.addImage(branding.logoBase64, 'PNG', pw / 2 - 20, 25, 40, 40);
    } catch { /* ignore */ }
  }

  // Accent lines
  doc.setFillColor(...branding.accentColor);
  doc.rect(pw * 0.2, 80, pw * 0.6, 2.5, 'F');
  doc.rect(pw * 0.25, 85, pw * 0.5, 0.8, 'F');

  // Org name
  doc.setTextColor(...branding.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.orgName, pw / 2, 100, { align: 'center' });

  // Department
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(branding.department, pw / 2, 112, { align: 'center' });

  // Title — positioned well below department to avoid overlap
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  const titleY = 145;
  const titleLines = options.title.split('\n');
  titleLines.forEach((line, idx) => {
    doc.text(line, pw / 2, titleY + idx * 16, { align: 'center' });
  });

  // Fiscal year
  if (options.fiscalYear) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fiscal Year ${options.fiscalYear}`, pw / 2, titleY + titleLines.length * 16 + 24, { align: 'center' });
  }

  // Metadata
  const metaY = ph * 0.65;
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 230);
  const metaLines = [];
  if (options.version) metaLines.push(`Plan Version: ${options.version}`);
  if (options.status) metaLines.push(`Status: ${options.status}`);
  if (options.preparedBy) metaLines.push(`Prepared By: ${options.preparedBy}`);
  if (options.approvedBy) metaLines.push(`Approved By: ${options.approvedBy}`);
  if (options.approvedDate) metaLines.push(`Approved Date: ${options.approvedDate}`);
  metaLines.forEach((line, i) => {
    doc.text(line, pw / 2, metaY + i * 10, { align: 'center' });
  });

  // Confidentiality at bottom
  if (options.showConfidentiality !== false) {
    doc.setFontSize(8);
    doc.setTextColor(160, 175, 200);
    doc.text('CONFIDENTIAL', pw / 2, ph - 30, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pw / 2, ph - 22, { align: 'center' });
  }

  return 0; // Full cover page — no Y continuation
}

// ─── Page Header (continuation pages) ───

export interface PageHeaderOptions {
  sectionTitle: string;
  fiscalYear?: string;
  version?: number;
}

/**
 * Renders a branded header band on continuation pages.
 * Returns Y position after header.
 */
export function renderPageHeader(
  doc: jsPDF,
  branding: ExportBranding,
  options: PageHeaderOptions
): number {
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(...branding.primaryColor);
  doc.rect(0, 0, pw, 36, 'F');
  doc.setFillColor(...branding.accentColor);
  doc.rect(0, 36, pw, 2.5, 'F');

  doc.setTextColor(...branding.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.orgName, 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(branding.department, 14, 21);
  doc.setFontSize(8);
  doc.text(options.sectionTitle, 14, 29);

  if (options.fiscalYear) {
    const rightText = options.version
      ? `FY ${options.fiscalYear}  •  v${options.version}`
      : `FY ${options.fiscalYear}`;
    doc.text(rightText, pw - 14, 29, { align: 'right' });
  }

  return 50;
}

/**
 * Renders a mini header on table continuation pages.
 */
export function renderMiniHeader(doc: jsPDF, branding: ExportBranding): void {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...branding.primaryColor);
  doc.rect(0, 0, pw, 12, 'F');
  doc.setFillColor(...branding.accentColor);
  doc.rect(0, 12, pw, 1, 'F');
  doc.setTextColor(...branding.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`${branding.orgName} — Continued`, 14, 9);
}

// ─── Footer ───

export interface FooterOptions {
  /** Extra text like version info */
  extraText?: string;
  /** Whether to show generation date */
  showDate?: boolean;
}

/**
 * Adds branded footer to ALL pages of the document.
 */
export function renderFooter(
  doc: jsPDF,
  branding: ExportBranding,
  options: FooterOptions = {}
): void {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...branding.primaryColor);
    doc.setLineWidth(0.3);
    doc.line(14, ph - 18, pw - 14, ph - 18);

    doc.setFontSize(7);
    doc.setTextColor(...branding.mutedText);

    // Left: org name
    doc.text(`${branding.orgName} — ${branding.address}`, 14, ph - 12);

    // Center: extra text
    if (options.extraText) {
      doc.text(options.extraText, pw / 2, ph - 12, { align: 'center' });
    }

    // Right: page numbers + date
    const dateText = options.showDate !== false
      ? `Generated: ${new Date().toLocaleDateString()} | `
      : '';
    doc.text(`${dateText}Page ${i} of ${pageCount}`, pw - 14, ph - 12, { align: 'right' });
  }
}

// ─── Section Heading ───

/**
 * Renders a numbered section heading with primary-colored bar.
 * Returns the new Y position.
 */
export function renderSectionHeading(
  doc: jsPDF,
  branding: ExportBranding,
  title: string,
  y: number,
  options?: { sectionNumber?: number; fontSize?: number }
): number {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Page break check
  if (y > ph - 50) {
    doc.addPage();
    y = 20;
  }

  // Accent bar
  doc.setFillColor(...branding.primaryColor);
  doc.rect(margin, y - 4, 3, 12, 'F');

  // Title text
  doc.setTextColor(...branding.primaryColor);
  doc.setFontSize(options?.fontSize || 13);
  doc.setFont('helvetica', 'bold');
  const label = options?.sectionNumber ? `${options.sectionNumber}. ${title}` : title;
  doc.text(label, margin + 6, y + 4);

  y += 14;

  // Underline
  doc.setDrawColor(...branding.primaryColor);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 4, pw - margin, y - 4);

  return y + 4;
}

/**
 * Renders a section title with accent underline (simpler style for board packs).
 */
export function renderSectionTitle(
  doc: jsPDF,
  branding: ExportBranding,
  title: string,
  y: number
): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...branding.primaryColor);
  doc.text(title, 14, y);
  doc.setDrawColor(...branding.accentColor);
  doc.setLineWidth(0.8);
  doc.line(14, y + 2, pw / 3, y + 2);
  return y + 10;
}

// ─── Watermark ───

/**
 * Adds a diagonal watermark to the current page.
 */
export function renderWatermark(
  doc: jsPDF,
  text: string = 'DRAFT',
  opacity: number = 0.08
): void {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  doc.setFontSize(60);
  doc.setTextColor(180, 180, 180);
  try {
    (doc as any).setGState(new (doc as any).GState({ opacity }));
  } catch { /* older jsPDF fallback */ }
  doc.setFont('helvetica', 'bold');
  doc.text(text, pw / 2, ph / 2, { align: 'center', angle: 45 } as any);
  doc.restoreGraphicsState();
}

/**
 * Adds watermark to ALL pages.
 */
export function renderWatermarkAllPages(
  doc: jsPDF,
  text: string = 'DRAFT',
  opacity: number = 0.08
): void {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderWatermark(doc, text, opacity);
  }
}

// ─── Table Styles ───

/**
 * Returns standard autoTable config for branded tables.
 */
export function getAuditTableConfig(
  branding: ExportBranding,
  startY: number,
  options?: {
    fontSize?: number;
    cellPadding?: number;
    margin?: number;
    /** Whether to re-draw mini header on continuation pages */
    continuationHeader?: boolean;
  }
): Record<string, any> {
  const fontSize = options?.fontSize || 8;
  const cellPadding = options?.cellPadding || 3;
  const margin = options?.margin || 14;

  return {
    startY,
    theme: 'grid' as const,
    styles: {
      fontSize,
      cellPadding,
      lineColor: [220, 220, 220] as [number, number, number],
    },
    headStyles: {
      fillColor: branding.primaryColor,
      textColor: branding.white,
      fontStyle: 'bold' as const,
      fontSize,
    },
    alternateRowStyles: { fillColor: branding.altRowColor },
    margin: { top: 40, bottom: 22, left: margin, right: margin },
    ...(options?.continuationHeader
      ? {
          didDrawPage: (data: any) => {
            if (data.pageNumber > 1) {
              renderMiniHeader(data.doc as jsPDF, branding);
            }
          },
        }
      : {}),
  };
}

// ─── Paragraph ───

/**
 * Renders a text paragraph. Returns new Y position.
 */
export function renderParagraph(
  doc: jsPDF,
  branding: ExportBranding,
  text: string,
  y: number,
  options?: {
    margin?: number;
    fontSize?: number;
    maxWidth?: number;
    watermarkText?: string;
  }
): number {
  const margin = options?.margin || 16;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const maxWidth = options?.maxWidth || (pw - margin * 2);

  doc.setTextColor(...branding.darkText);
  doc.setFontSize(options?.fontSize || 9);
  doc.setFont('helvetica', 'normal');

  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string) => {
    if (y > ph - 25) {
      doc.addPage();
      y = 20;
      if (options?.watermarkText) renderWatermark(doc, options.watermarkText);
    }
    doc.text(line, margin, y);
    y += 5;
  });

  return y + 4;
}

// ─── Narrative Block ───

/**
 * Renders a titled narrative block (label + content).
 */
export function renderNarrativeBlock(
  doc: jsPDF,
  branding: ExportBranding,
  title: string,
  content: string | null | undefined,
  y: number
): number {
  if (!content) return y;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  if (y > 250) { doc.addPage(); y = 52; }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...branding.primaryColor);
  doc.text(title, 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...branding.darkText);
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(content, pw - 32);
  doc.text(lines, 16, y);
  y += lines.length * 5 + 8;
  return y;
}

// ─── Key-Value Table ───

/**
 * Renders a key-value pair table. Returns new Y position.
 */
export function renderKvTable(
  doc: jsPDF,
  branding: ExportBranding,
  pairs: [string, string][],
  y: number
): number {
  const filtered = pairs.filter(([, v]) => v && v.trim() !== '');
  if (filtered.length === 0) return y;
  autoTable(doc, {
    startY: y,
    body: filtered,
    styles: { fontSize: 10, cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0.3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, textColor: branding.primaryColor },
      1: { textColor: branding.darkText },
    },
    theme: 'plain',
    margin: { left: 14, right: 14 },
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

// ─── Approval Block ───

/**
 * Renders sign-off / approval lines.
 */
export function renderApprovalBlock(
  doc: jsPDF,
  branding: ExportBranding,
  signatories: { label: string; name?: string; roleTitle: string }[],
  y: number
): number {
  const ph = doc.internal.pageSize.getHeight();

  signatories.forEach((sig) => {
    if (y > ph - 40) { doc.addPage(); y = 20; }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...branding.mutedText);
    doc.text(sig.label, 16, y);
    y += 18;

    doc.setDrawColor(...branding.darkText);
    doc.setLineWidth(0.3);
    doc.line(16, y, 96, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...branding.darkText);
    doc.setFontSize(9);
    doc.text(sig.name || '—', 16, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...branding.mutedText);
    doc.text(sig.roleTitle, 16, y);
    y += 4;
    doc.text('Date: _______________', 16, y);
    y += 12;
  });

  return y;
}

// ─── Utility ───

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

/** Clean display value — no ugly dashes for empty data */
export function displayValue(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '' || val === '—') return fallback;
  return String(val);
}

/** Resolve field with fallbacks from multiple keys */
export function resolveField(obj: any, ...keys: string[]): any {
  for (const k of keys) {
    if (obj[k] !== null && obj[k] !== undefined && obj[k] !== '') return obj[k];
  }
  return null;
}

/** Load logo image as base64 for jsPDF embedding */
const _logoCache = new Map<string, string | null>();
export async function loadLogoBase64(logoSrc: string): Promise<string | null> {
  if (_logoCache.has(logoSrc)) return _logoCache.get(logoSrc) ?? null;
  try {
    const resp = await fetch(logoSrc);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const value = reader.result as string;
        _logoCache.set(logoSrc, value);
        resolve(value);
      };
      reader.onerror = () => {
        _logoCache.set(logoSrc, null);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    _logoCache.set(logoSrc, null);
    return null;
  }
}
