/**
 * Batch Issue Progress — Real-time progress indicator for batch issue operations.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import type { BnPaymentBatch } from '@/services/bn/batchOperationsService';

interface Props {
  batch: BnPaymentBatch;
}

export const BatchIssueProgress: React.FC<Props> = ({ batch }) => {
  if (!['RELEASED', 'ISSUED', 'PARTIALLY_ISSUED'].includes(batch.status)) return null;

  const total = batch.total_items || 1;
  const issued = batch.issued_items || 0;
  const failed = batch.issue_error_count || 0;
  const remaining = total - issued - failed;
  const pct = Math.round((issued / total) * 100);
  const isComplete = batch.status === 'ISSUED';
  const isPartial = batch.status === 'PARTIALLY_ISSUED';
  const isInProgress = batch.status === 'RELEASED' && batch.issue_started_at && !batch.issue_completed_at;

  return (
    <Card className={isPartial ? 'border-amber-300' : isComplete ? 'border-emerald-300' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {isInProgress && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {isComplete && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {isPartial && <XCircle className="h-4 w-4 text-amber-600" />}
          Issue Progress
          <Badge variant={isComplete ? 'default' : isPartial ? 'secondary' : 'outline'} className="ml-auto text-xs">
            {batch.status.replace('_', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={pct} className="h-3" />
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{total}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">{issued}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Issued</p>
          </div>
          <div>
            <p className="text-lg font-bold text-destructive">{failed}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-muted-foreground">{remaining}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
          </div>
        </div>
        {batch.issue_started_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Started: {new Date(batch.issue_started_at).toLocaleString()}
            {batch.issue_completed_at && (
              <span className="ml-2">
                Completed: {new Date(batch.issue_completed_at).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
