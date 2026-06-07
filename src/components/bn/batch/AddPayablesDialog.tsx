import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useBnAvailablePayables } from '@/hooks/bn/useBnBatchOperations';

import { formatNumber } from '@/lib/culture/culture';
interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (payableIds: string[]) => Promise<void>;
  paymentMethod?: string;
  officeCode?: string;
  isAdding: boolean;
}

export const AddPayablesDialog: React.FC<Props> = ({
  open, onClose, onAdd, paymentMethod, officeCode, isAdding,
}) => {
  const { data: payables = [], isLoading } = useBnAvailablePayables(paymentMethod, officeCode);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    if (selected.size === payables.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(payables.map((p: any) => p.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleAdd = async () => {
    await onAdd(Array.from(selected));
    setSelected(new Set());
  };

  const totalAmount = payables
    .filter((p: any) => selected.has(p.id))
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payables to Batch</DialogTitle>
          <DialogDescription>
            Select READY payable instructions to include in this batch.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : payables.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No eligible payable instructions available.
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size === payables.length && payables.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs">SSN</TableHead>
                  <TableHead className="text-xs">Claim</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.ssn}</TableCell>
                    <TableCell className="text-xs">{p.claim_number || '—'}</TableCell>
                    <TableCell className="text-xs">{p.instruction_type}</TableCell>
                    <TableCell className="text-xs">
                      {p.period_start && p.period_end
                        ? `${p.period_start} – ${p.period_end}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatNumber((p.amount || 0), 2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selected.size} selected • Total: {formatNumber(totalAmount, 2)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isAdding}>Cancel</Button>
            <Button onClick={handleAdd} disabled={selected.size === 0 || isAdding}>
              {isAdding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add {selected.size} Payable{selected.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
