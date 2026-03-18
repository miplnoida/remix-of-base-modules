import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/common/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Printer, Scissors, Loader2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDisplayDate } from '@/lib/dateFormat';

interface PaymentRow {
  payment_id: number;
  batch_number: string;
  payer_type: string;
  payer_id: string;
  date_received: string | null;
  remarks: string | null;
  payment_code?: string;
  payment_amount?: number;
  mop_code?: string;
  period?: string;
  receipt_id?: number;
  receipt_status?: string;
  reprint_times?: number;
}

const PaymentHistoryManagement = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState<PaymentRow | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState('2');
  const [isSplitting, setIsSplitting] = useState(false);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: headers } = await supabase
        .from('cn_payment_header')
        .select('*')
        .order('payment_id', { ascending: false })
        .limit(500);

      if (!headers || headers.length === 0) {
        setPayments([]);
        setIsLoading(false);
        return;
      }

      const paymentIds = headers.map(h => h.payment_id);

      const [{ data: details }, { data: receipts }] = await Promise.all([
        supabase.from('cn_payment').select('*').in('payment_id', paymentIds),
        supabase.from('cn_receipt').select('*').in('payment_id', paymentIds),
      ]);

      const rows: PaymentRow[] = headers.map(h => {
        const detail = details?.find(d => d.payment_id === h.payment_id);
        const rcpt = receipts?.find(r => r.payment_id === h.payment_id);
        return {
          payment_id: h.payment_id,
          batch_number: h.batch_number,
          payer_type: h.payer_type,
          payer_id: h.payer_id,
          date_received: h.date_received,
          remarks: h.remarks,
          payment_code: detail?.payment_code,
          payment_amount: detail?.payment_amount ?? undefined,
          mop_code: detail?.mop_code,
          period: detail?.period ?? undefined,
          receipt_id: rcpt?.receipt_id,
          receipt_status: rcpt?.status ?? undefined,
          reprint_times: rcpt?.reprint_times ?? undefined,
        };
      });
      setPayments(rows);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filteredPayments = searchTerm
    ? payments.filter(p =>
        p.payer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.payment_id).includes(searchTerm)
      )
    : payments;

  const handleReprint = useCallback(async (row: PaymentRow) => {
    if (!row.receipt_id) {
      toast({ title: 'No Receipt', description: 'No receipt exists for this payment.', variant: 'destructive' });
      return;
    }
    try {
      await supabase.from('cn_receipt').update({
        status: 'R',
        reprint_times: (row.reprint_times || 0) + 1,
        updated_at: new Date().toISOString(),
        updated_by: 'USR',
      }).eq('receipt_id', row.receipt_id);
      toast({ title: 'Reprinted', description: `Receipt ${row.receipt_id} reprinted.` });
      fetchPayments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [fetchPayments]);

  const handleSplit = useCallback(async () => {
    if (!selectedRow) return;
    const count = parseInt(splitCount);
    if (isNaN(count) || count < 2 || count > 30) {
      toast({ title: 'Invalid', description: 'Split count must be between 2 and 30.', variant: 'destructive' });
      return;
    }

    setIsSplitting(true);
    try {
      const { data: details } = await supabase
        .from('cn_payment')
        .select('*')
        .eq('payment_id', selectedRow.payment_id);

      if (!details || details.length === 0) throw new Error('No detail rows found.');

      // Get max sequence
      const maxSeq = Math.max(...details.map(d => d.payment_sequence_no));
      const firstDetail = details[0];
      const totalAmount = firstDetail.payment_amount || 0;
      const splitAmount = Math.round((totalAmount / count) * 100) / 100;

      // Update original row amount
      await supabase.from('cn_payment').update({ payment_amount: splitAmount } as any)
        .eq('payment_id', firstDetail.payment_id)
        .eq('payment_sequence_no', firstDetail.payment_sequence_no);

      // Create additional rows
      const newRows = [];
      for (let i = 1; i < count; i++) {
        newRows.push({
          payment_id: firstDetail.payment_id,
          payment_code: firstDetail.payment_code,
          fund_code: firstDetail.fund_code,
          payment_amount: i === count - 1
            ? totalAmount - splitAmount * (count - 1) // handle rounding
            : splitAmount,
          mop_code: firstDetail.mop_code,
          period: firstDetail.period,
          bank_code: firstDetail.bank_code,
          payment_date: firstDetail.payment_date,
        });
      }

      await supabase.from('cn_payment').insert(newRows as any);
      toast({ title: 'Split Complete', description: `Payment split into ${count} equal entries.` });
      setShowSplitModal(false);
      setSelectedRow(null);
      fetchPayments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSplitting(false);
    }
  }, [selectedRow, splitCount, fetchPayments]);

  const statusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">No Receipt</Badge>;
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      P: { label: 'Printed', variant: 'default' },
      R: { label: 'Reprinted', variant: 'secondary' },
      C: { label: 'Cancelled', variant: 'destructive' },
    };
    const s = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const columns: DataTableColumn<PaymentRow>[] = [
    { key: 'payment_id', header: 'Payment ID', className: 'w-[90px] font-mono' },
    { key: 'batch_number', header: 'Batch', className: 'text-xs' },
    { key: 'payer_type', header: 'Type', className: 'w-[50px]' },
    { key: 'payer_id', header: 'Payer ID', className: 'font-mono' },
    { key: 'date_received', header: 'Date Received', render: r => formatDisplayDate(r.date_received) },
    { key: 'payment_code', header: 'Code' },
    { key: 'payment_amount', header: 'Amount', className: 'text-right font-mono', render: r => r.payment_amount != null ? `$${r.payment_amount.toFixed(2)}` : '—' },
    { key: 'mop_code', header: 'MOP' },
    { key: 'period', header: 'Period' },
    { key: 'receipt_status', header: 'Receipt', render: r => statusBadge(r.receipt_status) },
  ];

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History Management</h1>
        <p className="text-sm text-muted-foreground">View, reprint, and split existing payment records. Records are part of the audit trail.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by Payment ID, Payer ID, or Batch..."
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
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleReprint(row)}
                  disabled={!row.receipt_id || row.receipt_status === 'C'}
                  title="Reprint Receipt"
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setSelectedRow(row); setShowSplitModal(true); }}
                  title="Split Payment"
                >
                  <Scissors className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Split Modal */}
      <Dialog open={showSplitModal} onOpenChange={v => { if (!v) { setShowSplitModal(false); setSelectedRow(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Split Payment</DialogTitle>
            <DialogDescription>
              Payment #{selectedRow?.payment_id} — Amount: ${selectedRow?.payment_amount?.toFixed(2) ?? '0.00'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-md bg-muted text-sm">
              The original payment will be divided into equal parts. The last part will absorb any rounding difference.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Number of Splits (2–30)</Label>
              <Input
                type="number"
                min={2}
                max={30}
                value={splitCount}
                onChange={e => setSplitCount(e.target.value)}
              />
            </div>
            {selectedRow?.payment_amount && splitCount && parseInt(splitCount) >= 2 && (
              <div className="text-sm text-muted-foreground">
                Each part: <span className="font-mono font-semibold">${(selectedRow.payment_amount / parseInt(splitCount)).toFixed(2)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitModal(false)}>Cancel</Button>
            <Button onClick={handleSplit} disabled={isSplitting}>
              {isSplitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Split Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentHistoryManagement;
