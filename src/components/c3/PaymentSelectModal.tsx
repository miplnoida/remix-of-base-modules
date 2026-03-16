import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPeriodPaymentList,
  applyOfflinePayment,
  type BimaPayment,
  type OfflinePaymentReceipt,
} from '@/services/wizC3DetailsService';
import { format, parseISO } from 'date-fns';

function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'dd-MMM-yyyy HH:mm'); } catch { return dateStr; }
}

interface PaymentSelectModalProps {
  open: boolean;
  onClose: () => void;
  headerId: number;
  entityType: 'employer' | 'nwd' | 'self_employed';
  registrationNumber?: string;
  periodMonth?: string;
  periodYear?: string;
  onPaymentApplied: (receipt: OfflinePaymentReceipt) => void;
}

export const PaymentSelectModal: React.FC<PaymentSelectModalProps> = ({
  open,
  onClose,
  headerId,
  entityType,
  registrationNumber,
  periodMonth,
  periodYear,
  onPaymentApplied,
}) => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<BimaPayment[]>([]);
  const [period, setPeriod] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

  // Auto-search when modal opens
  useEffect(() => {
    if (!open || !headerId) return;
    setLoading(true);
    setPayments([]);
    setPeriod('');

    getPeriodPaymentList({
      header_id: headerId,
      entity_type: entityType,
      registration_number: registrationNumber,
      period_month: periodMonth,
      period_year: periodYear,
    })
      .then((res) => {
        const data = res.data;
        if (!data || !data.payments || data.payments.length === 0) {
          toast.error('No BIMA payments found for this period.');
          return;
        }
        setPayments(data.payments);
        setPeriod(data.period || '');
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to retrieve payment list');
      })
      .finally(() => setLoading(false));
  }, [open, headerId, entityType, registrationNumber, periodMonth, periodYear]);

  const handleApply = useCallback(async (payment: BimaPayment) => {
    setApplying(payment.receipt_number);
    try {
      const res = await applyOfflinePayment({
        header_id: headerId,
        entity_type: entityType,
        receipt_number: payment.receipt_number,
        batch_number: payment.batch_number,
        payment_date: payment.payment_date,
        payment_mode: payment.payment_mode,
        ss_amount: payment.ss_amount,
        lv_amount: payment.lv_amount,
        pe_amount: payment.pe_amount,
        total_amount: payment.total,
        admin_user_id: 1,
      });
      toast.success(res.data?.message || 'Payment applied successfully');
      if (res.data?.receipt) {
        onPaymentApplied(res.data.receipt);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply payment');
    } finally {
      setApplying(null);
    }
  }, [headerId, entityType, onPaymentApplied, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Payment</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No payments found for this period.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                There are <strong>{payments.length}</strong> C3 payments for <strong>{period}</strong>.
                Please review the details below and click <strong>Apply</strong> to confirm the correct payment.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payments.map((p, idx) => {
                const hasWarnings = p.validation_warnings && p.validation_warnings.length > 0;
                return (
                  <Card key={idx} className="border">
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="font-semibold text-primary">Period : {period}</div>
                      <div className="space-y-0.5">
                        <div><span className="font-semibold text-red-600">Receipt Number:</span> {p.receipt_number}</div>
                        <div><span className="text-muted-foreground">Payment Mode:</span> {p.payment_mode}</div>
                        <div><span className="text-muted-foreground">Batch Number:</span> {p.batch_number}</div>
                        <div><span className="text-muted-foreground">Payment Date:</span> {fmtDate(p.payment_date)}</div>
                      </div>
                      <div className="pt-2 font-semibold text-xs">Payment Details</div>
                      {p.ss_amount > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span>SS Contributions</span>
                          <span className="ml-auto">{fmt(p.ss_amount)}</span>
                        </div>
                      )}
                      {p.lv_amount > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span>LV Contributions</span>
                          <span className="ml-auto">{fmt(p.lv_amount)}</span>
                        </div>
                      )}
                      {p.pe_amount > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>PE Contributions</span>
                          <span className="ml-auto">{fmt(p.pe_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Total</span>
                        <span>{fmt(p.total)}</span>
                      </div>
                      {hasWarnings && (
                        <div className="text-xs text-amber-600">
                          {p.validation_warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                        </div>
                      )}
                      <div className="pt-2">
                        {p.is_applied ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Received
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500 text-green-600"
                            disabled={applying !== null}
                            onClick={() => handleApply(p)}
                          >
                            {applying === p.receipt_number ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : null}
                            Apply
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
