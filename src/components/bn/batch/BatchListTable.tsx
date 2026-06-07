import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { Loader2 } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { BnPaymentBatch } from '@/services/bn/batchOperationsService';

import { formatNumber } from '@/lib/culture/culture';
interface Props {
  batches: BnPaymentBatch[];
  isLoading: boolean;
  onSelect: (batch: BnPaymentBatch) => void;
}

export const BatchListTable: React.FC<Props> = ({ batches, isLoading, onSelect }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batches.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No batches found matching current filters.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Batch #</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Method</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Items</TableHead>
            <TableHead className="font-semibold text-right">Amount</TableHead>
            <TableHead className="font-semibold">Office</TableHead>
            <TableHead className="font-semibold">Created By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((b) => (
            <TableRow
              key={b.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => onSelect(b)}
            >
              <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
              <TableCell className="text-sm">{formatDateForDisplay(b.batch_date)}</TableCell>
              <TableCell>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium">
                  {b.payment_method}
                </span>
              </TableCell>
              <TableCell><BnStatusBadge status={b.status} dot size="sm" /></TableCell>
              <TableCell className="text-right font-mono text-sm">
                {b.total_items}
                {b.failed_items > 0 && (
                  <span className="text-destructive ml-1">({b.failed_items} fail)</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {b.currency} {formatNumber(b.total_amount, 2)}
              </TableCell>
              <TableCell className="text-xs">{b.office_code}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{b.created_by}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
