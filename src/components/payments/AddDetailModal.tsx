import React, { useState, useEffect, useMemo } from 'react';
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

  // Populate from editData
  useEffect(() => {
    if (open && editData) {
      setPaymentCode(editData.payment_code || '');
      setFundCode(editData.fund_code || '');
      setAmount(editData.payment_amount?.toString() || '');
      setMopCode(editData.mop_code || '');
      if (editData.period) {
        // period is stored as timestamp, extract YYYYMM
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

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !paymentCode || !mopCode) return;

    const periodStr = periodMonth && periodYear ? `${periodYear}-${periodMonth}-01` : null;

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
    };

    onAdd(detail);
    onClose();

    // Check if MOP popup is needed after adding
    if ((mopCode === 'CHQ' || mopCode === 'CHK' || mopCode === 'CRD') && onMopPopupNeeded) {
      setTimeout(() => onMopPopupNeeded(mopCode), 100);
    }
  };

  const selectedPtLabel = paymentTypes.find((t: any) => t.payment_code === paymentCode);
  const selectedMopLabel = mopTypes.find((m: any) => m.mop_code === mopCode);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Payment Detail Line' : 'Add Payment Detail Line'}</DialogTitle>
          <DialogDescription>Enter the details for this payment line.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment Code - searchable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Code *</Label>
              <Popover open={paymentCodeOpen} onOpenChange={setPaymentCodeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9 text-sm">
                    {ptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                      selectedPtLabel ? <span className="truncate">{(selectedPtLabel as any).payment_code} - {(selectedPtLabel as any).payment_type_description}</span> : 'Select...'}
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search payment type..." value={paymentCodeSearch} onValueChange={setPaymentCodeSearch} />
                    <CommandList>
                      <CommandEmpty>No payment type found.</CommandEmpty>
                      <CommandGroup>
                        {filteredPaymentTypes.map((pt: any) => (
                          <CommandItem
                            key={pt.payment_code}
                            value={pt.payment_code}
                            onSelect={() => { setPaymentCode(pt.payment_code); setPaymentCodeOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-3 w-3", paymentCode === pt.payment_code ? "opacity-100" : "opacity-0")} />
                            <span className="font-mono text-xs mr-2">{pt.payment_code}</span>
                            <span className="text-xs truncate">{pt.payment_type_description}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fund</Label>
              <Input value={fundCode} readOnly className="bg-muted" />
            </div>
          </div>

          {/* Amount + MOP */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus={!editData}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method of Payment *</Label>
              <Popover open={mopOpen} onOpenChange={setMopOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9 text-sm">
                    {mopLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                      selectedMopLabel ? <span className="truncate">{(selectedMopLabel as any).mop_code} - {(selectedMopLabel as any).short_description}</span> : 'Select...'}
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search MOP..." value={mopSearch} onValueChange={setMopSearch} />
                    <CommandList>
                      <CommandEmpty>No method found.</CommandEmpty>
                      <CommandGroup>
                        {filteredMopTypes.map((m: any) => (
                          <CommandItem
                            key={m.mop_code}
                            value={m.mop_code}
                            onSelect={() => { setMopCode(m.mop_code); setMopOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-3 w-3", mopCode === m.mop_code ? "opacity-100" : "opacity-0")} />
                            <span className="font-mono text-xs mr-2">{m.mop_code}</span>
                            <span className="text-xs truncate">{m.short_description}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label className="text-xs">Contribution Period</Label>
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
