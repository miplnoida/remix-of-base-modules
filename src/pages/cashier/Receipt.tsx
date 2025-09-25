import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Printer, Receipt as ReceiptIcon } from "lucide-react";
import { SocialSecurityIcon } from "@/components/icons/SocialSecurityIcon";

interface ReceiptData {
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
    logo?: string;
  };
  remarks?: string;
  nextSteps?: string;
}

const Receipt: React.FC = () => {
  const [receiptData] = useState<ReceiptData>({
    receiptNumber: "C3-20241225-0045",
    batchId: "BATCH-SARAH-20241225",
    paymentDate: new Date(),
    status: "Open",
    payerDetails: {
      name: "Government of St. Kitts and Nevis",
      address: "Government Headquarters, Basseterre, St. Kitts",
      contact: "+1-869-465-2521",
      payerType: "Employer",
      registrationNumber: "EMP-GOV-001"
    },
    paymentDetails: {
      paymentType: "C3 Social Security Contributions",
      paymentMethod: "Check",
      currency: "EC$",
      amount: 15750.00,
      checkNumber: "CHK-001234",
      bankName: "Royal Bank of Canada",
      invoiceReference: "INV-C3-202412-001"
    },
    contributionDetails: {
      period: "2024-12",
      employeeContribution: 7875.00,
      employerContribution: 7875.00,
      totalContribution: 15750.00,
      contributorType: "employer"
    },
    cashierDetails: {
      cashierId: "CASH001",
      cashierName: "Sarah Johnson",
      terminalId: "TERM-01",
      workstation: "Cashier Station 1"
    },
    organizationDetails: {
      name: "Social Security Board",
      address: "P.O. Box 347, Wellington Road, Basseterre, St. Kitts",
      phone: "+1-869-465-2521",
      email: "info@socialsecurity.kn",
      website: "www.socialsecurity.kn"
    },
    remarks: "Monthly employer contribution payment for December 2024",
    nextSteps: "Contribution has been recorded. Employer statement will be available in 3-5 business days."
  });

  const formatCurrency = (amount: number, currency: string = "EC$") => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDateTime = (date: Date) => {
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const datetime = formatDateTime(receiptData.paymentDate);

  const printReceipt = () => {
    window.print();
  };

  const downloadReceipt = () => {
    // In a real implementation, this would generate a PDF
    alert('Receipt download functionality would be implemented here');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold">Payment Receipt</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReceipt}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={printReceipt}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Receipt Container */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardContent className="p-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <SocialSecurityIcon size={48} className="text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-primary">{receiptData.organizationDetails.name}</h1>
                <p className="text-sm text-muted-foreground">St. Kitts and Nevis</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{receiptData.organizationDetails.address}</p>
              <p>Tel: {receiptData.organizationDetails.phone} | Email: {receiptData.organizationDetails.email}</p>
              <p>{receiptData.organizationDetails.website}</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Receipt Details Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <ReceiptIcon className="h-5 w-5 mr-2" />
                Receipt Information
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Receipt Number:</span>
                  <span className="font-mono">{receiptData.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Batch ID:</span>
                  <span className="font-mono">{receiptData.batchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{datetime.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Time:</span>
                  <span>{datetime.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant="outline">{receiptData.status}</Badge>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Cashier Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Cashier:</span>
                  <span>{receiptData.cashierDetails.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Cashier ID:</span>
                  <span className="font-mono">{receiptData.cashierDetails.cashierId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Terminal:</span>
                  <span>{receiptData.cashierDetails.terminalId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Workstation:</span>
                  <span>{receiptData.cashierDetails.workstation}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Payer Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Payer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Name/Organization:</span>
                  <span className="text-right">{receiptData.payerDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payer Type:</span>
                  <span>{receiptData.payerDetails.payerType}</span>
                </div>
                {receiptData.payerDetails.registrationNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium">Registration Number:</span>
                    <span className="font-mono">{receiptData.payerDetails.registrationNumber}</span>
                  </div>
                )}
                {receiptData.payerDetails.ssn && (
                  <div className="flex justify-between">
                    <span className="font-medium">SSN:</span>
                    <span className="font-mono">{receiptData.payerDetails.ssn}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {receiptData.payerDetails.address && (
                  <div>
                    <span className="font-medium">Address:</span>
                    <p className="text-right mt-1">{receiptData.payerDetails.address}</p>
                  </div>
                )}
                {receiptData.payerDetails.contact && (
                  <div className="flex justify-between">
                    <span className="font-medium">Contact:</span>
                    <span>{receiptData.payerDetails.contact}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Payment Details */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Payment Type:</span>
                  <span>{receiptData.paymentDetails.paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Method:</span>
                  <Badge variant="outline">{receiptData.paymentDetails.paymentMethod}</Badge>
                </div>
                {receiptData.paymentDetails.checkNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium">Check Number:</span>
                    <span className="font-mono">{receiptData.paymentDetails.checkNumber}</span>
                  </div>
                )}
                {receiptData.paymentDetails.bankName && (
                  <div className="flex justify-between">
                    <span className="font-medium">Bank:</span>
                    <span>{receiptData.paymentDetails.bankName}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {receiptData.paymentDetails.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium">Reference Number:</span>
                    <span className="font-mono">{receiptData.paymentDetails.referenceNumber}</span>
                  </div>
                )}
                {receiptData.paymentDetails.invoiceReference && (
                  <div className="flex justify-between">
                    <span className="font-medium">Invoice Reference:</span>
                    <span className="font-mono">{receiptData.paymentDetails.invoiceReference}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contribution Details (if applicable) */}
          {receiptData.contributionDetails && (
            <>
              <Separator className="my-6" />
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Contribution Breakdown</h2>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Contribution Period:</span>
                      <span>{receiptData.contributionDetails.period}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Contributor Type:</span>
                      <span className="capitalize">{receiptData.contributionDetails.contributorType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Employee Contribution:</span>
                      <span>{formatCurrency(receiptData.contributionDetails.employeeContribution, receiptData.paymentDetails.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Employer Contribution:</span>
                      <span>{formatCurrency(receiptData.contributionDetails.employerContribution, receiptData.paymentDetails.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          {/* Amount Section */}
          <div className="bg-primary/10 p-6 rounded-lg mb-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Total Amount</h2>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(receiptData.paymentDetails.amount, receiptData.paymentDetails.currency)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ({receiptData.paymentDetails.paymentMethod} Payment)
              </p>
            </div>
          </div>

          {/* Additional Information */}
          {(receiptData.remarks || receiptData.nextSteps) && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                {receiptData.remarks && (
                  <div>
                    <h3 className="font-semibold mb-2">Remarks:</h3>
                    <p className="text-sm text-foreground bg-muted/50 p-3 rounded">{receiptData.remarks}</p>
                  </div>
                )}
                {receiptData.nextSteps && (
                  <div>
                    <h3 className="font-semibold mb-2">Next Steps:</h3>
                    <p className="text-sm text-foreground bg-primary/10 p-3 rounded">{receiptData.nextSteps}</p>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator className="my-6" />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-2">
            <p>This is an official receipt from the Social Security Board of St. Kitts and Nevis</p>
            <p>Please retain this receipt for your records</p>
            <p>For inquiries, contact us at {receiptData.organizationDetails.phone} or {receiptData.organizationDetails.email}</p>
            <p className="font-mono">Generated on {datetime.date} at {datetime.time}</p>
          </div>
        </CardContent>
      </Card>

      <style>
        {`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .max-w-4xl {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
        }
        `}
      </style>
    </div>
  );
};

export default Receipt;