import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  // Optional C3 period props
  showPeriod?: boolean;
  periodMonth?: string;
  setPeriodMonth?: (v: string) => void;
  periodYear?: string;
  setPeriodYear?: (v: string) => void;
}

const PAYER_TYPES = [
  { value: 'ER', label: 'Employer' },
  { value: 'IP', label: 'Insured Person' },
  { value: 'SE', label: 'Self-Employed' },
  { value: 'VC', label: 'Voluntary Contributor' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: new Date(2024, i).toLocaleString('default', { month: 'long' }),
}));

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 5 + i;
  return { value: y.toString(), label: y.toString() };
});

export function PaymentHeaderForm({
  payerType,
  setPayerType,
  payerId,
  setPayerId,
  payerInfo,
  dateReceived,
  setDateReceived,
  remarks,
  setRemarks,
  onPayerBlur,
  isValidating,
  disabled,
  showPeriod,
  periodMonth,
  setPeriodMonth,
  periodYear,
  setPeriodYear,
}: PaymentHeaderFormProps) {
  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-base">Payment Header</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className={`grid grid-cols-1 ${showPeriod ? 'md:grid-cols-6' : 'md:grid-cols-4'} gap-4`}>
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
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Period Month</Label>
                <Select value={periodMonth} onValueChange={setPeriodMonth} disabled={disabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Period Year</Label>
                <Select value={periodYear} onValueChange={setPeriodYear} disabled={disabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
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