import React, { useState, useEffect } from 'react';
import { StandardModal } from '@/components/common/StandardModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPaymentDetailsList,
  type PaymentRecord,
  type PaymentPayDetail,
} from '@/services/wizPaymentService';
import type { C3ContributionRecord } from '@/services/wizC3DetailsService';

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

interface ExistingPaymentsPopupProps {
  open: boolean;
  onClose: () => void;
  record: C3ContributionRecord;
  companyId: number;
  onContinueToPayment: (record: C3ContributionRecord, pendingAmount?: number | null) => void;
}

export const ExistingPaymentsPopup: React.FC<ExistingPaymentsPopupProps> = ({
  open,
  onClose,
  record,
  companyId,
  onContinueToPayment,
}) => {
  const [loading, setLoading] = useState(false);
  const [payDetails, setPayDetails] = useState<PaymentPayDetail[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPayDetails([]);
    setTotalPaid(0);

    getPaymentDetailsList({
      company_id: companyId,
      types: 'Company',
      payment_status: 'success',
      page_number: 1,
      page_size: 100,
    })
      .then((res) => {
        const records: PaymentRecord[] = res.data?.records || [];
        // Filter records matching this C3's period and header
        const matching = records.filter(
          (r) =>
            r.period_month_number === record.month_number &&
            r.period_year === record.year
        );

        // Flatten all pay_details from matching records
        const allDetails: PaymentPayDetail[] = matching.flatMap((r) => r.pay_details || []);
        const paid = allDetails.reduce((sum, d) => sum + (d.payment_amount || 0), 0);

        setPayDetails(allDetails);
        setTotalPaid(paid);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load payment history');
      })
      .finally(() => setLoading(false));
  }, [open, companyId, record]);

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
              onContinueToPayment(record, pendingAmount > 0 ? pendingAmount : null);
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
      ) : payDetails.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Inbox className="h-10 w-10" />
          <p>No previous payments found for this period.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Receipt Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payDetails.map((d, idx) => (
                <TableRow key={d.transaction_id || idx}>
                  <TableCell className="font-mono text-xs">{d.transaction_id || '-'}</TableCell>
                  <TableCell>{formatTxnDate(d.transaction_date)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(d.payment_amount)}</TableCell>
                  <TableCell>{d.mode || '-'}</TableCell>
                  <TableCell>{d.receipt_number || '-'}</TableCell>
                  <TableCell>{formatTxnDate(d.receipt_date)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.transaction_status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {d.transaction_status || '-'}
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
