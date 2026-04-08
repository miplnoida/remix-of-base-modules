/**
 * PDF export for Management Response Report.
 * Uses the unified auditExportPrimitives for consistent branding.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DEFAULT_AUDIT_BRANDING,
  renderCoverPage,
  renderFooter,
  getAuditTableConfig,
  type ExportBranding,
} from '@/lib/audit/auditExportPrimitives';
import type { MgmtResponseReportData } from '@/lib/audit/managementResponseReportMapper';

export function generateManagementResponsePDF(data: MgmtResponseReportData) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pw = doc.internal.pageSize.getWidth();
  const branding: ExportBranding = DEFAULT_AUDIT_BRANDING;
  const margin = 14;

  // ─── COVER PAGE ───
  renderCoverPage(doc, branding, {
    title: 'Management Response Report',
    metadata: [
      { label: 'Audit Name', value: data.auditName },
      { label: 'Department', value: data.department },
      { label: 'Audit Period', value: data.auditPeriod },
      { label: 'Report Date', value: data.reportDate },
    ],
    showConfidentiality: true,
  });

  // Summary counts on cover
  let y = 120;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pw - margin * 2, 14, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...branding.primaryColor);
  const summaryText = [
    `Total Findings: ${data.summary.totalFindings}`,
    `Open: ${data.summary.openFindings}`,
    `Closed: ${data.summary.closedFindings}`,
    `Overdue Actions: ${data.summary.overdueActions}`,
  ].join('    |    ');
  doc.text(summaryText, pw / 2, y + 9, { align: 'center' });

  // ─── TABLE PAGE ───
  doc.addPage();

  autoTable(doc, {
    startY: 16,
    head: [[
      '#', 'Finding', 'Risk', 'Recommendation',
      'Management Response', 'Agreed Action', 'Owner', 'Target Date', 'Status',
    ]],
    body: data.rows.map((r) => [
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
      fillColor: branding.primaryColor,
      textColor: branding.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: branding.lightGray },
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

  renderFooter(doc, branding);

  const fileName = `Management-Response-Report-${data.auditName.replace(/[^a-zA-Z0-9]/g, '-')}`;
  doc.save(`${fileName}.pdf`);
}
