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

interface BoardPackTabProps {
  planId: string;
  plan: any;
  engagements: any[];
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
      // Mark as Draft if plan not yet approved, Generated if approved
      const artifactStatus = isApproved ? 'Generated' : 'Draft';
      const fileName = artifactType === 'board_summary_pdf'
        ? `Board_Summary_${plan?.fiscal_year}_v${version}.pdf`
        : artifactType === 'detailed_plan_pdf'
          ? `Detailed_Plan_${plan?.fiscal_year}_v${version}.pdf`
          : `Engagement_Annex_${plan?.fiscal_year}_v${version}.xlsx`;

      await create.mutateAsync({
        plan_id: planId,
        version_number: version,
        artifact_type: artifactType,
        status: artifactStatus,
        file_name: fileName,
        file_path: `plans/${planId}/${fileName}`,
        mime_type: artifactType.includes('pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        generated_at: new Date().toISOString(),
        generated_by: userCode || 'system',
        is_final: false,
      });

      toast({ title: 'Artifact Generated', description: `${fileName} has been generated as ${artifactStatus}.` });
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
      {/* Contextual banner based on plan status */}
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
