import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, X, Save, Loader2 } from 'lucide-react';
import { useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { AddEngagementToPlanForm } from './AddEngagementToPlanForm';
import { OverrideReasonModal } from './OverrideReasonModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIADepartments, useIAActiveAuditors } from '@/hooks/useAuditData';
import { formatDateForDisplay } from '@/lib/format-config';
import { useUserCode } from '@/hooks/useUserCode';
import { useManualOverride } from '@/hooks/useAutoPlanEngine';

interface EngagementBuilderProps {
  planId: string;
  planStatus: string;
}

export function EngagementBuilder({ planId, planStatus }: EngagementBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { data: engagements = [], isLoading } = useIAPlanEngagements(planId);
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAActiveAuditors();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const canEdit = ['Draft', 'Revision'].includes(planStatus);

  const getDeptName = (id: string) => (departments || []).find((d: any) => d.id === id)?.name || '—';
  const getAuditorName = (id: string) => (auditors || []).find((a: any) => a.id === id)?.name || '—';

  const persistEngagement = useMutation({
    mutationFn: async (payload: any) => {
      const { risk_override_reason, derived_risk_rating, ...engPayload } = payload;
      const { data, error } = await supabase.rpc('ia_persist_plan_engagements' as any, {
        p_plan_id: planId,
        p_engagements: [engPayload],
        p_created_by: userCode || 'system',
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Failed to save engagement');

      // Log risk override if applicable
      if (risk_override_reason && derived_risk_rating && result.engagement_ids?.[0]) {
        await supabase.from('ia_engagement_risk_overrides' as any).insert({
          engagement_id: result.engagement_ids[0],
          derived_risk_rating,
          overridden_risk_rating: engPayload.engagement_risk_rating,
          override_reason: risk_override_reason,
          overridden_by: userCode || 'system',
        } as any);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_plan_engagements', planId] });
      setShowAddDialog(false);
      toast({ title: 'Engagement Added', description: 'The engagement has been added to the plan.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const removeEngagement = useMutation({
    mutationFn: async (engagementId: string) => {
      const { error } = await supabase
        .from('ia_audit_engagements' as any)
        .update({ is_active: false, updated_by: userCode || 'system', updated_at: new Date().toISOString() })
        .eq('id', engagementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_plan_engagements', planId] });
      toast({ title: 'Engagement Removed', description: 'The engagement has been removed from the plan.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const columns: DataTableColumn<any>[] = [
    { key: 'engagement_code', header: 'Code' },
    { key: 'engagement_name', header: 'Audit Title' },
    { key: 'engagement_type', header: 'Type', render: (r) => <StatusBadge status={r.engagement_type || 'Planned Audit'} /> },
    { key: 'department_id', header: 'Department', render: (r) => r.department_id ? getDeptName(r.department_id) : '—' },
    { key: 'engagement_risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.engagement_risk_rating || 'Medium'} /> },
    { key: 'lead_auditor_id', header: 'Lead Auditor', render: (r) => r.lead_auditor_id ? getAuditorName(r.lead_auditor_id) : '—' },
    { key: 'planned_start_date', header: 'Start', render: (r) => r.planned_start_date ? formatDateForDisplay(r.planned_start_date) : '—' },
    { key: 'planned_end_date', header: 'End', render: (r) => r.planned_end_date ? formatDateForDisplay(r.planned_end_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Planned'} /> },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Engagement Portfolio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {canEdit
                ? 'Add, edit, or remove audit engagements under this annual plan.'
                : 'Engagements are locked. Plan must be in Draft or Revision status to modify.'}
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />Add Engagement
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={engagements}
            emptyMessage="No engagements added to this plan yet. Click 'Add Engagement' to build the audit portfolio."
            renderActions={canEdit ? (row) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm('Remove this engagement from the plan?')) {
                    removeEngagement.mutate(row.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : undefined}
          />
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Engagement to Plan</DialogTitle>
          </DialogHeader>
          <AddEngagementToPlanForm
            planId={planId}
            onSave={(payload) => persistEngagement.mutate(payload)}
            isSaving={persistEngagement.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
