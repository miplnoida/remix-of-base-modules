import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Eye, Download } from 'lucide-react';
import { getAPPayments, getAPInvoices } from '@/services/apBenefitsService';

export default function PaymentInquiry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const payments = getAPPayments();
  const invoices = getAPInvoices();

  const filtered = payments.filter(payment => {
    const invoice = invoices.find(inv => inv.id === payment.apInvoiceId);
    if (!invoice) return false;

    const matchesSearch = 
      invoice.payeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.chequeNumber && payment.chequeNumber.includes(searchTerm));

    const matchesMethod = paymentMethod === 'ALL' || payment.paymentMethod === paymentMethod;

    const matchesDate = 
      (!dateFrom || payment.paymentDate >= dateFrom) &&
      (!dateTo || payment.paymentDate <= dateTo);

    return matchesSearch && matchesMethod && matchesDate;
  });

  const getInvoiceForPayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    return payment ? invoices.find(inv => inv.id === payment.apInvoiceId) : undefined;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Benefit Payment Inquiry</h1>
        <p className="text-muted-foreground mt-1">Search and view all benefit payments</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="col-span-2 space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search by name, payment ID, or cheque number..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Methods</SelectItem>
                <SelectItem value="EFT">EFT</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Payee Name</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Cheque/EFT Reference</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => {
                const invoice = getInvoiceForPayment(payment.id);
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{invoice?.payeeName || 'N/A'}</TableCell>
                    <TableCell>{invoice?.reference.split('-')[0] || 'N/A'}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>
                      {payment.paymentMethod === 'CHEQUE' && payment.chequeNumber}
                      {payment.paymentMethod === 'EFT' && payment.eftBatchId}
                      {payment.paymentMethod === 'CASH' && 'N/A'}
                    </TableCell>
                    <TableCell>{payment.paymentDate}</TableCell>
                    <TableCell className="text-right">XCD ${invoice?.amount.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'SENT' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
