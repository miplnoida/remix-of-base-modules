import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Invoice, InsuredPerson, ServiceType } from '@/types/serviceRequest';
import { Badge } from '@/components/ui/badge';

interface InvoiceStubProps {
  invoice: Invoice;
  insuredPerson: InsuredPerson;
  serviceType: ServiceType;
  serviceRequestId: string;
  queueToken?: string;
}

export function InvoiceStub({ invoice, insuredPerson, serviceType, serviceRequestId, queueToken }: InvoiceStubProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice Stub - ${invoice.invoiceNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 8px;
              background: white;
            }
            .stub-container {
              max-width: 300px;
              margin: 0 auto;
              padding: 8px;
              border: 1px dashed #000;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .header h1 {
              margin: 0;
              font-size: 14px;
              font-weight: bold;
            }
            .header p {
              margin: 2px 0 0;
              font-size: 9px;
              color: #333;
            }
            .section {
              margin-bottom: 6px;
              font-size: 10px;
            }
            .label {
              font-size: 8px;
              color: #666;
              text-transform: uppercase;
            }
            .value {
              font-size: 11px;
              font-weight: 600;
              margin: 2px 0;
            }
            .amount-box {
              background: #f5f5f5;
              border: 1px solid #000;
              padding: 8px;
              text-align: center;
              margin: 8px 0;
            }
            .amount-label {
              font-size: 9px;
              color: #666;
              margin-bottom: 2px;
            }
            .amount-value {
              font-size: 18px;
              font-weight: bold;
            }
            .qr-container {
              text-align: center;
              margin: 8px 0;
              padding: 6px;
            }
            .footer {
              text-align: center;
              font-size: 8px;
              color: #666;
              border-top: 1px dashed #000;
              padding-top: 6px;
              margin-top: 8px;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              background: #078A00;
              color: white;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 600;
              margin-top: 2px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              @page { 
                size: 80mm auto;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Generate QR code data with invoice information
  const qrData = JSON.stringify({
    invoiceNumber: invoice.invoiceNumber,
    invoiceId: invoice.id,
    serviceRequestId,
    amount: invoice.totalAmount,
    timestamp: invoice.createdAt
  });

  const isFree = invoice.totalAmount === 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Invoice Stub
        </Button>
      </div>

      <div ref={printRef}>
        <div className="stub-container max-w-[300px] mx-auto border border-dashed border-border bg-background p-2">
          {/* Header */}
          <div className="header text-center border-b border-dashed border-border pb-2 mb-2">
            <h1 className="text-sm font-bold">Social Security Board</h1>
            <p className="text-[9px] text-muted-foreground">Service Invoice</p>
          </div>

          {/* Invoice Number */}
          <div className="section mb-2">
            <div className="label text-[8px] text-muted-foreground uppercase">Invoice #</div>
            <div className="value text-base font-bold">{invoice.invoiceNumber}</div>
          </div>

          {/* Service Request ID */}
          <div className="section mb-2">
            <div className="label text-[8px] text-muted-foreground uppercase">Request ID</div>
            <div className="value text-xs font-semibold">{serviceRequestId}</div>
          </div>

          {/* Queue Token (if applicable) */}
          {queueToken && (
            <div className="section mb-2">
              <div className="label text-[8px] text-muted-foreground uppercase">Token</div>
              <div className="value text-xs font-semibold">{queueToken}</div>
            </div>
          )}

          {/* Insured Person */}
          <div className="section mb-2">
            <div className="label text-[8px] text-muted-foreground uppercase">Name</div>
            <div className="value text-[11px] font-semibold">{insuredPerson.fullName}</div>
            <div className="text-[9px] text-muted-foreground">SSN: {insuredPerson.ssn}</div>
          </div>

          {/* Service Type */}
          <div className="section mb-2">
            <div className="label text-[8px] text-muted-foreground uppercase">Service</div>
            <div className="value text-[10px] font-semibold leading-tight">{serviceType.name}</div>
          </div>

          {/* Amount Box */}
          <div className="amount-box bg-muted border border-border p-2 text-center my-2">
            <div className="amount-label text-[9px] text-muted-foreground mb-1">Amount Due</div>
            <div className="amount-value text-2xl font-bold">
              {isFree ? 'FREE' : `$${invoice.totalAmount.toFixed(2)}`}
            </div>
            {isFree && (
              <div className="badge text-[9px] mt-1">No Payment</div>
            )}
          </div>

          {/* QR Code */}
          <div className="qr-container text-center my-2">
            <div className="label text-[8px] text-muted-foreground uppercase mb-1">
              Scan to Pay
            </div>
            <div className="flex justify-center">
              <QRCodeSVG 
                value={qrData} 
                size={100}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="footer text-center text-[8px] text-muted-foreground border-t border-dashed border-border pt-2 mt-2">
            <p className="leading-tight">
              {isFree 
                ? 'Proceed to processing unit'
                : 'Present at Cashier'}
            </p>
            <p className="mt-1 leading-tight">{new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p className="mt-1 font-semibold">Thank You</p>
          </div>
        </div>
      </div>
    </div>
  );
}
