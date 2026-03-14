import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/dateFormat';
import type { BatchData } from '@/hooks/usePaymentBatch';

interface BatchHeaderProps {
  batch: BatchData | null;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  O: { label: 'Open', variant: 'default' },
  V: { label: 'Verified', variant: 'secondary' },
  P: { label: 'Posted', variant: 'outline' },
};

export function BatchHeader({ batch }: BatchHeaderProps) {
  if (!batch) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="py-4 text-center text-muted-foreground text-sm">
          No batch loaded. Click <strong>New Batch</strong> to begin.
        </CardContent>
      </Card>
    );
  }

  const st = statusLabels[batch.batch_status || ''] || { label: batch.batch_status || 'Unknown', variant: 'outline' as const };

  return (
    <Card>
      <CardContent className="py-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground text-xs block">Batch #</span>
            <span className="font-semibold">{batch.batch_number}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Status</span>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Batch Date</span>
            <span>{formatDisplayDate(batch.batch_date)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Balance Forward</span>
            <span className="font-mono">${(batch.balance_forward || 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Entered By</span>
            <span>{batch.entered_by || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Office</span>
            <span>{batch.office_code || '—'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
