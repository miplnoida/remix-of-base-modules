import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FileEdit, Inbox } from 'lucide-react';
import type { DetailLineData } from './AddDetailModal';

interface PaymentDetailGridProps {
  rows: DetailLineData[];
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
  onEditRow: (index: number) => void;
  disabled?: boolean;
  totalAmount: number;
}

export function PaymentDetailGrid({
  rows,
  onAddRow,
  onDeleteRow,
  onEditRow,
  disabled,
  totalAmount,
}: PaymentDetailGridProps) {
  return (
    <Card>
      <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Payment Details</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-primary">
            Total: ${totalAmount.toFixed(2)}
          </span>
          <Button type="button" size="sm" onClick={onAddRow} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Payment Code</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>MOP</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Bank/Card</TableHead>
                <TableHead className="w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="h-8 w-8" />
                      <p className="text-sm">No payment lines. Click "Add Line" to begin.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium">{row.payment_code}</span>
                    </TableCell>
                    <TableCell className="text-xs">{row.fund_code}</TableCell>
                    <TableCell className="text-right font-mono">${(row.payment_amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{row.mop_code}</TableCell>
                    <TableCell className="text-xs">
                      {row.period ? new Date(row.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{row.bank_code || row.credit_card_code || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button" variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => onEditRow(idx)} disabled={disabled}
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => onDeleteRow(idx)} disabled={disabled}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
