import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { ReadinessCheck } from '@/hooks/useAuditPlanApproval';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checks: ReadinessCheck[];
  engagementCount: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function PlanSubmissionReadiness({ open, onOpenChange, checks, engagementCount, onSubmit, isSubmitting }: Props) {
  const allPassed = checks.every(c => c.passed);
  const failedCount = checks.filter(c => !c.passed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {allPassed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            Submission Readiness Check
          </DialogTitle>
          <DialogDescription>
            {allPassed
              ? `All checks passed. ${engagementCount} engagement(s) ready for review.`
              : `${failedCount} issue(s) must be resolved before submission.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-md border p-3">
              {check.passed ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{check.label}</p>
                {check.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={!allPassed || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
