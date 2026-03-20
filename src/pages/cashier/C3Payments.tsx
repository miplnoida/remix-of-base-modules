import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { toast } from '@/hooks/use-toast';
import { Trash2, Receipt, Loader2, PlusCircle, RotateCcw, XCircle, Edit2, X, Search, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { usePaymentEntry, PayerInfo } from '@/hooks/usePaymentEntry';
import { useReceiptActions } from '@/hooks/useReceiptActions';
import { useUserCode } from '@/hooks/useUserCode';
import { useC3PaymentTypes } from '@/hooks/usePaymentModuleConfig';
import { useEnabledCashierCurrencies } from '@/hooks/useCashierCurrencyConfig';
import { ChequeDetailModal, ChequeDetails } from '@/components/payments/ChequeDetailModal';
import { CardDetailModal, CardDetails } from '@/components/payments/CardDetailModal';
import { ReceiptCancelModal } from '@/components/payments/ReceiptCancelModal';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDateForStorage } from '@/lib/dateFormat';
import { logApplicationError } from '@/lib/globalErrorHandler';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/* ─── types ──────────────────────────────────────────── */

interface PaymentComponent {
  payment_code: string;
  fund_code: string;
  description: string;
  amount: number;
}

interface MethodRow {
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

type FlowState = 'entry' | 'saving' | 'saved';

const PAYER_TYPES = [
  { value: 'ER', label: 'Employer' },
  { value: 'IP', label: 'Insured Person' },
  { value: 'SE', label: 'Self-Employed' },
  { value: 'VC', label: 'Voluntary Contributor' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: new Date(2024, i).toLocaleString('default', { month: 'short' }),
  full: new Date(2024, i).toLocaleString('default', { month: 'long' }),
}));

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 5 + i;
  return { value: y.toString(), label: y.toString() };
});

/* ─── component ──────────────────────────────────────── */

const C3Payments: React.FC = () => {
  const batchSel = useBatchSelection();
  const payment = usePaymentEntry();
  const receiptActions = useReceiptActions();
  const { userCode } = useUserCode();

  // Header state
  const [payerType, setPayerType] = useState('ER');
  const [payerId, setPayerId] = useState('');
  const [payerInfo, setPayerInfo] = useState<PayerInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(new Date());
  const [remarks, setRemarks] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [periodOpen, setPeriodOpen] = useState(false);

  // Components
  const [selectedComponents, setSelectedComponents] = useState<PaymentComponent[]>([]);
  const [componentSearch, setComponentSearch] = useState('');
  const [componentSearchFocused, setComponentSearchFocused] = useState(false);

  // Methods
  const [methods, setMethods] = useState<MethodRow[]>([]);

  // Flow
  const [flowState, setFlowState] = useState<FlowState>('entry');
  const [savedPaymentId, setSavedPaymentId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Modals
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingMethodId, setPendingMethodId] = useState<string | null>(null);

  // Refs for auto-focus
  const amountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const methodAmountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const componentSearchRef = useRef<HTMLInputElement | null>(null);
  const payerIdRef = useRef<HTMLInputElement | null>(null);

  /* ── data fetching ───────────────────── */

  const { c3PaymentTypes, isLoading: c3TypesLoading } = useC3PaymentTypes();
  const { data: enabledCurrencies = [] } = useEnabledCashierCurrencies();

  const { data: paymentTypesAll = [], isLoading: ptLoading } = useQuery({
    queryKey: ['tb_payment_type_all'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_payment_type').select('payment_code, payment_type_description, fund_code');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: mopTypes = [] } = useQuery({
    queryKey: ['tb_method_of_payment'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_method_of_payment').select('mop_code, short_description, long_description');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const c3PaymentTypeDetails = useMemo(() => {
    if (!c3PaymentTypes.length || !paymentTypesAll.length) return [];
    return paymentTypesAll.filter((pt: any) => c3PaymentTypes.includes(pt.payment_code));
  }, [c3PaymentTypes, paymentTypesAll]);

  const availableComponents = useMemo(() => {
    const selectedCodes = new Set(selectedComponents.map(c => c.payment_code));
    return c3PaymentTypeDetails.filter((pt: any) => !selectedCodes.has(pt.payment_code));
  }, [c3PaymentTypeDetails, selectedComponents]);

  const filteredAvailable = useMemo(() => {
    if (!componentSearch.trim()) return availableComponents;
    const q = componentSearch.toLowerCase();
    return availableComponents.filter((pt: any) =>
      (pt.payment_type_description || '').toLowerCase().includes(q) ||
      pt.payment_code.toLowerCase().includes(q)
    );
  }, [availableComponents, componentSearch]);

  const mainCurrency = useMemo(() =>
    enabledCurrencies.find((c: any) => c.is_main_currency) || enabledCurrencies[0],
    [enabledCurrencies]
  );

  /* ── computed ─────────────────────────── */

  const c3Amount = useMemo(() => selectedComponents.reduce((s, c) => s + c.amount, 0), [selectedComponents]);
  const totalPaymentReceived = useMemo(() => methods.reduce((s, m) => s + m.base_amount, 0), [methods]);
  const difference = c3Amount - totalPaymentReceived;

  const period = `${selectedMonth.padStart(2, '0')}/${selectedYear}`;
  const periodLabel = `${MONTHS.find(m => m.value === selectedMonth)?.full || ''} ${selectedYear}`;

  const isEntry = flowState === 'entry';
  const isSaving = flowState === 'saving';
  const isSaved = flowState === 'saved';
  const canCancel = isSaved && receiptActions.currentReceipt?.status === 'O';
  const canReprint = isSaved && !!receiptActions.currentReceipt;

  const baseCurrCode = mainCurrency?.currency_code || 'XCD';

  /* ── keyboard shortcut ────────────────── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Enter = Process
      if (e.ctrlKey && e.key === 'Enter' && isEntry && selectedComponents.length > 0 && methods.length > 0 && payerInfo) {
        e.preventDefault();
        setShowConfirm(true);
      }
      // Ctrl+M = Add Method
      if (e.ctrlKey && e.key === 'm' && isEntry) {
        e.preventDefault();
        addMethodRow();
      }
      // Ctrl+Shift+N = New Payment
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        resetForm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEntry, selectedComponents, methods, payerInfo]);

  // Auto-focus payer ID on mount
  useEffect(() => {
    if (batchSel.isReady && batchSel.selectedBatch) {
      setTimeout(() => payerIdRef.current?.focus(), 200);
    }
  }, [batchSel.isReady, batchSel.selectedBatch]);

  /* ── handlers ─────────────────────────── */

  const handlePayerBlur = useCallback(async () => {
    if (!payerId.trim() || isValidating) return;
    setIsValidating(true);
    const info = await payment.lookupPayer(payerType, payerId.trim());
    setPayerInfo(info);
    if (!info) toast({ title: 'Not Found', description: 'Payer not found. Please check the ID.', variant: 'destructive' });
    setIsValidating(false);
  }, [payerType, payerId, payment, isValidating]);

  const handleSelectComponent = useCallback((code: string) => {
    const pt = c3PaymentTypeDetails.find((p: any) => p.payment_code === code);
    if (!pt) return;
    setSelectedComponents(prev => [...prev, {
      payment_code: pt.payment_code,
      fund_code: pt.fund_code || '',
      description: pt.payment_type_description || pt.payment_code,
      amount: 0,
    }]);
    setComponentSearch('');
    setTimeout(() => amountRefs.current[code]?.focus(), 50);
  }, [c3PaymentTypeDetails]);

  const removeComponent = useCallback((code: string) => {
    setSelectedComponents(prev => prev.filter(c => c.payment_code !== code));
  }, []);

  const updateComponentAmount = useCallback((code: string, amount: number) => {
    setSelectedComponents(prev => prev.map(c =>
      c.payment_code === code ? { ...c, amount } : c
    ));
  }, []);

  // Tab from last component amount → component search or add-method
  const handleComponentAmountKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus next component or jump to component search
      const nextComp = selectedComponents[idx + 1];
      if (nextComp) {
        amountRefs.current[nextComp.payment_code]?.focus();
      } else {
        componentSearchRef.current?.focus();
      }
    }
  }, [selectedComponents]);

  const addMethodRow = useCallback(() => {
    const defaultCurrency = mainCurrency?.currency_code || 'XCD';
    const newId = crypto.randomUUID();
    setMethods(prev => [...prev, {
      id: newId,
      mop_code: '',
      mop_desc: '',
      currency_code: defaultCurrency,
      original_amount: 0,
      exchange_rate: 1,
      base_amount: 0,
      bank_code: '', mop_number: '', cheque_date: null,
      mop_account_number: '', mop_notes1: '',
      credit_card_code: '', expiration_date: '', card_desc: '', bank_desc: '',
    }]);
    return newId;
  }, [mainCurrency]);

  const removeMethodRow = useCallback((id: string) => {
    setMethods(prev => prev.filter(m => m.id !== id));
  }, []);

  const updateMethodField = useCallback((id: string, field: keyof MethodRow, value: any) => {
    setMethods(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: value };
      if (field === 'original_amount' || field === 'exchange_rate') {
        updated.base_amount = Number((updated.original_amount * updated.exchange_rate).toFixed(2));
      }
      if (field === 'currency_code') {
        const curr = enabledCurrencies.find((c: any) => c.currency_code === value);
        updated.exchange_rate = curr?.exchange_rate || 1;
        updated.base_amount = Number((updated.original_amount * updated.exchange_rate).toFixed(2));
      }
      return updated;
    }));
  }, [enabledCurrencies]);

  const focusMethodAmount = useCallback((id: string) => {
    setTimeout(() => methodAmountRefs.current[id]?.focus(), 100);
  }, []);

  const handleMopCodeChange = useCallback((id: string, mopCode: string) => {
    const mop = mopTypes.find((m: any) => m.mop_code === mopCode);
    setMethods(prev => prev.map(m => {
      if (m.id !== id) return m;
      return {
        ...m, mop_code: mopCode, mop_desc: mop?.short_description || mopCode,
        bank_code: '', mop_number: '', cheque_date: null,
        mop_account_number: '', mop_notes1: '',
        credit_card_code: '', expiration_date: '', card_desc: '', bank_desc: '',
      };
    }));
    if (mopCode === 'CHQ' || mopCode === 'CHK') {
      setPendingMethodId(id);
      setTimeout(() => setShowChequeModal(true), 100);
    } else if (mopCode === 'CRD') {
      setPendingMethodId(id);
      setTimeout(() => setShowCardModal(true), 100);
    } else {
      focusMethodAmount(id);
    }
  }, [mopTypes, focusMethodAmount]);

  const handleEditMopDetail = useCallback((id: string) => {
    const m = methods.find(r => r.id === id);
    if (!m) return;
    setPendingMethodId(id);
    if (m.mop_code === 'CHQ' || m.mop_code === 'CHK') setShowChequeModal(true);
    else if (m.mop_code === 'CRD') setShowCardModal(true);
  }, [methods]);

  const handleChequeDetailsSave = useCallback((details: ChequeDetails) => {
    if (pendingMethodId) {
      setMethods(prev => prev.map(m => m.id === pendingMethodId ? {
        ...m, mop_number: details.mop_number, bank_code: details.bank_code,
        cheque_date: details.cheque_date, mop_account_number: details.mop_account_number,
        mop_notes1: details.mop_notes1, bank_desc: details.bank_desc || '',
      } : m));
      focusMethodAmount(pendingMethodId);
    }
    setPendingMethodId(null);
    setShowChequeModal(false);
  }, [pendingMethodId, focusMethodAmount]);

  const handleCardDetailsSave = useCallback((details: CardDetails) => {
    if (pendingMethodId) {
      setMethods(prev => prev.map(m => m.id === pendingMethodId ? {
        ...m, credit_card_code: details.credit_card_code, mop_number: details.mop_number,
        expiration_date: details.expiration_date, mop_notes1: details.mop_notes1,
        card_desc: details.card_desc || '',
      } : m));
      focusMethodAmount(pendingMethodId);
    }
    setPendingMethodId(null);
    setShowCardModal(false);
  }, [pendingMethodId, focusMethodAmount]);

  const handleMethodAmountKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextMethod = methods[idx + 1];
      if (nextMethod) {
        methodAmountRefs.current[nextMethod.id]?.focus();
      }
    }
  }, [methods]);

  /* ── process payment ──────────────────── */

  const handleProcessPayment = useCallback(async () => {
    setShowConfirm(false);
    const logCtx = { module: 'C3Payments', action: 'handleProcessPayment', entity_type: 'cn_receipt' };

    if (!batchSel.selectedBatch) {
      toast({ title: 'No Batch', description: 'No active batch selected.', variant: 'destructive' });
      return;
    }
    if (!payerInfo) {
      toast({ title: 'Missing Payer', description: 'Please enter and validate a Payer ID.', variant: 'destructive' });
      return;
    }
    if (selectedComponents.length === 0 || c3Amount <= 0) {
      toast({ title: 'No Components', description: 'Select at least one payment component with an amount.', variant: 'destructive' });
      return;
    }
    if (methods.length === 0 || totalPaymentReceived <= 0) {
      toast({ title: 'No Methods', description: 'Add at least one payment method with an amount.', variant: 'destructive' });
      return;
    }
    for (const m of methods) {
      if (!m.mop_code) {
        toast({ title: 'Incomplete Method', description: 'All payment method rows must have a method selected.', variant: 'destructive' });
        return;
      }
      if (m.base_amount <= 0) {
        toast({ title: 'Invalid Amount', description: 'All payment method rows must have a positive amount.', variant: 'destructive' });
        return;
      }
    }

    const uCode = userCode || 'SYS';
    setFlowState('saving');

    try {
      const componentsJson = selectedComponents.map((c, i) => ({
        payment_code: c.payment_code, fund_code: c.fund_code,
        amount: c.amount, period, sort_order: i,
      }));
      const methodsJson = methods.map((m, i) => ({
        mop_code: m.mop_code, currency_code: m.currency_code,
        original_amount: m.original_amount, exchange_rate: m.exchange_rate,
        base_amount: m.base_amount,
        bank_code: m.bank_code || null, mop_number: m.mop_number || null,
        cheque_date: m.cheque_date || null, mop_account_number: m.mop_account_number || null,
        mop_notes1: m.mop_notes1 || null, credit_card_code: m.credit_card_code || null,
        expiration_date: m.expiration_date || null, sort_order: i,
      }));

      const dateRcvd = dateReceived ? formatDateForStorage(dateReceived) : formatDateForStorage(new Date());

      const { data: result, error: rpcErr } = await supabase.rpc('create_c3_payment_with_receipt' as any, {
        p_batch_number: batchSel.selectedBatch.batch_number,
        p_payer_type: payerType, p_payer_id: payerId.trim(),
        p_date_received: dateRcvd, p_remarks: remarks || null,
        p_components: componentsJson, p_methods: methodsJson,
        p_receipt_total: totalPaymentReceived, p_user_code: uCode,
      });

      if (rpcErr) {
        await logApplicationError(rpcErr, { ...logCtx, action: 'create_c3_payment_with_receipt_rpc' });
        throw rpcErr;
      }

      const res = typeof result === 'string' ? JSON.parse(result) : result;
      if (!res || !res.payment_id) {
        const err = new Error('RPC returned null or missing payment_id.');
        await logApplicationError(err, { ...logCtx, request_payload: { result: res } });
        throw err;
      }

      await receiptActions.loadReceipt(res.payment_id as number);
      setSavedPaymentId(res.payment_id as number);
      setFlowState('saved');

      toast({ title: 'C3 Payment Processed', description: `Receipt #${res.receipt_id} created. ${res.detail_count} payment line(s) generated.` });
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      await logApplicationError(err, { ...logCtx, action: 'handleProcessPayment_catch' });
      toast({ title: 'Error Processing C3 Payment', description: err.message || 'An unexpected error occurred.', variant: 'destructive' });
      setFlowState('entry');
    }
  }, [batchSel.selectedBatch, payerInfo, payerType, payerId, dateReceived, remarks,
    selectedComponents, c3Amount, methods, totalPaymentReceived, period, userCode, receiptActions]);

  /* ── reprint / cancel / reset ─────────── */

  const handleReprint = useCallback(async () => {
    if (!savedPaymentId || !receiptActions.currentReceipt) return;
    const uCode = userCode || 'SYS';
    try {
      await supabase.from('cn_receipt').update({
        reprint_times: (receiptActions.currentReceipt.reprint_times || 0) + 1,
        updated_by: uCode, updated_at: new Date().toISOString(),
      } as any).eq('receipt_id', receiptActions.currentReceipt.receipt_id);
      await supabase.from('cn_receipt_prints').insert({
        receipt_id: receiptActions.currentReceipt.receipt_id,
        printed_by: uCode, print_type: 'REPRINT',
      } as any);
      await receiptActions.loadReceipt(savedPaymentId);
      toast({ title: 'Reprinted', description: `Reprint #${(receiptActions.currentReceipt.reprint_times || 0) + 1}` });
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [savedPaymentId, receiptActions, userCode]);

  const handleCancelReceipt = useCallback(async (reason: string) => {
    if (!savedPaymentId || !receiptActions.currentReceipt) return;
    if (receiptActions.currentReceipt.status !== 'O') {
      toast({ title: 'Cannot Cancel', description: 'Only Original receipts can be cancelled.', variant: 'destructive' });
      setShowCancelModal(false);
      return;
    }
    const uCode = userCode || 'SYS';
    try {
      await supabase.from('cn_receipt').update({
        status: 'C', cancel_reason: reason,
        cancel_date: new Date().toISOString(), cancel_user: uCode,
        updated_by: uCode, updated_at: new Date().toISOString(),
      } as any).eq('receipt_id', receiptActions.currentReceipt.receipt_id);
      await receiptActions.loadReceipt(savedPaymentId);
      toast({ title: 'Receipt Cancelled' });
      setShowCancelModal(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [savedPaymentId, receiptActions, userCode]);

  const resetForm = useCallback(() => {
    setPayerType('ER');
    setPayerId('');
    setPayerInfo(null);
    setDateReceived(new Date());
    setRemarks('');
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedComponents([]);
    setMethods([]);
    setFlowState('entry');
    setSavedPaymentId(null);
    receiptActions.setCurrentReceipt(null);
    setTimeout(() => payerIdRef.current?.focus(), 200);
  }, [receiptActions]);

  /* ── pending modal data ───────────────── */

  const pendingMethod = pendingMethodId ? methods.find(m => m.id === pendingMethodId) : null;

  /* ── render ────────────────────────────── */

  if (c3TypesLoading || ptLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mopDetailSummary = (m: MethodRow) => {
    if ((m.mop_code === 'CHQ' || m.mop_code === 'CHK') && m.mop_number)
      return `#${m.mop_number}${m.bank_desc ? ' · ' + m.bank_desc : ''}`;
    if (m.mop_code === 'CRD' && m.credit_card_code)
      return `${m.card_desc || m.credit_card_code}${m.mop_number ? ' · ****' + m.mop_number.slice(-4) : ''}`;
    return '';
  };

  return (
    <BatchSelectionGuard
      isLoading={batchSel.isLoading}
      isReady={batchSel.isReady}
      noBatchesAvailable={batchSel.noBatchesAvailable}
      showPopup={batchSel.showPopup}
      openBatches={batchSel.openBatches}
      canManageAllBatches={batchSel.canManageAllBatches}
      selectedBatch={batchSel.selectedBatch}
      onSelectBatch={batchSel.selectBatch}
      onChangeBatch={batchSel.changeBatch}
    >
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {/* ═══ TOP BAR ═══ */}
        <div className="shrink-0 border-b bg-card px-5 py-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <div>
                  <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">C3 Contributions</h1>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Ctrl+↵</kbd> Process
                    <span className="mx-1.5">·</span>
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Ctrl+M</kbd> Method
                    <span className="mx-1.5">·</span>
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Ctrl+⇧+N</kbd> New
                  </p>
                </div>
              </div>
              {batchSel.selectedBatch && (
                <div className="ml-2">
                  <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button onClick={resetForm} variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                disabled={isEntry && methods.length === 0 && selectedComponents.length === 0 && !payerInfo}>
                <PlusCircle className="h-3.5 w-3.5" /> New
              </Button>
              <Button onClick={handleReprint} variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={!canReprint}>
                <RotateCcw className="h-3.5 w-3.5" /> Reprint
              </Button>
              <Button onClick={() => setShowCancelModal(true)} variant="destructive" size="sm" className="h-8 text-xs gap-1.5" disabled={!canCancel}>
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        </div>

        {/* ═══ HEADER FIELDS — single compact strip ═══ */}
        <div className="shrink-0 px-5 py-3 border-b bg-card/60">
          <div className="flex items-end gap-3">
            <div className="w-[130px] space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Type</Label>
              <Select value={payerType} onValueChange={setPayerType} disabled={!isEntry}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px] space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Payer ID</Label>
              <div className="relative">
                <Input
                  ref={payerIdRef}
                  value={payerId}
                  onChange={e => setPayerId(e.target.value)}
                  onBlur={handlePayerBlur}
                  onKeyDown={e => { if (e.key === 'Enter') handlePayerBlur(); }}
                  placeholder={payerType === 'ER' ? 'Reg. No.' : 'SSN'}
                  className="h-9 pr-8 font-mono"
                  disabled={!isEntry}
                />
                {isValidating && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            <div className="flex-1 min-w-[160px] space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Payer</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40 text-sm">
                {payerInfo ? (
                  <>
                    <span className="truncate font-medium text-foreground">{payerInfo.name}</span>
                    {payerInfo.status === 'A' || payerInfo.status === 'Active'
                      ? <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
                  </>
                ) : <span className="text-muted-foreground text-xs italic">Enter Payer ID and press Enter</span>}
              </div>
            </div>

            <div className="w-[170px] space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">C3 Period</Label>
              <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={!isEntry}
                    className={cn('w-full justify-start text-left font-normal h-9',
                      !selectedMonth && 'text-muted-foreground')}>
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                    <span className="font-medium">{periodLabel}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Month</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.full}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {YEARS.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => setPeriodOpen(false)}>Done</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-[140px] space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Date</Label>
              <DatePicker date={dateReceived} onDateChange={setDateReceived} disabled={!isEntry} />
            </div>

            <div className="w-[180px] space-y-1">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Remarks</Label>
              <Input
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Optional..."
                className="h-9"
                disabled={!isEntry}
                maxLength={250}
              />
            </div>
          </div>
        </div>

        {/* ═══ MAIN CONTENT — Two panels ═══ */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">

          {/* ─── LEFT: Payment Components ─── */}
          <div className="flex flex-col border-r overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Payment Components</span>
                {selectedComponents.length > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">
                    {selectedComponents.length}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {baseCurrCode} {c3Amount.toFixed(2)}
              </span>
            </div>

            {/* Search */}
            {isEntry && availableComponents.length > 0 && (
              <div className="shrink-0 px-3 py-2 border-b bg-background">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    ref={componentSearchRef}
                    value={componentSearch}
                    onChange={e => setComponentSearch(e.target.value)}
                    onFocus={() => setComponentSearchFocused(true)}
                    onBlur={() => setTimeout(() => setComponentSearchFocused(false), 150)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && filteredAvailable.length > 0) {
                        e.preventDefault();
                        handleSelectComponent(filteredAvailable[0].payment_code);
                      }
                      if (e.key === 'Escape') {
                        setComponentSearch('');
                        setComponentSearchFocused(false);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Search components… press Enter to add"
                    className="h-8 pl-8 text-xs bg-muted/30 border-muted focus:bg-background"
                  />
                  {componentSearchFocused && componentSearch.trim() && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 border rounded-lg bg-popover shadow-lg max-h-44 overflow-y-auto">
                      {filteredAvailable.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">No matching components</p>
                      ) : (
                        filteredAvailable.map((pt: any, i: number) => (
                          <button
                            key={pt.payment_code}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 text-xs hover:bg-accent/10 flex justify-between items-center transition-colors',
                              i === 0 && 'bg-primary/5'
                            )}
                            onMouseDown={e => {
                              e.preventDefault();
                              handleSelectComponent(pt.payment_code);
                            }}
                          >
                            <span className="font-medium text-foreground">{pt.payment_type_description || pt.payment_code}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">{pt.payment_code}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Component list */}
            <div className="flex-1 overflow-y-auto">
              {selectedComponents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-6">
                  <Search className="h-8 w-8 mb-3 opacity-30" />
                  <p className="text-sm font-medium">
                    {c3PaymentTypeDetails.length === 0 ? 'No C3 payment types configured' : 'No components added'}
                  </p>
                  <p className="text-xs mt-1 text-center">
                    {c3PaymentTypeDetails.length > 0 && 'Use the search box above to find and add components'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {selectedComponents.map((comp, idx) => (
                    <div key={comp.payment_code}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{comp.description}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{comp.payment_code} · {comp.fund_code}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground font-medium">{baseCurrCode}</span>
                        <Input
                          ref={el => { amountRefs.current[comp.payment_code] = el; }}
                          type="number" step="0.01" min="0"
                          value={comp.amount || ''}
                          onChange={e => updateComponentAmount(comp.payment_code, parseFloat(e.target.value) || 0)}
                          onKeyDown={e => handleComponentAmountKeyDown(e, idx)}
                          placeholder="0.00"
                          className="w-28 text-right tabular-nums font-mono text-sm h-8"
                          disabled={!isEntry}
                        />
                        {isEntry && (
                          <button type="button" onClick={() => removeComponent(comp.payment_code)}
                            className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all">
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Payment Methods ─── */}
          <div className="flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                  <Plus className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Payment Methods</span>
                {methods.length > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">
                    {methods.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {baseCurrCode} {totalPaymentReceived.toFixed(2)}
                </span>
                {isEntry && (
                  <Button onClick={() => addMethodRow()} variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                )}
              </div>
            </div>

            {/* Method list */}
            <div className="flex-1 overflow-y-auto">
              {methods.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-6">
                  <PlusCircle className="h-8 w-8 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No payment methods</p>
                  <p className="text-xs mt-1">Click "Add" or press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+M</kbd></p>
                </div>
              ) : (
                <div className="divide-y">
                  {methods.map((m, idx) => {
                    const isMainCurr = m.currency_code === baseCurrCode;
                    const detail = mopDetailSummary(m);
                    const needsDetail = (m.mop_code === 'CHQ' || m.mop_code === 'CHK' || m.mop_code === 'CRD') && !detail;
                    return (
                      <div key={m.id}
                        className={cn(
                          'px-4 py-2.5 hover:bg-muted/30 transition-colors group',
                          needsDetail && 'bg-warning/5'
                        )}>
                        <div className="flex items-center gap-2">
                          {/* MOP Select */}
                          <Select value={m.mop_code} onValueChange={v => handleMopCodeChange(m.id, v)} disabled={!isEntry}>
                            <SelectTrigger className="h-8 text-xs w-[140px] shrink-0"><SelectValue placeholder="Select method…" /></SelectTrigger>
                            <SelectContent>
                              {mopTypes.map((mt: any) => (
                                <SelectItem key={mt.mop_code} value={mt.mop_code}>{mt.short_description || mt.mop_code}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Currency (only when multiple) */}
                          {enabledCurrencies.length > 1 && (
                            <Select value={m.currency_code} onValueChange={v => updateMethodField(m.id, 'currency_code', v)} disabled={!isEntry}>
                              <SelectTrigger className="h-8 text-xs w-[80px] shrink-0"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {enabledCurrencies.map((c: any) => (
                                  <SelectItem key={c.currency_code} value={c.currency_code}>{c.currency_code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Amount */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-xs text-muted-foreground font-medium shrink-0">{m.currency_code}</span>
                            <Input
                              ref={el => { methodAmountRefs.current[m.id] = el; }}
                              type="number" step="0.01" min="0"
                              value={m.original_amount || ''}
                              onChange={e => updateMethodField(m.id, 'original_amount', parseFloat(e.target.value) || 0)}
                              onKeyDown={e => handleMethodAmountKeyDown(e, idx)}
                              placeholder="0.00"
                              className="w-28 text-right tabular-nums font-mono text-sm h-8"
                              disabled={!isEntry}
                            />
                            {/* Base currency conversion inline */}
                            {!isMainCurr && m.original_amount > 0 && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums font-mono shrink-0">
                                = {baseCurrCode} {m.base_amount.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-0.5 shrink-0">
                            {(m.mop_code === 'CHQ' || m.mop_code === 'CHK' || m.mop_code === 'CRD') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" onClick={() => handleEditMopDetail(m.id)} disabled={!isEntry}
                                      className={cn('p-1.5 rounded-md transition-colors',
                                        needsDetail
                                          ? 'bg-warning/20 text-warning animate-pulse'
                                          : 'opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground')}>
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{needsDetail ? 'Add details (required)' : 'Edit details'}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <button type="button" onClick={() => removeMethodRow(m.id)} disabled={!isEntry}
                              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>

                        {/* Detail line — cheque/card info + rate */}
                        {(detail || (!isMainCurr && m.exchange_rate !== 1)) && (
                          <div className="flex gap-3 text-[10px] text-muted-foreground mt-1.5 pl-0.5">
                            {!isMainCurr && m.exchange_rate !== 1 && (
                              <span className="font-mono">Rate: {m.exchange_rate}</span>
                            )}
                            {detail && (
                              <span className="font-medium">{detail}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="shrink-0 border-t bg-card shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-1">
              {/* C3 Amount */}
              <div className="px-4 py-1.5 rounded-lg bg-muted/60 text-center min-w-[120px]">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">C3 Amount</p>
                <p className="text-lg font-bold tabular-nums text-foreground leading-tight">{baseCurrCode} {c3Amount.toFixed(2)}</p>
              </div>

              <div className="text-muted-foreground/40 text-lg font-light px-1">−</div>

              {/* Received */}
              <div className="px-4 py-1.5 rounded-lg bg-muted/60 text-center min-w-[120px]">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Received</p>
                <p className="text-lg font-bold tabular-nums text-foreground leading-tight">{baseCurrCode} {totalPaymentReceived.toFixed(2)}</p>
              </div>

              <div className="text-muted-foreground/40 text-lg font-light px-1">=</div>

              {/* Difference */}
              <div className={cn(
                'px-4 py-1.5 rounded-lg text-center min-w-[120px]',
                Math.abs(difference) < 0.01
                  ? 'bg-primary/8'
                  : 'bg-destructive/8'
              )}>
                <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground">Difference</p>
                <p className={cn('text-lg font-bold tabular-nums leading-tight',
                  Math.abs(difference) < 0.01 ? 'text-primary' : 'text-destructive')}>
                  {baseCurrCode} {difference.toFixed(2)}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!isEntry || isSaving || selectedComponents.length === 0 || methods.length === 0 || !payerInfo}
              size="lg"
              className="h-11 px-8 text-sm font-semibold shadow-md hover:shadow-lg transition-shadow gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Process C3 Payment
            </Button>
          </div>
        </div>

        {/* ═══ DIALOGS ═══ */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Process C3 Payment?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 py-2">
                    <span className="text-muted-foreground">Payer</span>
                    <span className="font-medium text-foreground">{payerInfo?.name || payerId}</span>
                    <span className="text-muted-foreground">Period</span>
                    <span className="font-medium text-foreground">{periodLabel}</span>
                    <span className="text-muted-foreground">Components</span>
                    <span className="font-medium text-foreground">{selectedComponents.length} · {baseCurrCode} {c3Amount.toFixed(2)}</span>
                    <span className="text-muted-foreground">Methods</span>
                    <span className="font-medium text-foreground">{methods.length} · {baseCurrCode} {totalPaymentReceived.toFixed(2)}</span>
                  </div>
                  {Math.abs(difference) >= 0.01 && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Difference of {baseCurrCode} {difference.toFixed(2)} between C3 amount and received.
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleProcessPayment}>Confirm & Process</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ChequeDetailModal
          open={showChequeModal}
          onClose={() => { setShowChequeModal(false); setPendingMethodId(null); }}
          onSave={handleChequeDetailsSave}
          initialData={pendingMethod ? {
            mop_number: pendingMethod.mop_number, bank_code: pendingMethod.bank_code,
            cheque_date: pendingMethod.cheque_date, mop_account_number: pendingMethod.mop_account_number,
            mop_notes1: pendingMethod.mop_notes1,
          } : undefined}
        />
        <CardDetailModal
          open={showCardModal}
          onClose={() => { setShowCardModal(false); setPendingMethodId(null); }}
          onSave={handleCardDetailsSave}
          initialData={pendingMethod ? {
            credit_card_code: pendingMethod.credit_card_code, mop_number: pendingMethod.mop_number,
            expiration_date: pendingMethod.expiration_date, mop_notes1: pendingMethod.mop_notes1,
          } : undefined}
        />
        <ReceiptCancelModal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelReceipt}
          isLoading={receiptActions.isLoading}
          receiptId={receiptActions.currentReceipt?.receipt_id}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default C3Payments;
