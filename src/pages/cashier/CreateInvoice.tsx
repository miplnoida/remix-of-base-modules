import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { PlusCircle, Trash2, CheckCircle, AlertCircle, Loader2, FileText, Printer, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnabledCashierCurrencies, useAllCurrencies } from '@/hooks/useCashierCurrencyConfig';
import { usePaymentEntry, PayerInfo } from '@/hooks/usePaymentEntry';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrencyWithCode } from '@/utils/currencyConverter';
import { useInvoiceActions, InvoiceData } from '@/hooks/useInvoiceActions';
import { InvoiceCancelModal } from '@/components/payments/InvoiceCancelModal';

// ---------- types ----------
interface InvoiceLine {
  key: string;
  payment_code: string;
  currency_code: string;
  amount: string;
  exchange_rate: number;
  amount_base: number;
}

const emptyLine = (): InvoiceLine => ({
  key: crypto.randomUUID(),
  payment_code: '',
  currency_code: 'XCD',
  amount: '',
  exchange_rate: 1,
  amount_base: 0,
});

// ---------- data hooks ----------
function useInvoiceTypes() {
  return useQuery({
    queryKey: ['tb_invoice_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_invoice_types')
        .select('code, description')
        .eq('is_active', true)
        .order('description');
      if (error) throw error;
      return data as { code: string; description: string }[];
    },
  });
}

function usePaymentSources() {
  return useQuery({
    queryKey: ['tb_payment_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_payment_sources')
        .select('code, description')
        .eq('is_active', true)
        .order('description');
      if (error) throw error;
      return data as { code: string; description: string }[];
    },
  });
}

function usePayerTypes() {
  return useQuery({
    queryKey: ['tb_payer_type'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_payer_type')
        .select('code, description')
        .eq('is_active', true)
        .order('description');
      if (error) throw error;
      return data as { code: string; description: string }[];
    },
  });
}

function usePaymentTypes() {
  return useQuery({
    queryKey: ['tb_payment_type_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_payment_type')
        .select('payment_code, payment_type_description');
      if (error) throw error;
      return data as { payment_code: string; payment_type_description: string }[];
    },
  });
}

// ---------- Component ----------
const CreateInvoice: React.FC = () => {
  // header state
  const [invoiceType, setInvoiceType] = useState('');
  const [paymentSource, setPaymentSource] = useState('');
  const [payerType, setPayerType] = useState('');
  const [payerId, setPayerId] = useState('');
  const [payerInfo, setPayerInfo] = useState<PayerInfo | null>(null);
  const [payerLookupDone, setPayerLookupDone] = useState(false);
  const [payerLoading, setPayerLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('XCD');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // lines
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);

  // notes
  const [publicNotes, setPublicNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [submitting, setSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{ id: number; invoice_number: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // data queries
  const { data: invoiceTypes, isLoading: loadingIT } = useInvoiceTypes();
  const { data: paymentSources, isLoading: loadingPS } = usePaymentSources();
  const { data: payerTypes, isLoading: loadingPT } = usePayerTypes();
  const { data: paymentTypes, isLoading: loadingPMT } = usePaymentTypes();
  const { data: enabledCurrencies, isLoading: loadingCurr } = useEnabledCashierCurrencies();
  const { data: allCurrencies } = useAllCurrencies();
  const { lookupPayer } = usePaymentEntry();
  const { userCode } = useUserCode();
  const invoiceActions = useInvoiceActions();

  // currency map for exchange rates
  const currencyMap = useMemo(() => {
    const map = new Map<string, number>();
    (allCurrencies || []).forEach(c => map.set(c.currency_code, c.exchange_rate));
    return map;
  }, [allCurrencies]);

  const mainCurrency = useMemo(() => {
    return (enabledCurrencies || []).find(c => c.is_main_currency)?.currency_code || 'XCD';
  }, [enabledCurrencies]);

  // ---------- helpers ----------
  const clearError = (field: string) => setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const handlePayerBlur = useCallback(async () => {
    if (!payerType || !payerId) return;
    setPayerLoading(true);
    try {
      const info = await lookupPayer(payerType, payerId);
      setPayerInfo(info);
      setPayerLookupDone(true);
      if (!info) {
        setErrors(prev => ({ ...prev, payerId: 'Payer not found' }));
      } else {
        clearError('payerId');
      }
    } finally {
      setPayerLoading(false);
    }
  }, [payerType, payerId, lookupPayer]);

  const updateLine = (key: string, field: keyof InvoiceLine, value: string) => {
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const updated = { ...l, [field]: value };
      if (field === 'currency_code') {
        updated.exchange_rate = currencyMap.get(value) || 1;
        const amt = parseFloat(updated.amount) || 0;
        updated.amount_base = Math.round(amt * updated.exchange_rate * 100) / 100;
      }
      if (field === 'amount') {
        const amt = parseFloat(value) || 0;
        updated.amount_base = Math.round(amt * updated.exchange_rate * 100) / 100;
      }
      return updated;
    }));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter(l => l.key !== key));
  };

  const totalBase = useMemo(() => lines.reduce((s, l) => s + l.amount_base, 0), [lines]);

  // ---------- validation ----------
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!invoiceType) e.invoiceType = 'Required';
    if (!paymentSource) e.paymentSource = 'Required';
    if (!payerType) e.payerType = 'Required';
    if (!payerId) e.payerId = 'Required';
    if (!payerInfo) e.payerId = 'Valid payer required';
    if (!dueDate) e.dueDate = 'Required';
    else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (dueDate < today) e.dueDate = 'Cannot be a past date';
    }

    lines.forEach((l, i) => {
      if (!l.payment_code) e[`line_pt_${i}`] = 'Required';
      const amt = parseFloat(l.amount);
      if (!l.amount || isNaN(amt) || amt <= 0) e[`line_amt_${i}`] = 'Amount must be > 0';
      if (!l.exchange_rate || l.exchange_rate <= 0) e[`line_rate_${i}`] = 'Invalid rate';
    });

    if (isRecurring) {
      if (!frequency) e.frequency = 'Required';
      if (!startDate) e.startDate = 'Required';
    }

    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error('Please check the form for valid information!', {
        description: Object.values(e)[0],
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return false;
    }
    return true;
  };

  // ---------- submit ----------
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const headerRate = currencyMap.get(currencyCode) || 1;
      const { data, error } = await supabase.rpc('create_invoice_with_lines', {
        p_invoice_type: invoiceType,
        p_payment_source: paymentSource,
        p_payer_type: payerType,
        p_payer_id: payerId,
        p_payer_name: payerInfo?.name || '',
        p_currency_code: currencyCode,
        p_exchange_rate: headerRate,
        p_total_amount: totalBase / (headerRate || 1),
        p_total_amount_base: totalBase,
        p_due_date: dueDate!.toISOString().split('T')[0],
        p_public_notes: publicNotes || null,
        p_internal_notes: internalNotes || null,
        p_is_recurring: isRecurring,
        p_created_by: userCode || 'SYSTEM',
        p_lines: lines.map((l, i) => ({
          payment_code: l.payment_code,
          currency_code: l.currency_code,
          amount: parseFloat(l.amount) || 0,
          exchange_rate: l.exchange_rate,
          amount_base: l.amount_base,
          sort_order: i,
        })),
        p_recurring: isRecurring ? {
          frequency,
          start_date: startDate!.toISOString().split('T')[0],
          end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        } : null,
      });

      if (error) throw error;
      const result = data as any;
      setCreatedInvoice({ id: result.invoice_id, invoice_number: result.invoice_number });
      await invoiceActions.loadInvoice(result.invoice_id);
      toast.success(`Invoice ${result.invoice_number} created successfully (Status: Original)`);
    } catch (err: any) {
      toast.error('Failed to create invoice', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprintInvoice = async () => {
    if (!createdInvoice) return;
    await invoiceActions.reprintInvoice(createdInvoice.id, userCode || 'SYSTEM');
  };

  const handleCancelInvoice = async (reason: string) => {
    if (!createdInvoice) return;
    const result = await invoiceActions.cancelInvoice(createdInvoice.id, reason, userCode || 'SYSTEM');
    if (result) setShowCancelModal(false);
  };

  const resetForm = () => {
    setInvoiceType(''); setPaymentSource(''); setPayerType(''); setPayerId('');
    setPayerInfo(null); setPayerLookupDone(false); setCurrencyCode(mainCurrency);
    setDueDate(undefined); setLines([emptyLine()]);
    setPublicNotes(''); setInternalNotes('');
    setIsRecurring(false); setFrequency(''); setStartDate(undefined); setEndDate(undefined);
    setErrors({});
  };

  const FieldError = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive mt-1">{errors[name]}</p> : null;

  // ---------- render ----------
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Invoice</h1>
          <p className="text-muted-foreground">Generate a new invoice with payment details</p>
        </div>
        <Badge variant="outline" className="text-sm"><FileText className="h-3 w-3 mr-1" />New Invoice</Badge>
      </div>

      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Invoice Header</CardTitle>
          <CardDescription>Classification, payer, and basic details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Invoice Type */}
            <div className="space-y-1.5">
              <Label>Invoice Type *</Label>
              <Select value={invoiceType} onValueChange={v => { setInvoiceType(v); clearError('invoiceType'); }}>
                <SelectTrigger className={errors.invoiceType ? 'border-destructive' : ''}>
                  <SelectValue placeholder={loadingIT ? 'Loading...' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {(invoiceTypes || []).map(t => <SelectItem key={t.code} value={t.code}>{t.description}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError name="invoiceType" />
            </div>

            {/* Payment Source */}
            <div className="space-y-1.5">
              <Label>Payment Source *</Label>
              <Select value={paymentSource} onValueChange={v => { setPaymentSource(v); clearError('paymentSource'); }}>
                <SelectTrigger className={errors.paymentSource ? 'border-destructive' : ''}>
                  <SelectValue placeholder={loadingPS ? 'Loading...' : 'Select source'} />
                </SelectTrigger>
                <SelectContent>
                  {(paymentSources || []).map(s => <SelectItem key={s.code} value={s.code}>{s.description}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError name="paymentSource" />
            </div>

            {/* Payer Type */}
            <div className="space-y-1.5">
              <Label>Payer Type *</Label>
              <Select value={payerType} onValueChange={v => {
                setPayerType(v); setPayerInfo(null); setPayerLookupDone(false); clearError('payerType');
              }}>
                <SelectTrigger className={errors.payerType ? 'border-destructive' : ''}>
                  <SelectValue placeholder={loadingPT ? 'Loading...' : 'Select payer type'} />
                </SelectTrigger>
                <SelectContent>
                  {(payerTypes || []).map(p => <SelectItem key={p.code} value={p.code}>{p.description}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError name="payerType" />
            </div>

            {/* Payer ID */}
            <div className="space-y-1.5">
              <Label>Payer ID / SSN *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={payerId}
                  onChange={e => { setPayerId(e.target.value); setPayerInfo(null); setPayerLookupDone(false); clearError('payerId'); }}
                  onBlur={handlePayerBlur}
                  placeholder="Enter ID or SSN"
                  className={errors.payerId ? 'border-destructive' : ''}
                />
                {payerLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!payerLoading && payerLookupDone && payerInfo && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                {!payerLoading && payerLookupDone && !payerInfo && <AlertCircle className="h-5 w-5 text-destructive" />}
              </div>
              <FieldError name="payerId" />
            </div>

            {/* Payer Name (read-only) */}
            <div className="space-y-1.5">
              <Label>Payer Name</Label>
              <Input value={payerInfo?.name || ''} readOnly placeholder="Auto-filled on lookup" className="bg-muted" />
            </div>

            {/* Invoice Currency */}
            <div className="space-y-1.5">
              <Label>Invoice Currency</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCurr ? 'Loading...' : 'Select currency'} />
                </SelectTrigger>
                <SelectContent>
                  {(enabledCurrencies || []).map(c => (
                    <SelectItem key={c.currency_code} value={c.currency_code}>{c.currency_code} — {c.currency_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <DatePicker
                date={dueDate}
                onDateChange={d => { setDueDate(d); clearError('dueDate'); }}
                placeholder="Select due date"
                className={errors.dueDate ? 'border-destructive' : ''}
              />
              <FieldError name="dueDate" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Add payment line items with currencies and amounts</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <PlusCircle className="h-4 w-4 mr-1" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Payment Type *</TableHead>
                <TableHead className="w-[18%]">Currency</TableHead>
                <TableHead className="w-[18%]">Amount *</TableHead>
                <TableHead className="w-[22%]">Base Amount ({mainCurrency})</TableHead>
                <TableHead className="w-[12%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Select value={line.payment_code} onValueChange={v => { updateLine(line.key, 'payment_code', v); clearError(`line_pt_${idx}`); }}>
                      <SelectTrigger className={errors[`line_pt_${idx}`] ? 'border-destructive' : ''}>
                        <SelectValue placeholder={loadingPMT ? 'Loading...' : 'Select type'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(paymentTypes || []).map(pt => (
                          <SelectItem key={pt.payment_code} value={pt.payment_code}>{pt.payment_type_description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError name={`line_pt_${idx}`} />
                  </TableCell>
                  <TableCell>
                    <Select value={line.currency_code} onValueChange={v => updateLine(line.key, 'currency_code', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(enabledCurrencies || []).map(c => (
                          <SelectItem key={c.currency_code} value={c.currency_code}>{c.currency_code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.amount}
                      onChange={e => { updateLine(line.key, 'amount', e.target.value); clearError(`line_amt_${idx}`); }}
                      placeholder="0.00"
                      className={errors[`line_amt_${idx}`] ? 'border-destructive' : ''}
                    />
                    <FieldError name={`line_amt_${idx}`} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatCurrencyWithCode(line.amount_base, mainCurrency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.key)} disabled={lines.length <= 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
                <TableCell className="font-bold text-lg">{formatCurrencyWithCode(totalBase, mainCurrency)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Public Notes <span className="text-xs text-muted-foreground">(printed on invoice)</span></Label>
              <Textarea value={publicNotes} onChange={e => setPublicNotes(e.target.value)} placeholder="Notes visible on invoice..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Internal Notes <span className="text-xs text-muted-foreground">(not printed)</span></Label>
              <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Internal use only..." rows={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurring */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <CardTitle>Recurring Invoice</CardTitle>
            <Switch checked={isRecurring} onCheckedChange={v => { setIsRecurring(v); if (!v) { setFrequency(''); setStartDate(undefined); setEndDate(undefined); } }} />
          </div>
        </CardHeader>
        {isRecurring && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Frequency *</Label>
                <Select value={frequency} onValueChange={v => { setFrequency(v); clearError('frequency'); }}>
                  <SelectTrigger className={errors.frequency ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError name="frequency" />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <DatePicker
                  date={startDate}
                  onDateChange={d => { setStartDate(d); clearError('startDate'); }}
                  placeholder="Select start date"
                  className={errors.startDate ? 'border-destructive' : ''}
                />
                <FieldError name="startDate" />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <DatePicker date={endDate} onDateChange={setEndDate} placeholder="Optional" />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetForm} disabled={submitting}>Reset</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[180px]">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
};

export default CreateInvoice;
