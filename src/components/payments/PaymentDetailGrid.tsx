import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileEdit, Inbox } from 'lucide-react';
import type { PaymentDetailData } from '@/hooks/usePaymentEntry';

interface PaymentDetailGridProps {
  rows: PaymentDetailData[];
  onAddRow: () => void;
  onDeleteRow: (seqNo: number) => void;
  onEditMOP: (seqNo: number) => void;
  disabled?: boolean;
  totalAmount: number;
}

const PAYMENT_CODES = [
  { value: 'SS', label: 'Social Security' },
  { value: 'PE', label: 'Employment Injury' },
  { value: 'LV', label: 'Levy' },
  { value: 'FN', label: 'Fines/Penalties' },
  { value: 'IN', label: 'Interest' },
  { value: 'OT', label: 'Other' },
];

const MOP_CODES = [
  { value: 'CSH', label: 'Cash' },
  { value: 'CHQ', label: 'Cheque' },
  { value: 'CRD', label: 'Credit Card' },
  { value: 'EFT', label: 'EFT' },
  { value: 'MO', label: 'Money Order' },
];

export function PaymentDetailGrid({
  rows,
  onAddRow,
  onDeleteRow,
  onEditMOP,
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
                <TableHead>Bank</TableHead>
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
                rows.map((row) => (
                  <TableRow key={row.payment_sequence_no}>
                    <TableCell className="font-mono text-xs">{row.payment_sequence_no}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium">
                        {PAYMENT_CODES.find(c => c.value === row.payment_code)?.label || row.payment_code}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{row.fund_code}</TableCell>
                    <TableCell className="text-right font-mono">${(row.payment_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {MOP_CODES.find(c => c.value === row.mop_code)?.label || row.mop_code}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{row.period || '—'}</TableCell>
                    <TableCell className="text-xs">{row.bank_code || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEditMOP(row.payment_sequence_no)}
                          disabled={disabled}
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => onDeleteRow(row.payment_sequence_no)}
                          disabled={disabled}
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

export { PAYMENT_CODES, MOP_CODES };
