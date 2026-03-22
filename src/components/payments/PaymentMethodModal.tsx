import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StandardModal } from '@/components/common/StandardModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/* ─── Types ─────────────────────────────────────── */

export interface MethodRow {
  id: string;
  mop_code: string;
  mop_desc: string;
  currency_code: string;
  original_amount: number;
  exchange_rate: number;
  base_amount: number;
  bank_code: string;
  mop_number: string;
  cheque_date: string | null;
  mop_account_number: string;
  mop_notes1: string;
  credit_card_code: string;
  expiration_date: string;
  card_desc: string;
  bank_desc: string;
}

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (row: MethodRow) => void;
  editRow?: MethodRow | null;
  mopTypes: { mop_code: string; short_description: string; long_description?: string }[];
  enabledCurrencies: { currency_code: string; exchange_rate: number; is_main_currency?: boolean }[];
  baseCurrCode: string;
}

/* ─── Component ─────────────────────────────────── */

export function PaymentMethodModal({
  open, onOpenChange, onSave, editRow, mopTypes, enabledCurrencies, baseCurrCode,
}: PaymentMethodModalProps) {
  const [mopCode, setMopCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  // Cheque fields
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [chequeDateStr, setChequeDateStr] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [chequeNotes, setChequeNotes] = useState('');

  // Card fields
  const [cardType, setCardType] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [cardNotes, setCardNotes] = useState('');

  const mopSelectRef = useRef<HTMLButtonElement>(null);

  // Lookups
  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: ['tb_bank_code'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_bank_code').select('bank_code, name').order('name');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ['tb_merchant'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_merchant').select('credit_card_code, credit_card_name').order('credit_card_name');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (editRow) {
        setMopCode(editRow.mop_code);
        setCurrencyCode(editRow.currency_code);
        setOriginalAmount(editRow.original_amount);
        setExchangeRate(editRow.exchange_rate);
        // Cheque
        setChequeNumber(editRow.mop_number || '');
        setBankCode(editRow.bank_code || '');
        setAccountNumber(editRow.mop_account_number || '');
        setChequeNotes(editRow.mop_notes1 || '');
        if (editRow.cheque_date) {
          const d = new Date(editRow.cheque_date);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          setChequeDateStr(`${dd}/${mm}/${yyyy}`);
        } else {
          setChequeDateStr('');
        }
        // Card
        setCardType(editRow.credit_card_code || '');
        setCardNumber((editRow.mop_code === 'CRD' ? editRow.mop_number : '') || '');
        setExpireDate(editRow.expiration_date || '');
        setCardNotes((editRow.mop_code === 'CRD' ? editRow.mop_notes1 : '') || '');
      } else {
        setMopCode('');
        setCurrencyCode(baseCurrCode);
        setOriginalAmount(0);
        setExchangeRate(1);
        setChequeNumber('');
        setBankCode('');
        setChequeDateStr('');
        setAccountNumber('');
        setChequeNotes('');
        setCardType('');
        setCardNumber('');
        setExpireDate('');
        setCardNotes('');
      }
      // Auto-focus method select
      setTimeout(() => mopSelectRef.current?.focus(), 150);
    }
  }, [open, editRow, baseCurrCode]);

  // Resolve exchange rate when currency changes
  const handleCurrencyChange = useCallback((code: string) => {
    setCurrencyCode(code);
    const curr = enabledCurrencies.find(c => c.currency_code === code);
    setExchangeRate(curr?.exchange_rate || 1);
  }, [enabledCurrencies]);

  const baseAmount = Number((originalAmount * exchangeRate).toFixed(2));
  const isMainCurr = currencyCode === baseCurrCode;
  const isCheque = mopCode === 'CHQ' || mopCode === 'CHK';
  const isCard = mopCode === 'CRD';

  // Date auto-format DD/MM/YYYY
  const handleDateChange = (val: string) => {
    const digits = val.replace(/[^\d]/g, '').slice(0, 8);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += digits[i];
    }
    setChequeDateStr(formatted);
  };

  const parseDateStr = (str: string): string | null => {
    if (!str || str.length < 10) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  // Card number: digits only, max 20
  const handleCardNumberChange = (val: string) => {
    setCardNumber(val.replace(/\D/g, '').slice(0, 20));
  };

  // Expire date: auto-format MM/YY
  const handleExpireDateChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 2) formatted += '/';
      formatted += digits[i];
    }
    setExpireDate(formatted);
  };

  const canSave = mopCode && originalAmount > 0
    && (!isCheque || chequeNumber.trim())
    && (!isCard || (cardType && cardNumber.trim()));

  const handleSave = () => {
    if (!canSave) return;
    const mop = mopTypes.find(m => m.mop_code === mopCode);
    const bankObj = banks.find((b: any) => b.bank_code === bankCode);
    const merchant = merchants.find((m: any) => m.credit_card_code === cardType);

    const row: MethodRow = {
      id: editRow?.id || crypto.randomUUID(),
      mop_code: mopCode,
      mop_desc: mop?.short_description || mopCode,
      currency_code: currencyCode,
      original_amount: originalAmount,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      bank_code: isCheque ? bankCode : '',
      mop_number: isCheque ? chequeNumber.trim() : isCard ? cardNumber.trim() : '',
      cheque_date: isCheque ? parseDateStr(chequeDateStr) : null,
      mop_account_number: isCheque ? accountNumber.trim() : '',
      mop_notes1: isCheque ? chequeNotes.trim() : isCard ? cardNotes.trim() : '',
      credit_card_code: isCard ? cardType : '',
      expiration_date: isCard ? expireDate : '',
      card_desc: isCard && merchant ? (merchant as any).credit_card_name : '',
      bank_desc: isCheque && bankObj ? (bankObj as any).name : '',
    };
    onSave(row);
    onOpenChange(false);
  };

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={editRow ? 'Edit Payment Method' : 'Add Payment Method'}
      mode="edit"
      size="lg"
      onSave={handleSave}
      onCancel={() => onOpenChange(false)}
      saveLabel={editRow ? 'Update Method' : 'Add Method'}
    >
      <div className="space-y-4">
        {/* Method Select */}
        <div className="space-y-1.5">
          <Label className="text-xs">Method of Payment *</Label>
          <Select value={mopCode} onValueChange={setMopCode}>
            <SelectTrigger ref={mopSelectRef}>
              <SelectValue placeholder="Select method..." />
            </SelectTrigger>
            <SelectContent>
              {mopTypes.map(mt => (
                <SelectItem key={mt.mop_code} value={mt.mop_code}>
                  {mt.short_description || mt.mop_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency + Amount row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Currency</Label>
            <Select value={currencyCode} onValueChange={handleCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enabledCurrencies.map(c => (
                  <SelectItem key={c.currency_code} value={c.currency_code}>
                    {c.currency_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Amount ({currencyCode}) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={originalAmount || ''}
              onChange={e => setOriginalAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="text-right"
            />
          </div>
        </div>

        {/* Base amount info */}
        {!isMainCurr && originalAmount > 0 && (
          <div className="text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            Exchange Rate: {exchangeRate} → Base Amount: {baseCurrCode} {baseAmount.toFixed(2)}
          </div>
        )}

        {/* ── Cheque Fields ── */}
        {isCheque && (
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cheque Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Cheque Number *</Label>
                <Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="Enter cheque number" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bank</Label>
                {banksLoading ? (
                  <div className="flex items-center h-10 px-3 border rounded-md"><Loader2 className="h-4 w-4 animate-spin" /></div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Cheque Date</Label>
                <Input value={chequeDateStr} onChange={e => handleDateChange(e.target.value)} placeholder="DD/MM/YYYY" maxLength={10} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Number</Label>
                <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={chequeNotes} onChange={e => setChequeNotes(e.target.value)} placeholder="Additional notes..." className="h-16" maxLength={250} />
            </div>
          </div>
        )}

        {/* ── Card Fields ── */}
        {isCard && (
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Card Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Card Type *</Label>
                {merchantsLoading ? (
                  <div className="flex items-center h-10 px-3 border rounded-md"><Loader2 className="h-4 w-4 animate-spin" /></div>
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
                <Label className="text-xs">Card Number *</Label>
                <Input value={cardNumber} onChange={e => handleCardNumberChange(e.target.value)} placeholder="Digits only" maxLength={20} inputMode="numeric" />
                <p className="text-xs text-muted-foreground">{cardNumber.length}/20 digits</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Expire Date</Label>
                <Input value={expireDate} onChange={e => handleExpireDateChange(e.target.value)} placeholder="MM/YY" maxLength={5} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={cardNotes} onChange={e => setCardNotes(e.target.value)} placeholder="Additional notes..." className="h-16" maxLength={250} />
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardModal>
  );
}
