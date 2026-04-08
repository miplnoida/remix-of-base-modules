/**
 * Audit Plan DOCX Export Engine
 *
 * Generates a professional Word document from a RenderPlan using the docx library.
 * Handles cover page, TOC, section numbering, zone-aware pagination,
 * approval blocks, and configurable typography.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, TableOfContents,
  LevelFormat, PageOrientation,
} from 'docx';
import { saveAs } from 'file-saver';
import type { RenderPlan, RenderPage } from './auditPlanRenderEngine';
import { getSectionPlaceholder } from './auditPlanRenderEngine';
import {
  getPageDimensions,
  getMarginsDXA,
  getContentWidthDXA,
  ptToHalfPt,
  ptToDxa,
  getDocxTypographyStyles,
} from './auditPlanLayoutEngine';

// ─── Constants ───

const CELL_BORDER: import('docx').IBorderOptions = {
  style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC',
};
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

// ─── Main Export ───

export interface DocxExportOptions {
  planData?: Record<string, any>;
  filename?: string;
  returnBlob?: boolean;
}

/**
 * Generates and downloads (or returns) an Audit Plan DOCX.
 */
export async function exportAuditPlanDocx(
  renderPlan: RenderPlan,
  options: DocxExportOptions = {}
): Promise<Blob | void> {
  const { mapped, pages, tocEntries, showWatermark, watermarkText, outputMode } = renderPlan;
  const { planData = {}, filename = 'Audit_Plan', returnBlob = false } = options;

  const layout = mapped.pageLayout;
  const typo = mapped.typography;
  const branding = mapped.resolved.branding;
  const dims = getPageDimensions(layout);
  const margins = getMarginsDXA(layout);
  const contentWidth = getContentWidthDXA(layout);
  const styles = getDocxTypographyStyles(typo);
  const primaryHex = branding.colorPalette.primary.replace('#', '');
  const headerBgHex = mapped.tableStyle.headerBackground.replace('#', '');
  const headerTextHex = mapped.tableStyle.headerTextColor.replace('#', '');

  // ─── Build Sections ───

  const docSections: import('docx').ISectionOptions[] = [];

  // 1. Cover Page Section
  docSections.push(buildCoverSection(renderPlan, { dims, margins, primaryHex, contentWidth, planData }));

  // 2. Body Sections (TOC + content sections)
  const bodyChildren: Paragraph[] = [];

  // TOC
  if (mapped.toc.enabled && tocEntries.length > 0) {
    bodyChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: mapped.toc.title, bold: true, font: typo.headingFont, size: ptToHalfPt(typo.h1Size), color: primaryHex })],
      }),
    );
    // TOC entries as styled paragraphs (TOC field is updated on open in Word)
    for (const entry of tocEntries) {
      const label = entry.sectionNumber ? `${entry.sectionNumber}. ${entry.label}` : entry.label;
      const pageStr = mapped.toc.showPageNumbers && entry.pageNumber ? `  ${entry.pageNumber}` : '';
      bodyChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: label, font: typo.fontFamily, size: ptToHalfPt(typo.baseFontSize) }),
            ...(pageStr ? [new TextRun({ text: pageStr, font: typo.fontFamily, size: ptToHalfPt(typo.baseFontSize), color: '999999' })] : []),
          ],
          spacing: { after: ptToDxa(3) },
          indent: { left: (entry.depth - 1) * 360 },
        })
      );
    }
    bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Content sections
  const contentSections = pages.filter(
    (p) => !['cover_page', 'table_of_contents'].includes(p.sectionId)
  );

  for (let i = 0; i < contentSections.length; i++) {
    const page = contentSections[i];

    // Page break
    if (page.pageBreakBefore && i > 0) {
      bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Section heading
    const headingText = page.sectionNumber
      ? `${page.sectionNumber}. ${page.label}`
      : page.label;

    bodyChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({
          text: headingText,
          bold: true,
          font: typo.headingFont,
          size: ptToHalfPt(typo.h2Size),
          color: primaryHex,
        })],
        spacing: { before: ptToDxa(typo.paragraphSpacingBefore + 4), after: ptToDxa(typo.paragraphSpacingAfter + 2) },
      })
    );

    // Approval block
    if (page.sectionId === 'approval_signoff') {
      bodyChildren.push(...buildApprovalParagraphs(renderPlan, { primaryHex }));
      continue;
    }

    // Content
    const placeholder = getSectionPlaceholder(page.sectionId);
    bodyChildren.push(
      new Paragraph({
        children: [new TextRun({
          text: placeholder,
          font: typo.fontFamily,
          size: ptToHalfPt(typo.baseFontSize),
          color: branding.colorPalette.text.replace('#', ''),
        })],
        spacing: {
          before: ptToDxa(typo.paragraphSpacingBefore),
          after: ptToDxa(typo.paragraphSpacingAfter),
          line: Math.round(typo.lineHeight * 240),
        },
      })
    );
  }

  // Build body section with header/footer
  docSections.push({
    properties: {
      page: {
        size: {
          width: dims.width,
          height: dims.height,
          orientation: layout.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
        },
        margin: margins,
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: branding.orgName || 'Internal Audit', font: typo.fontFamily, size: ptToHalfPt(8), color: '999999' }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: primaryHex, space: 4 } },
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: mapped.pagination.position === 'bottom-center' ? AlignmentType.CENTER : AlignmentType.RIGHT,
            children: [
              new TextRun({
                children: [
                  ...(showWatermark ? [`${watermarkText}  |  `] : []),
                  'Page ', PageNumber.CURRENT,
                ],
                font: typo.fontFamily,
                size: ptToHalfPt(8),
                color: '999999',
              }),
            ],
          }),
        ],
      }),
    },
    children: bodyChildren,
  });

  // ─── Build Document ───

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: typo.fontFamily, size: ptToHalfPt(typo.baseFontSize) },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ptToHalfPt(typo.h1Size), bold: true, font: typo.headingFont, color: primaryHex },
          paragraph: { spacing: { before: ptToDxa(8), after: ptToDxa(6) }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ptToHalfPt(typo.h2Size), bold: true, font: typo.headingFont, color: primaryHex },
          paragraph: { spacing: { before: ptToDxa(6), after: ptToDxa(4) }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ptToHalfPt(typo.h3Size), bold: true, font: typo.headingFont, color: primaryHex },
          paragraph: { spacing: { before: ptToDxa(4), after: ptToDxa(2) }, outlineLevel: 2 },
        },
      ],
    },
    sections: docSections,
  });

  // ─── Pack & Output ───
  const buffer = await Packer.toBlob(doc);
  if (returnBlob) return buffer;
  saveAs(buffer, `${filename}.docx`);
}

// ─── Cover Section Builder ───

function buildCoverSection(
  plan: RenderPlan,
  ctx: { dims: { width: number; height: number }; margins: any; primaryHex: string; contentWidth: number; planData: Record<string, any> }
): import('docx').ISectionOptions {
  const { mapped } = plan;
  const cover = mapped.cover;
  const branding = mapped.resolved.branding;
  const typo = mapped.typography;

  const children: Paragraph[] = [];

  // Spacer
  children.push(new Paragraph({ spacing: { before: 2400 }, children: [] }));

  // Logo placeholder
  if (branding.logoMode !== 'none') {
    children.push(new Paragraph({
      alignment: branding.logoAlignment === 'center' ? AlignmentType.CENTER :
                 branding.logoAlignment === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({ text: '[LOGO]', font: typo.headingFont, size: ptToHalfPt(14), color: ctx.primaryHex })],
      spacing: { after: 400 },
    }));
  }

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: cover.titleText, bold: true, font: typo.headingFont, size: ptToHalfPt(28), color: ctx.primaryHex })],
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ctx.primaryHex, space: 8 } },
  }));

  // Org name
  if (cover.showOrgName && branding.orgName) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: branding.orgName, font: typo.headingFont, size: ptToHalfPt(14), color: '666666' })],
      spacing: { after: 200 },
    }));
  }

  // Metadata
  const metaItems: string[] = [];
  if (cover.showPeriodCovered) metaItems.push(`Fiscal Year: ${cover.fiscalYearDisplay}`);
  if (cover.showVersionNumber && ctx.planData.version) metaItems.push(`Version: ${ctx.planData.version}`);
  if (cover.showIssueDate) metaItems.push(`Date: ${ctx.planData.issue_date || new Date().toLocaleDateString()}`);

  for (const item of metaItems) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: item, font: typo.fontFamily, size: ptToHalfPt(11), color: '444444' })],
      spacing: { after: 80 },
    }));
  }

  // Confidential label
  if (cover.showConfidentialLabel && cover.confidentialLabel) {
    children.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: cover.confidentialLabel, font: typo.fontFamily, size: ptToHalfPt(9), color: '999999', italics: true })],
    }));
  }

  return {
    properties: {
      page: {
        size: { width: ctx.dims.width, height: ctx.dims.height },
        margin: ctx.margins,
      },
    },
    children,
  };
}

// ─── Approval Paragraphs ───

function buildApprovalParagraphs(
  plan: RenderPlan,
  ctx: { primaryHex: string }
): Paragraph[] {
  const approval = plan.mapped.approval;
  const typo = plan.mapped.typography;
  const paragraphs: Paragraph[] = [];

  for (const sig of approval.signatories) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: sig.label, bold: true, font: typo.fontFamily, size: ptToHalfPt(10) })],
      spacing: { before: ptToDxa(12) },
    }));

    if (approval.showSignatureLine) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { before: ptToDxa(20) },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA', space: 2 } },
      }));
    }

    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: sig.roleTitle, font: typo.fontFamily, size: ptToHalfPt(9), color: '888888' })],
      spacing: { after: ptToDxa(4) },
    }));

    if (approval.showDateField) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: 'Date: _______________', font: typo.fontFamily, size: ptToHalfPt(9), color: '888888' })],
        spacing: { after: ptToDxa(8) },
      }));
    }
  }

  return paragraphs;
}
