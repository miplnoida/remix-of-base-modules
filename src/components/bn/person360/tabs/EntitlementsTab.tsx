/**
 * Person 360 — Entitlements Tab
 * 
 * Source: bn_entitlement (when created)
 * Status distinction: ACTIVE / SUSPENDED / EXHAUSTED / TERMINATED / CANCELLED
 * Read-only — no mutations
 * Role visibility: Claims Officer, Supervisor, Admin, Auditor
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateForDisplay } from '@/lib/format-config';
import { Link } from 'react-router-dom';
import type { Person360Entitlement } from '@/services/bn/person360Service';

const entitlementStatusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-700',
  SUSPENDED: 'bg-amber-500/15 text-amber-700',
  EXHAUSTED: 'bg-muted text-muted-foreground',
  TERMINATED: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-destructive/15 text-destructive',
};

interface EntitlementsTabProps {
  entitlements: Person360Entitlement[];
  isLoading?: boolean;
}

export const EntitlementsTab: React.FC<EntitlementsTabProps> = ({ entitlements, isLoading }) => (
  <div className="space-y-4">
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Claim #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Weekly Rate</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Effective From</TableHead>
            <TableHead>Effective To</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : entitlements.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No entitlements found</TableCell></TableRow>
          ) : entitlements.map(ent => (
            <TableRow key={ent.id}>
              <TableCell className="font-mono">{ent.claim_number}</TableCell>
              <TableCell>{ent.entitlement_type}</TableCell>
              <TableCell className="font-mono">${ent.weekly_rate.toFixed(2)}</TableCell>
              <TableCell className="font-mono">${ent.total_amount.toFixed(2)}</TableCell>
              <TableCell className="font-mono">${ent.remaining_amount.toFixed(2)}</TableCell>
              <TableCell>{formatDateForDisplay(ent.effective_from)}</TableCell>
              <TableCell>{ent.effective_to ? formatDateForDisplay(ent.effective_to) : '—'}</TableCell>
              <TableCell>{ent.payment_frequency}</TableCell>
              <TableCell>
                <Badge variant="outline" className={entitlementStatusColor[ent.status] || ''}>
                  {ent.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);
