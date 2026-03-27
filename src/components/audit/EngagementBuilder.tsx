import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Copy } from 'lucide-react';
import { useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { EditEngagementDialog } from './EditEngagementDialog';
import { OverrideReasonModal } from './OverrideReasonModal';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIADepartments, useIADepartmentFunctions, useIAActiveAuditors } from '@/hooks/useAuditData';
import { formatDateForDisplay } from '@/lib/format-config';
import { useUserCode } from '@/hooks/useUserCode';
import { useManualOverride } from '@/hooks/useAutoPlanEngine';

interface EngagementBuilderProps {
  planId: string;
  planStatus: string;
  planFiscalYear?: string;
}

export function EngagementBuilder({ planId, planStatus, planFiscalYear }: EngagementBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { data: engagements = [], isLoading } = useIAPlanEngagements(planId);
  const { data: departments = [] } = useIADepartments();
  const { data: functions = [] } = useIADepartmentFunctions('all');
  const { data: auditors = [] } = useIAActiveAuditors();
  const [editTarget, setEditTarget] = useState<any | null>(null); // null=add, object=edit
  const [showDialog, setShowDialog] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const manualOverride = useManualOverride(planId);

  const canEdit = ['Draft', 'Revision'].includes(planStatus);
  const isApproved = planStatus === 'Approved';
  // Allow editing even on approved plans (triggers amendment)
  const canModify = canEdit || isApproved;

  const getDeptName = (id: string) => (departments || []).find((d: any) => d.id === id)?.name || '—';
  const getFuncName = (id: string) => (functions || []).find((f: any) => f.id === id)?.function_name || '—';
  const getAuditorName = (id: string) => (auditors || []).find((a: any) => a.id === id)?.name || '—';

  const saveEngagement = useMutation({
    mutationFn: async (payload: any) => {
      const { id: engId, risk_override_reason, derived_risk_rating, ...fields } = payload;

      if (engId) {
        // UPDATE existing
        const { error } = await supabase
          .from('ia_audit_engagements' as any)
          .update({ ...fields, updated_by: userCode || 'system', updated_at: new Date().toISOString() } as any)
          .eq('id', engId);
        if (error) throw error;

        // If plan is approved, log amendment
        if (isApproved) {
          await supabase.from('ia_plan_amendments' as any).insert({
            plan_id: planId,
            plan_type: 'annual',
            field_changed: `Engagement: ${fields.engagement_name}`,
            new_value: 'Updated',
            reason: 'Engagement details modified after approval',
            requested_by: userCode || 'system',
            status: 'Applied',
          } as any);

          await supabase.from('ia_plan_change_log' as any).insert({
            plan_id: planId,
            change_type: 'engagement_modified',
            description: `Engagement "${fields.engagement_name}" was modified after plan approval`,
            changed_by: userCode || 'system',
          } as any);
        }

        return { engagement_ids: [engId] };
      } else {
        // INSERT new via RPC
        const { data, error } = await supabase.rpc('ia_persist_plan_engagements' as any, {
          p_plan_id: planId,
          p_engagements: [fields],
          p_created_by: userCode || 'system',
        });
        if (error) throw error;
        const result = data as any;
        if (!result?.success) throw new Error(result?.error || 'Failed to save engagement');

        if (risk_override_reason && derived_risk_rating && result.engagement_ids?.[0]) {
          await supabase.from('ia_engagement_risk_overrides' as any).insert({
            engagement_id: result.engagement_ids[0],
            derived_risk_rating,
            overridden_risk_rating: fields.engagement_risk_rating,
            override_reason: risk_override_reason,
            overridden_by: userCode || 'system',
          } as any);
        }

        if (isApproved) {
          await supabase.from('ia_plan_amendments' as any).insert({
            plan_id: planId,
            plan_type: 'annual',
            field_changed: 'Engagement Added',
            new_value: fields.engagement_name,
            reason: 'New engagement added after approval',
            requested_by: userCode || 'system',
            status: 'Applied',
          } as any);
        }

        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_plan_engagements', planId] });
      setShowDialog(false);
      setEditTarget(null);
      toast({ title: editTarget ? 'Engagement Updated' : 'Engagement Added', description: editTarget ? 'Changes saved.' : 'Added to the plan.' });
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
      toast({ title: 'Engagement Removed' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const duplicateEngagement = (eng: any) => {
    const { id, engagement_code, created_at, updated_at, ...rest } = eng;
    setEditTarget(null);
    setShowDialog(true);
    // Pre-fill will be handled by opening add mode, user copies from existing
    toast({ title: 'Duplicate', description: 'A new engagement form has been opened. Fill in the details.' });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'sequence_no', header: '#', render: (r) => r.sequence_no || '—' },
    { key: 'engagement_name', header: 'Audit Title', render: (r) => (
      <div>
        <span className="font-medium">{r.engagement_name}</span>
        {r.board_priority_flag && <span className="ml-1 text-xs bg-amber-100 text-amber-800 px-1 rounded">Priority</span>}
      </div>
    )},
    { key: 'department_id', header: 'Department', render: (r) => r.department_id ? getDeptName(r.department_id) : '—' },
    { key: 'function_id', header: 'Function', render: (r) => r.function_id ? getFuncName(r.function_id) : '—' },
    { key: 'engagement_risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.engagement_risk_rating || 'Medium'} /> },
    { key: 'lead_auditor_id', header: 'Lead Auditor', render: (r) => r.lead_auditor_id ? getAuditorName(r.lead_auditor_id) : '—' },
    { key: 'supportive_auditor_ids', header: 'Team', render: (r) => {
      const ids = Array.isArray(r.supportive_auditor_ids) ? r.supportive_auditor_ids : [];
      return ids.length > 0 ? (
        <span className="text-xs text-muted-foreground">{ids.map((id: string) => getAuditorName(id)).join(', ')}</span>
      ) : '—';
    }},
    { key: 'quarter', header: 'Quarter', render: (r) => r.quarter || '—' },
    { key: 'estimated_hours', header: 'Hours', render: (r) => r.estimated_hours || '—' },
    { key: 'planned_start_date', header: 'Start', render: (r) => r.planned_start_date ? formatDateForDisplay(r.planned_start_date) : '—' },
    { key: 'planned_end_date', header: 'End', render: (r) => r.planned_end_date ? formatDateForDisplay(r.planned_end_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Planned'} /> },
  ];

  // Summary stats
  const totalHours = engagements.reduce((sum: number, e: any) => sum + (Number(e.estimated_hours) || 0), 0);
  const byQuarter = ['Q1','Q2','Q3','Q4'].map(q => ({
    quarter: q,
    count: engagements.filter((e: any) => e.quarter === q).length,
    hours: engagements.filter((e: any) => e.quarter === q).reduce((s: number, e: any) => s + (Number(e.estimated_hours) || 0), 0),
  }));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Engagement Portfolio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {engagements.length} engagements • {totalHours} hours planned
              {byQuarter.filter(q => q.count > 0).map(q => ` • ${q.quarter}: ${q.count}`).join('')}
            </p>
          </div>
          {canModify && (
            <Button size="sm" onClick={() => { setEditTarget(null); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" />Add Engagement
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={engagements}
            emptyMessage="No engagements added to this plan yet. Click 'Add Engagement' to build the audit portfolio."
            renderActions={canModify ? (row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditTarget(row); setShowDialog(true); }} title="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setRemoveTarget({ id: row.id, name: row.engagement_name || 'Engagement' })} title="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : undefined}
          />
        </CardContent>
      </Card>

      <EditEngagementDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditTarget(null); }}
        engagement={editTarget}
        planId={planId}
        planFiscalYear={planFiscalYear}
        onSave={(payload) => saveEngagement.mutate(payload)}
        isSaving={saveEngagement.isPending}
        isApprovedPlan={isApproved}
      />

      <OverrideReasonModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Engagement"
        description={`Removing "${removeTarget?.name}" from the plan requires justification.`}
        overrideTypes={[{ value: 'remove_engagement', label: 'Remove Engagement' }]}
        onConfirm={(_type, reason) => {
          if (removeTarget) {
            manualOverride.mutate({
              override_type: 'remove_engagement',
              engagement_id: removeTarget.id,
              reason,
              changed_by: userCode || 'system',
            });
            removeEngagement.mutate(removeTarget.id);

            if (isApproved) {
              supabase.from('ia_plan_amendments' as any).insert({
                plan_id: planId,
                plan_type: 'annual',
                field_changed: 'Engagement Removed',
                old_value: removeTarget.name,
                reason,
                requested_by: userCode || 'system',
                status: 'Applied',
              } as any);
            }
          }
          setRemoveTarget(null);
        }}
      />
    </>
  );
}
