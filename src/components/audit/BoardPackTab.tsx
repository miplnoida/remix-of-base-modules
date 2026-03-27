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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BoardPackTabProps {
  planId: string;
  plan: any;
  engagements: any[];
}

function generateBoardSummaryPdf(plan: any, engagements: any[]): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Social Security Board', 14, 18);
  doc.setFontSize(11);
  doc.text('Internal Audit Department — Board Summary', 14, 28);
  doc.text(`Fiscal Year: ${plan?.fiscal_year || 'N/A'}`, 14, 35);

  // Plan info
  doc.setTextColor(0, 0, 0);
  let y = 50;
  doc.setFontSize(13);
  doc.text(plan?.plan_title || 'Annual Audit Plan', 14, y);
  y += 10;
  doc.setFontSize(10);
  doc.text(`Status: ${plan?.status || 'Draft'}`, 14, y);
  doc.text(`Version: v${plan?.current_version_number || 1}`, 100, y);
  y += 7;
  doc.text(`Prepared By: ${plan?.created_by || 'Internal Audit'}`, 14, y);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 100, y);
  y += 10;

  // Executive Summary
  if (plan?.executive_summary) {
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.text('Executive Summary', 14, y);
    y += 7;
    doc.setFont(undefined as any, 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(plan.executive_summary, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  // Engagements table
  if (engagements.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.text('Planned Audit Engagements', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Engagement Title', 'Quarter', 'Type', 'Priority', 'Est. Hours']],
      body: engagements.map((e: any, i: number) => [
        i + 1,
        e.engagement_title || e.title || '—',
        e.quarter || '—',
        e.engagement_type || e.audit_type || '—',
        e.board_priority_flag ? 'High' : 'Normal',
        e.estimated_hours || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [26, 54, 93] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Confidential — Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  return doc;
}

function generateDetailedPlanPdf(plan: any, engagements: any[]): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Social Security Board', 14, 18);
  doc.setFontSize(11);
  doc.text('Detailed Internal Audit Plan', 14, 28);
  doc.text(`Fiscal Year: ${plan?.fiscal_year || 'N/A'}`, 14, 35);

  doc.setTextColor(0, 0, 0);
  let y = 50;

  // Plan Details
  const details = [
    ['Plan Title', plan?.plan_title || '—'],
    ['Status', plan?.status || 'Draft'],
    ['Version', `v${plan?.current_version_number || 1}`],
    ['Board Committee', plan?.board_committee_name || '—'],
    ['Available Hours', plan?.available_audit_hours?.toString() || '—'],
    ['Planned Hours', plan?.planned_audit_hours?.toString() || '—'],
    ['Contingency Hours', plan?.contingency_hours?.toString() || '—'],
  ];

  doc.setFontSize(12);
  doc.setFont(undefined as any, 'bold');
  doc.text('Plan Overview', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    body: details,
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    theme: 'plain',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Executive Summary
  if (plan?.executive_summary) {
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.text('Executive Summary', 14, y);
    y += 7;
    doc.setFont(undefined as any, 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(plan.executive_summary, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  // Scope
  if (plan?.scope_description) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.text('Scope', 14, y);
    y += 7;
    doc.setFont(undefined as any, 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(plan.scope_description, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  // Methodology
  if (plan?.methodology_notes) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.text('Methodology', 14, y);
    y += 7;
    doc.setFont(undefined as any, 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(plan.methodology_notes, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  // Engagements Detail
  if (engagements.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.text('Planned Audit Engagements', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Title', 'Quarter', 'Type', 'Priority', 'Est. Hours', 'Rationale']],
      body: engagements.map((e: any, i: number) => [
        i + 1,
        e.engagement_title || e.title || '—',
        e.quarter || '—',
        e.engagement_type || e.audit_type || '—',
        e.board_priority_flag ? 'High' : 'Normal',
        e.estimated_hours || '—',
        e.inclusion_rationale || '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [26, 54, 93] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 6: { cellWidth: 45 } },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Confidential — Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  return doc;
}

export function BoardPackTab({ planId, plan, engagements }: BoardPackTabProps) {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data: artifacts = [], isLoading } = useIAPlanArtifacts(planId);
  const { create, update } = useIAPlanArtifactMutations();
  const [generating, setGenerating] = useState<string | null>(null);

  const isApproved = plan?.status === 'Approved';
  const isDraft = ['Draft', 'Submitted', 'Under Review'].includes(plan?.status);
  const hasFinal = artifacts.some((a: any) => a.is_final);

  const handleGenerate = async (artifactType: string) => {
    setGenerating(artifactType);
    try {
      // Supersede previous artifacts of same type
      const existing = artifacts.filter((a: any) => a.artifact_type === artifactType && a.status !== 'Superseded');
      for (const art of existing) {
        await update.mutateAsync({ id: (art as any).id, status: 'Superseded', is_final: false });
      }

      const version = (plan?.current_version_number || 1);
      const artifactStatus = isApproved ? 'Generated' : 'Draft';
      const fileName = artifactType === 'board_summary_pdf'
        ? `Board_Summary_${plan?.fiscal_year}_v${version}.pdf`
        : artifactType === 'detailed_plan_pdf'
          ? `Detailed_Plan_${plan?.fiscal_year}_v${version}.pdf`
          : `Engagement_Annex_${plan?.fiscal_year}_v${version}.xlsx`;

      const filePath = `plans/${planId}/${fileName}`;

      // Generate the actual file and upload to storage
      if (artifactType === 'board_summary_pdf' || artifactType === 'detailed_plan_pdf') {
        const doc = artifactType === 'board_summary_pdf'
          ? generateBoardSummaryPdf(plan, engagements)
          : generateDetailedPlanPdf(plan, engagements);

        const pdfBlob = doc.output('blob');
        const { error: uploadError } = await supabase.storage
          .from('ia-artifacts')
          .upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload PDF: ${uploadError.message}`);
        }
      } else if (artifactType === 'excel_annex') {
        // For Excel, create a simple CSV-like blob as placeholder
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Audit Engagements');
        sheet.columns = [
          { header: '#', key: 'seq', width: 5 },
          { header: 'Engagement Title', key: 'title', width: 40 },
          { header: 'Quarter', key: 'quarter', width: 10 },
          { header: 'Type', key: 'type', width: 20 },
          { header: 'Priority', key: 'priority', width: 10 },
          { header: 'Est. Hours', key: 'hours', width: 12 },
          { header: 'Rationale', key: 'rationale', width: 40 },
        ];
        engagements.forEach((e: any, i: number) => {
          sheet.addRow({
            seq: i + 1,
            title: e.engagement_title || e.title || '—',
            quarter: e.quarter || '—',
            type: e.engagement_type || e.audit_type || '—',
            priority: e.board_priority_flag ? 'High' : 'Normal',
            hours: e.estimated_hours || '—',
            rationale: e.inclusion_rationale || '—',
          });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const { error: uploadError } = await supabase.storage
          .from('ia-artifacts')
          .upload(filePath, new Blob([buffer]), {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true,
          });
        if (uploadError) {
          throw new Error(`Failed to upload Excel: ${uploadError.message}`);
        }
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

      toast({ title: 'Artifact Generated', description: `${fileName} has been generated and uploaded as ${artifactStatus}.` });
    } catch (err: any) {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const handleMarkFinal = async (artifactId: string) => {
    if (!isApproved) {
      toast({ title: 'Cannot Finalize', description: 'Only approved plans can have final (locked) artifacts. You can still generate and distribute draft artifacts for board review.', variant: 'destructive' });
      return;
    }
    try {
      await update.mutateAsync({ id: artifactId, status: 'Final', is_final: true });
      toast({ title: 'Artifact Finalized', description: 'Artifact marked as final and locked.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownload = async (artifact: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('ia-artifacts')
        .download(artifact.file_path);
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
    { key: 'version_number', header: 'Version', render: (r) => `v${r.version_number}` },
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
              <p>You can generate and distribute draft board pack artifacts for board/committee review before formal approval. Artifacts generated now will be marked as <strong>Draft</strong> and cannot be finalized until the plan is approved.</p>
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
              <p>This plan is approved. You can now generate final artifacts or mark existing ones as <strong>Final</strong> to lock them for official distribution.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isApproved && hasFinal && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Lock className="h-5 w-5 text-green-600 shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Final Artifact Locked</p>
              <p>A finalized artifact exists. Use the Distribution tab to send the official version to stakeholders.</p>
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
          {isDraft && (
            <p className="text-xs text-muted-foreground">Artifacts generated before approval are marked as Draft — suitable for board review but not final distribution.</p>
          )}
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
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(row)} title="Download">
                    <Download className="h-4 w-4 mr-1" />Download
                  </Button>
                )}
                {row.status === 'Generated' && isApproved && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkFinal(row.id)} title="Mark as Final">
                    <Lock className="h-4 w-4 mr-1" />Final
                  </Button>
                )}
                {row.status === 'Draft' && isApproved && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkFinal(row.id)} title="Promote to Final">
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
