import React, { useState, useEffect } from 'react';
import { StandardModal } from '@/components/common/StandardModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { C3ContributionRecord } from '@/services/wizC3DetailsService';

const ALLOWED_PAYMENT_CODES = ['CON', 'LVC', 'LVF', 'PEC', 'PEF', 'SSE', 'SEF', 'SSC', 'SSF', 'VOC', 'VOL'];

function fmt(val: number) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTxnDate(dateStr: string | null) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface PaymentDisplayRow {
  payment_id: number;
  payment_date: string | null;
  payment_amount: number;
  payment_code: string;
  mop_code: string;
  receipt_number: string | null;
  receipt_status: string | null;
}

interface ExistingPaymentsPopupProps {
  open: boolean;
  onClose: () => void;
  record: C3ContributionRecord;
  companyId: number;
  regNo: string;
  payerType: string;
  onContinueToPayment: (record: C3ContributionRecord) => void;
}

export const ExistingPaymentsPopup: React.FC<ExistingPaymentsPopupProps> = ({
  open,
  onClose,
  record,
  companyId,
  regNo,
  payerType,
  onContinueToPayment,
}) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PaymentDisplayRow[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setRows([]);
    setTotalPaid(0);

    fetchPaymentHistory();

    async function fetchPaymentHistory() {
      try {
        // Step 1: Get payment headers for this payer, excluding deleted
        const { data: headers, error: headersErr } = await supabase
          .from('cn_payment_header')
          .select('payment_id')
          .eq('payer_id', regNo)
          .eq('payer_type', payerType)
          .neq('status', 'deleted');

        if (headersErr) throw headersErr;
        if (!headers || headers.length === 0) {
          setLoading(false);
          return;
        }

        const paymentIds = headers.map(h => h.payment_id);

        // Step 2: Get non-cancelled receipts for these payment_ids
        const { data: receipts, error: receiptsErr } = await supabase
          .from('cn_receipt')
          .select('payment_id, receipt_number, status')
          .in('payment_id', paymentIds)
          .neq('status', 'C');

        if (receiptsErr) throw receiptsErr;

        // Build a set of valid payment_ids (those with non-cancelled receipts)
        const receiptMap = new Map<number, { receipt_number: string | null; status: string | null }>();
        (receipts || []).forEach(r => {
          receiptMap.set(Number(r.payment_id), {
            receipt_number: r.receipt_number,
            status: r.status,
          });
        });

        const validPaymentIds = Array.from(receiptMap.keys());
        if (validPaymentIds.length === 0) {
          setLoading(false);
          return;
        }

        // Step 3: Build period date range for the C3 month/year
        const year = record.year;
        const month = record.month_number; // 1-based
        const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        // Step 4: Get payment detail lines matching period and allowed codes
        const { data: payments, error: paymentsErr } = await supabase
          .from('cn_payment')
          .select('payment_id, payment_date, payment_amount, payment_code, mop_code')
          .in('payment_id', validPaymentIds)
          .gte('period', periodStart)
          .lt('period', periodEnd)
          .in('payment_code', ALLOWED_PAYMENT_CODES);

        if (paymentsErr) throw paymentsErr;

        const displayRows: PaymentDisplayRow[] = (payments || []).map(p => {
          const receipt = receiptMap.get(Number(p.payment_id));
          return {
            payment_id: Number(p.payment_id),
            payment_date: p.payment_date,
            payment_amount: Number(p.payment_amount) || 0,
            payment_code: p.payment_code,
            mop_code: p.mop_code,
            receipt_number: receipt?.receipt_number || null,
            receipt_status: receipt?.status || null,
          };
        });

        const paid = displayRows.reduce((sum, r) => sum + r.payment_amount, 0);
        setRows(displayRows);
        setTotalPaid(paid);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load payment history');
      } finally {
        setLoading(false);
      }
    }
  }, [open, regNo, payerType, record]);

  const pendingAmount = record.pending_amount ?? (record.total - totalPaid);

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm text-muted-foreground">
        <span>Total Paid: <strong className="text-foreground">{fmt(totalPaid)}</strong></span>
        <span className="mx-3">|</span>
        <span>Pending: <strong className="text-orange-600">{fmt(Math.max(0, pendingAmount))}</strong></span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {pendingAmount > 0 && (
          <Button
            onClick={() => {
              onClose();
              onContinueToPayment(record);
            }}
            className="gap-1"
          >
            Continue to Payment <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <StandardModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Payment History — ${record.month} ${record.year} (Schedule ${record.schedule})`}
      mode="view"
      size="4xl"
      footer={footer}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Inbox className="h-10 w-10" />
          <p>No previous payments found for this period.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment Code</TableHead>
                <TableHead>MOP</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d, idx) => (
                <TableRow key={`${d.payment_id}-${d.payment_code}-${idx}`}>
                  <TableCell className="font-mono text-xs">{d.payment_id}</TableCell>
                  <TableCell>{formatTxnDate(d.payment_date)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(d.payment_amount)}</TableCell>
                  <TableCell>{d.payment_code}</TableCell>
                  <TableCell>{d.mop_code || '-'}</TableCell>
                  <TableCell>{d.receipt_number || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.receipt_status === 'O'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {d.receipt_status === 'O' ? 'Verified' : d.receipt_status || '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </StandardModal>
  );
};
