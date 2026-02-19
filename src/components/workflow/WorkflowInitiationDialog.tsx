import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitBranch, Clock, ListChecks } from 'lucide-react';
import type { WorkflowEligibilityResult } from '@/services/workflowEligibilityService';

interface WorkflowInitiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility: WorkflowEligibilityResult | null;
  applicationStatus: string;
  recordName: string;
  onConfirm: () => void;
  onDecline: () => void;
  isInitiating?: boolean;
}

export function WorkflowInitiationDialog({
  open,
  onOpenChange,
  eligibility,
  applicationStatus,
  recordName,
  onConfirm,
  onDecline,
  isInitiating = false,
}: WorkflowInitiationDialogProps) {
  if (!eligibility?.eligible) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Initiate Workflow?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              <p>
                The application for <strong>{recordName}</strong> has been converted
                successfully. A workflow is eligible to be initiated for this registration.
              </p>

              <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Workflow</span>
                  <span className="font-medium">{eligibility.workflowName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Application Status</span>
                  <Badge variant="outline">{applicationStatus}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" />
                    Total Steps
                  </span>
                  <span>{eligibility.totalSteps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">First Step</span>
                  <span>{eligibility.firstStepName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    SLA
                  </span>
                  <span>{eligibility.defaultSlaHours} hours</span>
                </div>
              </div>

              <p className="text-muted-foreground">
                Confirming will create a workflow instance and assign the first task
                to the designated approver. Declining will leave the registration
                without a workflow — you can initiate one later from the registration view.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline} disabled={isInitiating}>
            Decline
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isInitiating}>
            {isInitiating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Initiating…
              </>
            ) : (
              'Confirm & Initiate'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
