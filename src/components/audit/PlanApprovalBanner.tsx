import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Send, CheckCircle2, XCircle, AlertTriangle, Clock, Archive } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  plan: any;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; message: string }> = {
  Draft: { icon: Unlock, color: 'text-muted-foreground', bgColor: 'bg-muted/50', message: 'This plan is in draft mode. Edit freely and submit when ready.' },
  Submitted: { icon: Send, color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', message: 'This plan has been submitted for approval. Editing is locked.' },
  'Under Review': { icon: Clock, color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', message: 'This plan is under review by the approver.' },
  Approved: { icon: CheckCircle2, color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', message: 'This plan is approved and locked.' },
  Rejected: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/5 border-destructive/20', message: 'This plan was rejected. Review comments and resubmit.' },
  'Changes Requested': { icon: AlertTriangle, color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', message: 'Changes have been requested. Edit and resubmit.' },
  'Amendment Pending': { icon: AlertTriangle, color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', message: 'Material changes detected. Re-approval required before final distribution.' },
  Superseded: { icon: Archive, color: 'text-muted-foreground', bgColor: 'bg-muted/50', message: 'This plan has been superseded by a newer approved version.' },
  Archived: { icon: Archive, color: 'text-muted-foreground', bgColor: 'bg-muted/50', message: 'This plan is archived.' },
};

export function PlanApprovalBanner({ plan }: Props) {
  const status = plan?.status || 'Draft';
  const config = statusConfig[status] || statusConfig.Draft;
  const Icon = config.icon;
  const isLocked = ['Submitted', 'Under Review', 'Approved', 'Superseded', 'Archived'].includes(status);

  return (
    <Alert className={`${config.bgColor} border`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${config.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`${config.color} border-current text-xs`}>
              {isLocked && <Lock className="h-3 w-3 mr-1" />}
              {status}
            </Badge>
            <span className="text-sm">{config.message}</span>
          </AlertDescription>
          {(plan?.submitted_by || plan?.approved_by || plan?.rejected_by) && (
            <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
              {plan.submitted_by && (
                <span>Submitted by <strong>{plan.submitted_by}</strong>{plan.submitted_date ? ` on ${formatDateForDisplay(plan.submitted_date)}` : ''}</span>
              )}
              {plan.approved_by && status === 'Approved' && (
                <span>Approved by <strong>{plan.approved_by}</strong>{plan.approved_date ? ` on ${formatDateForDisplay(plan.approved_date)}` : ''}</span>
              )}
              {plan.rejected_by && status === 'Rejected' && (
                <span>Rejected by <strong>{plan.rejected_by}</strong>{plan.rejected_at ? ` on ${formatDateForDisplay(plan.rejected_at)}` : ''}</span>
              )}
            </div>
          )}
          {plan?.approval_comments && ['Rejected', 'Changes Requested'].includes(status) && (
            <p className="text-xs mt-1 italic text-muted-foreground border-l-2 border-muted pl-2">
              "{plan.approval_comments}"
            </p>
          )}
        </div>
      </div>
    </Alert>
  );
}
