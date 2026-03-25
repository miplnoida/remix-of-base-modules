import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, UserCheck, Loader2, FileText } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface ApprovalHistoryPanelProps {
  /** Entity ID (plan, engagement, report) */
  entityId: string;
  entityType?: 'plan' | 'engagement' | 'report';
}

interface ApprovalEntry {
  id: string;
  step_name: string;
  action: string;
  performed_by: string;
  performed_at: string;
  comments: string | null;
  status: string;
  step_order: number;
}

export function ApprovalHistoryPanel({ entityId, entityType = 'plan' }: ApprovalHistoryPanelProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['ia_approval_history', entityId],
    queryFn: async () => {
      // Try fetching from workflow_tasks linked to an instance for this entity
      const { data: instances } = await supabase
        .from('workflow_instances' as any)
        .select('id')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!instances || instances.length === 0) return [];

      const instanceIds = instances.map((i: any) => i.id);
      const { data: tasks, error } = await supabase
        .from('workflow_tasks' as any)
        .select('*')
        .in('workflow_instance_id', instanceIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (tasks || []).map((t: any) => ({
        id: t.id,
        step_name: t.step_name || t.task_name || 'Step',
        action: t.action || t.status || 'Pending',
        performed_by: t.completed_by || t.assigned_to || '—',
        performed_at: t.completed_at || t.created_at,
        comments: t.comments || t.rejection_reason || null,
        status: t.status || 'Pending',
        step_order: t.step_order || 0,
      })) as ApprovalEntry[];
    },
    enabled: !!entityId,
  });

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'in_progress':
      case 'in progress':
        return <UserCheck className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'in_progress':
      case 'in progress':
        return 'bg-primary/10 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading approval history...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mb-2" />
        <p className="text-sm">No approval history for this {entityType}.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Approval History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-3">
            {history.map((entry, idx) => (
              <div key={entry.id} className="flex gap-3 relative">
                {/* Timeline dot */}
                <div className="relative z-10 shrink-0 mt-1">
                  {getStatusIcon(entry.status)}
                </div>

                <div className="flex-1 rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{entry.step_name}</p>
                    <Badge variant="outline" className={`text-[10px] ${getStatusColor(entry.status)}`}>
                      {entry.action || entry.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{entry.performed_by}</span>
                    <span>·</span>
                    <span>{entry.performed_at ? formatDateForDisplay(entry.performed_at) : '—'}</span>
                  </div>
                  {entry.comments && (
                    <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-muted pl-2">
                      {entry.comments}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
