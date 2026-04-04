import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star } from 'lucide-react';
import type { PostIssueTask } from '@/services/bn/postIssueService';

const TYPE_LABELS: Record<string, string> = {
  CL_HEAD_UPDATE: 'Claim Header',
  CLAIM_CLOSURE: 'Claim Closure',
  CLAIM_CONTINUATION: 'Claim Continuation',
  WAGES_CREDITED: 'Wages Credited',
  POSTAL_REG_UPDATE: 'Postal Registration',
  PENSION_SUPPORT: 'Pension Support',
  SURVIVOR_FOLLOWUP: 'Survivor Follow-up',
  HOLDING_FOLLOWUP: 'Holding Follow-up',
  ENTITLEMENT_UPDATE: 'Entitlement Update',
  INSTRUCTION_FINALIZE: 'Instruction Finalize',
  BATCH_COMPLETION_CHECK: 'Batch Check',
  AUDIT_COMPLETION: 'Audit Completion',
};

interface Props {
  tasks: PostIssueTask[];
  isLoading: boolean;
  onSelect: (task: PostIssueTask) => void;
}

export const PostIssueTaskList: React.FC<Props> = ({ tasks, isLoading, onSelect }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No post-issue tasks found matching current filters.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold text-xs w-10">#</TableHead>
            <TableHead className="font-semibold text-xs">Task</TableHead>
            <TableHead className="font-semibold text-xs">SSN</TableHead>
            <TableHead className="font-semibold text-xs">Claim</TableHead>
            <TableHead className="font-semibold text-xs">Cheque/Ref</TableHead>
            <TableHead className="font-semibold text-xs text-right">Amount</TableHead>
            <TableHead className="font-semibold text-xs">Status</TableHead>
            <TableHead className="font-semibold text-xs">Req</TableHead>
            <TableHead className="font-semibold text-xs">Retries</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t) => (
            <TableRow
              key={t.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => onSelect(t)}
            >
              <TableCell className="font-mono text-xs">{t.task_order}</TableCell>
              <TableCell className="text-xs font-medium">
                {TYPE_LABELS[t.task_type] || t.task_type}
              </TableCell>
              <TableCell className="font-mono text-xs">{t.ssn}</TableCell>
              <TableCell className="text-xs">{t.claim_number || '—'}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {t.cheque_number || '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell><BnStatusBadge status={t.status} dot size="sm" /></TableCell>
              <TableCell>
                {t.is_required && (
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {t.retry_count > 0 ? `${t.retry_count}/${t.max_retries}` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
