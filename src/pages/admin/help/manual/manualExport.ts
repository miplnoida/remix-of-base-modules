/**
 * Organisation Management — User Manual export utilities.
 *
 * Generates a full, paginated PDF (via jsPDF) and a proper DOCX
 * (via docx + file-saver) from the same source of truth used by the
 * on-screen manual: MANUAL_ENTRIES + BUSINESS_CASES + MANUAL_CONTENT.
 *
 * Both exporters walk the markdown line-by-line and honour headings,
 * bullets and paragraphs so the output is genuinely multi-page and
 * readable — not a screenshot of the first viewport.
 */
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from 'docx';
import { MANUAL_ENTRIES } from './_manualNav';
import { getManualContent } from './content';
import { getBusinessCase, renderBusinessCaseMarkdown } from './businessCases';

const DOC_TITLE = 'Organisation Management — User Manual';

/* ─────────────────────────  shared helpers  ───────────────────────── */

interface Block {
  kind: 'h1' | 'h2' | 'h3' | 'bullet' | 'p' | 'blank';
  text: string;
}

/** Strip markdown link syntax `[label](href)` → `label (href)`. */
function stripMd(line: string): string {
  return line
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^>\s?/, '');
}

/** Convert a markdown string into a linear list of typed blocks. */
function parseMarkdown(md: string): Block[] {
  const out: Block[] = [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push({ kind: 'p', text: raw });
      continue;
    }
    if (!line.trim()) {
      out.push({ kind: 'blank', text: '' });
      continue;
    }
    if (line.startsWith('### ')) {
      out.push({ kind: 'h3', text: stripMd(line.slice(4)) });
      continue;
    }
    if (line.startsWith('## ')) {
      out.push({ kind: 'h2', text: stripMd(line.slice(3)) });
      continue;
    }
    if (line.startsWith('# ')) {
      out.push({ kind: 'h1', text: stripMd(line.slice(2)) });
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      out.push({ kind: 'bullet', text: stripMd(line.slice(2)) });
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      out.push({ kind: 'blank', text: '' });
      continue;
    }
    out.push({ kind: 'p', text: stripMd(line) });
  }
  return out;
}

/** Assemble the full manual as one big markdown string. */
function buildFullMarkdown(): { title: string; group: string; slug: string; md: string }[] {
  return MANUAL_ENTRIES.map((entry) => {
    const bc = renderBusinessCaseMarkdown(getBusinessCase(entry.slug));
    const master = getManualContent(entry.slug) ?? '';
    return {
      title: entry.label,
      group: entry.group,
      slug: entry.slug,
      md: `${bc}\n${master}`.trim(),
    };
  });
}

/* ─────────────────────────────  PDF  ────────────────────────────── */

export function exportManualAsPdf(fileName = 'organisation-management-manual.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;

  let y = marginTop;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  const writeLines = (
    text: string,
    fontSize: number,
    style: 'normal' | 'bold' = 'normal',
    leftIndent = 0,
  ) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth - leftIndent) as string[];
    const lineHeight = fontSize * 1.35;
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX + leftIndent, y);
      y += lineHeight;
    }
  };

  // Cover page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(DOC_TITLE, marginX, y);
  y += 32;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(
    'A business-outcome guide to configuring Organisation Management and consuming its settings from business modules.',
    marginX,
    y,
    { maxWidth: contentWidth },
  );
  y += 40;

  // Table of contents
  writeLines('Table of Contents', 14, 'bold');
  y += 4;
  let lastGroup = '';
  for (const entry of MANUAL_ENTRIES) {
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      y += 6;
      writeLines(entry.group, 11, 'bold');
    }
    writeLines(`•  ${entry.label}`, 10, 'normal', 12);
  }

  // Pages
  const pages = buildFullMarkdown();
  for (const page of pages) {
    doc.addPage();
    y = marginTop;
    writeLines(page.group, 9, 'normal');
    y += 2;
    writeLines(page.title, 18, 'bold');
    y += 8;

    const blocks = parseMarkdown(page.md);
    for (const b of blocks) {
      switch (b.kind) {
        case 'h1':
          y += 6;
          writeLines(b.text, 16, 'bold');
          y += 4;
          break;
        case 'h2':
          y += 4;
          writeLines(b.text, 13, 'bold');
          y += 2;
          break;
        case 'h3':
          y += 2;
          writeLines(b.text, 11, 'bold');
          break;
        case 'bullet':
          writeLines(`•  ${b.text}`, 10, 'normal', 12);
          break;
        case 'p':
          writeLines(b.text, 10, 'normal');
          break;
        case 'blank':
          y += 4;
          break;
      }
    }
  }

  // Page numbers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${i} / ${total}`, pageWidth - marginX, pageHeight - 24, { align: 'right' });
  }

  doc.save(fileName);
}

/* ─────────────────────────────  DOCX  ───────────────────────────── */

function blocksToDocxParagraphs(blocks: Block[]): Paragraph[] {
  const out: Paragraph[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case 'h1':
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: b.text, bold: true })],
          }),
        );
        break;
      case 'h2':
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: b.text, bold: true })],
          }),
        );
        break;
      case 'h3':
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: b.text, bold: true })],
          }),
        );
        break;
      case 'bullet':
        out.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun(b.text)],
          }),
        );
        break;
      case 'p':
        out.push(new Paragraph({ children: [new TextRun(b.text)] }));
        break;
      case 'blank':
        out.push(new Paragraph({ children: [new TextRun('')] }));
        break;
    }
  }
  return out;
}

export async function exportManualAsDocx(
  fileName = 'organisation-management-manual.docx',
) {
  const pages = buildFullMarkdown();

  const children: Paragraph[] = [];

  // Cover
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: DOC_TITLE, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun(
          'A business-outcome guide to configuring Organisation Management and consuming its settings from business modules.',
        ),
      ],
    }),
    new Paragraph({ children: [new TextRun('')] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Table of Contents', bold: true })],
    }),
  );

  let lastGroup = '';
  for (const entry of MANUAL_ENTRIES) {
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: entry.group, bold: true })],
        }),
      );
    }
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun(entry.label)],
      }),
    );
  }

  // Sections
  for (const page of pages) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: page.group, italics: true, color: '666666' })],
      }),
    );
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: page.title, bold: true })],
      }),
    );
    children.push(...blocksToDocxParagraphs(parseMarkdown(page.md)));
  }

  const doc = new Document({
    creator: 'Organisation Management',
    title: DOC_TITLE,
    description: 'Business-outcome user manual',
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}
