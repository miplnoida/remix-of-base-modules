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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYMENT_CODES, MOP_CODES } from './PaymentDetailGrid';

interface AddDetailModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (detail: {
    payment_code: string;
    fund_code: string;
    payment_amount: number;
    mop_code: string;
    period: string;
    payment_date: string | null;
  }) => void;
}

export function AddDetailModal({ open, onClose, onAdd }: AddDetailModalProps) {
  const [paymentCode, setPaymentCode] = useState('SS');
  const [fundCode, setFundCode] = useState('GEN');
  const [amount, setAmount] = useState('');
  const [mopCode, setMopCode] = useState('CSH');
  const [period, setPeriod] = useState('');

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    onAdd({
      payment_code: paymentCode,
      fund_code: fundCode,
      payment_amount: amt,
      mop_code: mopCode,
      period: period || null,
      payment_date: new Date().toISOString(),
    });
    // Reset
    setAmount('');
    setPeriod('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Detail Line</DialogTitle>
          <DialogDescription>Enter the details for this payment line.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Code</Label>
              <Select value={paymentCode} onValueChange={setPaymentCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_CODES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fund Code</Label>
              <Input value={fundCode} onChange={e => setFundCode(e.target.value.toUpperCase())} maxLength={5} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method of Payment</Label>
              <Select value={mopCode} onValueChange={setMopCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOP_CODES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Period</Label>
            <Input
              value={period}
              onChange={e => setPeriod(e.target.value)}
              placeholder="e.g. 2026-Q1 or 202601"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!amount || parseFloat(amount) <= 0}>Add Line</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
