import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Search, Plus, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MiscellaneousPayment {
  id: string;
  receiptNumber: string;
  payerName: string;
  payerContact: string;
  paymentType: string;
  description: string;
  currency: string;
  amount: number;
  paymentMode: string;
  checkNumber?: string;
  bankName?: string;
  referenceNumber?: string;
  invoiceReference?: string;
  timestamp: Date;
  cashierId: string;
  batchId?: string;
}

const MiscellaneousPayments: React.FC = () => {
  const { toast } = useToast();
  const [activeBatch, setActiveBatch] = useState<string | null>("BATCH-001-20241225");
  const [payments, setPayments] = useState<MiscellaneousPayment[]>([]);
  const [searchInvoiceOpen, setSearchInvoiceOpen] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    payerName: '',
    payerContact: '',
    paymentType: '',
    description: '',
    currency: 'EC$',
    amount: '',
    paymentMode: 'cash',
    checkNumber: '',
    bankName: '',
    referenceNumber: '',
    invoiceReference: ''
  });

  useEffect(() => {
    if (!activeBatch) {
      toast({
        title: "No Active Batch",
        description: "Please open a batch before processing payments.",
        variant: "destructive"
      });
    }
  }, [activeBatch, toast]);

  const handleInputChange = (field: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const generateReceiptNumber = (): string => {
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = (payments.length + 1).toString().padStart(4, '0');
    return `MISC-${dateString}-${sequence}`;
  };

  const processPayment = () => {
    if (!activeBatch) {
      toast({
        title: "No Active Batch",
        description: "Please open a batch before processing payments.",
        variant: "destructive"
      });
      return;
    }

    if (!paymentForm.payerName || !paymentForm.paymentType || !paymentForm.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newPayment: MiscellaneousPayment = {
      id: Date.now().toString(),
      receiptNumber: generateReceiptNumber(),
      payerName: paymentForm.payerName,
      payerContact: paymentForm.payerContact,
      paymentType: paymentForm.paymentType,
      description: paymentForm.description,
      currency: paymentForm.currency,
      amount: parseFloat(paymentForm.amount),
      paymentMode: paymentForm.paymentMode,
      checkNumber: paymentForm.checkNumber,
      bankName: paymentForm.bankName,
      referenceNumber: paymentForm.referenceNumber,
      invoiceReference: paymentForm.invoiceReference,
      timestamp: new Date(),
      cashierId: "current-user",
      batchId: activeBatch
    };

    setPayments(prev => [newPayment, ...prev]);
    
    // Reset form
    setPaymentForm({
      payerName: '',
      payerContact: '',
      paymentType: '',
      description: '',
      currency: 'EC$',
      amount: '',
      paymentMode: 'cash',
      checkNumber: '',
      bankName: '',
      referenceNumber: '',
      invoiceReference: ''
    });

    toast({
      title: "Payment Processed",
      description: `Receipt ${newPayment.receiptNumber} generated successfully.`,
    });
  };

  const paymentTypes = [
    "Rent - Residential",
    "Rent - Commercial", 
    "Parking Fees",
    "Loan Repayment - Principal",
    "Loan Repayment - Interest",
    "Loan Repayment - Penalty",
    "Card Replacement Fee",
    "Pension Certificate Fee",
    "Statement Request Fee",
    "Appeal Processing Fee",
    "Late Filing Penalty",
    "Other Service Fees"
  ];

  if (!activeBatch) {
    return (
      <div className="p-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must open a batch before processing any payments. Please contact your supervisor or open a new batch.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Miscellaneous Payments - Batch Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No active batch found. Payment processing is disabled.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Miscellaneous Payments</h1>
          <p className="text-muted-foreground">Process payments for rent, loans, fees, and other services</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Batch: {activeBatch}</Badge>
          <Button variant="outline" size="sm">
            <Receipt className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payerName">Payer Name *</Label>
                  <Input
                    id="payerName"
                    value={paymentForm.payerName}
                    onChange={(e) => handleInputChange('payerName', e.target.value)}
                    placeholder="Enter payer name"
                  />
                </div>
                <div>
                  <Label htmlFor="payerContact">Contact Number</Label>
                  <Input
                    id="payerContact"
                    value={paymentForm.payerContact}
                    onChange={(e) => handleInputChange('payerContact', e.target.value)}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentType">Payment Type *</Label>
                  <Select value={paymentForm.paymentType} onValueChange={(value) => handleInputChange('paymentType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description/Details</Label>
                  <Input
                    id="description"
                    value={paymentForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Additional details"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={paymentForm.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EC$">EC$</SelectItem>
                      <SelectItem value="US$">US$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select value={paymentForm.paymentMode} onValueChange={(value) => handleInputChange('paymentMode', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online/EFT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentForm.paymentMode === 'check' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkNumber">Check Number</Label>
                    <Input
                      id="checkNumber"
                      value={paymentForm.checkNumber}
                      onChange={(e) => handleInputChange('checkNumber', e.target.value)}
                      placeholder="Check number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={paymentForm.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              )}

              {(paymentForm.paymentMode === 'online' || paymentForm.paymentMode === 'card') && (
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    placeholder="Transaction reference"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label htmlFor="invoiceReference">Invoice Reference</Label>
                <Input
                  id="invoiceReference"
                  value={paymentForm.invoiceReference}
                  onChange={(e) => handleInputChange('invoiceReference', e.target.value)}
                  placeholder="Invoice number (if applicable)"
                  className="flex-1"
                />
                <Dialog open={searchInvoiceOpen} onOpenChange={setSearchInvoiceOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Search Invoices</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input placeholder="Search by invoice number, payer name, or amount..." />
                      <div className="text-center text-muted-foreground py-8">
                        Invoice search functionality to be implemented
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={processPayment} className="flex-1">
                  <Receipt className="h-4 w-4 mr-2" />
                  Process Payment
                </Button>
                <Button variant="outline" onClick={() => setPaymentForm({
                  payerName: '', payerContact: '', paymentType: '', description: '',
                  currency: 'EC$', amount: '', paymentMode: 'cash', checkNumber: '',
                  bankName: '', referenceNumber: '', invoiceReference: ''
                })}>
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total EC$:</span>
                  <span className="font-semibold">
                    {payments.filter(p => p.currency === 'EC$').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total US$:</span>
                  <span className="font-semibold">
                    {payments.filter(p => p.currency === 'US$').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="font-semibold">{payments.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Mode Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['cash', 'check', 'card', 'online'].map(mode => {
                  const count = payments.filter(p => p.paymentMode === mode).length;
                  const total = payments.filter(p => p.paymentMode === mode).reduce((sum, p) => sum + p.amount, 0);
                  return (
                    <div key={mode} className="flex justify-between">
                      <span className="capitalize">{mode}:</span>
                      <span>{count} ({total.toFixed(2)})</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 10).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono">{payment.receiptNumber}</TableCell>
                  <TableCell>{payment.payerName}</TableCell>
                  <TableCell>{payment.paymentType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {payment.paymentMode}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.currency} {payment.amount.toFixed(2)}</TableCell>
                  <TableCell>{payment.timestamp.toLocaleTimeString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MiscellaneousPayments;