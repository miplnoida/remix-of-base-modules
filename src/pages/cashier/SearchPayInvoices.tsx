import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, Printer, XCircle, Loader2, FileText, ShoppingCart, Trash2, CreditCard, CheckCircle, Inbox, Plus, Edit2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { InvoiceCancelModal } from '@/components/payments/InvoiceCancelModal';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrencyWithCode } from '@/utils/currencyConverter';
import { formatDisplayDate } from '@/lib/dateFormat';
import { useEnabledCashierCurrencies } from '@/hooks/useCashierCurrencyConfig';
import { PaymentMethodModal, type MethodRow } from '@/components/payments/PaymentMethodModal';
import { printConfiguredReceipt } from '@/lib/receiptPrinter';

function useInvoiceStatuses() {
  return useQuery({
    queryKey: ['tb_invoice_status_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_invoice_status')
        .select('code, description')
        .eq('is_active', true)
        .order('description');
      if (error) throw error;
      return data as { code: string; description: string }[];
    },
  });
}

const NON_PAYABLE_STATUSES = ['C', 'P', 'V'];

interface InvoiceRow {
  id: number;
  invoice_number: string;
  invoice_type: string;
  payment_source: string;
  payer_type: string;
  payer_id: string;
  payer_name: string | null;
  currency_code: string;
  base_currency: string;
  total_amount: number;
  total_amount_base: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string;
  status: string;
  reprint_times: number;
  created_at: string;
}

/* ─── component ──────────────────────────────────── */

const SearchPayInvoices: React.FC = () => {
  const batchSel = useBatchSelection();
  const invoiceActions = useInvoiceActions();
  const { userCode } = useUserCode();
  const queryClient = useQueryClient();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<string>('invoice');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string>('');

  // Shortlisted invoices
  const [shortlist, setShortlist] = useState<InvoiceRow[]>([]);

  // C3-style inline MOP rows
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [pendingMethodId, setPendingMethodId] = useState<string | null>(null);
  const methodAmountRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invoiceStatuses } = useInvoiceStatuses();
  const { data: enabledCurrencies = [] } = useEnabledCashierCurrencies();

  const { data: mopTypes = [] } = useQuery({
    queryKey: ['tb_method_of_payment'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_method_of_payment').select('mop_code, short_description, long_description');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const mainCurrency = useMemo(() =>
    enabledCurrencies.find((c: any) => c.is_main_currency) || enabledCurrencies[0],
    [enabledCurrencies]
  );
  const baseCurrCode = mainCurrency?.currency_code || 'XCD';

  const { data: invoices, isLoading: loadingInvoices, refetch } = useQuery({
    queryKey: ['cn_invoices_search', searchTerm, searchType, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('cn_invoices')
        .select('id, invoice_number, invoice_type, payment_source, payer_type, payer_id, payer_name, currency_code, base_currency, total_amount, total_amount_base, paid_amount, outstanding_amount, due_date, status, reprint_times, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      if (searchTerm.trim()) {
        if (searchType === 'invoice') query = query.ilike('invoice_number', `%${searchTerm.trim()}%`);
        else if (searchType === 'payer') query = query.ilike('payer_name', `%${searchTerm.trim()}%`);
        else if (searchType === 'payer_id') query = query.ilike('payer_id', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InvoiceRow[];
    },
  });

  const statusMap = useMemo(() => {
    const m = new Map<string, string>();
    (invoiceStatuses || []).forEach(s => m.set(s.code, s.description));
    return m;
  }, [invoiceStatuses]);

  const getStatusBadge = (status: string) => {
    const label = statusMap.get(status) || status;
    const variant = status === 'C' ? 'destructive' : status === 'P' ? 'secondary' : status === 'O' ? 'default' : 'outline';
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  // Shortlist helpers
  const shortlistIds = useMemo(() => new Set(shortlist.map(s => s.id)), [shortlist]);
  const isPayable = (inv: InvoiceRow) => !NON_PAYABLE_STATUSES.includes(inv.status) && inv.outstanding_amount > 0;

  const toggleShortlist = useCallback((inv: InvoiceRow) => {
    setShortlist(prev => prev.find(s => s.id === inv.id) ? prev.filter(s => s.id !== inv.id) : [...prev, inv]);
  }, []);

  const removeFromShortlist = useCallback((id: number) => {
    setShortlist(prev => prev.filter(s => s.id !== id));
  }, []);

  const shortlistTotal = useMemo(() => shortlist.reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0), [shortlist]);
  const mopTotal = useMemo(() => methods.reduce((s, m) => s + m.base_amount, 0), [methods]);
  const difference = mopTotal - shortlistTotal;

  /* ── Method row handlers (C3 pattern) ── */

  const addMethodRow = useCallback(() => {
    const defaultCurrency = mainCurrency?.currency_code || 'XCD';
    setMethods(prev => [...prev, {
      id: crypto.randomUUID(),
      mop_code: '', mop_desc: '',
      currency_code: defaultCurrency,
      original_amount: 0, exchange_rate: 1, base_amount: 0,
      bank_code: '', mop_number: '', cheque_date: null,
      mop_account_number: '', mop_notes1: '',
      credit_card_code: '', expiration_date: '', card_desc: '', bank_desc: '',
    }]);
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
    setTimeout(() => { methodAmountRefs.current[id]?.focus(); }, 100);
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

  const pendingMethod = pendingMethodId ? methods.find(m => m.id === pendingMethodId) : null;

  const handleChequeDetailsSave = useCallback((details: ChequeDetails) => {
    if (pendingMethodId) {
      setMethods(prev => prev.map(m => m.id === pendingMethodId ? {
        ...m,
        mop_number: details.mop_number, bank_code: details.bank_code,
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
        ...m,
        credit_card_code: details.credit_card_code, mop_number: details.mop_number,
        expiration_date: details.expiration_date, mop_notes1: details.mop_notes1,
        card_desc: details.card_desc || '',
      } : m));
      focusMethodAmount(pendingMethodId);
    }
    setPendingMethodId(null);
    setShowCardModal(false);
  }, [pendingMethodId, focusMethodAmount]);

  // Reprint / Cancel
  const handleReprint = async (invoiceId: number) => {
    await invoiceActions.reprintInvoice(invoiceId, userCode || 'SYSTEM');
    refetch();
  };

  const handleCancelClick = (invoiceId: number, invoiceNumber: string) => {
    setSelectedInvoiceId(invoiceId);
    setSelectedInvoiceNumber(invoiceNumber);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedInvoiceId) return;
    const result = await invoiceActions.cancelInvoice(selectedInvoiceId, reason, userCode || 'SYSTEM');
    if (result) {
      setShowCancelModal(false);
      setSelectedInvoiceId(null);
      removeFromShortlist(selectedInvoiceId);
      refetch();
    }
  };

  // Submit payment
  const canSubmit = shortlist.length > 0 && methods.length > 0 && Math.abs(difference) < 0.01 && !isSubmitting && batchSel.isReady
    && methods.every(m => m.mop_code && m.base_amount > 0);

  const handleSubmitPayment = async () => {
    if (!canSubmit || !batchSel.selectedBatch) return;
    setIsSubmitting(true);
    try {
      const firstInv = shortlist[0];

      const methodsJson = methods.map(m => ({
        mop_code: m.mop_code,
        currency_code: m.currency_code,
        original_amount: m.original_amount,
        bank_code: m.bank_code || null,
        mop_number: m.mop_number || null,
        cheque_date: m.cheque_date || null,
        mop_account_number: m.mop_account_number || null,
        mop_notes1: m.mop_notes1 || null,
        credit_card_code: m.credit_card_code || null,
        expiration_date: m.expiration_date || null,
      }));

      const { data, error } = await supabase.rpc('pay_invoices_with_receipt', {
        p_batch_number: batchSel.selectedBatch.batch_number,
        p_payer_type: firstInv.payer_type || 'AP',
        p_payer_id: firstInv.payer_id || '',
        p_payer_name: firstInv.payer_name || '',
        p_date_received: new Date().toISOString().split('T')[0],
        p_remarks: `Payment for invoices: ${shortlist.map(s => s.invoice_number).join(', ')}`,
        p_methods: methodsJson,
        p_invoice_ids: shortlist.map(s => s.id),
        p_receipt_total: shortlistTotal,
        p_user_code: userCode || 'SYSTEM',
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      toast.success('Payment processed successfully', {
        description: `Payment ID: ${result.payment_id} | Receipt ID: ${result.receipt_id}`,
      });

      setShortlist([]);
      setMethods([]);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['cn_invoices_search'] });

      try {
        await printConfiguredReceipt(result.receipt_id);
      } catch (printErr) {
        console.warn('Receipt print failed:', printErr);
      }
    } catch (err: any) {
      toast.error('Payment failed', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Search & Pay Invoices</h1>
            <p className="text-muted-foreground">Search invoices, shortlist for payment, and process multi-invoice payments</p>
          </div>
          <Badge variant="outline" className="text-sm">
            <FileText className="h-3 w-3 mr-1" />
            {invoices?.length || 0} Results
          </Badge>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {/* Section A: Search Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Invoices
            </CardTitle>
            <CardDescription>Find invoices by number, payer name, or payer ID</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search Type</Label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice Number</SelectItem>
                    <SelectItem value="payer">Payer Name</SelectItem>
                    <SelectItem value="payer_id">Payer ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search Term</Label>
                <Input
                  placeholder={searchType === 'invoice' ? 'Enter invoice number' : searchType === 'payer' ? 'Enter payer name' : 'Enter payer ID'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {(invoiceStatuses || []).map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} variant="outline" className="w-full">Clear</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Results</CardTitle>
            <CardDescription>Select invoices for payment, or reprint/cancel as needed</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading invoices...</span>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">Select</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reprints</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoices || []).map((inv) => {
                      const payable = isPayable(inv);
                      const selected = shortlistIds.has(inv.id);
                      return (
                        <TableRow key={inv.id} className={`${inv.status === 'C' ? 'opacity-60' : ''} ${selected ? 'bg-primary/5' : ''}`}>
                          <TableCell>
                            <Checkbox checked={selected} onCheckedChange={() => toggleShortlist(inv)} disabled={!payable} />
                          </TableCell>
                          <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                          <TableCell>
                            <div>
                              <span className="text-sm">{inv.payer_name || '-'}</span>
                              <span className="block text-xs text-muted-foreground">{inv.payer_id}</span>
                            </div>
                          </TableCell>
                          <TableCell>{inv.invoice_type}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrencyWithCode(inv.total_amount, inv.currency_code)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrencyWithCode(inv.paid_amount || 0, inv.currency_code)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrencyWithCode(inv.outstanding_amount || 0, inv.currency_code)}</TableCell>
                          <TableCell>{inv.due_date ? formatDisplayDate(inv.due_date) : '-'}</TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                          <TableCell className="text-center">{inv.reprint_times || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => handleReprint(inv.id)} disabled={inv.status === 'C' || invoiceActions.isLoading} title="Re-Print Invoice">
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleCancelClick(inv.id, inv.invoice_number)} disabled={inv.status === 'C' || invoiceActions.isLoading} title="Cancel Invoice">
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {!loadingInvoices && (!invoices || invoices.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">No invoices found matching your search criteria</div>
            )}
          </CardContent>
        </Card>

        {/* Section B: Shortlisted Invoices */}
        <Card>
          <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Shortlisted for Payment ({shortlist.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-semibold text-primary">
                Total: {baseCurrCode} {shortlistTotal.toFixed(2)}
              </span>
              {shortlist.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShortlist([])}>Clear All</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            {shortlist.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <Inbox className="h-8 w-8" />
                <p className="text-sm">No invoices shortlisted. Select invoices from the search results above.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="w-[60px]">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortlist.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.payer_name || inv.payer_id}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{baseCurrCode} {(inv.outstanding_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{inv.currency_code}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromShortlist(inv.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section C: Payment Methods (C3-style inline) */}
        {shortlist.length > 0 && (
          <>
            <Card>
              <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Payment Methods</CardTitle>
                <Button onClick={addMethodRow} variant="outline" size="sm" disabled={isSubmitting}>
                  <Plus className="h-4 w-4 mr-1" /> Add Method
                </Button>
              </CardHeader>
              <CardContent className="pb-4 space-y-3">
                {methods.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                    <CreditCard className="h-8 w-8" />
                    <p className="text-sm">Click "Add Method" to add a payment method.</p>
                  </div>
                )}

                {methods.map((m, idx) => {
                  const isMainCurr = m.currency_code === baseCurrCode;
                  return (
                    <div key={m.id} className="border rounded-md p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Method {idx + 1}</span>
                        <div className="flex gap-1">
                          {(m.mop_code === 'CHQ' || m.mop_code === 'CHK' || m.mop_code === 'CRD') && (
                            <Button onClick={() => handleEditMopDetail(m.id)} variant="ghost" size="sm" disabled={isSubmitting}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button onClick={() => removeMethodRow(m.id)} variant="ghost" size="sm" disabled={isSubmitting}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Method</Label>
                          <Select value={m.mop_code} onValueChange={v => handleMopCodeChange(m.id, v)} disabled={isSubmitting}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {mopTypes.map((mt: any) => (
                                <SelectItem key={mt.mop_code} value={mt.mop_code}>{mt.short_description || mt.mop_code}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Currency</Label>
                          <Select value={m.currency_code} onValueChange={v => updateMethodField(m.id, 'currency_code', v)} disabled={isSubmitting}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {enabledCurrencies.map((c: any) => (
                                <SelectItem key={c.currency_code} value={c.currency_code}>{c.currency_code}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Amount ({m.currency_code})</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              ref={el => { methodAmountRefs.current[m.id] = el; }}
                              type="number" step="0.01" min="0"
                              value={m.original_amount || ''}
                              onChange={e => updateMethodField(m.id, 'original_amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="text-right text-sm h-8"
                              disabled={isSubmitting}
                            />
                            {!isMainCurr && m.original_amount > 0 && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                                {baseCurrCode} {m.base_amount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info row: Rate + MOP details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {!isMainCurr && <span>Rate: {m.exchange_rate}</span>}
                        {m.mop_desc && <span>Method: {m.mop_desc}</span>}
                        {(m.mop_code === 'CHQ' || m.mop_code === 'CHK') && m.mop_number && (
                          <span>Cheque #{m.mop_number} {m.bank_desc ? `• ${m.bank_desc}` : ''} {m.cheque_date ? `• ${new Date(m.cheque_date).toLocaleDateString()}` : ''}</span>
                        )}
                        {m.mop_code === 'CRD' && m.credit_card_code && (
                          <span>{m.card_desc || m.credit_card_code} {m.mop_number ? `• ****${m.mop_number.slice(-4)}` : ''} {m.expiration_date ? `• Exp: ${m.expiration_date}` : ''}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Balance Indicator + Submit */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="grid grid-cols-3 gap-8 text-sm">
                      <div>
                        <span className="text-muted-foreground">Invoice Total:</span>
                        <span className="ml-2 font-mono font-semibold">{baseCurrCode} {shortlistTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">MOP Total:</span>
                        <span className="ml-2 font-mono font-semibold">{baseCurrCode} {mopTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Difference:</span>
                        <span className={`ml-2 font-mono font-semibold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                          {baseCurrCode} {difference.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {Math.abs(difference) >= 0.01 && methods.length > 0 && (
                      <p className="text-xs text-destructive">Payment methods total must equal the invoice outstanding total to proceed.</p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    onClick={handleSubmitPayment}
                    disabled={!canSubmit}
                    className="min-w-[180px]"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 mr-2" /> Process Payment</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Modals */}
        <ChequeDetailModal
          open={showChequeModal}
          onClose={() => { setShowChequeModal(false); setPendingMethodId(null); }}
          onSave={handleChequeDetailsSave}
          initialData={pendingMethod ? {
            mop_number: pendingMethod.mop_number,
            bank_code: pendingMethod.bank_code,
            cheque_date: pendingMethod.cheque_date,
            mop_account_number: pendingMethod.mop_account_number,
            mop_notes1: pendingMethod.mop_notes1,
          } : undefined}
        />
        <CardDetailModal
          open={showCardModal}
          onClose={() => { setShowCardModal(false); setPendingMethodId(null); }}
          onSave={handleCardDetailsSave}
          initialData={pendingMethod ? {
            credit_card_code: pendingMethod.credit_card_code,
            mop_number: pendingMethod.mop_number,
            expiration_date: pendingMethod.expiration_date,
            mop_notes1: pendingMethod.mop_notes1,
          } : undefined}
        />
        <InvoiceCancelModal
          open={showCancelModal}
          onClose={() => { setShowCancelModal(false); setSelectedInvoiceId(null); }}
          onConfirm={handleCancelConfirm}
          isLoading={invoiceActions.isLoading}
          invoiceNumber={selectedInvoiceNumber}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default SearchPayInvoices;
