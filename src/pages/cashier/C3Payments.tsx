import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Receipt, Loader2, PlusCircle, RotateCcw, XCircle, Edit2, ChevronsUpDown, X, Eye } from 'lucide-react';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { usePaymentEntry, PayerInfo } from '@/hooks/usePaymentEntry';
import { useReceiptActions } from '@/hooks/useReceiptActions';
import { useUserCode } from '@/hooks/useUserCode';
import { useC3PaymentTypes, useMopDetailConfig } from '@/hooks/usePaymentModuleConfig';
import { useEnabledCashierCurrencies } from '@/hooks/useCashierCurrencyConfig';
import { PaymentMethodModal, type MethodRow } from '@/components/payments/PaymentMethodModal';
import { ReceiptCancelModal } from '@/components/payments/ReceiptCancelModal';
import { AllocationPreviewModal } from '@/components/payments/AllocationPreviewModal';
import { PaymentHeaderForm } from '@/components/payments/PaymentHeaderForm';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDateForStorage } from '@/lib/dateFormat';
import { logApplicationError } from '@/lib/globalErrorHandler';
import { printConfiguredReceipt } from '@/lib/receiptPrinter';

/* ─── types ──────────────────────────────────────────── */

interface PaymentComponent {
  payment_code: string;
  fund_code: string;
  description: string;
  amount: number;
}

type FlowState = 'entry' | 'saving' | 'saved';

/* ─── component ──────────────────────────────────────── */

const C3Payments: React.FC = () => {
  const batchSel = useBatchSelection();
  const payment = usePaymentEntry();
  const receiptActions = useReceiptActions();
  const { userCode } = useUserCode();
  const [searchParams] = useSearchParams();

  // Header state
  const [payerType, setPayerType] = useState(() => searchParams.get('payerType') || 'ER');
  const [payerId, setPayerId] = useState(() => searchParams.get('regNo') || '');
  const [payerInfo, setPayerInfo] = useState<PayerInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(new Date());
  const [remarks, setRemarks] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => searchParams.get('month') || (new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(() => searchParams.get('year') || new Date().getFullYear().toString());
  const [sequenceNo, setSequenceNo] = useState(() => searchParams.get('schedule') || '');
  const [initialParamsApplied, setInitialParamsApplied] = useState(false);
  const [c3ComponentsLoaded, setC3ComponentsLoaded] = useState(false);

  // Components
  const [selectedComponents, setSelectedComponents] = useState<PaymentComponent[]>([]);
  const [componentPopoverOpen, setComponentPopoverOpen] = useState(false);

  // Methods
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<MethodRow | null>(null);
  const addMethodBtnRef = useRef<HTMLButtonElement>(null);

  // Flow
  const [flowState, setFlowState] = useState<FlowState>('entry');
  const [savedPaymentId, setSavedPaymentId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAllocationPreview, setShowAllocationPreview] = useState(false);

  // Refs for auto-focus
  const amountRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Filtered payment types = only those configured as C3
  const c3PaymentTypeDetails = useMemo(() => {
    if (!c3PaymentTypes.length || !paymentTypesAll.length) return [];
    return paymentTypesAll.filter((pt: any) => c3PaymentTypes.includes(pt.payment_code));
  }, [c3PaymentTypes, paymentTypesAll]);

  // Available for selection = configured minus already selected
  const availableComponents = useMemo(() => {
    const selectedCodes = new Set(selectedComponents.map(c => c.payment_code));
    return c3PaymentTypeDetails.filter((pt: any) => !selectedCodes.has(pt.payment_code));
  }, [c3PaymentTypeDetails, selectedComponents]);

  // Main currency
  const mainCurrency = useMemo(() =>
    enabledCurrencies.find((c: any) => c.is_main_currency) || enabledCurrencies[0],
    [enabledCurrencies]
  );

  /* ── computed ─────────────────────────── */

  const c3Amount = useMemo(() => selectedComponents.reduce((s, c) => s + c.amount, 0), [selectedComponents]);
  const totalPaymentReceived = useMemo(() => methods.reduce((s, m) => s + m.base_amount, 0), [methods]);
  const difference = c3Amount - totalPaymentReceived;

  const period = `${selectedMonth.padStart(2, '0')}/${selectedYear}`;

  const isEntry = flowState === 'entry';
  const isSaving = flowState === 'saving';
  const isSaved = flowState === 'saved';
  const canCancel = isSaved && receiptActions.currentReceipt?.status === 'O';
  const canReprint = isSaved && !!receiptActions.currentReceipt;

  const MONTHS_LABELS: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {};
    for (let i = 0; i < 12; i++) {
      m[(i + 1).toString()] = new Date(2024, i).toLocaleString('default', { month: 'long' });
    }
    return m;
  }, []);

  /* ── handlers ─────────────────────────── */

  const handlePayerBlur = useCallback(async () => {
    if (!payerId.trim() || isValidating) return;
    setIsValidating(true);
    const info = await payment.lookupPayer(payerType, payerId.trim());
    setPayerInfo(info);
    if (!info) toast({ title: 'Not Found', description: 'Payer not found. Please check the ID.', variant: 'destructive' });
    setIsValidating(false);
  }, [payerType, payerId, payment, isValidating]);

  // Auto-validate payer when navigated from C3 detail screens with query params
  useEffect(() => {
    if (initialParamsApplied) return;
    const regNo = searchParams.get('regNo');
    if (regNo && regNo.trim() && !payerInfo) {
      setInitialParamsApplied(true);
      (async () => {
        setIsValidating(true);
        const info = await payment.lookupPayer(payerType, regNo.trim());
        setPayerInfo(info);
        if (!info) toast({ title: 'Not Found', description: 'Payer not found. Please check the ID.', variant: 'destructive' });
        setIsValidating(false);
      })();
    }
  }, [searchParams, initialParamsApplied, payerType, payment, payerInfo]);

  // Auto-load C3 payment components from cn_c3_reported when navigated from C3 detail screens
  useEffect(() => {
    if (c3ComponentsLoaded) return;
    const regNo = searchParams.get('regNo');
    const schedule = searchParams.get('schedule');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const pType = searchParams.get('payerType');
    if (!regNo || !schedule || !month || !year || !pType) return;
    if (!paymentTypesAll.length || ptLoading) return;

    setC3ComponentsLoaded(true);
    const periodDate = `${year}-${month.padStart(2, '0')}-01`;

    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_c3_payment_components' as any, {
          p_payer_id: regNo,
          p_payer_type: pType,
          p_period: periodDate,
          p_sequence_no: parseInt(schedule, 10),
        });

        if (error) {
          console.error('Error fetching C3 components:', error);
          toast({ title: 'Error', description: 'Failed to load C3 payment components.', variant: 'destructive' });
          return;
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;
        if (!result || result.status !== 'found') {
          toast({ title: 'No C3 Record', description: 'No matching C3 contribution record found for the given period and sequence.', variant: 'destructive' });
          return;
        }

        const components: PaymentComponent[] = [];
        for (const comp of result.components || []) {
          const pt = paymentTypesAll.find((p: any) => p.payment_code === comp.payment_code);
          if (pt && comp.amount > 0) {
            components.push({
              payment_code: comp.payment_code,
              fund_code: pt.fund_code || '',
              description: pt.payment_type_description || comp.payment_code,
              amount: Number(comp.amount),
            });
          }
        }

        if (components.length > 0) {
          setSelectedComponents(components);
          toast({ title: 'Components Loaded', description: `${components.length} payment component(s) auto-populated from C3 record.` });
        }
      } catch (err: any) {
        console.error('Error auto-loading C3 components:', err);
      }
    })();
  }, [searchParams, c3ComponentsLoaded, paymentTypesAll, ptLoading]);

  const handleSelectComponent = useCallback((code: string) => {
    const pt = c3PaymentTypeDetails.find((p: any) => p.payment_code === code);
    if (!pt) return;
    const newComp: PaymentComponent = {
      payment_code: pt.payment_code,
      fund_code: pt.fund_code || '',
      description: pt.payment_type_description || pt.payment_code,
      amount: 0,
    };
    setSelectedComponents(prev => [...prev, newComp]);
    setComponentPopoverOpen(false);
    // Auto-focus the amount input after render
    setTimeout(() => {
      amountRefs.current[code]?.focus();
    }, 50);
  }, [c3PaymentTypeDetails]);

  const removeComponent = useCallback((code: string) => {
    setSelectedComponents(prev => prev.filter(c => c.payment_code !== code));
  }, []);

  const updateComponentAmount = useCallback((code: string, amount: number) => {
    setSelectedComponents(prev => prev.map(c =>
      c.payment_code === code ? { ...c, amount } : c
    ));
  }, []);

  const addMethodRow = useCallback(() => {
    setEditingMethod(null);
    setShowMethodModal(true);
  }, []);

  const removeMethodRow = useCallback((id: string) => {
    setMethods(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleEditMethod = useCallback((id: string) => {
    const m = methods.find(r => r.id === id);
    if (!m) return;
    setEditingMethod(m);
    setShowMethodModal(true);
  }, [methods]);

  const handleMethodModalSave = useCallback((row: MethodRow) => {
    setMethods(prev => {
      const exists = prev.find(m => m.id === row.id);
      if (exists) return prev.map(m => m.id === row.id ? row : m);
      return [...prev, row];
    });
    setShowMethodModal(false);
    setEditingMethod(null);
    setTimeout(() => addMethodBtnRef.current?.focus(), 50);
  }, []);

  const handleMethodModalClose = useCallback((open: boolean) => {
    if (!open) {
      setShowMethodModal(false);
      setEditingMethod(null);
      setTimeout(() => addMethodBtnRef.current?.focus(), 50);
    }
  }, []);

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
      const seqNoVal = sequenceNo ? parseInt(sequenceNo, 10) : null;
      const componentsJson = selectedComponents.map((c, i) => ({
        payment_code: c.payment_code,
        fund_code: c.fund_code,
        amount: c.amount,
        period,
        sort_order: i,
        sequence_no: seqNoVal,
      }));

      const methodsJson = methods.map((m, i) => ({
        mop_code: m.mop_code,
        currency_code: m.currency_code,
        original_amount: m.original_amount,
        exchange_rate: m.exchange_rate,
        base_amount: m.base_amount,
        bank_code: m.bank_code || null,
        mop_number: m.mop_number || null,
        cheque_date: m.cheque_date || null,
        mop_account_number: m.mop_account_number || null,
        mop_notes1: m.mop_notes1 || null,
        credit_card_code: m.credit_card_code || null,
        expiration_date: m.expiration_date || null,
        sort_order: i,
      }));

      const dateRcvd = dateReceived ? formatDateForStorage(dateReceived) : formatDateForStorage(new Date());

      const { data: result, error: rpcErr } = await supabase.rpc('create_c3_payment_with_receipt' as any, {
        p_batch_number: batchSel.selectedBatch.batch_number,
        p_payer_type: payerType,
        p_payer_id: payerId.trim(),
        p_date_received: dateRcvd,
        p_remarks: remarks || null,
        p_components: componentsJson,
        p_methods: methodsJson,
        p_receipt_total: totalPaymentReceived,
        p_user_code: uCode,
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
      setTimeout(() => printConfiguredReceipt(res.payment_id as number).catch(e => console.error('Receipt print error:', e)), 300);
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
      setTimeout(() => printConfiguredReceipt(savedPaymentId).catch(e => console.error('Receipt print error:', e)), 300);
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
    setSequenceNo('');
    setSelectedComponents([]);
    setMethods([]);
    setFlowState('entry');
    setSavedPaymentId(null);
    receiptActions.setCurrentReceipt(null);
    setInitialParamsApplied(true); // prevent re-applying URL params after reset
    setC3ComponentsLoaded(true); // prevent re-loading components after reset
  }, [receiptActions]);

  /* ── render ────────────────────────────── */

  /* ── render ────────────────────────────── */

  if (c3TypesLoading || ptLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const baseCurrCode = mainCurrency?.currency_code || 'XCD';

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
      <div className="space-y-4 p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">C3 Contributions Payment</h1>
          <p className="text-sm text-muted-foreground">Process C3 contribution payments against a specific period.</p>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border">
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!isEntry || isSaving || selectedComponents.length === 0 || methods.length === 0 || !payerInfo}
            size="sm"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Receipt className="h-4 w-4 mr-1" />}
            Process C3 Payment
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button onClick={handleReprint} variant="outline" size="sm" disabled={!canReprint}>
            <RotateCcw className="h-4 w-4 mr-1" /> Re-Print
          </Button>
          <Button onClick={() => setShowCancelModal(true)} variant="destructive" size="sm" disabled={!canCancel}>
            <XCircle className="h-4 w-4 mr-1" /> Cancel Receipt
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button
            variant="outline" size="sm"
            disabled={selectedComponents.length === 0 || methods.length === 0}
            onClick={() => setShowAllocationPreview(true)}
          >
            <Eye className="h-4 w-4 mr-1" /> Preview Allocation
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button onClick={resetForm} variant="outline" size="sm" disabled={isEntry && methods.length === 0 && selectedComponents.length === 0 && !payerInfo}>
            <PlusCircle className="h-4 w-4 mr-1" /> New Payment
          </Button>
        </div>

        {/* Payment Header (now includes C3 Period and Sequence Number) */}
        <PaymentHeaderForm
          payerType={payerType} setPayerType={setPayerType}
          payerId={payerId} setPayerId={setPayerId}
          payerInfo={payerInfo}
          dateReceived={dateReceived} setDateReceived={setDateReceived}
          remarks={remarks} setRemarks={setRemarks}
          onPayerBlur={handlePayerBlur}
          isValidating={isValidating}
          disabled={!isEntry}
          showPeriod
          periodMonth={selectedMonth} setPeriodMonth={setSelectedMonth}
          periodYear={selectedYear} setPeriodYear={setSelectedYear}
          sequenceNo={sequenceNo}
          setSequenceNo={setSequenceNo}
        />

        {/* Payment Components */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base">Payment Components</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {/* Component search/select via Command popover */}
            {isEntry && (
              <Popover open={componentPopoverOpen} onOpenChange={setComponentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={componentPopoverOpen}
                    className="w-full max-w-md justify-between text-sm font-normal"
                    disabled={availableComponents.length === 0}
                  >
                    <span className="text-muted-foreground">Search & add component...</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Type component name..." />
                    <CommandList>
                      <CommandEmpty>No components found.</CommandEmpty>
                      <CommandGroup>
                        {availableComponents.map((pt: any) => (
                          <CommandItem
                            key={pt.payment_code}
                            value={`${pt.payment_type_description || ''} ${pt.payment_code}`}
                            onSelect={() => handleSelectComponent(pt.payment_code)}
                          >
                            <span className="font-medium">{pt.payment_type_description || pt.payment_code}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{pt.payment_code}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {c3PaymentTypeDetails.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No C3 payment types configured. Please configure them in Payment Module Configuration → C3 Payment Types tab.
              </p>
            ) : selectedComponents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Use the search above to add payment components.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedComponents.map(comp => (
                  <div key={comp.payment_code} className="flex items-center gap-3 p-2.5 border rounded-md bg-accent/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{comp.description}</p>
                      <p className="text-xs text-muted-foreground">{comp.payment_code} / {comp.fund_code}</p>
                    </div>
                    <div className="w-32">
                      <Input
                        ref={el => { amountRefs.current[comp.payment_code] = el; }}
                        type="number"
                        step="0.01"
                        min="0"
                        value={comp.amount || ''}
                        onChange={e => updateComponentAmount(comp.payment_code, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-right text-sm h-8"
                        disabled={!isEntry}
                      />
                    </div>
                    {isEntry && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => removeComponent(comp.payment_code)}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">C3 Amount</span>
              <span className="text-base font-bold">{baseCurrCode} {c3Amount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <Button ref={addMethodBtnRef} onClick={addMethodRow} variant="outline" size="sm" disabled={!isEntry}>
              <Plus className="h-4 w-4 mr-1" /> Add Method
            </Button>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {methods.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Click "Add Method" to add a payment method.
              </p>
            )}

            {methods.map((m, idx) => {
              const isMainCurr = m.currency_code === baseCurrCode;
              return (
                <div key={m.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.mop_desc || 'Unset'}</span>
                      <span className="text-xs text-muted-foreground">({m.currency_code})</span>
                    </div>
                    <p className="text-base font-bold tabular-nums">
                      {m.currency_code} {m.original_amount.toFixed(2)}
                      {!isMainCurr && m.original_amount > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          = {baseCurrCode} {m.base_amount.toFixed(2)} @ {m.exchange_rate}
                        </span>
                      )}
                    </p>
                    {/* Cheque/Card details as info text */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {(m.mop_code === 'CHQ' || m.mop_code === 'CHK') && m.mop_number && (
                        <span>Cheque #{m.mop_number} {m.bank_desc ? `• ${m.bank_desc}` : ''} {m.cheque_date ? `• ${new Date(m.cheque_date).toLocaleDateString()}` : ''}</span>
                      )}
                      {m.mop_code === 'CRD' && m.credit_card_code && (
                        <span>{m.card_desc || m.credit_card_code} {m.mop_number ? `• ****${m.mop_number.slice(-4)}` : ''} {m.expiration_date ? `• Exp: ${m.expiration_date}` : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button onClick={() => handleEditMethod(m.id)} variant="ghost" size="sm" disabled={!isEntry}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => removeMethodRow(m.id)} variant="ghost" size="sm" disabled={!isEntry}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Footer Totals (sticky) */}
        <div className="sticky bottom-0 z-10 bg-background border-t pt-3 pb-2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total Payment Received</p>
              <p className="text-lg font-bold">{baseCurrCode} {totalPaymentReceived.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">C3 Amount</p>
              <p className="text-lg font-bold">{baseCurrCode} {c3Amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Difference</p>
              <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                {baseCurrCode} {difference.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Process C3 Payment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create the payment transaction and generate a receipt for {payerInfo?.name || payerId}.<br />
                Period: {MONTHS_LABELS[selectedMonth]} {selectedYear}<br />
                C3 Amount: {c3Amount.toFixed(2)} | Methods Total: {totalPaymentReceived.toFixed(2)}<br />
                {Math.abs(difference) >= 0.01 && (
                  <span className="text-destructive font-medium">
                    Warning: Difference of {difference.toFixed(2)} exists between C3 amount and payment received.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleProcessPayment}>Confirm & Process</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modals */}
        <PaymentMethodModal
          open={showMethodModal}
          onOpenChange={handleMethodModalClose}
          onSave={handleMethodModalSave}
          editRow={editingMethod}
          mopTypes={mopTypes}
          enabledCurrencies={enabledCurrencies}
          baseCurrCode={baseCurrCode}
        />
        <ReceiptCancelModal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelReceipt}
          isLoading={receiptActions.isLoading}
          receiptId={receiptActions.currentReceipt?.receipt_id}
        />
        <AllocationPreviewModal
          open={showAllocationPreview}
          onOpenChange={setShowAllocationPreview}
          mode="c3"
          components={selectedComponents.map((c, i) => ({
            payment_code: c.payment_code,
            fund_code: c.fund_code,
            amount: c.amount,
            sort_order: i,
          }))}
          methods={methods.map(m => ({ mop_code: m.mop_code, currency_code: m.currency_code, original_amount: m.original_amount }))}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default C3Payments;
