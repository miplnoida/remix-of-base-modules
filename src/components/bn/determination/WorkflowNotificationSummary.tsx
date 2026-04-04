import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, FileCheck, AlertTriangle } from 'lucide-react';
import type { EvidenceSummary } from '@/services/bn/determinationService';

interface Props {
  evidenceSummary: EvidenceSummary;
  claimStatus: string;
}

export const WorkflowNotificationSummary: React.FC<Props> = ({ evidenceSummary, claimStatus }) => {
  const statusNotes: Record<string, { label: string; description: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ELIGIBILITY_CHECK: { label: 'Eligibility Review', description: 'Claim awaiting eligibility check.', variant: 'secondary' },
    CALCULATION: { label: 'Calculation Pending', description: 'Claim requires benefit calculation.', variant: 'secondary' },
    DECISION: { label: 'Decision Required', description: 'Claim recommended — awaiting supervisor decision.', variant: 'default' },
    PENDING_INFO: { label: 'Awaiting Info', description: 'Additional evidence or information requested.', variant: 'destructive' },
    APPROVED: { label: 'Approved', description: 'Determination complete — pending award setup.', variant: 'default' },
    DENIED: { label: 'Denied', description: 'Claim disallowed after determination.', variant: 'destructive' },
  };

  const note = statusNotes[claimStatus];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" /> Workflow & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current workflow state */}
        {note && (
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Badge variant={note.variant} className="text-xs">{note.label}</Badge>
            <span className="text-sm text-muted-foreground">{note.description}</span>
          </div>
        )}

        {/* Evidence readiness */}
        <div className="flex items-center gap-3 rounded-md border p-3">
          <FileCheck className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm">
              Evidence: {evidenceSummary.verified}/{evidenceSummary.total} verified
            </p>
          </div>
          {evidenceSummary.complete ? (
            <Badge className="bg-green-600 text-white text-xs">Complete</Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              {evidenceSummary.missing} missing, {evidenceSummary.pending} pending
            </Badge>
          )}
        </div>

        {/* Notification indicators */}
        {claimStatus === 'PENDING_INFO' && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Evidence request notification sent to claimant.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
