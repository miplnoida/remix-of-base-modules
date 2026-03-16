import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ssbLogo from '@/assets/stkitts-logo.png';
import {
  getTransactionReceipt,
  type TransactionReceiptData,
} from '@/services/wizC3DetailsService';

function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPeriod(period: string | null | undefined): string {
  if (!period) return '';
  // Convert "01/2026" or "01 - 2026" to "Jan-2026"
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const match = period.match(/(\d{1,2})\s*[-\/]\s*(\d{4})/);
  if (match) {
    const monthIdx = parseInt(match[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) return `${months[monthIdx]}-${match[2]}`;
  }
  return period;
}

interface PaymentReceiptModalProps {
  open: boolean;
  onClose: () => void;
  headerId: number;
  entityType: 'c3' | 'nw_director' | 'self_employed';
  transactionId?: string | null;
  /** If receipt data is already available (e.g. after payment), pass it directly */
  receiptData?: TransactionReceiptData | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  open,
  onClose,
  headerId,
  entityType,
  transactionId,
  receiptData: initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TransactionReceiptData | null>(initialData || null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }
    if (!open || !headerId) return;
    setLoading(true);
    getTransactionReceipt({ header_id: headerId, transaction_id: transactionId, entity_type: entityType })
      .then((res) => {
        if (res.data) {
          setData(res.data);
        } else {
          toast.error('No receipt found for this payment.');
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load receipt');
      })
      .finally(() => setLoading(false));
  }, [open, headerId, entityType, transactionId, initialData]);

  useEffect(() => {
    if (!open) setData(initialData || null);
  }, [open, initialData]);

  const handleDownload = () => {
    if (!data) return;
    const rows = buildReceiptRows(data);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Receipt #${data.receiptNumber}</title><style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 12px; border-bottom: 1px solid #eee; }
      td:first-child { font-weight: bold; }
      h1 { font-size: 18px; text-align: center; }
      h2 { font-size: 24px; text-align: center; }
      .offices { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
      .receipt-box { border: 2px solid #333; display: inline-block; padding: 8px 16px; font-weight: bold; margin-bottom: 20px; }
      .disclaimer { border: 1px solid #ccc; padding: 12px; margin-top: 20px; font-size: 12px; }
    </style></head><body>
      <div style="text-align:center;margin-bottom:20px;">
        <h1>St. Christopher and Nevis Social Security Board</h1>
        <h2>RECEIPT</h2>
      </div>
      <div class="offices">
        <div><strong>Head Office</strong><br/>Robert Llewellyn Bradshaw Building<br/>P.O. Box 79, Bay Road, Basseterre, St. Kitts<br/>PHONE: +1 (869) 465-2535<br/>EMAIL: pubinfo@socialsecurity.kn</div>
        <div><strong>Branch Office</strong><br/>Pinney's Commercial Site<br/>P.O. Box 667 Nevis<br/>PHONE: +1 (869) 469-5245<br/>EMAIL: nevis@socialsecurity.kn</div>
      </div>
      <div class="receipt-box">RECEIPT# ${data.receiptNumber}</div>
      <table>${rows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('')}</table>
      <div class="disclaimer"><strong>RECEIPT DISCLAIMER:</strong><br/>Your Payment has been posted to your account and will be applied to any past due social security contributions, levy, severance, fines, penalties, or current period liabilities.</div>
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
        ) : !data ? (
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
                  <p>P.O. Box 79, Bay Road, Basseterre, St. Kitts</p>
                  <p>PHONE: +1 (869) 465-2535</p>
                  <p>EMAIL: pubinfo@socialsecurity.kn</p>
                </div>
                <div>
                  <p className="font-bold">Branch Office</p>
                  <p>Pinney's Commercial Site</p>
                  <p>P.O. Box 667 Nevis</p>
                  <p>PHONE: +1 (869) 469-5245</p>
                  <p>EMAIL: nevis@socialsecurity.kn</p>
                </div>
              </div>

              <div className="border-2 border-foreground inline-block px-4 py-2">
                <span className="font-bold text-lg">RECEIPT# {data.receiptNumber}</span>
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {buildReceiptRows(data).map(([label, value], idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 font-bold w-1/3">{label}</td>
                      <td className={`py-2 ${label === 'Amount' ? 'font-bold' : ''} ${label === 'Status' && value === 'AUTHORIZED' ? 'text-green-600 font-semibold' : ''}`}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border rounded-md p-3 text-xs text-muted-foreground">
                <p className="font-bold text-foreground mb-1">RECEIPT DISCLAIMER:</p>
                <p>
                  Your Payment has been posted to your account and will be applied to any past due social security
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

/** Build receipt rows in legacy order, conditionally hiding zero-value penalty rows */
function buildReceiptRows(data: TransactionReceiptData): [string, string][] {
  const rows: [string, string][] = [
    ['Reg No.', data.regNo || ''],
    ['Customer Name', data.refCustomerName || ''],
    ['Transaction ID', data.paymentGatewayTransactionID || ''],
  ];

  if ((data.totalSscontributions ?? 0) > 0) {
    rows.push(['Total SS Contributions', fmt(data.totalSscontributions)]);
  }
  if ((data.totalSspenalty ?? 0) > 0) {
    rows.push(['Total SS Penalty', fmt(data.totalSspenalty)]);
  }
  if ((data.totalLevy ?? 0) > 0) {
    rows.push(['Total Levy', fmt(data.totalLevy)]);
  }
  if ((data.totalLevyeepenalty ?? 0) > 0) {
    rows.push(['Total Levy Penalty', fmt(data.totalLevyeepenalty)]);
  }
  if ((data.totalServayance ?? 0) > 0) {
    rows.push(['Total Severance', fmt(data.totalServayance)]);
  }
  if ((data.totalPepenalty ?? 0) > 0) {
    rows.push(['Total PE Penalty', fmt(data.totalPepenalty)]);
  }

  rows.push(
    ['Amount', fmt(data.paymentAmount)],
    ['Status', data.paymentStatus || ''],
    ['Period', formatPeriod(data.period)],
    ['Transaction Date', data.transactionDate || data.createTime || ''],
  );

  return rows;
}
