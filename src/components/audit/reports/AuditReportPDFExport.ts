/**
 * Enterprise-grade PDF export for Internal Audit reports.
 * Uses jsPDF + jspdf-autotable with SSB branding from reportTemplate.ts.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SSB_BRAND, addSSBFooter } from '@/lib/reportTemplate';
import { formatDateForDisplay } from '@/lib/format-config';

interface PDFExportParams {
  reportData: any;
  findings: any[];
  responses: any[];
  actions: any[];
  engagement?: any;
  departmentName?: string;
}

export function generateAuditReportPDF({
  reportData, findings, responses, actions, engagement, departmentName,
}: PDFExportParams) {
  const doc = new jsPDF({ orientation: 'portrait' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const { colors } = SSB_BRAND;
  const isDraft = reportData.status === 'Draft' || reportData.status === 'In Review';
  const margin = 16;
  const contentWidth = pw - margin * 2;

  // ─── COVER PAGE ───
  // Green header band
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pw, 45, 'F');
  doc.setFillColor(...colors.gold);
  doc.rect(0, 45, pw, 2, 'F');

  doc.setTextColor(...colors.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(SSB_BRAND.name, margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(SSB_BRAND.country, margin, 27);
  doc.setFontSize(9);
  doc.text('Internal Audit Department', margin, 35);

  // Address right
  doc.setFontSize(7);
  doc.text(SSB_BRAND.address, pw - margin, 18, { align: 'right' });
  doc.text(`Tel: ${SSB_BRAND.phone}`, pw - margin, 24, { align: 'right' });

  // Report Title
  let y = 80;
  doc.setTextColor(...colors.primary);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(reportData.title || 'Audit Report', contentWidth);
  doc.text(titleLines, pw / 2, y, { align: 'center' });
  y += titleLines.length * 10 + 8;

  // Report Type Badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mutedText);
  doc.text(reportData.report_type || 'Engagement Report', pw / 2, y, { align: 'center' });
  y += 20;

  // Metadata grid
  const metaItems = [
    ['Fiscal Year', reportData.fiscal_year || '—'],
    ['Department', departmentName || '—'],
    ['Report Number', reportData.report_number || '—'],
    ['Date', reportData.generated_on ? formatDateForDisplay(reportData.generated_on) : new Date().toLocaleDateString()],
    ['Prepared By', reportData.prepared_by || '—'],
    ['Status', reportData.status || 'Draft'],
  ];

  doc.setFontSize(8);
  const colWidth = contentWidth / 2;
  metaItems.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const xPos = margin + col * colWidth;
    const yPos = y + row * 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mutedText);
    doc.text(label, xPos, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.darkText);
    doc.text(value, xPos, yPos + 5);
  });
  y += Math.ceil(metaItems.length / 2) * 12 + 15;

  // Confidentiality notice
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(...colors.mutedText);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL', pw / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  const confText = 'This document is the property of the Social Security Board, St. Kitts and Nevis. Unauthorized distribution is strictly prohibited.';
  const confLines = doc.splitTextToSize(confText, contentWidth - 20);
  doc.text(confLines, pw / 2, y, { align: 'center' });

  // Draft watermark on cover
  if (isDraft) addDraftWatermark(doc);

  // ─── CONTENT PAGES ───
  doc.addPage();
  y = 20;

  const addSectionHeader = (title: string, num?: number) => {
    if (y > ph - 50) { doc.addPage(); y = 20; if (isDraft) addDraftWatermark(doc); }
    doc.setFillColor(...colors.primary);
    doc.rect(margin, y - 4, 3, 12, 'F');
    doc.setTextColor(...colors.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(num ? `${num}. ${title}` : title, margin + 6, y + 4);
    y += 14;
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 4, pw - margin, y - 4);
    y += 4;
  };

  const addParagraph = (text: string) => {
    doc.setTextColor(...colors.darkText);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      if (y > ph - 25) { doc.addPage(); y = 20; if (isDraft) addDraftWatermark(doc); }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;
  };

  let sn = 0;

  // Executive Summary
  if (reportData.executive_summary) {
    addSectionHeader('Executive Summary', ++sn);
    if (reportData.overall_assessment) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(`Overall Assessment: ${reportData.overall_assessment}`, margin, y);
      y += 8;
    }
    addParagraph(reportData.executive_summary);
  }

  // Background
  if (reportData.background) {
    addSectionHeader('Audit Background', ++sn);
    addParagraph(reportData.background);
  }

  // Objective
  if (reportData.audit_objective) {
    addSectionHeader('Audit Objective', ++sn);
    addParagraph(reportData.audit_objective);
  }

  // Scope
  if (reportData.audit_scope) {
    addSectionHeader('Scope', ++sn);
    addParagraph(reportData.audit_scope);
  }

  // Methodology
  if (reportData.methodology) {
    addSectionHeader('Methodology', ++sn);
    addParagraph(reportData.methodology);
  }

  // Risk Overview
  if (reportData.risk_rating || findings.length > 0) {
    addSectionHeader('Risk Overview', ++sn);
    if (findings.length > 0) {
      const riskData = ['Critical', 'High', 'Medium', 'Low'].map((level) => {
        const count = findings.filter((f: any) => f.risk_rating === level).length;
        return [level, String(count)];
      });
      autoTable(doc, {
        startY: y,
        head: [['Risk Level', 'Count']],
        body: riskData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        tableWidth: 80,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
    if (reportData.risk_rating) addParagraph(reportData.risk_rating);
  }

  // Findings Summary Table
  if (findings.length > 0) {
    addSectionHeader('Key Findings Snapshot', ++sn);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Finding', 'Risk', 'Status']],
      body: findings.map((f: any, i: number) => [
        String(i + 1),
        f.title || 'Untitled',
        f.risk_rating || '—',
        f.status || 'Open',
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: colors.lightGray },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Detailed findings
    addSectionHeader('Detailed Findings', ++sn);
    findings.forEach((f: any, i: number) => {
      if (y > ph - 60) { doc.addPage(); y = 20; if (isDraft) addDraftWatermark(doc); }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(`Finding ${i + 1}: ${f.title || 'Untitled'}`, margin, y);
      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.mutedText);
      doc.text(`Risk: ${f.risk_rating || '—'} | Impact: ${f.impact_area || '—'} | Status: ${f.status || 'Open'}`, margin, y);
      y += 6;

      const obs = [
        ['Criteria', f.criteria],
        ['Condition', f.condition],
        ['Cause', f.cause],
        ['Effect', f.effect],
        ['Recommendation', f.recommendation],
      ].filter(([, v]) => v);

      if (obs.length > 0) {
        autoTable(doc, {
          startY: y,
          body: obs.map(([label, val]) => [label, val]),
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }
    });
  }

  // Action Plan Table
  if (actions.length > 0) {
    addSectionHeader('Agreed Action Plan', ++sn);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Finding', 'Action', 'Owner', 'Due Date', 'Status']],
      body: actions.map((a: any, i: number) => {
        const finding = findings.find((f: any) => f.id === a.finding_id);
        return [
          String(i + 1),
          finding?.title || '—',
          a.action_description || '—',
          a.responsible_person || '—',
          a.target_date ? formatDateForDisplay(a.target_date) : '—',
          a.status || 'Open',
        ];
      }),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: colors.lightGray },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Conclusion
  if (reportData.conclusion) {
    addSectionHeader('Conclusion', ++sn);
    addParagraph(reportData.conclusion);
  }
  if (reportData.follow_up_actions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colors.mutedText);
    if (y > ph - 30) { doc.addPage(); y = 20; }
    doc.text('Follow-up Expectations:', margin, y);
    y += 5;
    addParagraph(reportData.follow_up_actions);
  }

  // Distribution
  if (reportData.distribution_list) {
    addSectionHeader('Distribution', ++sn);
    addParagraph(reportData.distribution_list);
  }

  // Signatures
  addSectionHeader('Approval & Sign-off', ++sn);
  [
    { label: 'Prepared By', name: reportData.prepared_by, role: 'Internal Auditor' },
    { label: 'Reviewed By', name: reportData.reviewed_by, role: 'Manager, Internal Audit' },
    { label: 'Approved By', name: reportData.approved_by || 'Director', role: 'Director' },
  ].forEach((sig) => {
    if (y > ph - 40) { doc.addPage(); y = 20; if (isDraft) addDraftWatermark(doc); }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.mutedText);
    doc.text(sig.label, margin, y);
    y += 18;
    doc.setDrawColor(...colors.darkText);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 80, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.darkText);
    doc.setFontSize(9);
    doc.text(sig.name || '—', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.mutedText);
    doc.text(sig.role, margin, y);
    y += 4;
    doc.text('Date: _______________', margin, y);
    y += 12;
  });

  // Footer on all pages
  addSSBFooter(doc);

  // Save
  const fileName = `${(reportData.title || 'Audit-Report').replace(/[^a-zA-Z0-9]/g, '-')}-${reportData.status || 'Draft'}`;
  doc.save(`${fileName}.pdf`);
}

function addDraftWatermark(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.text('DRAFT', pw / 2, ph / 2, {
    align: 'center',
    angle: 45,
    renderingMode: 'fill',
  } as any);
}
