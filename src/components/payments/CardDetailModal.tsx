import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export interface CardDetails {
  credit_card_code: string;
  mop_number: string;
  mop_notes1: string;
  expiration_date: string;
}

interface CardDetailModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (details: CardDetails) => void;
  initialData?: Partial<CardDetails>;
}

export function CardDetailModal({ open, onClose, onSave, initialData }: CardDetailModalProps) {
  const [cardType, setCardType] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ['tb_merchant'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_merchant').select('credit_card_code, credit_card_name').order('credit_card_name');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open) {
      setCardType(initialData?.credit_card_code || '');
      setCardNumber(initialData?.mop_number || '');
      setExpireDate(initialData?.expiration_date || '');
      setNotes(initialData?.mop_notes1 || '');
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!cardType || !cardNumber.trim()) return;
    onSave({
      credit_card_code: cardType,
      mop_number: cardNumber.trim(),
      mop_notes1: notes.trim(),
      expiration_date: expireDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Card Details</DialogTitle>
          <DialogDescription className="font-semibold text-foreground">
            Mode-of-Payment : CREDIT CARD
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Card Type *</Label>
              {merchantsLoading ? (
                <div className="flex items-center h-9 px-3 border rounded-md"><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : (
                <Select value={cardType} onValueChange={setCardType}>
                  <SelectTrigger><SelectValue placeholder="Select card type..." /></SelectTrigger>
                  <SelectContent>
                    {merchants.map((m: any) => (
                      <SelectItem key={m.credit_card_code} value={m.credit_card_code}>{m.credit_card_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expire Date</Label>
              <Input value={expireDate} onChange={e => setExpireDate(e.target.value)} placeholder="MM/YY" maxLength={5} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Card Number *</Label>
            <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} autoFocus placeholder="Enter card number" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="h-16" maxLength={250} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!cardType || !cardNumber.trim()}>Save Card Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
