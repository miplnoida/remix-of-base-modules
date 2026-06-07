import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateForDisplay } from '@/lib/format-config';
import type { HistoricalDisbursementRecord } from '@/services/bn/historicalInquiryService';

import { formatNumber } from '@/lib/culture/culture';
interface DisbursementsHistoryTableProps {
  data: HistoricalDisbursementRecord[];
  onViewDetail: (record: HistoricalDisbursementRecord) => void;
}

const SOURCE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  cl_cheques: { label: 'Standard', variant: 'outline' },
  cl_cheques_holding: { label: 'Held', variant: 'secondary' },
  cl_cheques_survivor: { label: 'Survivor', variant: 'default' },
};

export const DisbursementsHistoryTable: React.FC<DisbursementsHistoryTableProps> = ({
  data,
  onViewDetail,
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No disbursement records found matching the search criteria.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[120px]">Cheque / Ref</TableHead>
            <TableHead className="w-[120px]">Claim #</TableHead>
            <TableHead className="w-[90px]">SSN</TableHead>
            <TableHead>Payee</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[80px]">Method</TableHead>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
            <TableHead className="w-[90px]">Source</TableHead>
            <TableHead className="w-[60px] text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((rec, idx) => {
            const src = SOURCE_LABELS[rec.source_table] || { label: rec.source_table, variant: 'outline' as const };
            return (
              <TableRow
                key={`${rec.source_table}-${rec.id}-${idx}`}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => onViewDetail(rec)}
              >
                <TableCell className="font-mono text-xs">{rec.cheque_no || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{rec.claim_number}</TableCell>
                <TableCell className="font-mono text-xs">{rec.ssn}</TableCell>
                <TableCell className="text-sm">{rec.payee_name}</TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">
                  ${formatNumber(rec.amount, 2)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{rec.payment_method}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {rec.payment_date ? formatDateForDisplay(rec.payment_date) : '—'}
                </TableCell>
                <TableCell>
                  <BnStatusBadge status={rec.status} size="sm" />
                </TableCell>
                <TableCell>
                  <Badge variant={src.variant} className="text-[10px]">{src.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onViewDetail(rec); }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
