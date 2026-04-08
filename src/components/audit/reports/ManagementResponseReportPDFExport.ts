/**
 * PDF export for Management Response Report.
 * Reuses SSB branding from reportTemplate.ts.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SSB_BRAND, addSSBFooter } from '@/lib/reportTemplate';
import type { MgmtResponseReportData } from '@/lib/audit/managementResponseReportMapper';

export function generateManagementResponsePDF(data: MgmtResponseReportData) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const { colors } = SSB_BRAND;
  const margin = 14;

  // ─── COVER PAGE ───
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pw, 38, 'F');
  doc.setFillColor(...colors.gold);
  doc.rect(0, 38, pw, 2, 'F');

  doc.setTextColor(...colors.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(SSB_BRAND.name.toUpperCase(), margin, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(SSB_BRAND.country, margin, 24);
  doc.text('Internal Audit Department', margin, 31);

  doc.setFontSize(7);
  doc.text(SSB_BRAND.address, pw - margin, 16, { align: 'right' });
  doc.text(`Tel: ${SSB_BRAND.phone}`, pw - margin, 22, { align: 'right' });

  // Title
  let y = 58;
  doc.setTextColor(...colors.primary);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Management Response Report', pw / 2, y, { align: 'center' });
  y += 12;

  // Metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkText);
  const meta = [
    ['Audit Name', data.auditName],
    ['Department', data.department],
    ['Audit Period', data.auditPeriod],
    ['Report Date', data.reportDate],
  ];
  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.mutedText);
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkText);
    doc.text(value, margin + 35, y);
    y += 6;
  });
  y += 4;

  // Summary counts
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pw - margin * 2, 14, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  const summaryText = [
    `Total Findings: ${data.summary.totalFindings}`,
    `Open: ${data.summary.openFindings}`,
    `Closed: ${data.summary.closedFindings}`,
    `Overdue Actions: ${data.summary.overdueActions}`,
  ].join('    |    ');
  doc.text(summaryText, pw / 2, y + 9, { align: 'center' });
  y += 22;

  // Confidentiality
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);
  y += 6;
  doc.setFontSize(6);
  doc.setTextColor(...colors.mutedText);
  doc.setFont('helvetica', 'normal');
  doc.text('CONFIDENTIAL — This document contains information intended solely for the use of the addressee.', pw / 2, y, { align: 'center' });

  // ─── TABLE PAGE ───
  doc.addPage();

  autoTable(doc, {
    startY: 16,
    head: [[
      '#', 'Finding', 'Risk', 'Recommendation',
      'Management Response', 'Agreed Action', 'Owner', 'Target Date', 'Status',
    ]],
    body: data.rows.map((r, i) => [
      r.findingRef,
      r.findingTitle,
      r.riskRating,
      r.recommendation,
      r.managementResponse,
      r.agreedAction,
      r.responsibleOwner,
      r.targetDate,
      r.status,
    ]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: colors.lightGray },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 28 },
      2: { cellWidth: 16 },
      3: { cellWidth: 38 },
      4: { cellWidth: 42 },
      5: { cellWidth: 38 },
      6: { cellWidth: 22 },
      7: { cellWidth: 20 },
      8: { cellWidth: 16 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (hookData) => {
      // Color risk ratings
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const val = String(hookData.cell.raw);
        if (val === 'Critical') hookData.cell.styles.textColor = [220, 38, 38];
        else if (val === 'High') hookData.cell.styles.textColor = [234, 88, 12];
        else if (val === 'Medium') hookData.cell.styles.textColor = [202, 138, 4];
      }
      // Color status
      if (hookData.section === 'body' && hookData.column.index === 8) {
        const val = String(hookData.cell.raw);
        if (val === 'Completed' || val === 'Closed') hookData.cell.styles.textColor = [22, 163, 74];
        else if (val === 'Overdue') hookData.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  addSSBFooter(doc);

  const fileName = `Management-Response-Report-${data.auditName.replace(/[^a-zA-Z0-9]/g, '-')}`;
  doc.save(`${fileName}.pdf`);
}
