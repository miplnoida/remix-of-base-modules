/**
 * Common SSB Report Template for all PDF and Excel exports.
 * Provides branded headers, footers, and styling consistent with
 * Social Security Board identity.
 *
 * Usage:
 *   import { addSSBHeader, addSSBFooter, SSB_EXCEL_STYLES } from '@/lib/reportTemplate';
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

// ────────────────────────────────────────────
// Brand Constants
// ────────────────────────────────────────────
export const SSB_BRAND = {
  name: 'Social Security Board',
  country: 'St. Kitts and Nevis',
  address: 'Bay Road, P.O. Box 79, Basseterre, St. Kitts',
  phone: '(869) 465-2521',
  website: 'www.socialsecurity.kn',
  colors: {
    primary: [14, 95, 58] as [number, number, number],       // #0E5F3A
    primaryLight: [30, 142, 62] as [number, number, number],  // #1E8E3E
    gold: [244, 196, 48] as [number, number, number],         // #F4C430
    white: [255, 255, 255] as [number, number, number],
    lightGray: [248, 250, 252] as [number, number, number],
    darkText: [30, 30, 30] as [number, number, number],
    mutedText: [128, 128, 128] as [number, number, number],
  },
};

/**
 * Hydrates SSB_BRAND (name/country/address/phone/website) from the
 * Enterprise Context Resolver. Safe to call multiple times. Falls back
 * to the literal defaults above on any failure.
 *
 * Report generators may `await hydrateSsbBrand()` before rendering to
 * guarantee resolver-driven values. Otherwise the first render uses the
 * literal defaults and subsequent renders pick up resolved values.
 */
let _ssbHydratePromise: Promise<void> | null = null;
export function hydrateSsbBrand(moduleCode: string = 'REPORTS'): Promise<void> {
  if (_ssbHydratePromise) return _ssbHydratePromise;
  _ssbHydratePromise = (async () => {
    try {
      const { resolveEnterpriseContext } = await import('@/lib/enterprise/enterpriseContextResolver');
      const ctx = await resolveEnterpriseContext({ moduleCode });
      const org: any = ctx?.organization ?? {};
      const loc: any = ctx?.location ?? {};
      if (org.name) SSB_BRAND.name = org.name;
      if (org.country) SSB_BRAND.country = org.country;
      if (loc.address || org.address) SSB_BRAND.address = loc.address || org.address;
      if (loc.phone || org.phone) SSB_BRAND.phone = loc.phone || org.phone;
      if (org.website) SSB_BRAND.website = org.website;
    } catch { /* keep literal defaults */ }
  })();
  return _ssbHydratePromise;
}

// Fire-and-forget hydrate on module load so reports pick up resolved
// branding without each caller having to await.
void hydrateSsbBrand();


// ────────────────────────────────────────────
// PDF Report Template
// ────────────────────────────────────────────

export interface SSBReportConfig {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  additionalInfo?: { label: string; value: string }[];
  showLogo?: boolean;
  confidential?: boolean;
}

/**
 * Adds SSB branded header to a jsPDF document.
 * Returns the Y position after the header for content placement.
 */
export function addSSBHeader(doc: jsPDF, config: SSBReportConfig): number {
  const pw = doc.internal.pageSize.getWidth();
  const { colors } = SSB_BRAND;

  // Green header band
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pw, 32, 'F');

  // Gold accent line
  doc.setFillColor(...colors.gold);
  doc.rect(0, 32, pw, 2, 'F');

  // Organization name
  doc.setTextColor(...colors.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(SSB_BRAND.name, 14, 14);

  // Country
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(SSB_BRAND.country, 14, 22);

  // Address on right
  doc.setFontSize(7);
  doc.text(SSB_BRAND.address, pw - 14, 14, { align: 'right' });
  doc.text(`Tel: ${SSB_BRAND.phone} | ${SSB_BRAND.website}`, pw - 14, 20, { align: 'right' });

  // Confidential badge if needed
  if (config.confidential) {
    doc.setFontSize(7);
    doc.text('CONFIDENTIAL', pw - 14, 28, { align: 'right' });
  }

  // Report title
  let y = 44;
  doc.setTextColor(...colors.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(config.title, 14, y);
  y += 6;

  // Subtitle
  if (config.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mutedText);
    doc.text(config.subtitle, 14, y);
    y += 6;
  }

  // Additional info
  if (config.additionalInfo && config.additionalInfo.length > 0) {
    y += 2;
    doc.setFontSize(8);
    doc.setTextColor(...colors.darkText);
    config.additionalInfo.forEach((info) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${info.label}: `, 14, y);
      const labelWidth = doc.getTextWidth(`${info.label}: `);
      doc.setFont('helvetica', 'normal');
      doc.text(info.value, 14 + labelWidth, y);
      y += 5;
    });
  }

  // Separator line
  y += 2;
  doc.setDrawColor(...colors.primaryLight);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);
  y += 6;

  return y;
}

/**
 * Adds SSB branded footer to all pages of the document.
 */
export function addSSBFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const { colors } = SSB_BRAND;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.3);
    doc.line(14, ph - 18, pw - 14, ph - 18);

    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(...colors.mutedText);
    doc.text(
      `${SSB_BRAND.name} — ${SSB_BRAND.address}`,
      14,
      ph - 12
    );
    doc.text(
      `Generated: ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      pw - 14,
      ph - 12,
      { align: 'right' }
    );
  }
}

/**
 * AutoTable configuration preset for SSB branded tables.
 */
export function getSSBTableConfig(startY: number) {
  const { colors } = SSB_BRAND;
  return {
    startY,
    theme: 'grid' as const,
    styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 220] as [number, number, number] },
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontStyle: 'bold' as const,
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: colors.lightGray },
    margin: { top: 40, bottom: 22, left: 14, right: 14 },
    // Re-draw header on each new page
    didDrawPage: (data: any) => {
      // Mini header on continuation pages
      if (data.pageNumber > 1) {
        const doc = data.doc as jsPDF;
        const pw = doc.internal.pageSize.getWidth();
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pw, 12, 'F');
        doc.setFillColor(...colors.gold);
        doc.rect(0, 12, pw, 1, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`${SSB_BRAND.name} — Continued`, 14, 9);
      }
    },
  };
}

/**
 * Generates a complete SSB branded PDF report with a data table.
 */
export function generateSSBReport(
  config: SSBReportConfig,
  columns: { header: string; key: string }[],
  data: Record<string, any>[],
  fileName: string
) {
  const doc = new jsPDF({
    orientation: config.orientation || 'portrait',
  });

  const startY = addSSBHeader(doc, config);

  const headers = columns.map((c) => c.header);
  const body = data.map((row) =>
    columns.map((c) => {
      const v = row[c.key];
      if (v === null || v === undefined) return '-';
      if (typeof v === 'number') return v.toLocaleString();
      return String(v);
    })
  );

  autoTable(doc, {
    head: [headers],
    body,
    ...getSSBTableConfig(startY),
  });

  addSSBFooter(doc);
  doc.save(`${fileName}.pdf`);
}

// ────────────────────────────────────────────
// Excel Report Template
// ────────────────────────────────────────────

/**
 * Adds SSB branded header rows and styling to an ExcelJS worksheet.
 * Returns the row number where data should start.
 */
export function addSSBExcelHeader(
  ws: ExcelJS.Worksheet,
  title: string,
  subtitle?: string
): number {
  // Row 1: Organization name
  ws.mergeCells('A1:H1');
  const orgCell = ws.getCell('A1');
  orgCell.value = SSB_BRAND.name;
  orgCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  orgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E5F3A' } };
  orgCell.alignment = { horizontal: 'center' };
  ws.getRow(1).height = 28;

  // Row 2: Address
  ws.mergeCells('A2:H2');
  const addrCell = ws.getCell('A2');
  addrCell.value = `${SSB_BRAND.address} | Tel: ${SSB_BRAND.phone}`;
  addrCell.font = { size: 9, color: { argb: 'FFFFFFFF' } };
  addrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8E3E' } };
  addrCell.alignment = { horizontal: 'center' };
  ws.getRow(2).height = 20;

  // Row 3: Report title
  ws.mergeCells('A3:H3');
  const titleCell = ws.getCell('A3');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 12, color: { argb: 'FF0E5F3A' } };
  titleCell.alignment = { horizontal: 'center' };
  ws.getRow(3).height = 22;

  let dataStartRow = 4;

  // Row 4: Subtitle / date
  ws.mergeCells('A4:H4');
  const subCell = ws.getCell('A4');
  subCell.value = subtitle || `Generated: ${new Date().toLocaleDateString()}`;
  subCell.font = { size: 9, italic: true, color: { argb: 'FF666666' } };
  subCell.alignment = { horizontal: 'center' };
  dataStartRow = 6; // Leave a blank row 5

  return dataStartRow;
}

/**
 * Applies SSB branded styling to column header row in Excel.
 */
export function styleSSBExcelHeaderRow(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E5F3A' } };
  row.height = 24;
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0E5F3A' } },
      bottom: { style: 'thin', color: { argb: 'FFF4C430' } },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}
