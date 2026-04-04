/**
 * Person 360 — Payables (Pending Payments) Tab
 * 
 * Source: bn_payment_instruction (status IN: PENDING, APPROVED, BATCHED, HELD)
 * Shows payable instructions that have NOT yet been issued as cl_cheques records.
 * 
 * Status distinction (Payable): PENDING / APPROVED / BATCHED / HELD / EXCEPTION
 * Read-only display.
 * Role visibility: Claims Officer, Payments Officer, Supervisor, Admin
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateForDisplay } from '@/lib/format-config';
import type { Person360Payable } from '@/services/bn/person360Service';

const payableStatusColor: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700',
  APPROVED: 'bg-blue-500/15 text-blue-700',
  BATCHED: 'bg-violet-500/15 text-violet-700',
  HELD: 'bg-destructive/15 text-destructive',
  EXCEPTION: 'bg-destructive/15 text-destructive',
};

interface PayablesTabProps {
  payables: Person360Payable[];
  isLoading?: boolean;
}

export const PayablesTab: React.FC<PayablesTabProps> = ({ payables, isLoading }) => (
  <div className="space-y-4">
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Claim #</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : payables.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No pending payables</TableCell></TableRow>
          ) : payables.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-mono">{p.claim_number || '—'}</TableCell>
              <TableCell className="font-mono font-medium">${p.amount.toFixed(2)}</TableCell>
              <TableCell>{p.currency}</TableCell>
              <TableCell>{formatDateForDisplay(p.due_date)}</TableCell>
              <TableCell>{p.payment_method}</TableCell>
              <TableCell>{p.frequency}</TableCell>
              <TableCell className="max-w-48 truncate">{p.description || '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={payableStatusColor[p.status] || ''}>
                  {p.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);
