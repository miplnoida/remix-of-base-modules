import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, ArrowRight, RotateCcw, AlertCircle, Calendar } from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWorkflowActions, useExecuteWorkflowAction, WorkflowAction } from '@/hooks/useWorkflowActions';
import { cn } from '@/lib/utils';
import { ScheduleMeetingDialog } from '@/components/meetings/ScheduleMeetingDialog';

interface WorkflowActionButtonsProps {
  sourceModule: string;
  sourceRecordId: string | null;
  variant?: 'default' | 'compact';
  className?: string;
  onActionComplete?: (action: string, endState: string | null) => void;
}

// Helper to detect Schedule Meeting action types
const isScheduleMeetingAction = (actionType: string): boolean => {
  const normalized = actionType.toLowerCase().replace(/[\s_-]/g, '');
  return normalized.includes('schedulemeeting') || normalized === 'schedule-a-meeting';
};

// Map source module to meeting type
const getMeetingType = (sourceModule: string): 'IP-Registration' | 'Employer-Registration' | 'Doctor-Registration' | 'General' => {
  if (sourceModule.includes('insured') || sourceModule.includes('ip')) return 'IP-Registration';
  if (sourceModule.includes('employer')) return 'Employer-Registration';
  if (sourceModule.includes('doctor')) return 'Doctor-Registration';
  return 'General';
};

/**
 * Dynamic workflow action buttons component.
 * Renders action buttons based on workflow configuration.
 * Only shows buttons if:
 * 1. A workflow is attached to the record
 * 2. There's an active workflow instance
 * 3. The current user has permission to perform actions on the current step
 */
export function WorkflowActionButtons({
  sourceModule,
  sourceRecordId,
  variant = 'default',
  className,
  onActionComplete,
}: WorkflowActionButtonsProps) {
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);
  const [comments, setComments] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);

  const {
    hasWorkflow,
    instanceId,
    workflowId,
    taskId,
    currentStepId,
    currentStepName,
    actions,
    canPerformActions,
    isLoading,
    error,
    refetch,
  } = useWorkflowActions(sourceModule, sourceRecordId);

  const executeAction = useExecuteWorkflowAction();

  // Don't render anything if there's no workflow or no active task
  if (isLoading) {
    if (variant === 'compact') return null;
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading workflow...</span>
      </div>
    );
  }

  // Error loading workflow - fail safely by hiding buttons
  if (error) {
    console.error('Workflow error:', error);
    return null;
  }

  // No workflow attached to this record
  if (!hasWorkflow) {
    return null;
  }

  // Workflow exists but user can't perform actions (no permission or no active task)
  if (!canPerformActions || actions.length === 0) {
    if (variant === 'compact') return null;
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Pending: {currentStepName || 'Workflow step'}</span>
      </div>
    );
  }

  const handleActionClick = (action: WorkflowAction) => {
    setSelectedAction(action);
    setComments('');
    
    // Check if this is a Schedule Meeting action - show meeting dialog instead
    if (isScheduleMeetingAction(action.action_type)) {
      setShowMeetingDialog(true);
    } else {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedAction || !taskId || !sourceRecordId) return;

    try {
      const result = await executeAction.mutateAsync({
        taskId,
        actionId: selectedAction.id,
        comments: comments || undefined,
        sourceModule,
        sourceRecordId,
      });

      setShowConfirmDialog(false);
      setSelectedAction(null);
      setComments('');

      if (onActionComplete) {
        onActionComplete(result.action, result.endState || null);
      }
    } catch (error) {
      // Error is handled by mutation hook
    }
  };

  const handleMeetingSuccess = (data: any) => {
    setShowMeetingDialog(false);
    setSelectedAction(null);
    refetch();
    
    if (onActionComplete) {
      onActionComplete('Schedule Meeting', null);
    }
  };

  const getActionIcon = (actionType: string) => {
    if (isScheduleMeetingAction(actionType)) {
      return <Calendar className="h-4 w-4" />;
    }
    switch (actionType.toLowerCase()) {
      case 'approve':
        return <Check className="h-4 w-4" />;
      case 'reject':
        return <X className="h-4 w-4" />;
      case 'send_back':
      case 'send_back_to_applicant':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getActionVariant = (actionType: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (actionType.toLowerCase()) {
      case 'approve':
        return 'default';
      case 'reject':
        return 'destructive';
      case 'send_back':
      case 'send_back_to_applicant':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getActionClassName = (actionType: string): string => {
    if (isScheduleMeetingAction(actionType)) {
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
    switch (actionType.toLowerCase()) {
      case 'approve':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'reject':
        return '';
      default:
        return '';
    }
  };

  const requiresComment = (action: WorkflowAction | null): boolean => {
    if (!action) return false;
    // Check database-configured remarks_required flag first
    if (action.remarks_required) return true;
    // Fallback: always require comments for reject/send_back
    const type = action.action_type.toLowerCase();
    return type === 'reject' || type === 'send_back' || type === 'send_back_to_applicant';
  };

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={getActionVariant(action.action_type)}
            size={variant === 'compact' ? 'icon' : 'default'}
            className={getActionClassName(action.action_type)}
            onClick={() => handleActionClick(action)}
            disabled={executeAction.isPending}
            title={action.action_name}
          >
            {executeAction.isPending && selectedAction?.id === action.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {getActionIcon(action.action_type)}
                {variant !== 'compact' && (
                  <span className="ml-2">{action.action_name}</span>
                )}
              </>
            )}
          </Button>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {selectedAction?.action_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction?.action_type === 'Approve' && 
                'This will mark the application as verified and complete this workflow step.'}
              {selectedAction?.action_type === 'Reject' && 
                'This will reject the application. Please provide a reason below.'}
              {selectedAction?.action_type === 'send_back' && 
                'This will send the application back to the applicant for corrections.'}
              {!['Approve', 'Reject', 'send_back'].includes(selectedAction?.action_type || '') && 
                `Are you sure you want to execute "${selectedAction?.action_name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
              <Label htmlFor="comments">
                Comments {requiresComment(selectedAction) && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  requiresComment(selectedAction)
                    ? 'Comments are required for this action...'
                    : 'Add any comments or notes (optional)...'
                }
                rows={3}
                className={requiresComment(selectedAction) && !comments.trim() ? 'border-destructive' : ''}
              />
              {requiresComment(selectedAction) && !comments.trim() && (
                <p className="text-xs text-destructive">Reviewer comments are mandatory for this action</p>
              )}
            </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={executeAction.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={
                executeAction.isPending ||
                (requiresComment(selectedAction) && !comments.trim())
              }
              className={getActionClassName(selectedAction?.action_type || '')}
            >
              {executeAction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {getActionIcon(selectedAction?.action_type || '')}
                  <span className="ml-2">{selectedAction?.action_name}</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Meeting Dialog */}
      {sourceRecordId && (
        <ScheduleMeetingDialog
          open={showMeetingDialog}
          onOpenChange={(open) => {
            setShowMeetingDialog(open);
            if (!open) setSelectedAction(null);
          }}
          applicationReference={sourceRecordId}
          meetingType={getMeetingType(sourceModule)}
          workflowInstanceId={instanceId || undefined}
          workflowId={workflowId || undefined}
          stepId={currentStepId || undefined}
          onSuccess={handleMeetingSuccess}
        />
      )}
    </>
  );
}

/**
 * Compact version for use in table rows.
 */
export function WorkflowActionButtonsCompact(props: Omit<WorkflowActionButtonsProps, 'variant'>) {
  return <WorkflowActionButtons {...props} variant="compact" />;
}
