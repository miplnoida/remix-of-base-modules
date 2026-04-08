/**
 * Enterprise-grade PDF export for Internal Audit reports.
 * Uses jsPDF + jspdf-autotable with SSB branding from reportTemplate.ts.
 * Now settings-driven via documentTemplateResolver + reportOutputMapper.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SSB_BRAND, addSSBFooter } from '@/lib/reportTemplate';
import { formatDateForDisplay } from '@/lib/format-config';
import { resolveReportTemplate } from '@/lib/audit/documentTemplateResolver';
import { DEFAULT_AUDIT_REPORT_CONFIG, type AuditReportTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import { mapReportOutput } from '@/lib/audit/reportOutputMapper';

interface PDFExportParams {
  reportData: any;
  findings: any[];
  responses: any[];
  actions: any[];
  engagement?: any;
  departmentName?: string;
  templateConfig?: AuditReportTemplateConfig;
}

export function generateAuditReportPDF({
  reportData, findings, responses, actions, engagement, departmentName, templateConfig,
}: PDFExportParams) {
  const config = templateConfig || DEFAULT_AUDIT_REPORT_CONFIG;
  const resolved = resolveReportTemplate(config, reportData.status);
  const mapped = mapReportOutput(resolved, reportData, findings, responses, actions, departmentName);
  const doc = new jsPDF({ orientation: 'portrait' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const { colors } = SSB_BRAND;
  const margin = 16;
  const contentWidth = pw - margin * 2;

  // ─── COVER PAGE ───
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pw, 45, 'F');
  doc.setFillColor(...colors.gold);
  doc.rect(0, 45, pw, 2, 'F');

  doc.setTextColor(...colors.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(resolved.branding.orgName, margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(resolved.branding.country, margin, 27);
  doc.setFontSize(9);
  doc.text('Internal Audit Department', margin, 35);

  // Address right
  doc.setFontSize(7);
  doc.text(resolved.branding.address, pw - margin, 18, { align: 'right' });
  doc.text(`Tel: ${resolved.branding.phone}`, pw - margin, 24, { align: 'right' });

  // Report Title
  let y = 80;
  doc.setTextColor(...colors.primary);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(reportData.title || resolved.coverPage.reportTitle, contentWidth);
  doc.text(titleLines, pw / 2, y, { align: 'center' });
  y += titleLines.length * 10 + 8;

  // Report Type Badge
  if (resolved.coverPage.showSubtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mutedText);
    doc.text(reportData.report_type || resolved.coverPage.subtitleText, pw / 2, y, { align: 'center' });
    y += 20;
  } else {
    y += 10;
  }

  // Metadata grid — use configured field order
  doc.setFontSize(8);
  const colWidth = contentWidth / 2;
  mapped.coverMetadata.forEach((meta, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const xPos = margin + col * colWidth;
    const yPos = y + row * 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mutedText);
    doc.text(meta.label, xPos, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.darkText);
    doc.text(meta.value, xPos, yPos + 5);
  });
  y += Math.ceil(mapped.coverMetadata.length / 2) * 12 + 15;

  // Confidentiality notice — from config
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
  const confLines = doc.splitTextToSize(resolved.coverPage.confidentialityText, contentWidth - 20);
  doc.text(confLines, pw / 2, y, { align: 'center' });

  // Draft watermark on cover
  if (resolved.showWatermark) addDraftWatermark(doc, resolved.watermarkText);

  // ─── CONTENT PAGES ───
  doc.addPage();
  y = 20;

  const addSectionHeader = (title: string, num?: number) => {
    if (y > ph - 50) { doc.addPage(); y = 20; if (resolved.showWatermark) addDraftWatermark(doc, resolved.watermarkText); }
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
      if (y > ph - 25) { doc.addPage(); y = 20; if (resolved.showWatermark) addDraftWatermark(doc, resolved.watermarkText); }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;
  };

  // ─── Section renderers keyed by ID ───
  let sn = 0;

  const pdfSectionRenderers: Record<string, () => void> = {
    executive_summary: () => {
      if (!reportData.executive_summary) return;
      addSectionHeader('Executive Summary', ++sn);
      if (reportData.overall_assessment) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text(`Overall Assessment: ${reportData.overall_assessment}`, margin, y);
        y += 8;
      }
      addParagraph(reportData.executive_summary);
    },
    background: () => {
      if (!reportData.background) return;
      addSectionHeader('Audit Background', ++sn);
      addParagraph(reportData.background);
    },
    objective: () => {
      if (!reportData.audit_objective) return;
      addSectionHeader('Audit Objective', ++sn);
      addParagraph(reportData.audit_objective);
    },
    scope: () => {
      if (!reportData.audit_scope) return;
      addSectionHeader('Scope', ++sn);
      addParagraph(reportData.audit_scope);
    },
    methodology: () => {
      if (!reportData.methodology) return;
      addSectionHeader('Methodology', ++sn);
      addParagraph(reportData.methodology);
    },
    risk_overview: () => {
      if (!(reportData.risk_rating || findings.length > 0)) return;
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
    },
    key_findings: () => {
      if (findings.length === 0) return;
      addSectionHeader('Key Findings Snapshot', ++sn);
      autoTable(doc, {
        startY: y,
        head: [['#', 'Finding', 'Risk', 'Status']],
        body: findings.map((f: any, i: number) => [
          String(i + 1), f.title || 'Untitled', f.risk_rating || '—', f.status || 'Open',
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: colors.lightGray },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    },
    detailed_findings: () => {
      if (findings.length === 0) return;
      addSectionHeader('Detailed Findings', ++sn);
      findings.forEach((f: any, i: number) => {
        if (y > ph - 60) { doc.addPage(); y = 20; if (resolved.showWatermark) addDraftWatermark(doc, resolved.watermarkText); }
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
          y = (doc as any).lastAutoTable.finalY + 4;
        }

        // Inline management response if configured
        if (mapped.showInlineManagementResponse) {
          const findingResponses = responses.filter((r: any) => r.finding_id === f.id);
          findingResponses.forEach((r: any) => {
            if (y > ph - 30) { doc.addPage(); y = 20; if (resolved.showWatermark) addDraftWatermark(doc, resolved.watermarkText); }
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.mutedText);
            doc.text('Management Response:', margin + 4, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.darkText);
            const respLines = doc.splitTextToSize(r.response_text || '—', contentWidth - 8);
            respLines.forEach((line: string) => {
              if (y > ph - 25) { doc.addPage(); y = 20; }
              doc.text(line, margin + 4, y);
              y += 5;
            });
            y += 2;
          });
        }
        y += 2;
      });
    },
    management_responses: () => {
      if (responses.length === 0) return;
      addSectionHeader('Management Responses', ++sn);
      responses.forEach((r: any, i: number) => {
        if (y > ph - 30) { doc.addPage(); y = 20; if (resolved.showWatermark) addDraftWatermark(doc, resolved.watermarkText); }
        const finding = findings.find((f: any) => f.id === r.finding_id);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.darkText);
        doc.text(finding?.title || `Response ${i + 1}`, margin, y);
        y += 5;
        addParagraph(r.response_text || '—');
      });
    },
    action_plan: () => {
      if (actions.length === 0) return;
      addSectionHeader('Agreed Action Plan', ++sn);

      // Build header and body based on configured columns
      const colKeys = mapped.actionPlanColumnKeys;
      const headerLabels = ['#'];
      colKeys.forEach((k) => {
        const col = resolved.actionPlanColumns.find((c) => c.key === k);
        headerLabels.push(col?.label || k);
      });

      const body = actions.map((a: any, i: number) => {
        const finding = findings.find((f: any) => f.id === a.finding_id);
        const row = [String(i + 1)];
        colKeys.forEach((k) => {
          switch (k) {
            case 'finding': row.push(finding?.title || '—'); break;
            case 'action': row.push(a.action_description || '—'); break;
            case 'owner': row.push(a.responsible_person || '—'); break;
            case 'due_date': row.push(a.target_date ? formatDateForDisplay(a.target_date) : '—'); break;
            case 'status': row.push(a.status || 'Open'); break;
            default: row.push('—');
          }
        });
        return row;
      });

      autoTable(doc, {
        startY: y,
        head: [headerLabels],
        body,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: colors.lightGray },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    },
    conclusion: () => {
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
    },
    distribution: () => {
      if (!reportData.distribution_list) return;
      addSectionHeader('Distribution', ++sn);
      addParagraph(reportData.distribution_list);
    },
    approval: () => {
      addSectionHeader('Approval & Sign-off', ++sn);
      const signatories = resolved.signatories.map((sig) => ({
        label: sig.label,
        name: sig.label === 'Prepared By' ? (reportData.prepared_by || sig.defaultName) :
              sig.label === 'Reviewed By' ? (reportData.reviewed_by || sig.defaultName) :
              sig.label === 'Approved By' ? (reportData.approved_by || sig.defaultName || 'Director') :
              sig.defaultName,
        role: sig.roleTitle,
      }));
      signatories.forEach((sig) => {
        if (y > ph - 40) { doc.addPage(); y = 20; if (resolved.showWatermark) addDraftWatermark(doc, resolved.watermarkText); }
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
    },
  };

  // Render sections in configured order
  mapped.orderedSections.forEach((sectionId) => {
    const renderer = pdfSectionRenderers[sectionId];
    if (renderer) renderer();
  });

  // Footer on all pages
  addSSBFooter(doc);

  // Save
  const fileName = `${(reportData.title || 'Audit-Report').replace(/[^a-zA-Z0-9]/g, '-')}-${reportData.status || 'Draft'}`;
  doc.save(`${fileName}.pdf`);
}

function addDraftWatermark(doc: jsPDF, text: string = 'DRAFT') {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.text(text, pw / 2, ph / 2, {
    align: 'center',
    angle: 45,
    renderingMode: 'fill',
  } as any);
}
