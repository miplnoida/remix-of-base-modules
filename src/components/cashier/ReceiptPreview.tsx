import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Printer, Receipt as ReceiptIcon, Copy } from 'lucide-react';
import { SocialSecurityIcon } from '@/components/icons/SocialSecurityIcon';
import { toast } from 'sonner';

export interface ReceiptData {
  receiptNumber: string;
  batchId: string;
  paymentDate: Date;
  status: string;
  payerDetails: {
    name: string;
    address?: string;
    contact?: string;
    payerType: 'Employer' | 'Insured Person' | 'Individual' | 'Organization';
    registrationNumber?: string;
    ssn?: string;
  };
  paymentDetails: {
    paymentType: string;
    paymentMethod: string;
    currency: string;
    amount: number;
    checkNumber?: string;
    bankName?: string;
    referenceNumber?: string;
    invoiceReference?: string;
  };
  paymentSplits?: Array<{
    paymentMode: string;
    currency: string;
    amount: number;
    checkNumber?: string;
    bankName?: string;
    checkDate?: string;
  }>;
  contributionDetails?: {
    period: string;
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
    contributorType: 'employer' | 'insured';
  };
  cashierDetails: {
    cashierId: string;
    cashierName: string;
    terminalId?: string;
    workstation?: string;
  };
  organizationDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  fees?: Array<{
    description: string;
    amount: number;
  }>;
  notes?: string;
}

interface ReceiptPreviewProps {
  receiptData: ReceiptData;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  allowReprint?: boolean;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ 
  receiptData, 
  isOpen, 
  onClose, 
  title = "Receipt Preview",
  allowReprint = true 
}) => {
  const handlePrint = () => {
    // In a real application, this would send to printer
    window.print();
    toast.success("Receipt sent to printer");
  };

  const handleDownload = () => {
    // In a real application, this would generate and download PDF
    toast.success("Receipt downloaded as PDF");
  };

  const handleCopyReceipt = () => {
    // Generate receipt text and copy to clipboard
    const receiptText = `
ST KITTS AND NEVIS SOCIAL SECURITY DEPARTMENT
${receiptData.organizationDetails.address}
${receiptData.organizationDetails.phone}

RECEIPT: ${receiptData.receiptNumber}
Date: ${receiptData.paymentDate.toLocaleDateString()}
Batch: ${receiptData.batchId}

Payer: ${receiptData.payerDetails.name}
${receiptData.payerDetails.registrationNumber ? `Reg#: ${receiptData.payerDetails.registrationNumber}` : ''}
${receiptData.payerDetails.ssn ? `SSN: ${receiptData.payerDetails.ssn}` : ''}

Payment Type: ${receiptData.paymentDetails.paymentType}
Amount: ${receiptData.paymentDetails.currency} ${receiptData.paymentDetails.amount.toFixed(2)}
Method: ${receiptData.paymentDetails.paymentMethod}

Cashier: ${receiptData.cashierDetails.cashierName}
Terminal: ${receiptData.cashierDetails.terminalId || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(receiptText);
    toast.success("Receipt details copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ReceiptIcon className="w-5 h-5" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex justify-end space-x-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleCopyReceipt}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            {allowReprint && (
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            )}
          </div>

          {/* Receipt Content */}
          <Card className="bg-white text-black print:shadow-none print:border-none">
            <CardHeader className="text-center border-b">
              <div className="flex justify-center mb-4">
                <SocialSecurityIcon className="w-16 h-16" />
              </div>
              <CardTitle className="text-xl font-bold text-center">
                {receiptData.organizationDetails.name}
              </CardTitle>
              <div className="text-sm text-center space-y-1">
                <p>{receiptData.organizationDetails.address}</p>
                <p>Tel: {receiptData.organizationDetails.phone}</p>
                <p>Email: {receiptData.organizationDetails.email}</p>
                <p>Website: {receiptData.organizationDetails.website}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* Receipt Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">PAYMENT RECEIPT</h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Receipt No:</strong><br />
                    {receiptData.receiptNumber}
                  </div>
                  <div>
                    <strong>Date:</strong><br />
                    {receiptData.paymentDate.toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Batch:</strong><br />
                    {receiptData.batchId}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Payer Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <strong>Name:</strong> 
                      <span>{receiptData.payerDetails.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {receiptData.payerDetails.payerType}
                      </Badge>
                    </div>
                    {receiptData.payerDetails.address && (
                      <div className="mb-2">
                        <strong>Address:</strong> {receiptData.payerDetails.address}
                      </div>
                    )}
                    {receiptData.payerDetails.contact && (
                      <div className="mb-2">
                        <strong>Contact:</strong> {receiptData.payerDetails.contact}
                      </div>
                    )}
                  </div>
                  <div>
                    {receiptData.payerDetails.registrationNumber && (
                      <div className="mb-2">
                        <strong>Registration No:</strong> {receiptData.payerDetails.registrationNumber}
                      </div>
                    )}
                    {receiptData.payerDetails.ssn && (
                      <div className="mb-2">
                        <strong>SSN:</strong> {receiptData.payerDetails.ssn}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <div className="mb-2">
                      <strong>Payment Type:</strong> {receiptData.paymentDetails.paymentType}
                    </div>
                    <div className="mb-2">
                      <strong>Currency:</strong> {receiptData.paymentDetails.currency}
                    </div>
                  </div>
                  <div>
                    {receiptData.paymentDetails.referenceNumber && (
                      <div className="mb-2">
                        <strong>Reference:</strong> {receiptData.paymentDetails.referenceNumber}
                      </div>
                    )}
                    {receiptData.paymentDetails.invoiceReference && (
                      <div className="mb-2">
                        <strong>Invoice Reference:</strong> {receiptData.paymentDetails.invoiceReference}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Splits */}
                {receiptData.paymentSplits && receiptData.paymentSplits.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="text-md font-semibold mb-2">Payment Methods Used</h4>
                    <div className="space-y-2">
                      {receiptData.paymentSplits.map((split, index) => (
                        <div key={index} className="flex justify-between items-start border-b border-gray-200 pb-2 last:border-b-0">
                          <div className="flex-1">
                            <div className="font-medium capitalize">{split.paymentMode}</div>
                            <div className="text-xs text-gray-600">
                              {split.currency} {split.amount.toFixed(2)}
                            </div>
                            {split.checkNumber && (
                              <div className="text-xs text-gray-600 mt-1">
                                Check: {split.checkNumber}
                                {split.bankName && ` (${split.bankName})`}
                                {split.checkDate && ` - ${split.checkDate}`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contribution Details (if applicable) */}
              {receiptData.contributionDetails && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Contribution Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="mb-2">
                          <strong>Period:</strong> {receiptData.contributionDetails.period}
                        </div>
                        <div className="mb-2">
                          <strong>Contributor Type:</strong> {receiptData.contributionDetails.contributorType}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2">
                          <strong>Employee Contribution:</strong> {receiptData.paymentDetails.currency} {receiptData.contributionDetails.employeeContribution.toFixed(2)}
                        </div>
                        <div className="mb-2">
                          <strong>Employer Contribution:</strong> {receiptData.paymentDetails.currency} {receiptData.contributionDetails.employerContribution.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Amount Summary */}
              <Separator />
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Amount Summary</h3>
                {receiptData.fees && receiptData.fees.length > 0 && (
                  <div className="mb-4">
                    {receiptData.fees.map((fee, index) => (
                      <div key={index} className="flex justify-between text-sm mb-1">
                        <span>{fee.description}:</span>
                        <span>{receiptData.paymentDetails.currency} {fee.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold">
                  <span>Total Amount Paid:</span>
                  <span>{receiptData.paymentDetails.currency} {receiptData.paymentDetails.amount.toFixed(2)}</span>
                </div>
              </div>

              {receiptData.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Notes</h3>
                    <p className="text-sm bg-gray-50 p-3 rounded">{receiptData.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Footer */}
              <div className="text-center text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <strong>Cashier:</strong> {receiptData.cashierDetails.cashierName}<br />
                    <strong>Cashier ID:</strong> {receiptData.cashierDetails.cashierId}
                  </div>
                  <div>
                    {receiptData.cashierDetails.terminalId && (
                      <>
                        <strong>Terminal:</strong> {receiptData.cashierDetails.terminalId}<br />
                      </>
                    )}
                    {receiptData.cashierDetails.workstation && (
                      <>
                        <strong>Workstation:</strong> {receiptData.cashierDetails.workstation}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <p className="font-semibold">Thank you for your payment!</p>
                  <p className="text-xs mt-2">
                    This receipt is your proof of payment. Please retain for your records.
                  </p>
                  <p className="text-xs mt-1">
                    For enquiries, please contact us at {receiptData.organizationDetails.phone}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPreview;