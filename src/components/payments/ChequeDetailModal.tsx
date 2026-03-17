import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export interface ChequeDetails {
  mop_number: string;
  bank_code: string;
  cheque_date: string | null;
  mop_account_number: string;
  mop_notes1: string;
}

interface ChequeDetailModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (details: ChequeDetails) => void;
  initialData?: Partial<ChequeDetails>;
}

export function ChequeDetailModal({ open, onClose, onSave, initialData }: ChequeDetailModalProps) {
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [chequeDate, setChequeDate] = useState<Date | undefined>();
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

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
      setChequeNumber(initialData?.mop_number || '');
      setBankCode(initialData?.bank_code || '');
      setChequeDate(initialData?.cheque_date ? new Date(initialData.cheque_date) : undefined);
      setAccountNumber(initialData?.mop_account_number || '');
      setNotes(initialData?.mop_notes1 || '');
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!chequeNumber.trim()) return;
    onSave({
      mop_number: chequeNumber.trim(),
      bank_code: bankCode,
      cheque_date: chequeDate?.toISOString() || null,
      mop_account_number: accountNumber.trim(),
      mop_notes1: notes.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cheque Details</DialogTitle>
          <DialogDescription className="font-semibold text-foreground">
            Mode-of-Payment : CHEQUE
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cheque Number *</Label>
              <Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} autoFocus placeholder="Enter cheque number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cheque Date</Label>
              <DatePicker date={chequeDate} onDateChange={setChequeDate} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Account Number</Label>
              <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="h-16" maxLength={250} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!chequeNumber.trim()}>Save Cheque Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
