import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import type { EnabledCurrency } from '@/hooks/useCashierCurrencyConfig';

export interface ChequeEntry {
  id?: string;
  cheque_number: string;
  bank_code: string;
  amount: number;
  currency_code: string;
  date_of_issue: Date | undefined;
}

interface ChequeEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: ChequeEntry) => void;
  initialData?: ChequeEntry | null;
  enabledCurrencies: EnabledCurrency[];
}

export function ChequeEntryModal({ open, onClose, onSave, initialData, enabledCurrencies }: ChequeEntryModalProps) {
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [currencyCode, setCurrencyCode] = useState('XCD');
  const [dateOfIssue, setDateOfIssue] = useState<Date | undefined>(undefined);
  const chequeNumberRef = useRef<HTMLInputElement>(null);

  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: ['tb_bank_code'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_bank_code').select('bank_code, name').order('name');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setChequeNumber(initialData.cheque_number || '');
        setBankCode(initialData.bank_code || '');
        setAmount(initialData.amount || 0);
        setCurrencyCode(initialData.currency_code || 'XCD');
        setDateOfIssue(initialData.date_of_issue);
      } else {
        setChequeNumber('');
        setBankCode('');
        setAmount(0);
        setCurrencyCode(enabledCurrencies?.find(c => c.is_main_currency)?.currency_code || 'XCD');
        setDateOfIssue(undefined);
      }
      // Auto-focus cheque number on open
      setTimeout(() => chequeNumberRef.current?.focus(), 100);
    }
  }, [open, initialData, enabledCurrencies]);

  const handleSave = () => {
    if (!chequeNumber.trim() || amount <= 0) return;
    onSave({
      id: initialData?.id,
      cheque_number: chequeNumber.trim(),
      bank_code: bankCode,
      amount,
      currency_code: currencyCode,
      date_of_issue: dateOfIssue,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Cheque' : 'Add Cheque'}</DialogTitle>
          <DialogDescription>Enter cheque details for this batch</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Cheque Number *</Label>
            <Input
              ref={chequeNumberRef}
              value={chequeNumber}
              onChange={e => setChequeNumber(e.target.value)}
              placeholder="Enter cheque number"
              maxLength={30}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bank</Label>
            {banksLoading ? (
              <div className="flex items-center h-9 px-3 border rounded-md"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : (
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger><SelectValue placeholder="Select bank..." /></SelectTrigger>
                <SelectContent>
                  {banks.map((b: any) => (
                    <SelectItem key={b.bank_code} value={b.bank_code}>{b.bank_code} - {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(enabledCurrencies || []).map(c => (
                    <SelectItem key={c.currency_code} value={c.currency_code}>{c.currency_code} - {c.currency_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date of Issue</Label>
            <DatePicker
              date={dateOfIssue}
              onDateChange={setDateOfIssue}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!chequeNumber.trim() || amount <= 0}>
            {initialData ? 'Update Cheque' : 'Add Cheque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
