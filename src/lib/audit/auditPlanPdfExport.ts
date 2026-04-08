/**
 * Audit Plan PDF Export Engine
 *
 * Generates a professional PDF from a RenderPlan using jsPDF + jspdf-autotable.
 * Handles cover page, TOC, section numbering, zone-aware pagination,
 * watermarks, approval blocks, and appendix formatting.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RenderPlan, RenderPage } from './auditPlanRenderEngine';
import { getSectionPlaceholder } from './auditPlanRenderEngine';
import { formatPageNumber } from './auditPlanPaginationEngine';
import type { TocEntry } from './auditPlanPaginationEngine';

// ─── Constants ───

const INCH_TO_PT = 72;
const COVER_BG_HEIGHT = 200;

// ─── Main Export ───

export interface PdfExportOptions {
  /** Plan data for dynamic content */
  planData?: Record<string, any>;
  /** Filename (without .pdf) */
  filename?: string;
  /** Whether to return blob instead of triggering download */
  returnBlob?: boolean;
}

/**
 * Generates and downloads (or returns) an Audit Plan PDF.
 */
export async function exportAuditPlanPdf(
  renderPlan: RenderPlan,
  options: PdfExportOptions = {}
): Promise<Blob | void> {
  const { mapped, pages, tocEntries, showWatermark, watermarkText, outputMode } = renderPlan;
  const { planData = {}, filename = 'Audit_Plan', returnBlob = false } = options;

  // Page dimensions
  const layout = mapped.pageLayout;
  const isLandscape = layout.orientation === 'landscape';
  const pageSize = layout.pageSize === 'a4' ? 'a4' : layout.pageSize === 'legal' ? 'legal' : 'letter';

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: pageSize,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = layout.margins.left * INCH_TO_PT;
  const marginR = layout.margins.right * INCH_TO_PT;
  const marginT = layout.margins.top * INCH_TO_PT;
  const marginB = layout.margins.bottom * INCH_TO_PT;
  const contentW = pageW - marginL - marginR;

  // Typography
  const typo = mapped.typography;
  const branding = mapped.resolved.branding;
  const primaryColor = hexToRgb(branding.colorPalette.primary);
  const textColor = hexToRgb(branding.colorPalette.text);
  const accentColor = hexToRgb(branding.colorPalette.accent);

  // Track actual page numbers per zone for footer rendering
  let currentLogicalPage = 0;
  const zoneStartPages: Record<string, number> = {};

  // ─── Render Cover Page ───
  renderCoverPage(doc, renderPlan, { pageW, pageH, marginL, marginT, contentW, primaryColor, textColor, planData });

  // ─── Render TOC ───
  if (mapped.toc.enabled && tocEntries.length > 0) {
    doc.addPage();
    renderTocPage(doc, renderPlan, { marginL, marginT, contentW, primaryColor, textColor });
  }

  // ─── Render Body Sections ───
  const bodySections = pages.filter(
    (p) => !['cover_page', 'table_of_contents'].includes(p.sectionId)
  );

  for (let i = 0; i < bodySections.length; i++) {
    const page = bodySections[i];

    // Page break logic
    if (i > 0 || mapped.toc.enabled) {
      if (page.pageBreakBefore || i === 0) {
        doc.addPage();
      }
    } else if (!mapped.toc.enabled) {
      doc.addPage();
    }

    renderSectionPage(doc, page, renderPlan, {
      marginL, marginT, marginB, contentW, pageH, primaryColor, textColor, planData,
    });
  }

  // ─── Watermark on all pages ───
  if (showWatermark && watermarkText) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.saveGraphicsState();
      doc.setFontSize(60);
      doc.setTextColor(180, 180, 180);
      doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
      const textW = doc.getTextWidth(watermarkText);
      doc.text(watermarkText, pageW / 2 - textW / 2, pageH / 2, { angle: 45 });
      doc.restoreGraphicsState();
    }
  }

  // ─── Page Numbers ───
  renderPageNumbers(doc, renderPlan, { pageW, pageH, marginB });

  // ─── Output ───
  if (returnBlob) {
    return doc.output('blob');
  }
  doc.save(`${filename}.pdf`);
}

// ─── Cover Page ───

function renderCoverPage(
  doc: jsPDF,
  plan: RenderPlan,
  ctx: { pageW: number; pageH: number; marginL: number; marginT: number; contentW: number; primaryColor: [number, number, number]; textColor: [number, number, number]; planData: Record<string, any> }
) {
  const { mapped } = plan;
  const cover = mapped.cover;
  const branding = mapped.resolved.branding;

  // Cover background band
  doc.setFillColor(...ctx.primaryColor);
  doc.rect(0, 0, ctx.pageW, COVER_BG_HEIGHT, 'F');

  // Accent stripe
  const accentRgb = hexToRgb(branding.colorPalette.secondary);
  doc.setFillColor(...accentRgb);
  doc.rect(0, COVER_BG_HEIGHT, ctx.pageW, 4, 'F');

  // Logo placeholder
  if (branding.logoMode !== 'none') {
    doc.setFillColor(255, 255, 255);
    const logoSize = branding.logoSize === 'large' ? 50 : branding.logoSize === 'medium' ? 40 : 30;
    const logoX = branding.logoAlignment === 'center' ? ctx.pageW / 2 - logoSize / 2 :
                  branding.logoAlignment === 'right' ? ctx.pageW - ctx.marginL - logoSize : ctx.marginL;
    doc.roundedRect(logoX, 30, logoSize, logoSize, 4, 4, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('LOGO', logoX + logoSize / 2, 30 + logoSize / 2, { align: 'center', baseline: 'middle' });
  }

  // Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const titleY = branding.logoMode !== 'none' ? 110 : 80;
  doc.text(cover.titleText, ctx.pageW / 2, titleY, { align: 'center' });

  // Org name
  if (cover.showOrgName && branding.orgName) {
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(branding.orgName, ctx.pageW / 2, titleY + 24, { align: 'center' });
  }

  // Metadata below band
  let metaY = COVER_BG_HEIGHT + 30;
  doc.setFontSize(11);
  doc.setTextColor(...ctx.textColor);

  if (cover.showAuditableEntity && ctx.planData.entity_name) {
    doc.text(`Entity: ${ctx.planData.entity_name}`, ctx.marginL, metaY);
    metaY += 18;
  }

  if (cover.showPeriodCovered) {
    doc.text(`Fiscal Year: ${cover.fiscalYearDisplay}`, ctx.marginL, metaY);
    metaY += 18;
  }

  if (cover.showVersionNumber && ctx.planData.version) {
    doc.text(`Version: ${ctx.planData.version}`, ctx.marginL, metaY);
    metaY += 18;
  }

  if (cover.showIssueDate) {
    const date = ctx.planData.issue_date || new Date().toLocaleDateString();
    doc.text(`Date: ${date}`, ctx.marginL, metaY);
    metaY += 18;
  }

  if (cover.showConfidentialLabel && cover.confidentialLabel) {
    metaY += 20;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(cover.confidentialLabel, ctx.pageW / 2, metaY, { align: 'center' });
  }
}

// ─── TOC Page ───

function renderTocPage(
  doc: jsPDF,
  plan: RenderPlan,
  ctx: { marginL: number; marginT: number; contentW: number; primaryColor: [number, number, number]; textColor: [number, number, number] }
) {
  const { tocEntries, mapped } = plan;

  // TOC heading
  doc.setFontSize(mapped.typography.h1Size);
  doc.setTextColor(...ctx.primaryColor);
  doc.text(mapped.toc.title, ctx.marginL, ctx.marginT);

  // Separator line
  doc.setDrawColor(...ctx.primaryColor);
  doc.setLineWidth(1);
  doc.line(ctx.marginL, ctx.marginT + 8, ctx.marginL + ctx.contentW, ctx.marginT + 8);

  // Entries
  let y = ctx.marginT + 28;
  doc.setFontSize(mapped.typography.baseFontSize);

  for (const entry of tocEntries) {
    doc.setTextColor(...ctx.textColor);
    const indent = (entry.depth - 1) * 20;
    const label = entry.sectionNumber ? `${entry.sectionNumber}. ${entry.label}` : entry.label;

    doc.text(label, ctx.marginL + indent, y);

    if (entry.pageNumber && mapped.toc.showPageNumbers) {
      doc.text(entry.pageNumber, ctx.marginL + ctx.contentW, y, { align: 'right' });

      // Leader dots
      if (mapped.toc.showLeaderDots) {
        const labelW = doc.getTextWidth(label);
        const pageNumW = doc.getTextWidth(entry.pageNumber);
        const dotStart = ctx.marginL + indent + labelW + 8;
        const dotEnd = ctx.marginL + ctx.contentW - pageNumW - 4;
        if (dotEnd > dotStart) {
          doc.setTextColor(180, 180, 180);
          const dots = '.'.repeat(Math.max(0, Math.floor((dotEnd - dotStart) / 3)));
          doc.text(dots, dotStart, y);
        }
      }
    }

    y += mapped.typography.baseFontSize + 6;
  }
}

// ─── Section Page ───

function renderSectionPage(
  doc: jsPDF,
  page: RenderPage,
  plan: RenderPlan,
  ctx: {
    marginL: number; marginT: number; marginB: number; contentW: number;
    pageH: number; primaryColor: [number, number, number]; textColor: [number, number, number];
    planData: Record<string, any>;
  }
) {
  const { mapped } = plan;
  const typo = mapped.typography;

  // Section heading
  const heading = page.sectionNumber
    ? `${page.sectionNumber}. ${page.label}`
    : page.label;

  doc.setFontSize(typo.h2Size);
  doc.setTextColor(...ctx.primaryColor);
  doc.text(heading, ctx.marginL, ctx.marginT);

  // Underline
  doc.setDrawColor(...ctx.primaryColor);
  doc.setLineWidth(0.5);
  doc.line(ctx.marginL, ctx.marginT + 4, ctx.marginL + ctx.contentW, ctx.marginT + 4);

  // Section content
  let y = ctx.marginT + 20;

  // Approval block
  if (page.sectionId === 'approval_signoff' && mapped.approval.signatories.length > 0) {
    renderApprovalBlock(doc, plan, { y, marginL: ctx.marginL, contentW: ctx.contentW, textColor: ctx.textColor, primaryColor: ctx.primaryColor });
    return;
  }

  // Table-mode sections
  if (page.displayMode === 'table') {
    renderTablePlaceholder(doc, page, plan, { y, marginL: ctx.marginL, contentW: ctx.contentW });
    return;
  }

  // Narrative content
  doc.setFontSize(typo.baseFontSize);
  doc.setTextColor(...ctx.textColor);
  const placeholder = getSectionPlaceholder(page.sectionId);
  const lines = doc.splitTextToSize(placeholder, ctx.contentW);
  doc.text(lines, ctx.marginL, y);
}

// ─── Approval Block ───

function renderApprovalBlock(
  doc: jsPDF,
  plan: RenderPlan,
  ctx: { y: number; marginL: number; contentW: number; textColor: [number, number, number]; primaryColor: [number, number, number] }
) {
  const approval = plan.mapped.approval;
  let y = ctx.y;

  for (const sig of approval.signatories) {
    doc.setFontSize(10);
    doc.setTextColor(...ctx.textColor);
    doc.text(sig.label, ctx.marginL, y);

    if (approval.showSignatureLine) {
      y += 24;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(ctx.marginL, y, ctx.marginL + 180, y);
      y += 4;
    } else {
      y += 14;
    }

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(sig.roleTitle, ctx.marginL, y);

    if (approval.showDateField) {
      doc.text('Date: _______________', ctx.marginL + 200, y);
    }

    y += 30;
  }
}

// ─── Table Placeholder ───

function renderTablePlaceholder(
  doc: jsPDF,
  page: RenderPage,
  plan: RenderPlan,
  ctx: { y: number; marginL: number; contentW: number }
) {
  const tableStyle = plan.mapped.tableStyle;
  const headerBg = hexToRgb(tableStyle.headerBackground);
  const headerText = hexToRgb(tableStyle.headerTextColor);

  // Sample table for section
  const sampleColumns = getSampleColumns(page.sectionId);
  const sampleRows = getSampleRows(page.sectionId);

  autoTable(doc, {
    startY: ctx.y,
    margin: { left: ctx.marginL },
    tableWidth: ctx.contentW,
    head: [sampleColumns],
    body: sampleRows,
    headStyles: {
      fillColor: headerBg,
      textColor: headerText,
      fontStyle: 'bold',
      fontSize: tableStyle.fontSize === 'small' ? 8 : 9,
      cellPadding: tableStyle.cellPadding * 0.75,
    },
    bodyStyles: {
      fontSize: tableStyle.fontSize === 'small' ? 8 : 9,
      cellPadding: tableStyle.cellPadding * 0.75,
    },
    alternateRowStyles: tableStyle.stripedRows
      ? { fillColor: hexToRgb(tableStyle.stripeColor) }
      : undefined,
    styles: {
      lineColor: hexToRgb(tableStyle.borderColor),
      lineWidth: 0.5,
    },
  });
}

// ─── Page Numbers ───

function renderPageNumbers(
  doc: jsPDF,
  plan: RenderPlan,
  ctx: { pageW: number; pageH: number; marginB: number }
) {
  const pagination = plan.mapped.pagination;
  if (!pagination.showPageNumbers) return;

  const totalPages = doc.getNumberOfPages();
  const isTopRight = pagination.position === 'top-right';
  const isBottomRight = pagination.position === 'bottom-right';

  // Determine zone boundaries
  // Page 1 = cover, Page 2 = TOC (if enabled), rest = body
  const tocPageCount = plan.mapped.toc.enabled && plan.tocEntries.length > 0 ? 1 : 0;
  const frontMatterEnd = 1 + tocPageCount; // cover + TOC
  const bodyStart = frontMatterEnd + 1;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Skip cover if configured
    if (p === 1 && pagination.hideOnCover) continue;

    let pageNum: string;
    if (p <= frontMatterEnd) {
      // Front matter
      pageNum = formatPageNumber(p, pagination.frontMatterStyle);
    } else {
      // Body
      const bodyPage = p - frontMatterEnd;
      pageNum = formatPageNumber(bodyPage, pagination.bodyStyle);
    }

    if (!pageNum) continue;

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);

    const y = isTopRight ? 30 : ctx.pageH - ctx.marginB / 2;
    const x = isBottomRight || isTopRight ? ctx.pageW - 50 : ctx.pageW / 2;
    const align = isBottomRight || isTopRight ? 'right' : 'center';

    doc.text(pageNum, x, y, { align: align as any });
  }
}

// ─── Utilities ───

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function getSampleColumns(sectionId: string): string[] {
  const columnMap: Record<string, string[]> = {
    document_control: ['Version', 'Date', 'Author', 'Changes'],
    risk_assessment_summary: ['Risk Area', 'Risk Level', 'Impact', 'Likelihood', 'Score'],
    focus_areas: ['Focus Area', 'Key Questions', 'Risk Level'],
    planned_procedures: ['Procedure', 'Objective', 'Expected Evidence'],
    information_required: ['Document/Data', 'Source', 'Due Date'],
    resource_plan: ['Staff Member', 'Role', 'Audit Days', 'Allocation %'],
    timeline_milestones: ['Milestone', 'Target Date', 'Status'],
    deliverables: ['Deliverable', 'Due Date', 'Recipient'],
  };
  return columnMap[sectionId] ?? ['Item', 'Description', 'Status'];
}

function getSampleRows(sectionId: string): string[][] {
  const rowMap: Record<string, string[][]> = {
    document_control: [
      ['1.0', 'Draft', 'Internal Auditor', 'Initial draft'],
      ['1.1', 'Review', 'Manager', 'Peer review comments incorporated'],
    ],
    risk_assessment_summary: [
      ['Financial Controls', 'High', 'High', 'Medium', '15'],
      ['IT Security', 'Medium', 'High', 'Low', '10'],
      ['Compliance', 'High', 'Medium', 'High', '14'],
    ],
    resource_plan: [
      ['Lead Auditor', 'Lead', '40', '50%'],
      ['Staff Auditor', 'Support', '30', '37%'],
      ['IT Specialist', 'Specialist', '10', '13%'],
    ],
    timeline_milestones: [
      ['Planning Complete', 'Q1', 'Planned'],
      ['Fieldwork Start', 'Q2', 'Planned'],
      ['Report Issued', 'Q3', 'Planned'],
    ],
  };
  return rowMap[sectionId] ?? [
    ['Sample item 1', 'Description of item', 'Active'],
    ['Sample item 2', 'Description of item', 'Planned'],
  ];
}
