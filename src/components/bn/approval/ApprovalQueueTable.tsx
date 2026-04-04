import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BnStatusBadge } from '@/components/bn/shared';
import { Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { ApprovalQueueItem } from '@/services/bn/approvalConsoleService';

interface Props {
  items: ApprovalQueueItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onViewCase: (claimId: string) => void;
}

const priorityColors: Record<string, string> = {
  URGENT: 'bg-destructive text-destructive-foreground',
  HIGH: 'bg-amber-500 text-white',
  NORMAL: 'bg-muted text-muted-foreground',
  LOW: 'bg-muted/50 text-muted-foreground',
};

export const ApprovalQueueTable: React.FC<Props> = ({ items, selectedIds, onSelectionChange, onViewCase }) => {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.claim_id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.filter(i => i.status === 'DECISION').map((i) => i.claim_id)));
    }
  };

  const toggleOne = (claimId: string) => {
    const next = new Set(selectedIds);
    if (next.has(claimId)) next.delete(claimId); else next.add(claimId);
    onSelectionChange(next);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
            </TableHead>
            <TableHead>Claim #</TableHead>
            <TableHead>SSN</TableHead>
            <TableHead>Benefit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Readiness</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                No cases in the approval queue.
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow
              key={item.claim_id}
              className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(item.claim_id) ? 'bg-primary/5' : ''}`}
              onClick={() => onViewCase(item.claim_id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(item.claim_id)}
                  onCheckedChange={() => toggleOne(item.claim_id)}
                  disabled={item.status !== 'DECISION'}
                  aria-label={`Select ${item.claim_number}`}
                />
              </TableCell>
              <TableCell className="font-mono text-sm font-medium">
                {item.claim_number || item.claim_id.slice(0, 8)}
              </TableCell>
              <TableCell className="font-mono text-sm">{item.ssn}</TableCell>
              <TableCell className="text-sm">{item.benefit_type}</TableCell>
              <TableCell><BnStatusBadge status={item.status} /></TableCell>
              <TableCell>
                <Badge className={`text-xs ${priorityColors[item.priority] || ''}`}>
                  {item.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <span className={item.age_days > 14 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {item.age_days}d
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span title={item.has_eligibility ? 'Eligibility passed' : 'No eligibility'}>
                    {item.has_eligibility ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span title={item.has_calculation ? 'Calculated' : 'Not calculated'}>
                    {item.has_calculation ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span title={item.evidence_complete ? 'Evidence complete' : 'Evidence incomplete'}>
                    {item.evidence_complete ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{item.assigned_to || '—'}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewCase(item.claim_id); }}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
