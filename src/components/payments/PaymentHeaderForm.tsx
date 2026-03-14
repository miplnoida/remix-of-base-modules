import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  onValidatePayer: () => void;
  onPayerSearch: () => void;
  isValidating?: boolean;
  disabled?: boolean;
}

const PAYER_TYPES = [
  { value: 'ER', label: 'Employer' },
  { value: 'IP', label: 'Insured Person' },
  { value: 'SE', label: 'Self-Employed' },
  { value: 'VC', label: 'Voluntary Contributor' },
];

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
  onValidatePayer,
  onPayerSearch,
  isValidating,
  disabled,
}: PaymentHeaderFormProps) {
  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-base">Payment Header</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="flex gap-1">
              <Input
                value={payerId}
                onChange={e => setPayerId(e.target.value)}
                placeholder={payerType === 'ER' || payerType === 'SE' ? 'Reg. No.' : 'SSN'}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onValidatePayer}
                disabled={disabled || !payerId || isValidating}
                className="shrink-0"
              >
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onPayerSearch}
                disabled={disabled}
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
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
