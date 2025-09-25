import React, { useState, useMemo } from 'react';
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
import { Search, CreditCard, Receipt, DollarSign } from 'lucide-react';
import { mockInvoices } from '@/data/mockInvoices';
import { Invoice } from '@/types/invoice';

const SearchPayInvoices: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'invoice' | 'payer'>('invoice');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'check' | 'card' | 'eft'>('cash');
  const [checkDetails, setCheckDetails] = useState({
    checkNumber: '',
    bankName: '',
    checkDate: ''
  });
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const filteredInvoices = useMemo(() => {
    return mockInvoices.filter(invoice => {
      const matchesSearch = searchType === 'invoice' 
        ? invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
        : invoice.payerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus && invoice.status !== 'paid';
    });
  }, [searchTerm, searchType, statusFilter]);

  const selectedInvoiceDetails = useMemo(() => {
    return mockInvoices.filter(inv => selectedInvoices.includes(inv.id));
  }, [selectedInvoices]);

  const totalAmount = useMemo(() => {
    return selectedInvoiceDetails.reduce((sum, inv) => sum + inv.balanceAmount, 0);
  }, [selectedInvoiceDetails]);

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

    if (paymentMode === 'check' && (!checkDetails.checkNumber || !checkDetails.bankName)) {
      toast.error('Please provide check number and bank name');
      return;
    }

    const receiptNumber = generateReceiptNumber();
    
    // Process payment logic here
    toast.success(`Payment processed successfully. Receipt: ${receiptNumber}`);
    
    // Reset selections
    setSelectedInvoices([]);
    setCheckDetails({ checkNumber: '', bankName: '', checkDate: '' });
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={() => setSearchTerm('')} variant="outline" className="w-full">
                Clear Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Results */}
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            Select invoices to process payment. Multiple invoices for the same payer can be paid together.
          </CardDescription>
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
            <div className="text-center py-8 text-muted-foreground">
              No invoices found matching your search criteria
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Invoices Summary */}
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
                    <DialogDescription>
                      Select payment mode and enter payment details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Payment Mode</Label>
                      <Select value={paymentMode} onValueChange={(value: any) => setPaymentMode(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="eft">EFT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {paymentMode === 'check' && (
                      <>
                        <div className="space-y-2">
                          <Label>Check Number</Label>
                          <Input
                            value={checkDetails.checkNumber}
                            onChange={(e) => setCheckDetails(prev => ({ ...prev, checkNumber: e.target.value }))}
                            placeholder="Enter check number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bank Name</Label>
                          <Input
                            value={checkDetails.bankName}
                            onChange={(e) => setCheckDetails(prev => ({ ...prev, bankName: e.target.value }))}
                            placeholder="Enter bank name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Check Date</Label>
                          <Input
                            type="date"
                            value={checkDetails.checkDate}
                            onChange={(e) => setCheckDetails(prev => ({ ...prev, checkDate: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span>EC$ {totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={processPayment} className="flex-1">
                        <Receipt className="h-4 w-4 mr-2" />
                        Confirm Payment
                      </Button>
                      <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchPayInvoices;