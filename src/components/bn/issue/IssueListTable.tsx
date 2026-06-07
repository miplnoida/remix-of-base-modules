import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { Loader2 } from 'lucide-react';
import type { IssueRecord } from '@/services/bn/paymentIssueService';

import { formatNumber } from '@/lib/culture/culture';
const TARGET_LABELS: Record<string, string> = {
  cl_cheques: 'Standard',
  cl_cheques_holding: 'Holding',
  cl_cheques_survivor: 'Survivor',
};

interface Props {
  records: IssueRecord[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectRecord: (r: IssueRecord) => void;
}

export const IssueListTable: React.FC<Props> = ({
  records, isLoading, selectedIds, onToggleSelect, onSelectRecord,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No issue records found matching current filters.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10" />
            <TableHead className="font-semibold text-xs">SSN</TableHead>
            <TableHead className="font-semibold text-xs">Claim</TableHead>
            <TableHead className="font-semibold text-xs">Method</TableHead>
            <TableHead className="font-semibold text-xs">Target</TableHead>
            <TableHead className="font-semibold text-xs">Status</TableHead>
            <TableHead className="font-semibold text-xs text-right">Amount</TableHead>
            <TableHead className="font-semibold text-xs">Cheque/Ref</TableHead>
            <TableHead className="font-semibold text-xs">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => onSelectRecord(r)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(r.id)}
                  onCheckedChange={() => onToggleSelect(r.id)}
                  disabled={!['PENDING', 'REISSUE_PENDING', 'FAILED'].includes(r.status)}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">{r.ssn}</TableCell>
              <TableCell className="text-xs">{r.claim_number || '—'}</TableCell>
              <TableCell>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium">
                  {r.issue_method}
                </span>
              </TableCell>
              <TableCell>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  r.target_table === 'cl_cheques_survivor'
                    ? 'bg-violet-500/10 text-violet-700 dark:text-violet-400'
                    : r.target_table === 'cl_cheques_holding'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-muted'
                }`}>
                  {TARGET_LABELS[r.target_table] || r.target_table}
                </span>
              </TableCell>
              <TableCell><BnStatusBadge status={r.status} dot size="sm" /></TableCell>
              <TableCell className="text-right font-mono text-xs">
                {r.currency} {formatNumber(r.amount, 2)}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {r.cheque_number || r.dd_reference || '—'}
              </TableCell>
              <TableCell className="text-xs">{r.instruction_type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
