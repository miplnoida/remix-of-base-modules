import React, { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

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
