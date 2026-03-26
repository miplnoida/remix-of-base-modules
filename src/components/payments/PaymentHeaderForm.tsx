import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle, AlertCircle, Loader2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PayerInfo } from '@/hooks/usePaymentEntry';

interface PaymentHeaderFormProps {
  payerType: string;
  setPayerType: (v: string) => void;
  payerId: string;
  setPayerId: (v: string) => void;
  payerInfo: PayerInfo | null;
  dateReceived: Date | undefined;
  setDateReceived: (d: Date | undefined) => void;
  remarks: string;
  setRemarks: (v: string) => void;
  onPayerBlur: () => void;
  isValidating?: boolean;
  disabled?: boolean;
  showPeriod?: boolean;
  periodMonth?: string;
  setPeriodMonth?: (v: string) => void;
  periodYear?: string;
  setPeriodYear?: (v: string) => void;
  sequenceNo?: string;
  setSequenceNo?: (v: string) => void;
}

const PAYER_TYPES = [
  { value: 'ER', label: 'Employer' },
  { value: 'IP', label: 'Insured Person' },
  { value: 'SE', label: 'Self-Employed' },
  { value: 'VC', label: 'Voluntary Contributor' },
  { value: 'AP', label: 'Accounts Payable' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: new Date(2024, i).toLocaleString('default', { month: 'long' }),
}));

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 5 + i;
  return { value: y.toString(), label: y.toString() };
});

function PeriodMonthYearPicker({
  month, year, onMonthChange, onYearChange, disabled,
}: {
  month: string; year: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const monthLabel = MONTHS.find(m => m.value === month)?.label || '';
  const displayText = monthLabel && year ? `${monthLabel} ${year}` : 'Select period...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !monthLabel && 'text-muted-foreground'
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Month</Label>
            <Select value={month} onValueChange={onMonthChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Year</Label>
            <Select value={year} onValueChange={onYearChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PaymentHeaderForm({
  payerType, setPayerType, payerId, setPayerId, payerInfo,
  dateReceived, setDateReceived, remarks, setRemarks, onPayerBlur,
  isValidating, disabled, showPeriod, periodMonth, setPeriodMonth, periodYear, setPeriodYear,
}: PaymentHeaderFormProps) {
  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-base">Payment Header</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className={`grid grid-cols-1 ${showPeriod ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
          <div className="space-y-1.5">
            <Label className="text-xs">Payer Type</Label>
            <Select value={payerType} onValueChange={setPayerType} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {PAYER_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payer ID</Label>
            <div className="relative">
              <Input
                value={payerId}
                onChange={e => setPayerId(e.target.value)}
                onBlur={onPayerBlur}
                placeholder={payerType === 'ER' ? 'Reg. No.' : 'SSN'}
                disabled={disabled}
                autoFocus
              />
              {isValidating && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payer Name</Label>
            <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-sm">
              {payerInfo ? (
                <>
                  <span className="truncate">{payerInfo.name}</span>
                  {payerInfo.status === 'A' || payerInfo.status === 'Active' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date Received</Label>
            <DatePicker date={dateReceived} onDateChange={setDateReceived} disabled={disabled} />
          </div>

          {showPeriod && setPeriodMonth && setPeriodYear && periodMonth && periodYear && (
            <div className="space-y-1.5">
              <Label className="text-xs">Period <span className="text-destructive">*</span></Label>
              <PeriodMonthYearPicker
                month={periodMonth}
                year={periodYear}
                onMonthChange={setPeriodMonth}
                onYearChange={setPeriodYear}
                disabled={disabled}
              />
            </div>
          )}
        </div>

        <div className="mt-3">
          <Label className="text-xs">Remarks</Label>
          <Textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Payment remarks..."
            className="h-16 mt-1"
            disabled={disabled}
            maxLength={250}
          />
        </div>
      </CardContent>
    </Card>
  );
}