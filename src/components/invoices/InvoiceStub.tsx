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
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .stub-container {
              max-width: 400px;
              margin: 0 auto;
              border: 2px solid #000;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              font-weight: bold;
            }
            .header p {
              margin: 5px 0 0;
              font-size: 12px;
              color: #666;
            }
            .section {
              margin-bottom: 15px;
            }
            .label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .value {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
            }
            .amount-box {
              background: #f5f5f5;
              border: 2px solid #000;
              padding: 15px;
              text-align: center;
              margin: 20px 0;
            }
            .amount-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .amount-value {
              font-size: 28px;
              font-weight: bold;
            }
            .qr-container {
              text-align: center;
              margin: 20px 0;
              padding: 15px;
              background: #f9f9f9;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
              margin-top: 20px;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              background: #078A00;
              color: white;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              margin-top: 5px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
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
        <div className="stub-container max-w-md mx-auto border-2 border-border bg-background">
          {/* Header */}
          <div className="header text-center border-b-2 border-border pb-4 mb-4">
            <h1 className="text-xl font-bold">Social Security Board</h1>
            <p className="text-sm text-muted-foreground mt-1">Service Invoice Stub</p>
            <p className="text-xs text-muted-foreground">Present this at Cashier for Payment</p>
          </div>

          {/* Invoice Number */}
          <div className="section mb-4">
            <div className="label text-xs text-muted-foreground uppercase mb-1">Invoice Number</div>
            <div className="value text-2xl font-bold">{invoice.invoiceNumber}</div>
          </div>

          {/* Service Request ID */}
          <div className="section mb-4">
            <div className="label text-xs text-muted-foreground uppercase mb-1">Service Request ID</div>
            <div className="value text-base font-semibold">{serviceRequestId}</div>
          </div>

          {/* Queue Token (if applicable) */}
          {queueToken && (
            <div className="section mb-4">
              <div className="label text-xs text-muted-foreground uppercase mb-1">Queue Token</div>
              <div className="value text-base font-semibold">{queueToken}</div>
            </div>
          )}

          {/* Insured Person */}
          <div className="section mb-4">
            <div className="label text-xs text-muted-foreground uppercase mb-1">Insured Person</div>
            <div className="value text-base font-semibold">{insuredPerson.fullName}</div>
            <div className="text-sm text-muted-foreground">SSN: {insuredPerson.ssn}</div>
          </div>

          {/* Service Type */}
          <div className="section mb-4">
            <div className="label text-xs text-muted-foreground uppercase mb-1">Service Type</div>
            <div className="value text-base font-semibold">{serviceType.name}</div>
          </div>

          {/* Amount Box */}
          <div className="amount-box bg-muted border-2 border-border p-4 text-center my-6">
            <div className="amount-label text-sm text-muted-foreground mb-2">Total Amount Due</div>
            <div className="amount-value text-4xl font-bold">
              {isFree ? 'FREE' : `EC$ ${invoice.totalAmount.toFixed(2)}`}
            </div>
            {isFree && (
              <Badge className="mt-2 bg-green-600">No Payment Required</Badge>
            )}
          </div>

          {/* QR Code */}
          <div className="qr-container text-center bg-muted/50 p-4 rounded-lg">
            <div className="label text-xs text-muted-foreground uppercase mb-3">
              Scan for Quick Payment
            </div>
            <div className="flex justify-center">
              <QRCodeSVG 
                value={qrData} 
                size={180}
                level="H"
                includeMargin
              />
            </div>
          </div>

          {/* Accounting Head */}
          <div className="section mt-4 mb-4">
            <div className="label text-xs text-muted-foreground uppercase mb-1">Accounting Head</div>
            <div className="value text-sm font-medium">{invoice.accountingHeadCode}</div>
          </div>

          {/* Invoice Date */}
          <div className="section mb-4">
            <div className="label text-xs text-muted-foreground uppercase mb-1">Invoice Date</div>
            <div className="value text-sm font-medium">
              {new Date(invoice.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Footer */}
          <div className="footer text-center text-xs text-muted-foreground border-t border-border pt-4 mt-6">
            <p>Please retain this stub for your records</p>
            <p className="mt-1">
              {isFree 
                ? 'Proceed to processing unit for service completion'
                : 'Present at Cashier counter for payment processing'}
            </p>
            <p className="mt-2 font-semibold">Thank you for your visit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
