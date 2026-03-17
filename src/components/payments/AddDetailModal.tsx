import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DetailLineData {
  payment_code: string;
  fund_code: string;
  payment_amount: number;
  mop_code: string;
  period: string | null;
  payment_date: string | null;
  // MOP-specific
  bank_code: string | null;
  mop_number: string | null;
  cheque_date: string | null;
  mop_account_number: string | null;
  mop_notes1: string | null;
  credit_card_code: string | null;
  expiration_date: string | null;
  // Display descriptions (client-side only, not saved to DB)
  payment_code_desc?: string;
  fund_code_desc?: string;
  mop_desc?: string;
  bank_desc?: string;
  card_desc?: string;
}

interface AddDetailModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (detail: DetailLineData) => void;
  editData?: DetailLineData | null;
  onMopPopupNeeded?: (mopCode: string) => void;
}

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' }, { value: '04', label: 'April' },
  { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));

const FUND_LABELS: Record<string, string> = {
  SS: 'Social Security',
  LV: 'Levy',
};

export function AddDetailModal({ open, onClose, onAdd, editData, onMopPopupNeeded }: AddDetailModalProps) {
  const [paymentCode, setPaymentCode] = useState('');
  const [fundCode, setFundCode] = useState('');
  const [amount, setAmount] = useState('');
  const [mopCode, setMopCode] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [periodYear, setPeriodYear] = useState(String(currentYear));
  const [paymentCodeOpen, setPaymentCodeOpen] = useState(false);
  const [mopOpen, setMopOpen] = useState(false);
  const [paymentCodeSearch, setPaymentCodeSearch] = useState('');
  const [mopSearch, setMopSearch] = useState('');
  
  const paymentCodeTriggerRef = useRef<HTMLButtonElement>(null);

  // Fetch payment types from DB
  const { data: paymentTypes = [], isLoading: ptLoading } = useQuery({
    queryKey: ['tb_payment_type'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_payment_type').select('payment_code, payment_type_description, fund_code').order('payment_code');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch MOP from DB
  const { data: mopTypes = [], isLoading: mopLoading } = useQuery({
    queryKey: ['tb_method_of_payment'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_method_of_payment').select('mop_code, short_description').order('mop_code');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filtered lists
  const filteredPaymentTypes = useMemo(() => {
    if (!paymentCodeSearch) return paymentTypes;
    const q = paymentCodeSearch.toLowerCase();
    return paymentTypes.filter((pt: any) =>
      pt.payment_code.toLowerCase().includes(q) || pt.payment_type_description.toLowerCase().includes(q)
    );
  }, [paymentTypes, paymentCodeSearch]);

  const filteredMopTypes = useMemo(() => {
    if (!mopSearch) return mopTypes;
    const q = mopSearch.toLowerCase();
    return mopTypes.filter((m: any) =>
      m.mop_code.toLowerCase().includes(q) || m.short_description.toLowerCase().includes(q)
    );
  }, [mopTypes, mopSearch]);

  // Auto-populate fund when payment code changes
  useEffect(() => {
    if (paymentCode && paymentTypes.length > 0) {
      const pt = paymentTypes.find((t: any) => t.payment_code === paymentCode);
      if (pt) setFundCode((pt as any).fund_code || '');
    }
  }, [paymentCode, paymentTypes]);

  // Populate from editData or reset
  useEffect(() => {
    if (open && editData) {
      setPaymentCode(editData.payment_code || '');
      setFundCode(editData.fund_code || '');
      setAmount(editData.payment_amount?.toString() || '');
      setMopCode(editData.mop_code || '');
      if (editData.period) {
        const d = new Date(editData.period);
        setPeriodMonth(String(d.getMonth() + 1).padStart(2, '0'));
        setPeriodYear(String(d.getFullYear()));
      } else {
        setPeriodMonth('');
        setPeriodYear(String(currentYear));
      }
    } else if (open && !editData) {
      setPaymentCode('');
      setFundCode('');
      setAmount('');
      setMopCode('');
      setPeriodMonth('');
      setPeriodYear(String(currentYear));
    }
    setPaymentCodeSearch('');
    setMopSearch('');
  }, [open, editData]);

  // Auto-focus Payment Code dropdown when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        paymentCodeTriggerRef.current?.focus();
      }, 150);
    }
  }, [open]);

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !paymentCode || !mopCode) return;

    const periodStr = periodMonth && periodYear ? `${periodYear}-${periodMonth}-01` : null;

    const selectedPt = paymentTypes.find((t: any) => t.payment_code === paymentCode);
    const selectedMop = mopTypes.find((m: any) => m.mop_code === mopCode);
    const fundDesc = FUND_LABELS[fundCode] || fundCode;

    const detail: DetailLineData = {
      payment_code: paymentCode,
      fund_code: fundCode,
      payment_amount: amt,
      mop_code: mopCode,
      period: periodStr,
      payment_date: new Date().toISOString(),
      bank_code: editData?.bank_code || null,
      mop_number: editData?.mop_number || null,
      cheque_date: editData?.cheque_date || null,
      mop_account_number: editData?.mop_account_number || null,
      mop_notes1: editData?.mop_notes1 || null,
      credit_card_code: editData?.credit_card_code || null,
      expiration_date: editData?.expiration_date || null,
      // descriptions for display
      payment_code_desc: selectedPt ? (selectedPt as any).payment_type_description : paymentCode,
      fund_code_desc: fundDesc,
      mop_desc: selectedMop ? (selectedMop as any).short_description : mopCode,
      bank_desc: editData?.bank_desc || null,
      card_desc: editData?.card_desc || null,
    };

    onAdd(detail);
    onClose();

    if ((mopCode === 'CHQ' || mopCode === 'CHK' || mopCode === 'CRD') && onMopPopupNeeded) {
      setTimeout(() => onMopPopupNeeded(mopCode), 100);
    }
  };

  const selectedPtLabel = paymentTypes.find((t: any) => t.payment_code === paymentCode);
  const selectedMopLabel = mopTypes.find((m: any) => m.mop_code === mopCode);
  const fundDisplay = FUND_LABELS[fundCode] || fundCode || '—';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Payment Detail Line' : 'Add Payment Detail Line'}</DialogTitle>
          <DialogDescription>Enter the details for this payment line.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment Code - searchable combobox */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Code *</Label>
            <Popover open={paymentCodeOpen} onOpenChange={setPaymentCodeOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={paymentCodeTriggerRef}
                  variant="outline"
                  role="combobox"
                  aria-expanded={paymentCodeOpen}
                  className="w-full justify-between font-normal h-9 text-sm border-input bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  {ptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    selectedPtLabel ? (
                      <span className="truncate text-foreground">{(selectedPtLabel as any).payment_code} — {(selectedPtLabel as any).payment_type_description}</span>
                    ) : (
                      <span className="text-muted-foreground">Select payment type...</span>
                    )}
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search payment type..." value={paymentCodeSearch} onValueChange={setPaymentCodeSearch} className="h-9" />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>No payment type found.</CommandEmpty>
                    <CommandGroup>
                      {filteredPaymentTypes.map((pt: any) => (
                        <CommandItem
                          key={pt.payment_code}
                          value={pt.payment_code}
                          onSelect={() => { setPaymentCode(pt.payment_code); setPaymentCodeOpen(false); }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Check className={cn("h-3.5 w-3.5 shrink-0", paymentCode === pt.payment_code ? "opacity-100" : "opacity-0")} />
                          <span className="font-mono text-xs text-primary">{pt.payment_code}</span>
                          <span className="text-xs text-foreground truncate">{pt.payment_type_description}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Fund (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fund</Label>
            <div className="flex items-center h-9 px-3 border rounded-md bg-muted text-sm text-foreground">
              {fundDisplay}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Amount ($) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Method of Payment - searchable combobox */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Method of Payment *</Label>
            <Popover open={mopOpen} onOpenChange={setMopOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={mopOpen}
                  className="w-full justify-between font-normal h-9 text-sm border-input bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  {mopLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    selectedMopLabel ? (
                      <span className="truncate text-foreground">{(selectedMopLabel as any).mop_code} — {(selectedMopLabel as any).short_description}</span>
                    ) : (
                      <span className="text-muted-foreground">Select method of payment...</span>
                    )}
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search MOP..." value={mopSearch} onValueChange={setMopSearch} className="h-9" />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>No method found.</CommandEmpty>
                    <CommandGroup>
                      {filteredMopTypes.map((m: any) => (
                        <CommandItem
                          key={m.mop_code}
                          value={m.mop_code}
                          onSelect={() => { setMopCode(m.mop_code); setMopOpen(false); }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Check className={cn("h-3.5 w-3.5 shrink-0", mopCode === m.mop_code ? "opacity-100" : "opacity-0")} />
                          <span className="font-mono text-xs text-primary">{m.mop_code}</span>
                          <span className="text-xs text-foreground truncate">{m.short_description}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Contribution Period</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={periodMonth} onValueChange={setPeriodMonth}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={periodYear} onValueChange={setPeriodYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!amount || parseFloat(amount) <= 0 || !paymentCode || !mopCode}>
            {editData ? 'Update Line' : 'Add Line'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
