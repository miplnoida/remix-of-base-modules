import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, Info } from 'lucide-react';
import { useDefaultOpeningBalance } from '@/hooks/useBatchBehaviorConfig';
import { useHeadCashier } from '@/hooks/useHeadCashier';

interface BatchCreationModalProps {
  open: boolean;
  onClose: () => void;
  onCreateBatch: (batchDate: string, officeCode: string) => Promise<void>;
  balanceForward: number;
  isLoading?: boolean;
  isHistorical?: boolean;
}

export function BatchCreationModal({
  open,
  onClose,
  onCreateBatch,
  balanceForward,
  isLoading,
  isHistorical,
}: BatchCreationModalProps) {
  const [batchDate, setBatchDate] = useState<Date | undefined>(new Date());
  const [officeCode, setOfficeCode] = useState('HQ');

  // Fetch per-branch opening balance based on selected office
  const {
    headCashierBalance,
    cashierBalance,
    isLoading: balanceLoading,
    isOfficeSpecific,
  } = useDefaultOpeningBalance(officeCode.trim() || undefined);

  // Check if current user is head cashier for selected office
  const { isCurrentUserHeadCashier, isLoading: hcLoading } = useHeadCashier(
    undefined,
    officeCode.trim() || undefined
  );

  const resolvedOpeningBalance = isCurrentUserHeadCashier
    ? headCashierBalance
    : cashierBalance;

  const handleCreate = async () => {
    if (!batchDate) return;
    await onCreateBatch(batchDate.toISOString(), officeCode);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isHistorical ? 'Create Historical Batch' : 'Create New Batch'}</DialogTitle>
          <DialogDescription>
            {isHistorical
              ? 'Create a batch for historical/back-dated payment entry.'
              : 'Start a new payment batch to begin entering payments.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Batch Date</Label>
            <DatePicker date={batchDate} onDateChange={setBatchDate} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Office Code</Label>
            <Input
              value={officeCode}
              onChange={e => setOfficeCode(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="e.g. HQ"
            />
          </div>

          <div className="p-3 rounded-md bg-muted text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Opening Balance:</span>
              <span className="font-mono font-semibold">
                {balanceLoading || hcLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  `$${resolvedOpeningBalance.toFixed(2)}`
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>
                {isCurrentUserHeadCashier ? 'Head Cashier' : 'Cashier'}
                {isOfficeSpecific
                  ? ` • ${officeCode} branch rate`
                  : ' • Default rate'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted text-sm">
            <span className="text-muted-foreground">Balance Forward: </span>
            <span className="font-mono font-semibold">${balanceForward.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!batchDate || !officeCode || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
