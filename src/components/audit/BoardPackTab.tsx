import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Lock, Loader2, AlertTriangle, Info, Settings2 } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useIAPlanArtifacts, useIAPlanArtifactMutations } from '@/hooks/useAuditPlanArtifacts';
import { formatDateForDisplay } from '@/lib/format-config';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { supabase } from '@/integrations/supabase/client';
import { useIADepartments, useIADepartmentFunctions, useIAActiveAuditors } from '@/hooks/useAuditData';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportCustomizationDialog, DEFAULT_REPORT_CONFIG, THEME_COLORS } from './ReportCustomizationDialog';
import type { ReportConfig } from './ReportCustomizationDialog';

interface BoardPackTabProps {
  planId: string;
  plan: any;
  engagements: any[];
}

// ===== HELPER: Lookup maps =====
function buildLookups(departments: any[], functions: any[], auditors: any[]) {
  const deptMap = new Map(departments.map((d: any) => [d.id, d.name]));
  const funcMap = new Map(functions.map((f: any) => [f.id, f.function_name]));
  const auditorMap = new Map(auditors.map((a: any) => [a.id, a.name]));
  return { deptMap, funcMap, auditorMap };
}

// ===== PDF HELPERS (SSB BRANDED) =====
function getTheme(config: ReportConfig) {
  return THEME_COLORS[config.colorTheme] || THEME_COLORS['ssb-green'];
}

function addHeader(doc: jsPDF, title: string, subtitle: string, fiscalYear: string, config: ReportConfig) {
  const pw = doc.internal.pageSize.getWidth();
  const theme = getTheme(config);

  // Green header bar
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, pw, 42, 'F');
  // Gold accent stripe
  doc.setFillColor(...theme.accent);
  doc.rect(0, 42, pw, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(config.headerTitle || 'Social Security Board', 14, 16);
  doc.setFontSize(11);
  doc.text(config.headerSubtitle || 'Internal Audit Department', 14, 24);
  doc.setFontSize(10);
  doc.text(title, 14, 32);
  doc.text(`Fiscal Year: ${fiscalYear}`, 14, 39);
  doc.setTextColor(200, 230, 210);
  doc.text(subtitle, pw - 14, 39, { align: 'right' });
}

function addFooter(doc: jsPDF, planId: string, version: number, artifactVersion: number, status: string, config: ReportConfig) {
  const pageCount = doc.getNumberOfPages();
  const theme = getTheme(config);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    // Green footer bar
    doc.setFillColor(...theme.primary);
    doc.rect(0, ph - 14, pw, 14, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`${config.confidentialityLabel} — Plan v${version} • Artifact v${artifactVersion} • Generated: ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`, pw / 2, ph - 6, { align: 'center' });
    if (status !== 'Approved' && config.showDraftWatermark) {
      doc.setTextColor(200, 230, 200);
      doc.setFontSize(60);
      doc.text('DRAFT', pw / 2, ph / 2, { align: 'center', angle: 45 });
    }
  }
}

function addSection(doc: jsPDF, y: number, title: string, content: string | null | undefined, pw: number, config: ReportConfig): number {
  if (!content) return y;
  if (y > 250) { doc.addPage(); y = 20; }
  const theme = getTheme(config);
  doc.setFontSize(12);
  doc.setFont(undefined as any, 'bold');
  doc.setTextColor(...theme.primary);
  doc.text(title, 14, y);
  y += 7;
  doc.setFont(undefined as any, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(content, pw - 28);
  doc.text(lines, 14, y);
  y += lines.length * 4.5 + 8;
  return y;
}

// ===== BOARD SUMMARY PDF =====
function generateBoardSummaryPdf(plan: any, engagements: any[], lookups: ReturnType<typeof buildLookups>, config: ReportConfig): jsPDF {
  const doc = new jsPDF({ orientation: config.pageOrientation });
  const pw = doc.internal.pageSize.getWidth();
  const version = plan?.current_version_number || 1;
  const artVersion = (plan?.artifact_version_number || 0) + 1;
  const theme = getTheme(config);

  addHeader(doc, 'Board Summary — Annual Audit Plan', `Version ${version}`, plan?.fiscal_year || 'N/A', config);

  let y = 54;
  const planInfo = [
    ['Plan Title', plan?.title || '—'],
    ['Status', plan?.status || 'Draft'],
    ['Plan Version', `v${version}`],
    ['Created By', plan?.created_by || plan?.plan_owner || '—'],
    ['Last Updated By', plan?.updated_by || '—'],
    ['Board Committee', plan?.board_committee_name || '—'],
    ['Approved By', plan?.approved_by || '—'],
    ['Approved Date', plan?.approved_date ? formatDateForDisplay(plan.approved_date) : '—'],
    ['Total Engagements', String(engagements.length)],
    ['Total Planned Days', String(engagements.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0))],
    ['Total Planned Weeks', String(engagements.reduce((s: number, e: any) => s + (Number(e.estimated_hours) || 0), 0))],
  ];
  autoTable(doc, { startY: y, body: planInfo, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }, theme: 'plain' });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (config.includeExecutiveSummary) {
    y = addSection(doc, y, 'Executive Summary', plan?.executive_summary, pw, config);
    y = addSection(doc, y, 'Planning Methodology', plan?.methodology || plan?.methodology_notes, pw, config);
  }

  if (config.includeRiskCoverage) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.setTextColor(...theme.primary);
    doc.text('Risk Coverage Summary', 14, y);
    y += 4;
    const riskDist = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    engagements.forEach((e: any) => {
      const r = e.engagement_risk_rating as keyof typeof riskDist;
      if (r in riskDist) riskDist[r]++;
    });
    autoTable(doc, {
      startY: y,
      head: [['Risk Level', 'Count', '% of Plan']],
      body: Object.entries(riskDist).map(([k, v]) => [k, String(v), engagements.length ? `${Math.round((v / engagements.length) * 100)}%` : '0%']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: theme.primary },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (config.includeEngagementSchedule) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.setTextColor(...theme.primary);
    doc.text('Annual Engagement Schedule', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Engagement Title', 'Department', 'Function', 'Risk', 'Lead Auditor', 'Quarter', 'Days', 'Weeks', 'Priority']],
      body: engagements.map((e: any, i: number) => [
        e.sequence_no || i + 1,
        e.engagement_name || '—',
        lookups.deptMap.get(e.department_id) || '—',
        lookups.funcMap.get(e.function_id) || '—',
        e.engagement_risk_rating || '—',
        lookups.auditorMap.get(e.lead_auditor_id) || '—',
        e.quarter || '—',
        e.estimated_days || '—',
        e.estimated_hours || '—',
        e.board_priority_flag ? '★ Yes' : 'No',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: theme.primary },
      alternateRowStyles: { fillColor: theme.altRow },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (config.includeResourceSummary) {
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSection(doc, y, 'Resource Summary',
      `Available Days: ${plan?.total_available_hours || '—'}\nPlanned Weeks: ${plan?.planned_hours || '—'}\nContingency Days: ${plan?.contingency_hours || '—'}`, pw, config);
  }

  addFooter(doc, plan?.id, version, artVersion, plan?.status, config);
  return doc;
}

// ===== DETAILED PLAN PDF =====
function generateDetailedPlanPdf(
  plan: any, engagements: any[], lookups: ReturnType<typeof buildLookups>,
  gapFunctions: any[], config: ReportConfig
): jsPDF {
  const doc = new jsPDF({ orientation: config.pageOrientation });
  const pw = doc.internal.pageSize.getWidth();
  const version = plan?.current_version_number || 1;
  const artVersion = (plan?.artifact_version_number || 0) + 1;
  const theme = getTheme(config);

  // ===== A. COVER PAGE =====
  if (config.includeCoverPage) {
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...theme.primary);
    doc.rect(0, 0, pw, ph, 'F');
    // Gold accent stripe at 1/3
    doc.setFillColor(...theme.accent);
    doc.rect(0, ph * 0.33, pw, 3, 'F');
    doc.rect(0, ph * 0.33 + 6, pw, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text('Annual Internal Audit Plan', pw / 2, ph / 2 - 40, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`Fiscal Year ${plan?.fiscal_year || 'N/A'}`, pw / 2, ph / 2 - 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Plan Version: v${version}`, pw / 2, ph / 2, { align: 'center' });
    doc.text(`Status: ${plan?.status || 'Draft'}`, pw / 2, ph / 2 + 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(config.headerTitle || 'Social Security Board', pw / 2, ph / 2 + 30, { align: 'center' });
    doc.text(`${config.headerSubtitle || 'Internal Audit Department'}`, pw / 2, ph / 2 + 40, { align: 'center' });
    doc.text(`Prepared By: ${plan?.created_by || 'Internal Audit Department'}`, pw / 2, ph / 2 + 55, { align: 'center' });
    if (plan?.approved_by) {
      doc.text(`Approved By: ${plan.approved_by} on ${plan.approved_date ? formatDateForDisplay(plan.approved_date) : '—'}`, pw / 2, ph / 2 + 65, { align: 'center' });
    }
    doc.setTextColor(200, 230, 210);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pw / 2, ph - 30, { align: 'center' });
  }

  // ===== B. EXECUTIVE SUMMARY =====
  if (config.includeExecutiveSummary) {
    doc.addPage();
    addHeader(doc, 'Executive Summary', `v${version}`, plan?.fiscal_year || '', config);
    let y = 54;
    y = addSection(doc, y, 'Annual Audit Strategy', plan?.executive_summary, pw, config);
    y = addSection(doc, y, 'Planning Basis & Methodology', plan?.methodology || plan?.methodology_notes, pw, config);
    y = addSection(doc, y, 'Major Assumptions', plan?.planning_assumptions, pw, config);
    y = addSection(doc, y, 'Exclusions / Out-of-Scope', plan?.exclusions, pw, config);
    y = addSection(doc, y, 'Resource Constraints', plan?.resource_constraints, pw, config);
    y = addSection(doc, y, 'Objective', plan?.objective, pw, config);
  }

  // ===== C. COVERAGE SUMMARY =====
  if (config.includeRiskCoverage) {
    doc.addPage();
    addHeader(doc, 'Annual Coverage Summary', `v${version}`, plan?.fiscal_year || '', config);
    let y = 54;

    const coveredDepts = new Set(engagements.map((e: any) => e.department_id).filter(Boolean));
    const coveredFuncs = new Set(engagements.map((e: any) => e.function_id).filter(Boolean));
    const riskDist = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    engagements.forEach((e: any) => {
      const r = e.engagement_risk_rating as keyof typeof riskDist;
      if (r in riskDist) riskDist[r]++;
    });
    const totalDays = engagements.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0);

    const coverageData = [
      ['Total Engagements', String(engagements.length)],
      ['Departments Covered', String(coveredDepts.size)],
      ['Functions Covered', String(coveredFuncs.size)],
      ['Critical Risk', String(riskDist.Critical)],
      ['High Risk', String(riskDist.High)],
      ['Medium Risk', String(riskDist.Medium)],
      ['Low Risk', String(riskDist.Low)],
      ['Total Planned Days', String(totalDays)],
    ];
    autoTable(doc, { startY: y, body: coverageData, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } }, theme: 'striped' });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===== D. ENGAGEMENT SCHEDULE TABLE =====
  if (config.includeEngagementSchedule) {
    doc.addPage();
    addHeader(doc, 'Engagement Schedule — Detailed', `v${version}`, plan?.fiscal_year || '', config);
    let y = 54;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Code', 'Title', 'Department', 'Function', 'Risk', 'Objective', 'Scope', 'Rationale', 'Lead', 'Support', 'Days', 'Weeks', 'Q', 'Start', 'End', 'Priority', 'Status']],
      body: engagements.map((e: any, i: number) => {
        const supportNames = (Array.isArray(e.supportive_auditor_ids) ? e.supportive_auditor_ids : [])
          .map((id: string) => lookups.auditorMap.get(id) || '—').join(', ');
        return [
          e.sequence_no || i + 1,
          e.engagement_code || '—',
          e.engagement_name || '—',
          lookups.deptMap.get(e.department_id) || '—',
          lookups.funcMap.get(e.function_id) || '—',
          e.engagement_risk_rating || '—',
          e.objectives || '—',
          e.scope || '—',
          e.inclusion_rationale || '—',
          lookups.auditorMap.get(e.lead_auditor_id) || '—',
          supportNames || '—',
          e.estimated_days || '—',
          e.estimated_hours || '—',
          e.quarter || '—',
          e.planned_start_date || '—',
          e.planned_end_date || '—',
          e.board_priority_flag ? '★' : '',
          e.status || 'Planned',
        ];
      }),
      styles: { fontSize: 5.5, cellPadding: 1.5 },
      headStyles: { fillColor: theme.primary, fontSize: 5.5 },
      alternateRowStyles: { fillColor: theme.altRow },
      margin: { left: 8, right: 8 },
    });
  }

  // ===== E. RESOURCE PLAN =====
  if (config.includeResourceSummary) {
    doc.addPage();
    addHeader(doc, 'Resource Plan', `v${version}`, plan?.fiscal_year || '', config);
    let y = 54;
    const totalDays = engagements.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0);

    const resourceInfo = [
      ['Total Available Days', plan?.total_available_hours?.toString() || '—'],
      ['Total Planned Days', String(totalDays)],
      ['Contingency Days', plan?.contingency_hours?.toString() || '—'],
      ['Utilization', plan?.total_available_hours ? `${Math.round((totalDays / Number(plan.total_available_hours)) * 100)}%` : '—'],
    ];
    autoTable(doc, { startY: y, body: resourceInfo, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } }, theme: 'plain' });
    y = (doc as any).lastAutoTable.finalY + 10;

    if (config.includeAuditorBreakdown) {
      const auditorDays = new Map<string, number>();
      engagements.forEach((e: any) => {
        if (e.lead_auditor_id) {
          const name = lookups.auditorMap.get(e.lead_auditor_id) || 'Unknown';
          auditorDays.set(name, (auditorDays.get(name) || 0) + (Number(e.estimated_days) || 0));
        }
      });
      if (auditorDays.size > 0) {
        doc.setFontSize(11); doc.setFont(undefined as any, 'bold'); doc.setTextColor(...theme.primary);
        doc.text('Days by Lead Auditor', 14, y); y += 4;
        autoTable(doc, {
          startY: y,
          head: [['Auditor', 'Planned Days']],
          body: Array.from(auditorDays.entries()).map(([name, days]) => [name, String(days)]),
          styles: { fontSize: 9 }, headStyles: { fillColor: theme.primary },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    if (config.includeQuarterBreakdown) {
      const quarterDays = ['Q1','Q2','Q3','Q4'].map(q => [
        q,
        String(engagements.filter((e: any) => e.quarter === q).length),
        String(engagements.filter((e: any) => e.quarter === q).reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0)),
      ]);
      doc.setFontSize(11); doc.setFont(undefined as any, 'bold'); doc.setTextColor(...theme.primary);
      doc.text('Days by Quarter', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Quarter', 'Engagements', 'Days']],
        body: quarterDays,
        styles: { fontSize: 9 }, headStyles: { fillColor: theme.primary },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    y = addSection(doc, y, 'Outsourced Support', plan?.outsourced_support_notes, pw, config);
    y = addSection(doc, y, 'Skills Constraints', plan?.skills_constraints, pw, config);
  }

  // ===== F. GAP ANALYSIS =====
  if (config.includeGapAnalysis && gapFunctions.length > 0) {
    doc.addPage();
    addHeader(doc, 'Risk Coverage / Gap Analysis', `v${version}`, plan?.fiscal_year || '', config);
    let y = 54;
    doc.setFontSize(11); doc.setFont(undefined as any, 'bold'); doc.setTextColor(...theme.primary);
    doc.text('High-Risk Functions NOT Covered in Plan', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Function', 'Department', 'Risk Level', 'Status']],
      body: gapFunctions.map((g: any) => [g.functionName, g.departmentName, g.riskLevel, 'Not Covered']),
      styles: { fontSize: 8 }, headStyles: { fillColor: [214, 40, 40] as [number, number, number] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
    y = addSection(doc, y, 'Recommendation', 'These high-risk functions should be considered for inclusion in the next planning cycle or addressed through a supplementary audit.', pw, config);
  }

  // ===== G. GOVERNANCE =====
  if (config.includeGovernance) {
    doc.addPage();
    addHeader(doc, 'Approval & Governance', `v${version}`, plan?.fiscal_year || '', config);
    let y = 54;
    const govData = [
      ['Board Committee', plan?.board_committee_name || '—'],
      ['Minutes Reference', plan?.minutes_reference || '—'],
      ['Approval Note', plan?.approval_note || '—'],
      ['Approved By', plan?.approved_by || '—'],
      ['Approved Date', plan?.approved_date ? formatDateForDisplay(plan.approved_date) : '—'],
    ];
    autoTable(doc, { startY: y, body: govData, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }, theme: 'plain' });
  }

  addFooter(doc, plan?.id, version, artVersion, plan?.status, config);
  return doc;
}

// ===== COMPONENT =====
export function BoardPackTab({ planId, plan, engagements }: BoardPackTabProps) {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data: artifacts = [], isLoading } = useIAPlanArtifacts(planId);
  const { create, update } = useIAPlanArtifactMutations();
  const { data: departments = [] } = useIADepartments();
  const { data: functions = [] } = useIADepartmentFunctions('all');
  const { data: auditors = [] } = useIAActiveAuditors();
  const { data: assessments = [] } = useIARiskAssessments();
  const [generating, setGenerating] = useState<string | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfig>(DEFAULT_REPORT_CONFIG);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [pendingArtifactType, setPendingArtifactType] = useState<string>('');

  const isApproved = plan?.status === 'Approved';
  const isDraft = ['Draft', 'Submitted', 'Under Review'].includes(plan?.status);
  const hasFinal = artifacts.some((a: any) => a.is_final);
  const lookups = buildLookups(departments, functions, auditors);

  // Gap analysis: high-risk functions not covered
  const coveredFuncIds = new Set(engagements.map((e: any) => e.function_id).filter(Boolean));
  const gapFunctions = (functions || [])
    .filter((fn: any) => {
      if (coveredFuncIds.has(fn.id)) return false;
      const riskA = (assessments || []).find((a: any) => a.function_id === fn.id);
      const fnRisk = riskA?.risk_rating || fn.risk_rating;
      return ['High', 'Critical'].includes(fnRisk);
    })
    .map((fn: any) => {
      const dept = departments.find((d: any) => d.id === fn.department_id);
      const riskA = (assessments || []).find((a: any) => a.function_id === fn.id);
      return {
        functionName: fn.function_name,
        departmentName: dept?.name || '—',
        riskLevel: riskA?.risk_rating || fn.risk_rating || 'High',
      };
    });

  const openCustomize = (artifactType: string) => {
    setPendingArtifactType(artifactType);
    setCustomizeDialogOpen(true);
  };

  const handleGenerate = async (artifactType: string, config?: ReportConfig) => {
    const cfg = config || reportConfig;
    setGenerating(artifactType);
    try {
      const existing = artifacts.filter((a: any) => a.artifact_type === artifactType && a.status !== 'Superseded');
      for (const art of existing) {
        await update.mutateAsync({ id: (art as any).id, status: 'Superseded', is_final: false });
      }

      const version = (plan?.current_version_number || 1);
      const artVersion = (artifacts.filter((a: any) => a.artifact_type === artifactType).length || 0) + 1;
      const artifactStatus = isApproved ? 'Generated' : 'Draft';
      const fileName = artifactType === 'board_summary_pdf'
        ? `Board_Summary_FY${plan?.fiscal_year}_v${version}.${artVersion}.pdf`
        : artifactType === 'detailed_plan_pdf'
          ? `Detailed_Plan_FY${plan?.fiscal_year}_v${version}.${artVersion}.pdf`
          : `Engagement_Annex_FY${plan?.fiscal_year}_v${version}.${artVersion}.xlsx`;
      const filePath = `plans/${planId}/${fileName}`;

      if (artifactType === 'board_summary_pdf' || artifactType === 'detailed_plan_pdf') {
        const doc = artifactType === 'board_summary_pdf'
          ? generateBoardSummaryPdf(plan, engagements, lookups, cfg)
          : generateDetailedPlanPdf(plan, engagements, lookups, gapFunctions, cfg);

        const pdfBlob = doc.output('blob');
        const { error: uploadError } = await supabase.storage.from('ia-artifacts').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      } else if (artifactType === 'excel_annex') {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Audit Engagements');
        sheet.columns = [
          { header: '#', key: 'seq', width: 5 },
          { header: 'Code', key: 'code', width: 16 },
          { header: 'Engagement Title', key: 'title', width: 35 },
          { header: 'Department', key: 'dept', width: 25 },
          { header: 'Function', key: 'func', width: 25 },
          { header: 'Risk', key: 'risk', width: 10 },
          { header: 'Lead Auditor', key: 'lead', width: 20 },
          { header: 'Support Team', key: 'support', width: 30 },
          { header: 'Quarter', key: 'quarter', width: 8 },
          { header: 'Start', key: 'start', width: 12 },
          { header: 'End', key: 'end', width: 12 },
          { header: 'Days', key: 'days', width: 8 },
          { header: 'Weeks', key: 'weeks', width: 8 },
          { header: 'Objective', key: 'objective', width: 40 },
          { header: 'Scope', key: 'scope', width: 40 },
          { header: 'Rationale', key: 'rationale', width: 30 },
          { header: 'Priority', key: 'priority', width: 10 },
          { header: 'Status', key: 'status', width: 12 },
        ];
        engagements.forEach((e: any, i: number) => {
          const supportNames = (Array.isArray(e.supportive_auditor_ids) ? e.supportive_auditor_ids : [])
            .map((id: string) => lookups.auditorMap.get(id) || '—').join(', ');
          sheet.addRow({
            seq: e.sequence_no || i + 1,
            code: e.engagement_code || '—',
            title: e.engagement_name || '—',
            dept: lookups.deptMap.get(e.department_id) || '—',
            func: lookups.funcMap.get(e.function_id) || '—',
            risk: e.engagement_risk_rating || '—',
            lead: lookups.auditorMap.get(e.lead_auditor_id) || '—',
            support: supportNames || '—',
            quarter: e.quarter || '—',
            start: e.planned_start_date || '—',
            end: e.planned_end_date || '—',
            days: e.estimated_days || '—',
            weeks: e.estimated_hours || '—',
            objective: e.objectives || '—',
            scope: e.scope || '—',
            rationale: e.inclusion_rationale || '—',
            priority: e.board_priority_flag ? 'High' : 'Normal',
            status: e.status || 'Planned',
          });
        });
        // Style header row with SSB green
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E5F3A' } };
        const buffer = await workbook.xlsx.writeBuffer();
        const { error: uploadError } = await supabase.storage.from('ia-artifacts').upload(filePath, new Blob([buffer]), {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true,
        });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      }

      await create.mutateAsync({
        plan_id: planId,
        version_number: version,
        artifact_type: artifactType,
        status: artifactStatus,
        file_name: fileName,
        file_path: filePath,
        mime_type: artifactType.includes('pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        generated_at: new Date().toISOString(),
        generated_by: userCode || 'system',
        is_final: false,
      });

      await supabase.from('ia_annual_plans' as any).update({
        artifact_version_number: artVersion,
        updated_by: userCode || 'system',
      } as any).eq('id', planId);

      toast({ title: 'Artifact Generated', description: `${fileName} has been generated successfully.` });
    } catch (err: any) {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const handleMarkFinal = async (artifactId: string) => {
    if (!isApproved) {
      toast({ title: 'Cannot Finalize', description: 'Only approved plans can have final artifacts.', variant: 'destructive' });
      return;
    }
    try {
      await update.mutateAsync({ id: artifactId, status: 'Final', is_final: true });
      toast({ title: 'Artifact Finalized' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownload = async (artifact: any) => {
    try {
      const { data, error } = await supabase.storage.from('ia-artifacts').download(artifact.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: 'Download Failed', description: err.message, variant: 'destructive' });
    }
  };

  const artifactColumns: DataTableColumn<any>[] = [
    { key: 'file_name', header: 'File', render: (r) => <span className="font-medium text-sm">{r.file_name || '—'}</span> },
    { key: 'artifact_type', header: 'Type', render: (r) => <StatusBadge status={r.artifact_type?.replace(/_/g, ' ') || '—'} /> },
    { key: 'version_number', header: 'Plan Ver.', render: (r) => `v${r.version_number}` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'generated_at', header: 'Generated', render: (r) => r.generated_at ? formatDateForDisplay(r.generated_at) : '—' },
    { key: 'generated_by', header: 'By', render: (r) => r.generated_by || '—' },
  ];

  return (
    <div className="space-y-4">
      {isDraft && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Info className="h-5 w-5 text-warning shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Pre-Approval Board Pack</p>
              <p className="text-muted-foreground">Artifacts generated now will be marked as <strong>Draft</strong> with a watermark.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isApproved && !hasFinal && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Info className="h-5 w-5 text-success shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Plan Approved — Ready to Finalize</p>
              <p className="text-muted-foreground">Generate final artifacts and mark them as <strong>Final</strong> for official distribution.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Generate Board Pack Artifacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Board Summary - with customize option */}
            <div className="flex gap-1">
              <Button variant="outline" className="justify-start gap-2 flex-1" onClick={() => handleGenerate('board_summary_pdf')} disabled={!!generating}>
                {generating === 'board_summary_pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-primary" />}
                Board Summary PDF
              </Button>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openCustomize('board_summary_pdf')} disabled={!!generating}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
            {/* Detailed Plan - with customize option */}
            <div className="flex gap-1">
              <Button variant="outline" className="justify-start gap-2 flex-1" onClick={() => handleGenerate('detailed_plan_pdf')} disabled={!!generating}>
                {generating === 'detailed_plan_pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-primary" />}
                Detailed Plan PDF
              </Button>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openCustomize('detailed_plan_pdf')} disabled={!!generating}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
            {/* Excel - no customize needed */}
            <Button variant="outline" className="justify-start gap-2" onClick={() => handleGenerate('excel_annex')} disabled={!!generating}>
              {generating === 'excel_annex' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-primary" />}
              Excel Annex
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Click the <Settings2 className="inline h-3 w-3" /> icon to customize report format, sections, and color theme before generating. PDFs use SSB official branding.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Artifact History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={artifactColumns}
            data={artifacts}
            emptyMessage="No artifacts generated yet."
            renderActions={(row) => (
              <div className="flex gap-1">
                {row.file_path && row.status !== 'Superseded' && (
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(row)}>
                    <Download className="h-4 w-4 mr-1" />Download
                  </Button>
                )}
                {row.status === 'Generated' && isApproved && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkFinal(row.id)}>
                    <Lock className="h-4 w-4 mr-1" />Final
                  </Button>
                )}
                {row.status === 'Draft' && isApproved && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkFinal(row.id)}>
                    <Lock className="h-4 w-4 mr-1" />Finalize
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Customization Dialog */}
      <ReportCustomizationDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        config={reportConfig}
        onConfigChange={setReportConfig}
        onGenerate={(cfg) => handleGenerate(pendingArtifactType, cfg)}
        reportType={pendingArtifactType}
        generating={!!generating}
      />
    </div>
  );
}
