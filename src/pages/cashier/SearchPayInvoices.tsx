import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, CreditCard, Receipt, DollarSign, Plus, Trash2 } from 'lucide-react';
import { mockInvoices } from '@/data/mockInvoices';
import { Invoice } from '@/types/invoice';
import { getActiveBanks } from '@/data/bankData';
import ReceiptPreview, { ReceiptData } from '@/components/cashier/ReceiptPreview';
import { getPendingInvoices, getAllInvoices, updateInvoiceStatus as updateServiceInvoiceStatus, getInsuredPersonById } from '@/services/serviceRequestService';
import { Invoice as ServiceInvoice } from '@/types/serviceRequest';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';

interface PaymentSplit {
  id: string;
  currency: 'EC$' | 'US$';
  paymentMode: 'cash' | 'check' | 'card' | 'eft';
  amount: number;
  checkNumber?: string;
  bankName?: string;
  cardReference?: string;
}

const SearchPayInvoices: React.FC = () => {
  const batchSel = useBatchSelection();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'invoice' | 'payer'>('invoice');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState<ReceiptData | null>(null);
  const [serviceInvoices, setServiceInvoices] = useState<ServiceInvoice[]>([]);
  
  const banks = getActiveBanks();

  useEffect(() => {
    setServiceInvoices(getAllInvoices());
  }, []);

  const filteredInvoices = useMemo(() => {
    const combinedInvoices = [
      ...mockInvoices.filter(invoice => invoice.status !== 'paid'),
      ...serviceInvoices
        .filter(inv => inv.status === 'Pending')
        .map(inv => {
          const person = getInsuredPersonById(inv.insuredPersonId);
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            payerName: person?.fullName || 'Unknown',
            invoiceDate: inv.createdAt,
            dueDate: inv.createdAt,
            totalAmount: inv.totalAmount,
            paidAmount: 0,
            balanceAmount: inv.totalAmount,
            status: 'pending' as const,
            paymentCategory: 'Service Request Fee',
            description: 'Insured Person Service Fee',
            accountingHead: inv.accountingHeadCode,
            type: 'Service Request',
            currency: 'EC$',
            amount: inv.totalAmount
          };
        })
    ];

    return combinedInvoices.filter(invoice => {
      const matchesSearch = searchType === 'invoice' 
        ? invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
        : invoice.payerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, searchType, statusFilter, serviceInvoices]);

  const selectedInvoiceDetails = useMemo(() => {
    return mockInvoices.filter(inv => selectedInvoices.includes(inv.id));
  }, [selectedInvoices]);

  const totalAmount = useMemo(() => {
    return selectedInvoiceDetails.reduce((sum, inv) => sum + inv.balanceAmount, 0);
  }, [selectedInvoiceDetails]);

  useEffect(() => {
    addPaymentSplit();
  }, []);

  const addPaymentSplit = () => {
    const newSplit: PaymentSplit = {
      id: Date.now().toString(),
      currency: 'EC$',
      paymentMode: 'cash',
      amount: 0
    };
    setPaymentSplits(prev => [...prev, newSplit]);
  };

  const updatePaymentSplit = (id: string, field: keyof PaymentSplit, value: any) => {
    setPaymentSplits(prev => prev.map(split => 
      split.id === id ? { ...split, [field]: value } : split
    ));
  };

  const removePaymentSplit = (id: string) => {
    if (paymentSplits.length > 1) {
      setPaymentSplits(prev => prev.filter(split => split.id !== id));
    }
  };

  const getTotalPaymentAmount = () => {
    return paymentSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
  };

  const handleInvoiceSelection = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCP-${dateStr}-${sequence}`;
  };

  const processPayment = () => {
    if (selectedInvoices.length === 0) {
      toast.error('Please select at least one invoice to pay');
      return;
    }
    const totalPaymentAmount = getTotalPaymentAmount();
    if (totalPaymentAmount !== totalAmount || totalPaymentAmount <= 0) {
      toast.error(`Payment splits (${totalPaymentAmount.toFixed(2)}) must equal invoice total (${totalAmount.toFixed(2)})`);
      return;
    }
    for (const split of paymentSplits) {
      if (!split.amount || split.amount <= 0) {
        toast.error('All payment splits must have valid amounts');
        return;
      }
      if (split.paymentMode === 'check' && (!split.checkNumber || !split.bankName)) {
        toast.error('Check payments require check number and bank name');
        return;
      }
    }

    const receiptNumber = generateReceiptNumber();
    const now = new Date();
    const firstInvoice = selectedInvoiceDetails[0];
    
    const receiptData: ReceiptData = {
      receiptNumber,
      batchId: batchSel.selectedBatch?.batch_number || '',
      paymentDate: now,
      status: 'Completed',
      payerDetails: {
        name: firstInvoice.payerName,
        payerType: firstInvoice.payerType === 'employer' ? 'Employer' : 
                   firstInvoice.payerType === 'individual' ? 'Individual' : 
                   firstInvoice.payerType === 'contributor' ? 'Insured Person' : 'Organization',
        address: '123 Main Street, Basseterre, St. Kitts',
        contact: '(869) 123-4567'
      },
      paymentDetails: {
        paymentType: 'Invoice Payment',
        paymentMethod: paymentSplits.map(s => s.paymentMode).join(', '),
        currency: 'EC$',
        amount: totalPaymentAmount,
        invoiceReference: selectedInvoices.join(', '),
        referenceNumber: `INV-${receiptNumber}`
      },
      paymentSplits: paymentSplits.map(split => ({
        paymentMode: split.paymentMode,
        currency: split.currency,
        amount: split.amount,
        checkNumber: split.checkNumber,
        bankName: split.bankName,
        cardReference: split.cardReference
      })),
      cashierDetails: {
        cashierId: batchSel.selectedBatch?.entered_by || 'CASH001',
        cashierName: batchSel.selectedBatch?.entered_by || 'Current User',
        terminalId: 'TERM-01',
        workstation: 'WS-MAIN-01'
      },
      organizationDetails: {
        name: 'ST KITTS AND NEVIS SOCIAL SECURITY DEPARTMENT',
        address: 'P.O. Box 96, Social Security Building, Cayon Street, Basseterre, St. Kitts',
        phone: '(869) 465-5000',
        email: 'info@socialsecurity.kn',
        website: 'www.socialsecurity.kn'
      },
      fees: selectedInvoiceDetails.map(inv => ({
        description: `Invoice ${inv.invoiceNumber} - ${inv.description}`,
        amount: inv.amount
      })),
      notes: `Payment for invoices: ${selectedInvoices.join(', ')}. Total amount: EC$ ${totalPaymentAmount.toFixed(2)}`
    };

    setCurrentReceiptData(receiptData);
    setIsReceiptPreviewOpen(true);
    
    toast.success(`Payment processed successfully. Receipt: ${receiptNumber}`);
    setSelectedInvoices([]);
    setPaymentSplits([]);
    addPaymentSplit();
    setIsPaymentDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning" | "success"> = {
      pending: 'default',
      partial: 'secondary',
      overdue: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <BatchSelectionGuard
      isLoading={batchSel.isLoading}
      isReady={batchSel.isReady}
      noBatchesAvailable={batchSel.noBatchesAvailable}
      showPopup={batchSel.showPopup}
      openBatches={batchSel.openBatches}
      canManageAllBatches={batchSel.canManageAllBatches}
      selectedBatch={batchSel.selectedBatch}
      onSelectBatch={batchSel.selectBatch}
      onChangeBatch={batchSel.changeBatch}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Search & Pay Invoices</h1>
            <p className="text-muted-foreground">Search for pending invoices and process payments</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {selectedInvoices.length} Selected
          </Badge>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {/* Search Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Invoices
            </CardTitle>
            <CardDescription>
              Search by invoice number or payer name to find pending invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search Type</Label>
                <Select value={searchType} onValueChange={(value: 'invoice' | 'payer') => setSearchType(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice Number</SelectItem>
                    <SelectItem value="payer">Payer Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search Term</Label>
                <Input
                  placeholder={searchType === 'invoice' ? 'Enter invoice number' : 'Enter payer name'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => setSearchTerm('')} variant="outline" className="w-full">Clear Search</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Results */}
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>Select invoices to process payment. Multiple invoices for the same payer can be paid together.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payer Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onCheckedChange={(checked) => handleInvoiceSelection(invoice.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="capitalize">{invoice.type}</TableCell>
                    <TableCell>{invoice.payerName}</TableCell>
                    <TableCell>{invoice.currency} {invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">{invoice.currency} {invoice.balanceAmount.toFixed(2)}</TableCell>
                    <TableCell>{invoice.dueDate}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredInvoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No invoices found matching your search criteria</div>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        {selectedInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Selected Invoices:</span>
                    <div className="font-medium">{selectedInvoices.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <div className="font-medium text-lg">EC$ {totalAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payer:</span>
                    <div className="font-medium">{selectedInvoiceDetails[0]?.payerName || 'Multiple Payers'}</div>
                  </div>
                </div>
                
                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Process Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Process Payment</DialogTitle>
                      <DialogDescription>Select payment mode and enter payment details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Payment Methods</Label>
                        <Button onClick={addPaymentSplit} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Payment
                        </Button>
                      </div>

                      {paymentSplits.map((split, index) => (
                        <Card key={split.id} className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Payment {index + 1}</h4>
                            {paymentSplits.length > 1 && (
                              <Button onClick={() => removePaymentSplit(split.id)} variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Currency</Label>
                              <Select value={split.currency} onValueChange={(value) => updatePaymentSplit(split.id, 'currency', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EC$">EC$</SelectItem>
                                  <SelectItem value="US$">US$</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Mode</Label>
                              <Select value={split.paymentMode} onValueChange={(value) => updatePaymentSplit(split.id, 'paymentMode', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="check">Check</SelectItem>
                                  <SelectItem value="card">Card</SelectItem>
                                  <SelectItem value="eft">EFT</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Amount</Label>
                              <Input
                                type="number"
                                value={split.amount || ''}
                                onChange={(e) => updatePaymentSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          {split.paymentMode === 'check' && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="space-y-2">
                                <Label>Check Number</Label>
                                <Input
                                  value={split.checkNumber || ''}
                                  onChange={(e) => updatePaymentSplit(split.id, 'checkNumber', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Bank Name</Label>
                                <Select value={split.bankName || ''} onValueChange={(value) => updatePaymentSplit(split.id, 'bankName', value)}>
                                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                                  <SelectContent>
                                    {banks.map(bank => (
                                      <SelectItem key={bank.id} value={bank.name}>{bank.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total: EC$ {getTotalPaymentAmount().toFixed(2)}</span>
                        <span className={`text-sm ${Math.abs(getTotalPaymentAmount() - totalAmount) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                          {Math.abs(getTotalPaymentAmount() - totalAmount) < 0.01 ? '✓ Balanced' : `Difference: EC$ ${(totalAmount - getTotalPaymentAmount()).toFixed(2)}`}
                        </span>
                      </div>

                      <Button onClick={processPayment} className="w-full" disabled={Math.abs(getTotalPaymentAmount() - totalAmount) >= 0.01}>
                        <Receipt className="h-4 w-4 mr-2" />
                        Confirm Payment
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Receipt Preview */}
        {currentReceiptData && (
          <ReceiptPreview
            isOpen={isReceiptPreviewOpen}
            onClose={() => setIsReceiptPreviewOpen(false)}
            receiptData={currentReceiptData}
          />
        )}
      </div>
    </BatchSelectionGuard>
  );
};

export default SearchPayInvoices;
