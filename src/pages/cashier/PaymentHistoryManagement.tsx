import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DataTable, DataTableColumn } from '@/components/common/DataTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Printer, Trash2, Loader2, Search, FileText, XCircle, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDisplayDate } from '@/lib/dateFormat';
import { useReceiptActions, ReceiptData } from '@/hooks/useReceiptActions';
import { useUserCode } from '@/hooks/useUserCode';
import { ReceiptCancelModal } from '@/components/payments/ReceiptCancelModal';
import { logApplicationError } from '@/lib/globalErrorHandler';

// --- Types ---
interface PaymentRow {
  payment_id: number;
  batch_number: string;
  payer_type: string;
  payer_id: string;
  date_received: string | null;
  remarks: string | null;
  payer_display: string;
  type_display: string;
  receipt_id: number | null;
  receipt_status: string | null;
  receipt_total: number | null;
  receipt_number: string | null;
  reprint_times: number | null;
  receipt_status_desc: string;
  has_details: boolean;
}

interface PaymentDetailLine {
  payment_sequence_no: number;
  payment_code: string;
  fund_code: string;
  payment_amount: number | null;
  mop_code: string;
  period: string | null;
  bank_code: string | null;
  mop_number: string | null;
  cheque_date: string | null;
  credit_card_code: string | null;
  expiration_date: string | null;
  mop_account_number: string | null;
  mop_transit_number: string | null;
  mop_notes1: string | null;
  bank_lodgement_code: string | null;
  // resolved descriptions
  payment_code_desc?: string;
  fund_code_desc?: string;
  mop_desc?: string;
}

// Fund labels fallback
const FUND_LABELS: Record<string, string> = {
  SS: 'Social Security',
  LV: 'Levy',
  PE: 'Severance',
};

// --- Constants ---
const PAYER_TYPE_MAP: Record<string, string> = {
  ER: 'Employer',
  SE: 'Self-Employed',
  IP: 'Insured-Person',
  VC: 'Voluntary-Contributor',
};

const PaymentHistoryManagement = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Detail popup
  const [selectedRow, setSelectedRow] = useState<PaymentRow | null>(null);
  const [detailLines, setDetailLines] = useState<PaymentDetailLine[]>([]);
  const [detailReceipt, setDetailReceipt] = useState<ReceiptData | null>(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<PaymentRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Generate receipt confirm
  const [generateTarget, setGenerateTarget] = useState<PaymentRow | null>(null);

  // Receipt generation loading
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  // Reprint loading
  const [isReprinting, setIsReprinting] = useState(false);

  const receiptActions = useReceiptActions();
  const { userCode } = useUserCode();

  // --- Status map cache (useRef to avoid dependency cycles) ---
  const statusMapRef = useRef<Record<string, string>>({});
  const statusMapLoaded = useRef(false);

  // Fetch receipt status descriptions once
  const fetchStatusMap = useCallback(async (): Promise<Record<string, string>> => {
    if (statusMapLoaded.current && Object.keys(statusMapRef.current).length > 0) {
      return statusMapRef.current;
    }
    const { data } = await supabase.from('tb_receipt_status').select('code, description');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(r => { map[r.code] = r.description || r.code; });
      statusMapRef.current = map;
      statusMapLoaded.current = true;
      return map;
    }
    return {};
  }, []);

  // --- Batch resolve payer names ---
  const resolvePayerNames = useCallback(async (
    headers: Array<{ payer_type: string; payer_id: string }>
  ): Promise<Record<string, string>> => {
    const nameMap: Record<string, string> = {};
    const erIds = [...new Set(headers.filter(h => h.payer_type === 'ER').map(h => h.payer_id))];
    const nonErIds = [...new Set(headers.filter(h => h.payer_type !== 'ER').map(h => h.payer_id))];

    const promises: Promise<void>[] = [];

    if (erIds.length > 0) {
      promises.push(
        (async () => {
          const { data } = await supabase.from('er_master').select('regno, name').in('regno', erIds);
          data?.forEach(r => { nameMap[r.regno] = r.name || r.regno; });
        })()
      );
    }
    if (nonErIds.length > 0) {
      promises.push(
        (async () => {
          const { data } = await supabase.from('ip_master').select('ssn, firstname, surname').in('ssn', nonErIds);
          data?.forEach(r => {
            nameMap[r.ssn] = `${r.firstname || ''} ${r.surname || ''}`.trim() || r.ssn;
          });
        })()
      );
    }

    await Promise.all(promises);
    return nameMap;
  }, []);

  // --- Fetch payments ---
  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch status map (from ref, no state dependency)
      const sMap = await fetchStatusMap();

      // 2. Fetch active payment headers
      const { data: headers, error: hErr } = await supabase
        .from('cn_payment_header')
        .select('payment_id, batch_number, payer_type, payer_id, date_received, remarks, status')
        .or('status.is.null,status.eq.active')
        .order('payment_id', { ascending: false })
        .limit(500);

      if (hErr) throw hErr;
      if (!headers || headers.length === 0) {
        setPayments([]);
        return;
      }

      const paymentIds = headers.map(h => h.payment_id);

      // 3. Fetch receipts + check cn_payment existence in parallel
      const [{ data: receipts }, { data: detailCheck }] = await Promise.all([
        supabase.from('cn_receipt').select('payment_id, receipt_id, status, receipt_total, receipt_number, reprint_times, cancel_date, cancel_reason, cancel_user, created_by, created_at').in('payment_id', paymentIds),
        supabase.from('cn_payment').select('payment_id').in('payment_id', paymentIds),
      ]);

      const receiptByPayment = new Map<number, any>();
      receipts?.forEach(r => receiptByPayment.set(r.payment_id, r));

      const hasDetailSet = new Set<number>();
      detailCheck?.forEach(d => hasDetailSet.add(d.payment_id));

      // 4. Filter out headers with NO receipt AND NO cn_payment rows
      const validHeaders = headers.filter(h => {
        return receiptByPayment.has(h.payment_id) || hasDetailSet.has(h.payment_id);
      });

      if (validHeaders.length === 0) {
        setPayments([]);
        return;
      }

      // 5. Batch resolve payer names
      const nameMap = await resolvePayerNames(validHeaders);

      // 6. Build rows
      const rows: PaymentRow[] = validHeaders.map(h => {
        const rcpt = receiptByPayment.get(h.payment_id);
        const payerName = nameMap[h.payer_id] || h.payer_id;
        const typeDisplay = PAYER_TYPE_MAP[h.payer_type] || h.payer_type;

        let receiptStatusDesc = 'No Receipt';
        if (rcpt?.status) {
          receiptStatusDesc = sMap[rcpt.status] || `${rcpt.status} - Not Defined`;
        }

        return {
          payment_id: h.payment_id,
          batch_number: h.batch_number,
          payer_type: h.payer_type,
          payer_id: h.payer_id,
          date_received: h.date_received,
          remarks: h.remarks,
          payer_display: `${h.payer_id} - ${payerName}`,
          type_display: typeDisplay,
          receipt_id: rcpt?.receipt_id ?? null,
          receipt_status: rcpt?.status ?? null,
          receipt_total: rcpt?.receipt_total ?? null,
          receipt_number: rcpt?.receipt_number ?? null,
          reprint_times: rcpt?.reprint_times ?? null,
          receipt_status_desc: receiptStatusDesc,
          has_details: hasDetailSet.has(h.payment_id),
        };
      });

      setPayments(rows);
    } catch (err: any) {
      await logApplicationError(err, { module: 'PaymentHistoryManagement', action: 'fetchPayments' });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatusMap, resolvePayerNames]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // --- Search filter ---
  const filteredPayments = searchTerm
    ? payments.filter(p =>
        p.payer_display.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.payment_id).includes(searchTerm)
      )
    : payments;

  // --- Generate Receipt ---
  const handleGenerateReceipt = useCallback(async (row: PaymentRow) => {
    if (row.receipt_id) return;
    const uCode = userCode || 'SYS';
    setGeneratingId(row.payment_id);
    try {
      // Get total from cn_payment detail lines
      const { data: details, error: dErr } = await supabase
        .from('cn_payment')
        .select('payment_amount')
        .eq('payment_id', row.payment_id);
      if (dErr) throw dErr;

      const receiptTotal = details?.reduce((sum, d) => sum + (d.payment_amount || 0), 0) || 0;
      const totalPayments = details?.length || 0;

      const result = await receiptActions.printReceipt(row.payment_id, receiptTotal, totalPayments, uCode);
      if (result) {
        // Log the print
        await supabase.from('cn_receipt_prints').insert({
          receipt_id: result.receipt_id,
          printed_by: uCode,
          print_type: 'ORIGINAL',
        } as any);

        toast({ title: 'Receipt Generated', description: `Receipt #${result.receipt_id} created.` });
        setTimeout(() => window.print(), 300);
        fetchPayments();
      }
    } catch (err: any) {
      await logApplicationError(err, { module: 'PaymentHistoryManagement', action: 'handleGenerateReceipt', entity_type: 'cn_receipt', request_payload: { payment_id: row.payment_id } });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingId(null);
    }
  }, [userCode, receiptActions, fetchPayments]);

  // --- Soft Delete ---
  const handleRemovePayment = useCallback(async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from('cn_payment_header')
        .update({ status: 'deleted' } as any)
        .eq('payment_id', removeTarget.payment_id);
      if (error) throw error;
      toast({ title: 'Payment Removed', description: `Payment #${removeTarget.payment_id} has been removed.` });
      setRemoveTarget(null);
      fetchPayments();
    } catch (err: any) {
      await logApplicationError(err, { module: 'PaymentHistoryManagement', action: 'handleRemovePayment', entity_type: 'cn_payment_header', request_payload: { payment_id: removeTarget.payment_id } });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRemoving(false);
    }
  }, [removeTarget, fetchPayments]);

  // --- Open Detail Popup ---
  const handleRowClick = useCallback(async (row: PaymentRow) => {
    setSelectedRow(row);
    setShowDetailPopup(true);
    setIsLoadingDetail(true);
    try {
      const [{ data: lines }, { data: rcpt }, { data: ptTypes }, { data: mopTypes }] = await Promise.all([
        supabase.from('cn_payment').select('*').eq('payment_id', row.payment_id).order('payment_sequence_no'),
        supabase.from('cn_receipt').select('*').eq('payment_id', row.payment_id).maybeSingle(),
        supabase.from('tb_payment_type').select('payment_code, payment_type_description, fund_code'),
        supabase.from('tb_method_of_payment').select('mop_code, short_description'),
      ]);

      // Build lookup maps
      const ptMap: Record<string, string> = {};
      ptTypes?.forEach((pt: any) => { ptMap[pt.payment_code] = pt.payment_type_description || pt.payment_code; });
      const mopMap: Record<string, string> = {};
      mopTypes?.forEach((m: any) => { mopMap[m.mop_code] = m.short_description || m.mop_code; });

      const resolvedLines: PaymentDetailLine[] = (lines || []).map((d: any) => ({
        ...d,
        payment_code_desc: ptMap[d.payment_code] || d.payment_code,
        fund_code_desc: FUND_LABELS[d.fund_code] || d.fund_code,
        mop_desc: mopMap[d.mop_code] || d.mop_code,
      }));

      setDetailLines(resolvedLines);
      setDetailReceipt(rcpt ? (rcpt as unknown as ReceiptData) : null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // --- Reprint (in popup) ---
  const handleReprint = useCallback(async () => {
    if (!selectedRow || !detailReceipt) return;
    const uCode = userCode || 'SYS';
    setIsReprinting(true);
    try {
      const { error: updErr } = await supabase.from('cn_receipt').update({
        reprint_times: (detailReceipt.reprint_times || 0) + 1,
        updated_by: uCode,
        updated_at: new Date().toISOString(),
      } as any).eq('receipt_id', detailReceipt.receipt_id);
      if (updErr) throw updErr;

      await supabase.from('cn_receipt_prints').insert({
        receipt_id: detailReceipt.receipt_id,
        printed_by: uCode,
        print_type: 'REPRINT',
      } as any);

      toast({ title: 'Receipt Reprinted', description: `Reprint #${(detailReceipt.reprint_times || 0) + 1}` });
      // Reload receipt
      const { data: rcpt } = await supabase.from('cn_receipt').select('*').eq('receipt_id', detailReceipt.receipt_id).single();
      setDetailReceipt(rcpt ? (rcpt as unknown as ReceiptData) : null);
      fetchPayments();
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      await logApplicationError(err, { module: 'PaymentHistoryManagement', action: 'handleReprint', entity_type: 'cn_receipt', entity_id: String(detailReceipt.receipt_id) });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsReprinting(false);
    }
  }, [selectedRow, detailReceipt, userCode, fetchPayments]);

  // --- Cancel Receipt (in popup) ---
  const handleCancelReceipt = useCallback(async (reason: string) => {
    if (!selectedRow || !detailReceipt) return;
    if (detailReceipt.status !== 'O') {
      toast({ title: 'Cannot Cancel', description: 'Only receipts with status Original (O) can be cancelled.', variant: 'destructive' });
      setShowCancelModal(false);
      return;
    }
    const uCode = userCode || 'SYS';
    try {
      const { error } = await supabase.from('cn_receipt').update({
        status: 'C',
        cancel_reason: reason,
        cancel_date: new Date().toISOString(),
        cancel_user: uCode,
        updated_by: uCode,
        updated_at: new Date().toISOString(),
      } as any).eq('receipt_id', detailReceipt.receipt_id);
      if (error) throw error;

      toast({ title: 'Receipt Cancelled', description: 'Receipt has been cancelled.' });
      setShowCancelModal(false);

      // Reload receipt
      const { data: rcpt } = await supabase.from('cn_receipt').select('*').eq('receipt_id', detailReceipt.receipt_id).single();
      setDetailReceipt(rcpt ? (rcpt as unknown as ReceiptData) : null);
      fetchPayments();
    } catch (err: any) {
      await logApplicationError(err, { module: 'PaymentHistoryManagement', action: 'handleCancelReceipt', entity_type: 'cn_receipt', entity_id: String(detailReceipt.receipt_id) });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [selectedRow, detailReceipt, userCode, fetchPayments]);

  // --- Receipt status badge ---
  const statusBadge = (desc: string, status: string | null) => {
    if (!status) return <Badge variant="outline">No Receipt</Badge>;
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      O: 'default', R: 'secondary', C: 'destructive',
    };
    return <Badge variant={variantMap[status] || 'outline'}>{desc}</Badge>;
  };

  // --- Columns ---
  const columns: DataTableColumn<PaymentRow>[] = [
    { key: 'payment_id', header: 'Payment ID', className: 'w-[90px] font-mono' },
    { key: 'batch_number', header: 'Batch', className: 'text-xs' },
    { key: 'type_display', header: 'Type' },
    { key: 'payer_display', header: 'Payer', className: 'min-w-[200px]' },
    { key: 'date_received', header: 'Date Received', render: r => formatDisplayDate(r.date_received) },
    {
      key: 'receipt_total', header: 'Amount', className: 'text-right font-mono',
      render: r => r.receipt_total != null ? `$${r.receipt_total.toFixed(2)}` : '—',
    },
    {
      key: 'receipt_status_desc', header: 'Receipt',
      render: r => statusBadge(r.receipt_status_desc, r.receipt_status),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History Management</h1>
        <p className="text-sm text-muted-foreground">
          View payment records, generate receipts, and manage payment history.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by Payment ID, Payer, or Batch..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchPayments} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredPayments}
            isLoading={isLoading}
            emptyMessage="No payment records found"
            keyField="payment_id"
            onView={handleRowClick}
            renderActions={(row) => {
              const hasReceipt = !!row.receipt_id;
              if (hasReceipt) return null;
              return (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setGenerateTarget(row); }}
                    disabled={generatingId === row.payment_id}
                    title="Generate Receipt"
                  >
                    {generatingId === row.payment_id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <FileText className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setRemoveTarget(row); }}
                    title="Remove Payment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            }}
          />
        </CardContent>
      </Card>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={v => { if (!v) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove Payment #{removeTarget?.payment_id}? This will mark the payment as deleted. It will no longer appear on this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePayment}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Receipt Confirmation */}
      <AlertDialog open={!!generateTarget} onOpenChange={v => { if (!v) setGenerateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to generate a receipt for Payment #{generateTarget?.payment_id}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generatingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (generateTarget) handleGenerateReceipt(generateTarget); setGenerateTarget(null); }}
              disabled={generatingId !== null}
            >
              {generatingId !== null && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Popup */}
      <Dialog open={showDetailPopup} onOpenChange={v => { if (!v) { setShowDetailPopup(false); setSelectedRow(null); setDetailLines([]); setDetailReceipt(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Payment Detail — #{selectedRow?.payment_id}
            </DialogTitle>
            <DialogDescription>Read-only payment and receipt information</DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedRow && (
            <div className="space-y-4">
              {/* Payment Info */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground/80">Payment Information</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-muted/40 rounded-lg p-3">
                  <div><Label className="text-xs text-muted-foreground">Payment ID</Label><p className="font-mono">{selectedRow.payment_id}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Batch</Label><p className="text-xs">{selectedRow.batch_number}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Type</Label><p>{selectedRow.type_display}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Payer</Label><p>{selectedRow.payer_display}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Date Received</Label><p>{formatDisplayDate(selectedRow.date_received)}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Remarks</Label><p>{selectedRow.remarks || '—'}</p></div>
                </div>
              </div>

              <Separator />

              {/* Detail Lines */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground/80">Payment Detail Lines</h3>
                {detailLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No detail lines found.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="text-xs">Fund</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs">MOP</TableHead>
                          <TableHead className="text-xs">Period</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailLines.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-mono">{d.payment_sequence_no}</TableCell>
                            <TableCell className="text-xs">{d.payment_code}</TableCell>
                            <TableCell className="text-xs">{d.fund_code}</TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {d.payment_amount != null ? `$${d.payment_amount.toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className="text-xs">{d.mop_code}</TableCell>
                            <TableCell className="text-xs">{d.period || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Receipt Info */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground/80">Receipt Information</h3>
                {!detailReceipt ? (
                  <p className="text-sm text-muted-foreground">No receipt generated for this payment.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-muted/40 rounded-lg p-3">
                    <div><Label className="text-xs text-muted-foreground">Receipt ID</Label><p className="font-mono">{detailReceipt.receipt_id}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Receipt Number</Label><p className="font-mono text-xs">{(detailReceipt as any).receipt_number || '—'}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Status</Label><p>{statusMapRef.current[detailReceipt.status || ''] || detailReceipt.status || '—'}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Total</Label><p className="font-mono">{detailReceipt.receipt_total != null ? `$${detailReceipt.receipt_total.toFixed(2)}` : '—'}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Created By</Label><p>{detailReceipt.created_by || '—'}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Created At</Label><p>{formatDisplayDate(detailReceipt.created_at)}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Reprint Times</Label><p>{detailReceipt.reprint_times ?? 0}</p></div>
                    {detailReceipt.status === 'C' && (
                      <>
                        <div className="col-span-2"><Separator /></div>
                        <div><Label className="text-xs text-muted-foreground">Cancel Date</Label><p>{formatDisplayDate(detailReceipt.cancel_date)}</p></div>
                        <div><Label className="text-xs text-muted-foreground">Cancel User</Label><p>{detailReceipt.cancel_user || '—'}</p></div>
                        <div className="col-span-2"><Label className="text-xs text-muted-foreground">Cancel Reason</Label><p>{detailReceipt.cancel_reason || '—'}</p></div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {/* Cancel Payment: visible only when receipt status is 'O' */}
            {detailReceipt && detailReceipt.status === 'O' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel Payment
              </Button>
            )}
            {/* Reprint: visible only when receipt exists and not cancelled */}
            {detailReceipt && detailReceipt.status !== 'C' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprint}
                disabled={isReprinting}
              >
                {isReprinting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
                Reprint
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Receipt Modal */}
      <ReceiptCancelModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelReceipt}
        isLoading={receiptActions.isLoading}
        receiptId={detailReceipt?.receipt_id}
      />
    </div>
  );
};

export default PaymentHistoryManagement;
