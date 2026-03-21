import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { PlusCircle, Trash2, CheckCircle, AlertCircle, Loader2, FileText, Printer, XCircle, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnabledCashierCurrencies, useAllCurrencies } from '@/hooks/useCashierCurrencyConfig';
import { usePaymentEntry, PayerInfo } from '@/hooks/usePaymentEntry';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrencyWithCode } from '@/utils/currencyConverter';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { InvoiceCancelModal } from '@/components/payments/InvoiceCancelModal';
import { validateEmail, validatePhone } from '@/lib/contactValidation';
import { cn } from '@/lib/utils';
import { printConfiguredInvoice } from '@/lib/invoicePrinter';

// ---------- types ----------
interface InvoiceLine {
  key: string;
  payment_code: string;
  currency_code: string;
  amount: string;
  exchange_rate: number;
  amount_base: number;
}

interface APPayer {
  payer_id: string;
  payer_name: string;
  email?: string;
  phone?: string;
  address?: string;
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

// ---------- AP Payer Search Hook ----------
function useAPPayerSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['ap_payer_search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 1) return [];
      const { data, error } = await supabase
        .from('cn_payer')
        .select('payer_id, payer_name, email, phone, address')
        .eq('payer_type', 'AP')
        .ilike('payer_name', `%${searchTerm}%`)
        .order('payer_name')
        .limit(20);
      if (error) throw error;
      return (data || []) as APPayer[];
    },
    enabled: searchTerm.length >= 1,
  });
}

// ---------- Component ----------
const CreateInvoice: React.FC = () => {
  // header state
  const [invoiceType, setInvoiceType] = useState('');
  const [paymentSource, setPaymentSource] = useState('');
  const [payerType, setPayerType] = useState('ER');
  const [payerId, setPayerId] = useState('');
  const [payerInfo, setPayerInfo] = useState<PayerInfo | null>(null);
  const [payerLookupDone, setPayerLookupDone] = useState(false);
  const [payerLoading, setPayerLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('XCD');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // AP payer state
  const [apSearchTerm, setApSearchTerm] = useState('');
  const [apDropdownOpen, setApDropdownOpen] = useState(false);
  const [apSelectedIndex, setApSelectedIndex] = useState(0);
  const [isNewPayer, setIsNewPayer] = useState(false);
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerAddress, setPayerAddress] = useState('');
  const apNameRef = useRef<HTMLInputElement>(null);
  const apDropdownRef = useRef<HTMLDivElement>(null);

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

  // AP search
  const { data: apResults = [], isLoading: apSearching } = useAPPayerSearch(
    payerType === 'AP' ? apSearchTerm : ''
  );

  // Build AP options list (results + "New Payer" option)
  const apOptions = useMemo(() => {
    const opts: (APPayer | { _new: true })[] = [...apResults];
    if (apSearchTerm.trim().length >= 1) {
      opts.push({ _new: true } as any);
    }
    return opts;
  }, [apResults, apSearchTerm]);

  // currency map
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

  const isAP = payerType === 'AP';

  // Standard payer lookup (ER, IP, SE, VC)
  const handlePayerBlur = useCallback(async () => {
    if (isAP || !payerType || !payerId) return;
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
  }, [payerType, payerId, lookupPayer, isAP]);

  // AP payer selection
  const selectAPPayer = useCallback((payer: APPayer) => {
    setPayerId(payer.payer_id);
    setApSearchTerm(payer.payer_name || '');
    setPayerInfo({ id: payer.payer_id, name: payer.payer_name || '', status: 'Active' });
    setPayerLookupDone(true);
    setIsNewPayer(false);
    setPayerEmail(payer.email || '');
    setPayerPhone(payer.phone || '');
    setPayerAddress(payer.address || '');
    setApDropdownOpen(false);
    clearError('payerId');
    clearError('payerName');
  }, []);

  const selectNewPayer = useCallback(() => {
    setIsNewPayer(true);
    setPayerId('');
    setPayerInfo({ id: 'NEW', name: apSearchTerm.trim(), status: 'New' });
    setPayerLookupDone(true);
    setPayerEmail('');
    setPayerPhone('');
    setPayerAddress('');
    setApDropdownOpen(false);
    clearError('payerId');
  }, [apSearchTerm]);

  // Handle payer type change
  const handlePayerTypeChange = useCallback((v: string) => {
    setPayerType(v);
    setPayerInfo(null);
    setPayerLookupDone(false);
    setPayerId('');
    setApSearchTerm('');
    setIsNewPayer(false);
    setPayerEmail('');
    setPayerPhone('');
    setPayerAddress('');
    clearError('payerType');
    clearError('payerId');
    clearError('payerName');

    if (v === 'AP') {
      setTimeout(() => apNameRef.current?.focus(), 50);
    }
  }, []);

  // AP keyboard navigation
  const handleAPKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!apDropdownOpen || apOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setApSelectedIndex(prev => Math.min(prev + 1, apOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setApSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = apOptions[apSelectedIndex];
      if (selected && '_new' in selected) {
        selectNewPayer();
      } else if (selected) {
        selectAPPayer(selected as APPayer);
      }
    } else if (e.key === 'Escape') {
      setApDropdownOpen(false);
    }
  }, [apDropdownOpen, apOptions, apSelectedIndex, selectAPPayer, selectNewPayer]);

  // Close AP dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (apDropdownRef.current && !apDropdownRef.current.contains(e.target as Node)) {
        setApDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setApSelectedIndex(0);
  }, [apResults]);

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

    if (isAP) {
      if (!isNewPayer && !payerId) e.payerId = 'Select a payer or create new';
      if (isNewPayer && !apSearchTerm.trim()) e.payerName = 'Payer name is required';
      if (!payerInfo) e.payerId = 'Valid payer required';

      // Contact validation for AP
      const emailResult = validateEmail(payerEmail, 'email', 'Email', true);
      if (!emailResult.valid) e.payerEmail = emailResult.error || 'Invalid email';

      const phoneResult = validatePhone(payerPhone, 'phone', 'Phone', true);
      if (!phoneResult.valid) e.payerPhone = phoneResult.error || 'Invalid phone';

      if (!payerAddress.trim()) e.payerAddress = 'Mailing address is required';
    } else {
      if (!payerId) e.payerId = 'Required';
      if (!payerInfo) e.payerId = 'Valid payer required';
    }

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
      const payerName = isAP
        ? (isNewPayer ? apSearchTerm.trim() : payerInfo?.name || '')
        : (payerInfo?.name || '');

      const { data, error } = await supabase.rpc('create_invoice_with_lines', {
        p_invoice_type: invoiceType,
        p_payment_source: paymentSource,
        p_payer_type: payerType,
        p_payer_id: isNewPayer ? '' : payerId,
        p_payer_name: payerName,
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
        p_payer_email: isAP ? payerEmail : null,
        p_payer_phone: isAP ? payerPhone : null,
        p_payer_address: isAP ? payerAddress : null,
        p_create_new_payer: isNewPayer,
      });

      if (error) throw error;
      const result = data as any;
      setCreatedInvoice({ id: result.invoice_id, invoice_number: result.invoice_number });
      if (isNewPayer && result.payer_id) {
        setPayerId(result.payer_id);
      }
      await invoiceActions.loadInvoice(result.invoice_id);
      toast.success(`Invoice ${result.invoice_number} created successfully (Status: Original)`);
      // Auto-print the invoice
      try {
        await printConfiguredInvoice(result.invoice_id);
      } catch (printErr: any) {
        toast.error('Print failed', { description: printErr.message });
      }
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
    setInvoiceType(''); setPaymentSource(''); setPayerType('ER'); setPayerId('');
    setPayerInfo(null); setPayerLookupDone(false); setCurrencyCode(mainCurrency);
    setDueDate(undefined); setLines([emptyLine()]);
    setPublicNotes(''); setInternalNotes('');
    setIsRecurring(false); setFrequency(''); setStartDate(undefined); setEndDate(undefined);
    setErrors({});
    setCreatedInvoice(null);
    setApSearchTerm(''); setIsNewPayer(false);
    setPayerEmail(''); setPayerPhone(''); setPayerAddress('');
    invoiceActions.setCurrentInvoice(null);
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
              <Select value={payerType} onValueChange={handlePayerTypeChange}>
                <SelectTrigger className={errors.payerType ? 'border-destructive' : ''}>
                  <SelectValue placeholder={loadingPT ? 'Loading...' : 'Select payer type'} />
                </SelectTrigger>
                <SelectContent>
                  {(payerTypes || []).map(p => <SelectItem key={p.code} value={p.code}>{p.description}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError name="payerType" />
            </div>

            {/* Payer ID / Payer Name - conditional on AP */}
            {isAP ? (
              <>
                {/* AP: Payer Name (searchable) */}
                <div className="space-y-1.5 relative" ref={apDropdownRef}>
                  <Label>Payer Name *</Label>
                  <Input
                    ref={apNameRef}
                    value={apSearchTerm}
                    onChange={e => {
                      setApSearchTerm(e.target.value);
                      setApDropdownOpen(true);
                      setPayerInfo(null);
                      setPayerLookupDone(false);
                      setIsNewPayer(false);
                      setPayerId('');
                      clearError('payerName');
                      clearError('payerId');
                    }}
                    onFocus={() => { if (apSearchTerm) setApDropdownOpen(true); }}
                    onKeyDown={handleAPKeyDown}
                    placeholder="Type payer name to search..."
                    className={errors.payerName ? 'border-destructive' : ''}
                    autoComplete="off"
                  />
                  {apSearching && (
                    <div className="absolute right-3 top-[34px]">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <FieldError name="payerName" />

                  {/* AP Dropdown */}
                  {apDropdownOpen && apSearchTerm.trim().length >= 1 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-[240px] overflow-auto">
                      {apSearching ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Searching...
                        </div>
                      ) : (
                        <>
                          {apResults.length === 0 && (
                            <div className="p-3 text-center text-sm text-muted-foreground">No matching payers found</div>
                          )}
                          {apResults.map((payer, idx) => (
                            <div
                              key={payer.payer_id}
                              className={cn(
                                'px-3 py-2 cursor-pointer text-sm flex justify-between items-center hover:bg-accent',
                                idx === apSelectedIndex && 'bg-accent'
                              )}
                              onMouseEnter={() => setApSelectedIndex(idx)}
                              onClick={() => selectAPPayer(payer)}
                            >
                              <span className="truncate">{payer.payer_name}</span>
                              <span className="text-xs font-mono text-muted-foreground ml-2 shrink-0">ID: {payer.payer_id}</span>
                            </div>
                          ))}
                          {/* New Payer option */}
                          <div
                            className={cn(
                              'px-3 py-2 cursor-pointer text-sm flex items-center gap-2 hover:bg-accent border-t',
                              apSelectedIndex === apResults.length && 'bg-accent'
                            )}
                            onMouseEnter={() => setApSelectedIndex(apResults.length)}
                            onClick={selectNewPayer}
                          >
                            <UserPlus className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">New Payer: "{apSearchTerm.trim()}"</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* AP: Payer ID (read-only, auto-filled) */}
                <div className="space-y-1.5">
                  <Label>Payer ID</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={isNewPayer ? '(auto-generated)' : payerId}
                      readOnly
                      placeholder="Auto-filled on selection"
                      className="bg-muted"
                    />
                    {payerLookupDone && payerInfo && !isNewPayer && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    {isNewPayer && <Badge variant="secondary" className="shrink-0">New</Badge>}
                  </div>
                  <FieldError name="payerId" />
                </div>
              </>
            ) : (
              <>
                {/* Non-AP: Payer ID */}
                <div className="space-y-1.5">
                  <Label>Payer ID / SSN *</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={payerId}
                      onChange={e => { setPayerId(e.target.value); setPayerInfo(null); setPayerLookupDone(false); clearError('payerId'); }}
                      onBlur={handlePayerBlur}
                      placeholder={payerType === 'ER' ? 'Reg. No.' : 'SSN'}
                      className={errors.payerId ? 'border-destructive' : ''}
                      autoFocus
                    />
                    {payerLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                    {!payerLoading && payerLookupDone && payerInfo && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    {!payerLoading && payerLookupDone && !payerInfo && <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
                  </div>
                  <FieldError name="payerId" />
                </div>

                {/* Non-AP: Payer Name (read-only) */}
                <div className="space-y-1.5">
                  <Label>Payer Name</Label>
                  <Input value={payerInfo?.name || ''} readOnly placeholder="Auto-filled on lookup" className="bg-muted" />
                </div>
              </>
            )}

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

          {/* AP Contact Fields */}
          {isAP && payerInfo && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm font-semibold text-foreground mb-3 block">
                {isNewPayer ? 'New Payer Contact Details' : 'Payer Contact Details'} *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Address *</Label>
                  <Input
                    value={payerEmail}
                    onChange={e => { setPayerEmail(e.target.value); clearError('payerEmail'); }}
                    placeholder="email@example.com"
                    className={errors.payerEmail ? 'border-destructive' : ''}
                    type="email"
                  />
                  <FieldError name="payerEmail" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone Number *</Label>
                  <Input
                    value={payerPhone}
                    onChange={e => { setPayerPhone(e.target.value); clearError('payerPhone'); }}
                    placeholder="Phone number"
                    className={errors.payerPhone ? 'border-destructive' : ''}
                  />
                  <FieldError name="payerPhone" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mailing Address *</Label>
                  <Input
                    value={payerAddress}
                    onChange={e => { setPayerAddress(e.target.value); clearError('payerAddress'); }}
                    placeholder="Mailing address"
                    className={errors.payerAddress ? 'border-destructive' : ''}
                  />
                  <FieldError name="payerAddress" />
                </div>
              </div>
            </div>
          )}
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

      {/* Created Invoice Actions */}
      {createdInvoice && invoiceActions.currentInvoice && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Invoice {createdInvoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant={invoiceActions.currentInvoice.status === 'C' ? 'destructive' : 'default'} className="ml-1">
                      {invoiceActions.currentInvoice.status === 'O' ? 'Original' : invoiceActions.currentInvoice.status === 'R' ? 'Reprinted' : invoiceActions.currentInvoice.status === 'C' ? 'Cancelled' : invoiceActions.currentInvoice.status}
                    </Badge>
                    {invoiceActions.currentInvoice.reprint_times > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">(Reprinted {invoiceActions.currentInvoice.reprint_times}x)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReprintInvoice}
                  disabled={invoiceActions.isLoading || invoiceActions.currentInvoice.status === 'C'}
                >
                  {invoiceActions.isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
                  Re-Print
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  disabled={invoiceActions.isLoading || invoiceActions.currentInvoice.status === 'C'}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel Invoice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetForm} disabled={submitting}>Reset</Button>
        <Button onClick={handleSubmit} disabled={submitting || !!createdInvoice} className="min-w-[180px]">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : 'Create Invoice'}
        </Button>
      </div>

      {/* Cancel Invoice Modal */}
      <InvoiceCancelModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelInvoice}
        isLoading={invoiceActions.isLoading}
        invoiceNumber={createdInvoice?.invoice_number}
      />
    </div>
  );
};

export default CreateInvoice;
