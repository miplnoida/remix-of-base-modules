import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, Printer, XCircle, Loader2, FileText, ShoppingCart, Trash2, CreditCard, CheckCircle, Inbox } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { InvoiceCancelModal } from '@/components/payments/InvoiceCancelModal';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrencyWithCode } from '@/utils/currencyConverter';
import { formatDisplayDate } from '@/lib/dateFormat';
import { AddDetailModal, type DetailLineData } from '@/components/payments/AddDetailModal';
import { ChequeDetailModal, type ChequeDetails } from '@/components/payments/ChequeDetailModal';
import { CardDetailModal, type CardDetails } from '@/components/payments/CardDetailModal';
import { PaymentDetailGrid } from '@/components/payments/PaymentDetailGrid';
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

// Statuses that cannot be selected for payment
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

  // Shortlisted invoices for payment
  const [shortlist, setShortlist] = useState<InvoiceRow[]>([]);

  // MOP detail lines
  const [mopLines, setMopLines] = useState<DetailLineData[]>([]);
  const [showAddDetail, setShowAddDetail] = useState(false);
  const [editDetailIdx, setEditDetailIdx] = useState<number | null>(null);

  // MOP sub-modals
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [pendingMopIdx, setPendingMopIdx] = useState<number | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invoiceStatuses } = useInvoiceStatuses();

  const { data: invoices, isLoading: loadingInvoices, refetch } = useQuery({
    queryKey: ['cn_invoices_search', searchTerm, searchType, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('cn_invoices')
        .select('id, invoice_number, invoice_type, payment_source, payer_type, payer_id, payer_name, currency_code, base_currency, total_amount, total_amount_base, paid_amount, outstanding_amount, due_date, status, reprint_times, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm.trim()) {
        if (searchType === 'invoice') {
          query = query.ilike('invoice_number', `%${searchTerm.trim()}%`);
        } else if (searchType === 'payer') {
          query = query.ilike('payer_name', `%${searchTerm.trim()}%`);
        } else if (searchType === 'payer_id') {
          query = query.ilike('payer_id', `%${searchTerm.trim()}%`);
        }
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
    setShortlist(prev => {
      if (prev.find(s => s.id === inv.id)) {
        return prev.filter(s => s.id !== inv.id);
      }
      return [...prev, inv];
    });
  }, []);

  const removeFromShortlist = useCallback((id: number) => {
    setShortlist(prev => prev.filter(s => s.id !== id));
  }, []);

  const shortlistTotal = useMemo(() => shortlist.reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0), [shortlist]);
  const mopTotal = useMemo(() => mopLines.reduce((sum, l) => sum + (l.payment_amount || 0), 0), [mopLines]);
  const difference = mopTotal - shortlistTotal;

  // MOP handlers
  const handleAddDetail = (detail: DetailLineData) => {
    if (editDetailIdx !== null) {
      setMopLines(prev => prev.map((l, i) => i === editDetailIdx ? detail : l));
      setEditDetailIdx(null);
    } else {
      setMopLines(prev => [...prev, detail]);
    }
  };

  const handleMopPopupNeeded = (mopCode: string) => {
    const idx = mopLines.length - 1;
    setPendingMopIdx(idx);
    if (mopCode === 'CRD') {
      setShowCardModal(true);
    } else {
      setShowChequeModal(true);
    }
  };

  const handleChequeDetailSave = (details: ChequeDetails) => {
    if (pendingMopIdx !== null && pendingMopIdx < mopLines.length) {
      setMopLines(prev => prev.map((l, i) => i === pendingMopIdx ? {
        ...l,
        mop_number: details.mop_number,
        bank_code: details.bank_code,
        cheque_date: details.cheque_date,
        mop_account_number: details.mop_account_number,
        mop_notes1: details.mop_notes1,
        bank_desc: details.bank_desc,
      } : l));
    }
    setShowChequeModal(false);
    setPendingMopIdx(null);
  };

  const handleCardDetailSave = (details: CardDetails) => {
    if (pendingMopIdx !== null && pendingMopIdx < mopLines.length) {
      setMopLines(prev => prev.map((l, i) => i === pendingMopIdx ? {
        ...l,
        credit_card_code: details.credit_card_code,
        mop_number: details.mop_number,
        mop_notes1: details.mop_notes1,
        expiration_date: details.expiration_date,
        card_desc: details.card_desc,
      } : l));
    }
    setShowCardModal(false);
    setPendingMopIdx(null);
  };

  const handleEditMopDetail = (idx: number) => {
    const row = mopLines[idx];
    setPendingMopIdx(idx);
    if (row.mop_code === 'CRD') {
      setShowCardModal(true);
    } else if (row.mop_code === 'CHQ' || row.mop_code === 'CHK') {
      setShowChequeModal(true);
    }
  };

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
      // Remove from shortlist if it was there
      removeFromShortlist(selectedInvoiceId);
      refetch();
    }
  };

  // Submit payment
  const canSubmit = shortlist.length > 0 && mopLines.length > 0 && Math.abs(difference) < 0.01 && !isSubmitting && batchSel.isReady;

  const handleSubmitPayment = async () => {
    if (!canSubmit || !batchSel.selectedBatch) return;
    setIsSubmitting(true);
    try {
      // Use first invoice payer info
      const firstInv = shortlist[0];

      const detailLinesJson = mopLines.map(l => ({
        payment_code: l.payment_code,
        fund_code: l.fund_code,
        payment_amount: l.payment_amount,
        mop_code: l.mop_code,
        period: l.period,
        payment_date: l.payment_date,
        bank_code: l.bank_code || null,
        mop_number: l.mop_number || null,
        cheque_date: l.cheque_date || null,
        mop_account_number: l.mop_account_number || null,
        mop_notes1: l.mop_notes1 || null,
        credit_card_code: l.credit_card_code || null,
        expiration_date: l.expiration_date || null,
      }));

      const { data, error } = await supabase.rpc('pay_invoices_with_receipt', {
        p_batch_number: batchSel.selectedBatch.batch_number,
        p_payer_type: firstInv.payer_type || 'AP',
        p_payer_id: firstInv.payer_id || '',
        p_payer_name: firstInv.payer_name || '',
        p_date_received: new Date().toISOString().split('T')[0],
        p_remarks: `Payment for invoices: ${shortlist.map(s => s.invoice_number).join(', ')}`,
        p_detail_lines: detailLinesJson,
        p_invoice_ids: shortlist.map(s => s.id),
        p_receipt_total: shortlistTotal,
        p_total_payments: mopLines.length,
        p_user_code: userCode || 'SYSTEM',
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      toast.success('Payment processed successfully', {
        description: `Payment ID: ${result.payment_id} | Receipt ID: ${result.receipt_id}`,
      });

      // Clear shortlist and MOP lines
      setShortlist([]);
      setMopLines([]);

      // Refresh search results
      refetch();
      queryClient.invalidateQueries({ queryKey: ['cn_invoices_search'] });

      // Print receipt
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
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => toggleShortlist(inv)}
                              disabled={!payable}
                            />
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
                Total: ${shortlistTotal.toFixed(2)}
              </span>
              {shortlist.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShortlist([])}>
                  Clear All
                </Button>
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
                        <TableCell className="text-right font-mono font-semibold">${(inv.outstanding_amount || 0).toFixed(2)}</TableCell>
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

        {/* Section C: Payment Methods */}
        {shortlist.length > 0 && (
          <>
            <PaymentDetailGrid
              rows={mopLines}
              onAddRow={() => { setEditDetailIdx(null); setShowAddDetail(true); }}
              onDeleteRow={(idx) => setMopLines(prev => prev.filter((_, i) => i !== idx))}
              onEditRow={(idx) => { setEditDetailIdx(idx); setShowAddDetail(true); }}
              onEditMopDetail={handleEditMopDetail}
              disabled={isSubmitting}
              totalAmount={mopTotal}
            />

            {/* Balance Indicator + Submit */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="grid grid-cols-3 gap-8 text-sm">
                      <div>
                        <span className="text-muted-foreground">Invoice Total:</span>
                        <span className="ml-2 font-mono font-semibold">${shortlistTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">MOP Total:</span>
                        <span className="ml-2 font-mono font-semibold">${mopTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Difference:</span>
                        <span className={`ml-2 font-mono font-semibold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                          ${difference.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {Math.abs(difference) >= 0.01 && mopLines.length > 0 && (
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
        <AddDetailModal
          open={showAddDetail}
          onClose={() => { setShowAddDetail(false); setEditDetailIdx(null); }}
          onAdd={handleAddDetail}
          editData={editDetailIdx !== null ? mopLines[editDetailIdx] : null}
          onMopPopupNeeded={handleMopPopupNeeded}
        />
        <ChequeDetailModal
          open={showChequeModal}
          onClose={() => { setShowChequeModal(false); setPendingMopIdx(null); }}
          onSave={handleChequeDetailSave}
          initialData={pendingMopIdx !== null && pendingMopIdx < mopLines.length ? {
            mop_number: mopLines[pendingMopIdx].mop_number || '',
            bank_code: mopLines[pendingMopIdx].bank_code || '',
            cheque_date: mopLines[pendingMopIdx].cheque_date,
            mop_account_number: mopLines[pendingMopIdx].mop_account_number || '',
            mop_notes1: mopLines[pendingMopIdx].mop_notes1 || '',
          } : undefined}
        />
        <CardDetailModal
          open={showCardModal}
          onClose={() => { setShowCardModal(false); setPendingMopIdx(null); }}
          onSave={handleCardDetailSave}
          initialData={pendingMopIdx !== null && pendingMopIdx < mopLines.length ? {
            credit_card_code: mopLines[pendingMopIdx].credit_card_code || '',
            mop_number: mopLines[pendingMopIdx].mop_number || '',
            mop_notes1: mopLines[pendingMopIdx].mop_notes1 || '',
            expiration_date: mopLines[pendingMopIdx].expiration_date || '',
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
