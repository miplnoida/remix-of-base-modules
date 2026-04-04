/**
 * Entitlement List Table
 *
 * Displays all entitlements with filters.
 * Read-only display with row-click to open detail drawer.
 */
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ArrowUpRight } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { BnStatusBadge } from '@/components/bn/shared';
import type { EntitlementWithContext } from '@/services/bn/entitlementService';
import { ENTITLEMENT_STATUS_LABELS } from '@/services/bn/entitlementService';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700',
  SUSPENDED: 'bg-amber-500/15 text-amber-700',
  EXHAUSTED: 'bg-muted text-muted-foreground',
  TERMINATED: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-destructive/15 text-destructive',
  CLOSED: 'bg-muted text-muted-foreground',
  REOPENED: 'bg-blue-500/15 text-blue-700',
};

interface Props {
  items: EntitlementWithContext[];
  onViewDetail: (id: string) => void;
  isLoading?: boolean;
}

export const EntitlementListTable: React.FC<Props> = ({ items, onViewDetail, isLoading }) => (
  <div className="rounded-lg border bg-card overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>SSN</TableHead>
          <TableHead>Claim #</TableHead>
          <TableHead>Benefit</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Weekly Rate</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead>Effective From</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payables</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No entitlements found</TableCell>
          </TableRow>
        ) : items.map(ent => (
          <TableRow
            key={ent.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onViewDetail(ent.id)}
          >
            <TableCell className="font-mono text-sm">{ent.ssn}</TableCell>
            <TableCell className="font-mono text-sm font-medium">{ent.claim_number || '—'}</TableCell>
            <TableCell className="text-sm">{ent.benefit_name || '—'}</TableCell>
            <TableCell className="text-xs">{ent.entitlement_type}</TableCell>
            <TableCell className="font-mono text-sm">${(ent.weekly_rate ?? 0).toFixed(2)}</TableCell>
            <TableCell className="font-mono text-sm">${(ent.total_entitlement ?? 0).toFixed(2)}</TableCell>
            <TableCell className="font-mono text-sm">
              <span className={ent.remaining_amount <= 0 ? 'text-muted-foreground' : ''}>
                ${(ent.remaining_amount ?? 0).toFixed(2)}
              </span>
            </TableCell>
            <TableCell className="text-sm">{formatDateForDisplay(ent.effective_from)}</TableCell>
            <TableCell className="text-xs">{ent.payment_frequency}</TableCell>
            <TableCell>
              <Badge variant="outline" className={`text-xs ${statusColor[ent.status] || ''}`}>
                {ENTITLEMENT_STATUS_LABELS[ent.status] || ent.status}
              </Badge>
            </TableCell>
            <TableCell>
              {ent.active_instructions > 0 ? (
                <Badge variant="secondary" className="text-xs">{ent.active_instructions}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">0</span>
              )}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetail(ent.id); }}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
