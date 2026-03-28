import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { useToast } from '@/hooks/use-toast';
import type { VerificationCheque } from './ChequeVerificationList';

interface ChequeEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  cheque: VerificationCheque | null;
  batchNumber: string | null;
}

export function ChequeEditModal({ open, onClose, onSave, cheque, batchNumber }: ChequeEditModalProps) {
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [chequeNumber, setChequeNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [chequeDate, setChequeDate] = useState<Date | undefined>(undefined);
  const [editReason, setEditReason] = useState('');

  const { data: banks = [] } = useQuery({
    queryKey: ['tb_bank_code'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_bank_code').select('bank_code, name').order('name');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open && cheque) {
      setChequeNumber(cheque.override_cheque_number || cheque.cheque_number || '');
      setBankCode(cheque.override_bank_code || cheque.bank_code || '');
      setAmount(cheque.override_amount ?? cheque.amount);
      const dateStr = cheque.override_cheque_date || cheque.cheque_date;
      setChequeDate(dateStr ? new Date(dateStr) : undefined);
      setEditReason('');
    }
  }, [open, cheque]);

  const hasChanges = () => {
    if (!cheque) return false;
    const origNum = cheque.cheque_number || '';
    const origBank = cheque.bank_code || '';
    const origAmt = cheque.amount;
    const origDate = cheque.cheque_date || '';
    const newDateStr = chequeDate ? chequeDate.toISOString().slice(0, 10) : '';
    return (
      chequeNumber !== origNum ||
      bankCode !== origBank ||
      amount !== origAmt ||
      newDateStr !== origDate
    );
  };

  const handleSave = async () => {
    if (!cheque || !batchNumber || !userCode) return;
    if (!editReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for the edit.', variant: 'destructive' });
      return;
    }
    if (amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Amount must be greater than zero.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('edit_and_verify_batch_cheque', {
        p_batch_number: batchNumber,
        p_source_table: cheque.source_table,
        p_source_record_id: cheque.source_record_id,
        p_source_payment_id: cheque.payment_id,
        p_override_cheque_number: chequeNumber || null,
        p_override_bank_code: bankCode || null,
        p_override_amount: amount,
        p_override_cheque_date: chequeDate ? chequeDate.toISOString().slice(0, 10) : null,
        p_edit_reason: editReason.trim(),
        p_user_code: userCode,
      });
      if (error) throw error;
      toast({ title: 'Cheque Updated', description: 'Cheque details saved and verified.' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!cheque) return null;

  const origChequeNum = cheque.cheque_number || '—';
  const origBank = cheque.bank_name || cheque.bank_code || '—';
  const origAmount = cheque.amount;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Cheque Details</DialogTitle>
          <DialogDescription>
            Correct cheque information. Changes will propagate to the source transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Original vs Current comparison */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-xs">
            <p className="font-semibold text-sm mb-1">Original Values</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Cheque #:</span>
              <span className="font-mono">{origChequeNum}</span>
              <span className="text-muted-foreground">Bank:</span>
              <span>{origBank}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono">{cheque.currency_code} {origAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cheque Number</Label>
            <Input
              value={chequeNumber}
              onChange={e => setChequeNumber(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger><SelectValue placeholder="Select bank..." /></SelectTrigger>
              <SelectContent>
                {banks.map((b: any) => (
                  <SelectItem key={b.bank_code} value={b.bank_code}>{b.bank_code} - {b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cheque Date</Label>
              <DatePicker date={chequeDate} onDateChange={setChequeDate} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason for Edit *</Label>
            <Textarea
              value={editReason}
              onChange={e => setEditReason(e.target.value)}
              placeholder="Explain why this cheque is being corrected..."
              maxLength={250}
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">{editReason.length}/250</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !editReason.trim() || amount <= 0}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save & Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
