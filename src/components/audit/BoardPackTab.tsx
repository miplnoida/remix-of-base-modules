import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Lock, Loader2, AlertTriangle, Info } from 'lucide-react';
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

// ===== PDF HELPERS =====
const BRAND_COLOR: [number, number, number] = [26, 54, 93];
const ALT_ROW: [number, number, number] = [245, 247, 250];

function addHeader(doc: jsPDF, title: string, subtitle: string, fiscalYear: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pw, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Social Security Board', 14, 16);
  doc.setFontSize(11);
  doc.text('Internal Audit Department', 14, 24);
  doc.setFontSize(10);
  doc.text(title, 14, 32);
  doc.text(`Fiscal Year: ${fiscalYear}`, 14, 39);
  doc.setTextColor(200, 200, 200);
  doc.text(subtitle, pw - 14, 39, { align: 'right' });
}

function addFooter(doc: jsPDF, planId: string, version: number, artifactVersion: number, status: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`CONFIDENTIAL — Plan v${version} • Artifact v${artifactVersion} • Generated: ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`, pw / 2, ph - 8, { align: 'center' });
    if (status !== 'Approved') {
      // DRAFT watermark
      doc.setTextColor(220, 220, 220);
      doc.setFontSize(60);
      doc.text('DRAFT', pw / 2, ph / 2, { align: 'center', angle: 45 });
    }
  }
}

function addSection(doc: jsPDF, y: number, title: string, content: string | null | undefined, pw: number): number {
  if (!content) return y;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont(undefined as any, 'bold');
  doc.setTextColor(26, 54, 93);
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
function generateBoardSummaryPdf(plan: any, engagements: any[], lookups: ReturnType<typeof buildLookups>): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const version = plan?.current_version_number || 1;
  const artVersion = (plan?.artifact_version_number || 0) + 1;

  // Cover/Header
  addHeader(doc, 'Board Summary — Annual Audit Plan', `Version ${version}`, plan?.fiscal_year || 'N/A');

  let y = 52;
  // Plan Info
  const planInfo = [
    ['Plan Title', plan?.title || '—'],
    ['Status', plan?.status || 'Draft'],
    ['Plan Version', `v${version}`],
    ['Plan Owner', plan?.plan_owner || '—'],
    ['Prepared By', plan?.prepared_by || '—'],
    ['Board Committee', plan?.board_committee_name || '—'],
    ['Approved By', plan?.approved_by || '—'],
    ['Approved Date', plan?.approved_date ? formatDateForDisplay(plan.approved_date) : '—'],
    ['Total Engagements', String(engagements.length)],
    ['Total Planned Hours', String(engagements.reduce((s: number, e: any) => s + (Number(e.estimated_hours) || 0), 0))],
  ];
  autoTable(doc, { startY: y, body: planInfo, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }, theme: 'plain' });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = addSection(doc, y, 'Executive Summary', plan?.executive_summary, pw);
  y = addSection(doc, y, 'Planning Methodology', plan?.methodology || plan?.methodology_notes, pw);

  // Risk Coverage Summary
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont(undefined as any, 'bold');
  doc.setTextColor(...BRAND_COLOR);
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
    headStyles: { fillColor: BRAND_COLOR },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Engagement Schedule by Quarter
  if (y > 200) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont(undefined as any, 'bold');
  doc.setTextColor(...BRAND_COLOR);
  doc.text('Annual Engagement Schedule', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Engagement Title', 'Department', 'Function', 'Risk', 'Lead Auditor', 'Quarter', 'Hours', 'Priority']],
    body: engagements.map((e: any, i: number) => [
      e.sequence_no || i + 1,
      e.engagement_name || '—',
      lookups.deptMap.get(e.department_id) || '—',
      lookups.funcMap.get(e.function_id) || '—',
      e.engagement_risk_rating || '—',
      lookups.auditorMap.get(e.lead_auditor_id) || '—',
      e.quarter || '—',
      e.estimated_hours || '—',
      e.board_priority_flag ? '★ Yes' : 'No',
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: BRAND_COLOR },
    alternateRowStyles: { fillColor: ALT_ROW },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Resource Summary
  if (y > 230) { doc.addPage(); y = 20; }
  y = addSection(doc, y, 'Resource Summary',
    `Available Hours: ${plan?.total_available_hours || '—'}\nPlanned Hours: ${plan?.planned_hours || '—'}\nContingency Hours: ${plan?.contingency_hours || '—'}`, pw);

  addFooter(doc, plan?.id, version, artVersion, plan?.status);
  return doc;
}

// ===== DETAILED PLAN PDF =====
function generateDetailedPlanPdf(
  plan: any, engagements: any[], lookups: ReturnType<typeof buildLookups>,
  gapFunctions: any[]
): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const version = plan?.current_version_number || 1;
  const artVersion = (plan?.artifact_version_number || 0) + 1;

  // ===== A. COVER PAGE =====
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pw, ph, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('Annual Internal Audit Plan', pw / 2, ph / 2 - 40, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Fiscal Year ${plan?.fiscal_year || 'N/A'}`, pw / 2, ph / 2 - 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Plan Version: v${version}`, pw / 2, ph / 2, { align: 'center' });
  doc.text(`Status: ${plan?.status || 'Draft'}`, pw / 2, ph / 2 + 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Prepared By: ${plan?.prepared_by || 'Internal Audit Department'}`, pw / 2, ph / 2 + 30, { align: 'center' });
  doc.text(`Plan Owner: ${plan?.plan_owner || '—'}`, pw / 2, ph / 2 + 40, { align: 'center' });
  if (plan?.approved_by) {
    doc.text(`Approved By: ${plan.approved_by} on ${plan.approved_date ? formatDateForDisplay(plan.approved_date) : '—'}`, pw / 2, ph / 2 + 50, { align: 'center' });
  }
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pw / 2, ph / 2 + 65, { align: 'center' });

  // ===== B. EXECUTIVE SUMMARY =====
  doc.addPage();
  addHeader(doc, 'Executive Summary', `v${version}`, plan?.fiscal_year || '');
  let y = 52;
  y = addSection(doc, y, 'Annual Audit Strategy', plan?.executive_summary, pw);
  y = addSection(doc, y, 'Planning Basis & Methodology', plan?.methodology || plan?.methodology_notes, pw);
  y = addSection(doc, y, 'Major Assumptions', plan?.planning_assumptions, pw);
  y = addSection(doc, y, 'Exclusions / Out-of-Scope', plan?.exclusions, pw);
  y = addSection(doc, y, 'Resource Constraints', plan?.resource_constraints, pw);
  y = addSection(doc, y, 'Objective', plan?.objective, pw);

  // ===== C. COVERAGE SUMMARY =====
  doc.addPage();
  addHeader(doc, 'Annual Coverage Summary', `v${version}`, plan?.fiscal_year || '');
  y = 52;

  const coveredDepts = new Set(engagements.map((e: any) => e.department_id).filter(Boolean));
  const coveredFuncs = new Set(engagements.map((e: any) => e.function_id).filter(Boolean));
  const riskDist = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  engagements.forEach((e: any) => {
    const r = e.engagement_risk_rating as keyof typeof riskDist;
    if (r in riskDist) riskDist[r]++;
  });
  const totalHours = engagements.reduce((s: number, e: any) => s + (Number(e.estimated_hours) || 0), 0);

  const coverageData = [
    ['Total Engagements', String(engagements.length)],
    ['Departments Covered', String(coveredDepts.size)],
    ['Functions Covered', String(coveredFuncs.size)],
    ['Critical Risk', String(riskDist.Critical)],
    ['High Risk', String(riskDist.High)],
    ['Medium Risk', String(riskDist.Medium)],
    ['Low Risk', String(riskDist.Low)],
    ['Total Planned Hours', String(totalHours)],
  ];
  autoTable(doc, { startY: y, body: coverageData, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } }, theme: 'striped' });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ===== D. ENGAGEMENT SCHEDULE TABLE =====
  doc.addPage();
  addHeader(doc, 'Engagement Schedule — Detailed', `v${version}`, plan?.fiscal_year || '');
  y = 52;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Code', 'Title', 'Department', 'Function', 'Risk', 'Objective', 'Scope', 'Rationale', 'Lead', 'Support', 'Hours', 'Q', 'Start', 'End', 'Priority', 'Status']],
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
        e.estimated_hours || '—',
        e.quarter || '—',
        e.planned_start_date || '—',
        e.planned_end_date || '—',
        e.board_priority_flag ? '★' : '',
        e.status || 'Planned',
      ];
    }),
    styles: { fontSize: 5.5, cellPadding: 1.5 },
    headStyles: { fillColor: BRAND_COLOR, fontSize: 5.5 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: 8, right: 8 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ===== E. RESOURCE PLAN =====
  doc.addPage();
  addHeader(doc, 'Resource Plan', `v${version}`, plan?.fiscal_year || '');
  y = 52;

  const resourceInfo = [
    ['Total Available Hours', plan?.total_available_hours?.toString() || '—'],
    ['Total Planned Hours', String(totalHours)],
    ['Contingency Hours', plan?.contingency_hours?.toString() || '—'],
    ['Utilization', plan?.total_available_hours ? `${Math.round((totalHours / Number(plan.total_available_hours)) * 100)}%` : '—'],
  ];
  autoTable(doc, { startY: y, body: resourceInfo, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } }, theme: 'plain' });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Hours by Auditor
  const auditorHours = new Map<string, number>();
  engagements.forEach((e: any) => {
    if (e.lead_auditor_id) {
      const name = lookups.auditorMap.get(e.lead_auditor_id) || 'Unknown';
      auditorHours.set(name, (auditorHours.get(name) || 0) + (Number(e.estimated_hours) || 0));
    }
  });
  if (auditorHours.size > 0) {
    doc.setFontSize(11); doc.setFont(undefined as any, 'bold'); doc.setTextColor(...BRAND_COLOR);
    doc.text('Hours by Lead Auditor', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Auditor', 'Planned Hours']],
      body: Array.from(auditorHours.entries()).map(([name, hrs]) => [name, String(hrs)]),
      styles: { fontSize: 9 }, headStyles: { fillColor: BRAND_COLOR },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Hours by Quarter
  const quarterHours = ['Q1','Q2','Q3','Q4'].map(q => [
    q,
    String(engagements.filter((e: any) => e.quarter === q).length),
    String(engagements.filter((e: any) => e.quarter === q).reduce((s: number, e: any) => s + (Number(e.estimated_hours) || 0), 0)),
  ]);
  doc.setFontSize(11); doc.setFont(undefined as any, 'bold'); doc.setTextColor(...BRAND_COLOR);
  doc.text('Hours by Quarter', 14, y); y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Quarter', 'Engagements', 'Hours']],
    body: quarterHours,
    styles: { fontSize: 9 }, headStyles: { fillColor: BRAND_COLOR },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = addSection(doc, y, 'Outsourced Support', plan?.outsourced_support_notes, pw);
  y = addSection(doc, y, 'Skills Constraints', plan?.skills_constraints, pw);

  // ===== F. GAP ANALYSIS =====
  if (gapFunctions.length > 0) {
    doc.addPage();
    addHeader(doc, 'Risk Coverage / Gap Analysis', `v${version}`, plan?.fiscal_year || '');
    y = 52;
    doc.setFontSize(11); doc.setFont(undefined as any, 'bold'); doc.setTextColor(...BRAND_COLOR);
    doc.text('High-Risk Functions NOT Covered in Plan', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Function', 'Department', 'Risk Level', 'Status']],
      body: gapFunctions.map((g: any) => [g.functionName, g.departmentName, g.riskLevel, 'Not Covered']),
      styles: { fontSize: 8 }, headStyles: { fillColor: [180, 40, 40] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
    y = addSection(doc, y, 'Recommendation', 'These high-risk functions should be considered for inclusion in the next planning cycle or addressed through a supplementary audit.', pw);
  }

  // ===== G. GOVERNANCE =====
  doc.addPage();
  addHeader(doc, 'Approval & Governance', `v${version}`, plan?.fiscal_year || '');
  y = 52;
  const govData = [
    ['Board Committee', plan?.board_committee_name || '—'],
    ['Minutes Reference', plan?.minutes_reference || '—'],
    ['Approval Note', plan?.approval_note || '—'],
    ['Approved By', plan?.approved_by || '—'],
    ['Approved Date', plan?.approved_date ? formatDateForDisplay(plan.approved_date) : '—'],
  ];
  autoTable(doc, { startY: y, body: govData, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }, theme: 'plain' });

  addFooter(doc, plan?.id, version, artVersion, plan?.status);
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

  const handleGenerate = async (artifactType: string) => {
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
          ? generateBoardSummaryPdf(plan, engagements, lookups)
          : generateDetailedPlanPdf(plan, engagements, lookups, gapFunctions);

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
          { header: 'Hours', key: 'hours', width: 8 },
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
            hours: e.estimated_hours || '—',
            objective: e.objectives || '—',
            scope: e.scope || '—',
            rationale: e.inclusion_rationale || '—',
            priority: e.board_priority_flag ? 'High' : 'Normal',
            status: e.status || 'Planned',
          });
        });
        // Style header
        sheet.getRow(1).font = { bold: true };
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

      // Update plan artifact version
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
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Pre-Approval Board Pack</p>
              <p>Artifacts generated now will be marked as <strong>Draft</strong> with a watermark.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isApproved && !hasFinal && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Info className="h-5 w-5 text-green-600 shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Plan Approved — Ready to Finalize</p>
              <p>Generate final artifacts and mark them as <strong>Final</strong> for official distribution.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generate Board Pack Artifacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start gap-2" onClick={() => handleGenerate('board_summary_pdf')} disabled={!!generating}>
              {generating === 'board_summary_pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Board Summary PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => handleGenerate('detailed_plan_pdf')} disabled={!!generating}>
              {generating === 'detailed_plan_pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Detailed Plan PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => handleGenerate('excel_annex')} disabled={!!generating}>
              {generating === 'excel_annex' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Excel Annex
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            PDFs now include: cover page, executive summary, department/function coverage, risk analysis, detailed engagement schedule with lead auditor and team, resource plan, gap analysis, and governance section.
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
    </div>
  );
}
