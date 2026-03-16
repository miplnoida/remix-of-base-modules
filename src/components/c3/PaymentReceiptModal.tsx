import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ssbLogo from '@/assets/stkitts-logo.png';
import {
  getExistingPaymentReceipt,
  type OfflinePaymentReceipt,
} from '@/services/wizC3DetailsService';

function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PaymentReceiptModalProps {
  open: boolean;
  onClose: () => void;
  headerId: number;
  entityType: 'employer' | 'nwd' | 'self_employed';
  /** If receipt is already available (e.g. after Apply), pass it directly */
  receiptData?: OfflinePaymentReceipt | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  open,
  onClose,
  headerId,
  entityType,
  receiptData,
}) => {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<OfflinePaymentReceipt | null>(receiptData || null);

  useEffect(() => {
    if (receiptData) {
      setReceipt(receiptData);
      return;
    }
    if (!open || !headerId) return;
    setLoading(true);
    getExistingPaymentReceipt({ header_id: headerId, entity_type: entityType })
      .then((res) => {
        if (res.data?.receipt) {
          setReceipt(res.data.receipt);
        } else {
          toast.error('No receipt found for this payment.');
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load receipt');
      })
      .finally(() => setLoading(false));
  }, [open, headerId, entityType, receiptData]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) setReceipt(receiptData || null);
  }, [open, receiptData]);

  const handleDownload = () => {
    if (!receipt) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Receipt #${receipt.receipt_number}</title><style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 12px; border-bottom: 1px solid #eee; }
      td:first-child { font-weight: bold; }
      h1 { font-size: 18px; text-align: center; }
      h2 { font-size: 24px; text-align: center; }
      .header { text-align: center; margin-bottom: 20px; }
      .offices { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
      .receipt-box { border: 2px solid #333; display: inline-block; padding: 8px 16px; font-weight: bold; margin-bottom: 20px; }
      .disclaimer { border: 1px solid #ccc; padding: 12px; margin-top: 20px; font-size: 12px; }
    </style></head><body>
      <div class="header">
        <h1>St. Christopher and Nevis Social Security Board</h1>
        <h2>RECEIPT</h2>
      </div>
      <div class="offices">
        <div><strong>Head Office</strong><br/>Robert Llewellyn Bradshaw Building<br/>P.O. Box 79, Bay Road, Basseterre<br/>Phone: +1 (869) 465-2535</div>
        <div><strong>Branch Office</strong><br/>Pinney's Commercial Site<br/>P.O. Box 667, Nevis<br/>Phone: +1 (869) 469-5245</div>
      </div>
      <div class="receipt-box">RECEIPT# ${receipt.receipt_number}</div>
      <table>
        <tr><td>Registration No.</td><td>${receipt.reg_no}</td></tr>
        <tr><td>Customer Name</td><td>${receipt.customer_name}</td></tr>
        <tr><td>Period</td><td>${receipt.period}</td></tr>
        <tr><td>Batch Number</td><td>${receipt.batch_number}</td></tr>
        <tr><td>Payment Date</td><td>${receipt.payment_date}</td></tr>
        <tr><td>Payment Mode</td><td>${receipt.payment_mode}</td></tr>
        <tr><td>Status</td><td>${receipt.status}</td></tr>
        <tr><td>SS Contributions</td><td>${fmt(receipt.ss_contributions)}</td></tr>
        <tr><td>LV Contribution</td><td>${fmt(receipt.lv_contribution)}</td></tr>
        <tr><td>PE Contributions</td><td>${fmt(receipt.pe_contributions)}</td></tr>
        <tr><td>Amount</td><td>${fmt(receipt.amount)}</td></tr>
      </table>
      <div class="disclaimer"><strong>RECEIPT DISCLAIMER:</strong><br/>Your payment has been posted and applied to outstanding social security contributions, levy, severance, fines, penalties, or current period liabilities.</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !receipt ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No receipt data available.
          </div>
        ) : (
          <Card className="border-2">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <img
                  src={ssbLogo}
                  alt="SSB Logo"
                  className="h-16 w-16 mx-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <h2 className="font-bold text-base">St. Christopher and Nevis Social Security Board</h2>
                <h3 className="font-bold text-xl">RECEIPT</h3>
              </div>

              <div className="grid grid-cols-2 gap-x-8 text-xs">
                <div>
                  <p className="font-bold">Head Office</p>
                  <p>Robert Llewellyn Bradshaw Building</p>
                  <p>P.O. Box 79, Bay Road, Basseterre</p>
                  <p>Phone: +1 (869) 465-2535</p>
                </div>
                <div>
                  <p className="font-bold">Branch Office</p>
                  <p>Pinney's Commercial Site</p>
                  <p>P.O. Box 667, Nevis</p>
                  <p>Phone: +1 (869) 469-5245</p>
                </div>
              </div>

              <div className="border-2 border-foreground inline-block px-4 py-2">
                <span className="font-bold text-lg">RECEIPT# {receipt.receipt_number}</span>
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Registration No.', receipt.reg_no],
                    ['Customer Name', receipt.customer_name],
                    ['Period', receipt.period],
                    ['Batch Number', receipt.batch_number],
                    ['Payment Date', receipt.payment_date],
                    ['Payment Mode', receipt.payment_mode],
                    ['Status', receipt.status],
                    ['SS Contributions', fmt(receipt.ss_contributions)],
                    ['LV Contribution', fmt(receipt.lv_contribution)],
                    ['PE Contributions', fmt(receipt.pe_contributions)],
                    ['Amount', fmt(receipt.amount)],
                  ].map(([label, value]) => (
                    <tr key={String(label)} className="border-b">
                      <td className="py-2 font-bold w-1/3">{label}</td>
                      <td className="py-2">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border rounded-md p-3 text-xs text-muted-foreground">
                <p className="font-bold text-foreground mb-1">RECEIPT DISCLAIMER:</p>
                <p>
                  Your payment has been posted and applied to outstanding social security
                  contributions, levy, severance, fines, penalties, or current period liabilities.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" className="border-blue-500 text-blue-600" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
                <Button variant="outline" className="border-red-500 text-red-600" onClick={onClose}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};
