import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BimaPeriodPayment } from '@/services/wizC3DetailsService';

function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface SelectPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payments: BimaPeriodPayment[];
  period: string;
  onSelect: (payment: BimaPeriodPayment) => void;
  applyingReceipt: string | null;
}

const SelectPaymentModal: React.FC<SelectPaymentModalProps> = ({
  open, onClose, payments, period, onSelect, applyingReceipt,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Payment</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            There are <strong>{payments.length}</strong> C3 payments for <strong>{period}</strong>.
            Please review the details below and click <strong>Apply</strong> to confirm the correct payment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {payments.map((p) => (
            <div
              key={p.receipt_number}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="text-sm space-y-1">
                <div className="font-semibold text-xs text-muted-foreground">Period: {period}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Receipt:</span><span className="font-medium">{p.receipt_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mode:</span><span>{p.payment_mode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Batch:</span><span className="text-xs">{p.batch_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{p.payment_date}</span></div>
              </div>

              <div className="border-t pt-2 text-sm space-y-1">
                <div className="font-semibold text-xs mb-1">Payment Details</div>
                <div className="flex justify-between"><span>🟢 SS</span><span>{fmt(p.ss_amount)}</span></div>
                <div className="flex justify-between"><span>🟢 LV</span><span>{fmt(p.lv_amount)}</span></div>
                <div className="flex justify-between"><span>🟢 PE</span><span>{fmt(p.pe_amount)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Total</span><span>{fmt(p.total)}</span>
                </div>
              </div>

              {p.validation_warnings.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded space-y-1">
                  {p.validation_warnings.map((w, i) => (
                    <div key={i} className="flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /><span>{w}</span></div>
                  ))}
                </div>
              )}

              <div className="pt-1">
                {p.is_applied ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Applied
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onSelect(p)}
                    disabled={applyingReceipt === p.receipt_number}
                  >
                    {applyingReceipt === p.receipt_number ? 'Applying...' : 'Apply'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelectPaymentModal;
