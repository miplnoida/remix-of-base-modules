/**
 * Vector PDF generation for the Employer Audit Report.
 * Uses jsPDF + autoTable — produces real text, real page breaks,
 * repeating headers/footers. Replaces the old html2canvas raster path.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FullAuditReport, AuditReportSignature } from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';
import { formatDateForDisplay } from '@/lib/format-config';
import { supabase } from '@/integrations/supabase/client';

const BRAND = [14, 95, 58] as [number, number, number]; // #0E5F3A
const SEV_COLORS: Record<string, [number, number, number]> = {
  Low: [22, 163, 74],
  Medium: [202, 138, 4],
  High: [234, 88, 12],
  Critical: [220, 38, 38],
};

export interface BuildPdfInput {
  report: FullAuditReport;
  findings: InspectionFinding[];
  evidence: InspectionEvidence[];
  checklist: any[];
  signatures: AuditReportSignature[];
  variant: 'INTERNAL' | 'EMPLOYER';
}

export const auditReportPdfService = {
  /** Build a vector PDF and return the jsPDF instance. */
  build(input: BuildPdfInput): jsPDF {
    const { report, findings, evidence, checklist, signatures, variant } = input;
    const isEmployer = variant === 'EMPLOYER';
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    // ── Cover page ──
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SOCIAL SECURITY BOARD', pageWidth / 2, 32, { align: 'center' });

    doc.setTextColor(220, 38, 38);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1.5);
    const stampLabel = isEmployer ? 'EMPLOYER COPY' : 'CONFIDENTIAL — INTERNAL';
    const stampW = doc.getTextWidth(stampLabel) + 20;
    doc.rect((pageWidth - stampW) / 2, 110, stampW, 22);
    doc.setFontSize(11);
    doc.text(stampLabel, pageWidth / 2, 125, { align: 'center' });

    doc.setTextColor(...BRAND);
    doc.setFontSize(24);
    const title = isEmployer ? 'Employer Audit Acknowledgment Report' : 'Internal Audit Report';
    doc.text(title, pageWidth / 2, 200, { align: 'center' });

    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Compliance Field Audit Engagement', pageWidth / 2, 222, { align: 'center' });

    // Prominent employer identity panel on cover
    const panelY = 250;
    const panelH = 70;
    const panelMargin = 100;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(2);
    doc.setFillColor(240, 248, 244);
    doc.rect(panelMargin, panelY, pageWidth - panelMargin * 2, panelH, 'FD');
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(report.employerName ?? '—', pageWidth / 2, panelY + 26, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const auditDateStr = report.auditDate ? formatDateForDisplay(report.auditDate) : formatDateForDisplay(report.reportDate);
    const panelMeta = `Reg No: ${report.employerRegNumber ?? report.employerId ?? '—'}     Audit Date: ${auditDateStr}     Report No: ${report.reportNumber}`;
    doc.text(panelMeta, pageWidth / 2, panelY + 50, { align: 'center' });

    // Cover meta box
    const metaRows: [string, string][] = [
      ['Report Number', report.reportNumber],
      ['Employer', report.employerName ?? '—'],
      ['Registration No.', report.employerRegNumber ?? report.employerId ?? '—'],
      ['Audit Date', auditDateStr],
      ['Location', report.auditLocation ?? '—'],
      ['Inspector', report.inspectorName ?? '—'],
      ['Status', report.status],
    ];
    if (report.verificationRef) metaRows.push(['Verification Ref', report.verificationRef]);

    autoTable(doc, {
      startY: panelY + panelH + 30,
      margin: { left: 120, right: 120 },
      body: metaRows,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 130 },
        1: { halign: 'right' },
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          doc.setDrawColor(220, 220, 220);
          doc.setLineDashPattern([1, 1], 0);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          doc.setLineDashPattern([], 0);
        }
      },
    });

    // ── New page: body ──
    doc.addPage();
    let y = margin + 20;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 60) {
        doc.addPage();
        y = margin + 20;
      }
    };

    const sectionHeading = (text: string) => {
      ensureSpace(30);
      doc.setTextColor(...BRAND);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(text, margin, y);
      doc.setDrawColor(...BRAND);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 18;
    };

    const paragraph = (text: string) => {
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(text || '—', pageWidth - margin * 2);
      ensureSpace(lines.length * 12 + 6);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 8;
    };

    sectionHeading('1. Purpose & Scope');
    paragraph(report.purposeScope || report.scope || 'Not specified.');

    sectionHeading('2. Executive Summary');
    paragraph(report.executiveSummary || 'No executive summary provided.');

    sectionHeading('3. Records Reviewed');
    paragraph(report.recordsReviewed || 'No records reviewed entry recorded.');

    // Audit summary table
    sectionHeading('4. Audit Summary');
    const checklistAnswered = checklist.filter((c: any) => c.response).length;
    const sevCount = findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {});
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: [
        ['Total Findings', String(findings.length), 'Evidence Items', String(evidence.length)],
        ['Checklist Completion', `${report.checklistCompletionPct}% (${checklistAnswered}/${checklist.length})`, 'Violations Opened', String(report.totalViolations)],
        ['Critical', String(sevCount.Critical ?? 0), 'High', String(sevCount.High ?? 0)],
        ['Medium', String(sevCount.Medium ?? 0), 'Low', String(sevCount.Low ?? 0)],
      ],
      theme: 'grid',
      headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 4 },
    });
    y = (doc as any).lastAutoTable.finalY + 14;

    // Findings
    sectionHeading('5. Detailed Findings');
    if (findings.length === 0) {
      paragraph('No findings were recorded for this audit.');
    } else {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Finding', 'Severity', 'Category', 'Evid.']],
        body: findings.map((f, i) => [
          String(i + 1),
          {
            content: `${f.title}\n${f.description}${f.recommendedAction ? `\nAction: ${f.recommendedAction}` : ''}`,
            styles: { fontSize: 9 },
          } as any,
          f.severity,
          f.category || '—',
          String(f.evidenceIds?.length ?? 0),
        ]),
        theme: 'grid',
        headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 60, halign: 'center' },
          3: { cellWidth: 80 },
          4: { cellWidth: 35, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const sev = String(data.cell.raw);
            const c = SEV_COLORS[sev];
            if (c) {
              data.cell.styles.fillColor = c;
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 14;
    }

    // Evidence (internal only)
    if (!isEmployer && evidence.length > 0) {
      sectionHeading('6. Evidence Register (Internal)');
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'File', 'Type', 'Captured']],
        body: evidence.map((e, i) => [
          String(i + 1),
          `${e.fileName}${e.description ? `\n${e.description}` : ''}`,
          e.evidenceType,
          e.capturedAt ? formatDateForDisplay(e.capturedAt) : '—',
        ]),
        theme: 'grid',
        headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 80 },
          3: { cellWidth: 90 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 14;
    }

    sectionHeading(isEmployer ? '6. Required Actions' : '7. Recommendations');
    paragraph(report.recommendations || 'No recommendations issued.');

    sectionHeading(isEmployer ? '7. Compliance Conclusion' : '8. Conclusions');
    paragraph(report.complianceConclusion || report.conclusions || 'No conclusion recorded.');

    // ── Sampling disclaimer (mandatory before sign-off) ──
    sectionHeading(isEmployer ? '7a. Audit Scope Disclaimer' : '8a. Audit Scope Disclaimer');
    const disclaimerText =
      'Sampling Notice: This audit was conducted based on selected samples, records reviewed, and procedures performed during the stated audit period. The findings, observations, and conclusions expressed in this report are based solely on the sample examined and the information made available to the auditor at the time of the visit. They should not be interpreted as a complete or exhaustive review of all records, transactions, or compliance activities of the employer.\n\nThe Social Security Board reserves the right to conduct further reviews, request additional records, or initiate enforcement action should subsequent information indicate non-compliance beyond the scope of this audit.';
    {
      const lines = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2 - 20);
      const boxH = lines.length * 11 + 14;
      ensureSpace(boxH + 10);
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(1);
      doc.rect(margin, y, pageWidth - margin * 2, boxH, 'FD');
      doc.setLineWidth(2);
      doc.line(margin, y, margin, y + boxH);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(lines, margin + 10, y + 12);
      y += boxH + 14;
    }

    // ── Signature page ──
    doc.addPage();
    y = margin + 10;
    sectionHeading(isEmployer ? '8. Acknowledgment & Signatures' : '9. Sign-off');

    if (isEmployer) {
      doc.setFillColor(245, 247, 245);
      const ackText = `I, the undersigned representative of ${report.employerName ?? 'the employer'}, acknowledge that I have received and reviewed the contents of this audit report. My signature below indicates receipt of the report and does not constitute agreement with all findings unless explicitly stated in the comments section.`;
      const ackLines = doc.splitTextToSize(ackText, pageWidth - margin * 2 - 20);
      const boxH = ackLines.length * 11 + 14;
      doc.rect(margin, y, pageWidth - margin * 2, boxH, 'F');
      doc.setDrawColor(...BRAND);
      doc.setLineWidth(2);
      doc.line(margin, y, margin, y + boxH);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(ackLines, margin + 10, y + 12);
      y += boxH + 14;
    }

    // Dynamic signature blocks — render only what was actually captured.
    // No hardcoded "Lead Inspector" or "Supervisor" placeholders.
    // Employer Rep is shown even when missing (acknowledgment is the legal point of the report).
    const roleLabel: Record<AuditReportSignature['signerRole'], string> = {
      EMPLOYER_REP: 'Employer / Auditee Representative',
      INSPECTOR: 'Inspector',
      SUPERVISOR: 'Supervisor (Approval)',
      WITNESS: 'Witness',
    };

    type Block = { label: string; sig?: AuditReportSignature };
    const blocks: Block[] = [];

    const empSig = signatures.find((s) => s.signerRole === 'EMPLOYER_REP');
    blocks.push({ label: roleLabel.EMPLOYER_REP, sig: empSig });

    // Append any other captured signatures (inspector, supervisor approval, witness)
    // — only if they actually exist. Order: INSPECTOR → SUPERVISOR → WITNESS.
    (['INSPECTOR', 'SUPERVISOR', 'WITNESS'] as const).forEach((role) => {
      const s = signatures.find((x) => x.signerRole === role);
      if (s) blocks.push({ label: roleLabel[role], sig: s });
    });

    const colW = (pageWidth - margin * 2 - 20) / 2;
    for (let i = 0; i < blocks.length; i += 2) {
      ensureSpace(140);
      const startY = y;
      drawSignatureBlock(doc, margin, startY, colW, blocks[i].label, blocks[i].sig);
      if (blocks[i + 1]) {
        drawSignatureBlock(doc, margin + colW + 20, startY, colW, blocks[i + 1].label, blocks[i + 1].sig);
      }
      y = startY + 140;
    }

    // ── Repeating header, footer & DRAFT watermark on all pages ──
    const totalPages = (doc as any).internal.getNumberOfPages();
    const isDraft = report.status !== 'FINAL';
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // DRAFT watermark — every page when not FINAL
      if (isDraft) {
        doc.saveGraphicsState();
        // @ts-expect-error - GState exists at runtime
        doc.setGState(new doc.GState({ opacity: 0.10 }));
        doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(140);
        doc.text('DRAFT', pageWidth / 2, pageHeight / 2 + 50, { align: 'center', angle: -30 });
        doc.restoreGraphicsState();
      }

      if (p > 1) {
        // Header
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text(report.reportNumber, margin, 25);
        doc.text(report.employerName ?? '', pageWidth / 2, 25, { align: 'center' });
        doc.text(isEmployer ? 'EMPLOYER COPY' : 'CONFIDENTIAL', pageWidth - margin, 25, { align: 'right' });
        doc.setDrawColor(...BRAND);
        doc.setLineWidth(0.5);
        doc.line(margin, 30, pageWidth - margin, 30);
      }
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
      doc.text(`Report ID: ${report.reportNumber}`, margin, pageHeight - 18);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
      doc.text(`Verification: ${report.verificationRef ?? 'PENDING'}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
    }

    return doc;
  },

  /** Trigger client-side download. */
  download(input: BuildPdfInput, filename?: string) {
    const doc = this.build(input);
    const name = filename ?? `${input.report.reportNumber}-${input.variant.toLowerCase()}.pdf`;
    doc.save(name);
  },

  /** Build PDF and upload to storage; returns the public URL. */
  async buildAndUpload(input: BuildPdfInput): Promise<string> {
    const doc = this.build(input);
    const blob = doc.output('blob');
    const path = `audit-reports/${input.report.id}/v${input.report.currentVersion}-${input.variant.toLowerCase()}-${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from('documents')
      .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  },
};

function drawSignatureBlock(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  sig?: AuditReportSignature
) {
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(label.toUpperCase(), x, y + 10);

  const sigBoxY = y + 18;
  const sigBoxH = 60;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.5);

  const isRefused = sig && (sig.signatureType === 'REFUSED' || sig.signatureType === 'UNAVAILABLE');

  if (isRefused) {
    doc.setDrawColor(220, 38, 38);
    doc.setLineDashPattern([3, 3], 0);
    doc.rect(x, sigBoxY, width, sigBoxH);
    doc.setLineDashPattern([], 0);
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(sig.signatureType === 'REFUSED' ? 'REFUSED TO SIGN' : 'UNAVAILABLE', x + width / 2, sigBoxY + 25, { align: 'center' });
    if (sig.refusalReason) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 80, 80);
      const lines = doc.splitTextToSize(`Reason: ${sig.refusalReason}`, width - 10);
      doc.text(lines, x + 5, sigBoxY + 40);
    }
  } else if (sig?.signatureImageUrl) {
    try {
      doc.addImage(sig.signatureImageUrl, 'PNG', x, sigBoxY, Math.min(width, 200), sigBoxH);
    } catch {
      // ignore
    }
    doc.line(x, sigBoxY + sigBoxH, x + width, sigBoxY + sigBoxH);
  } else if (sig?.typedName) {
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text(`/s/ ${sig.typedName}`, x + 5, sigBoxY + 35);
    doc.setDrawColor(80, 80, 80);
    doc.line(x, sigBoxY + sigBoxH, x + width, sigBoxY + sigBoxH);
  } else {
    doc.line(x, sigBoxY + sigBoxH, x + width, sigBoxY + sigBoxH);
  }

  const metaY = sigBoxY + sigBoxH + 12;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(sig?.signerName ?? 'Pending', x, metaY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (sig?.signerDesignation) doc.text(sig.signerDesignation, x, metaY + 10);
  if (sig?.signedAt) doc.text(`Signed: ${formatDateForDisplay(sig.signedAt)}`, x, metaY + 20);
  else if (!sig) {
    doc.text('Name: ____________________', x, metaY + 10);
    doc.text('Date: ____________________', x, metaY + 20);
  }
}
