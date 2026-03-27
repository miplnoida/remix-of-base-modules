import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Lock, Loader2, AlertTriangle } from 'lucide-react';
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
      const fileName = artifactType === 'board_summary_pdf'
        ? `Board_Summary_${plan?.fiscal_year}_v${version}.pdf`
        : artifactType === 'detailed_plan_pdf'
          ? `Detailed_Plan_${plan?.fiscal_year}_v${version}.pdf`
          : `Engagement_Annex_${plan?.fiscal_year}_v${version}.xlsx`;

      await create.mutateAsync({
        plan_id: planId,
        version_number: version,
        artifact_type: artifactType,
        status: 'Generated',
        file_name: fileName,
        file_path: `plans/${planId}/${fileName}`,
        mime_type: artifactType.includes('pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        generated_at: new Date().toISOString(),
        generated_by: userCode || 'system',
        is_final: false,
      });

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
      {!isApproved && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">Plan must be approved before final board pack artifacts can be generated and locked.</p>
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
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
