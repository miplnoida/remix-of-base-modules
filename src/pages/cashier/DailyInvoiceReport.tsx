import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Calendar, DollarSign, TrendingUp, Download, Filter } from 'lucide-react';
import { mockInvoices } from '@/data/mockInvoices';

const DailyInvoiceReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter invoices by selected date and filters
  const todaysInvoices = useMemo(() => {
    return mockInvoices.filter(invoice => {
      const invoiceDate = new Date(invoice.createdDate).toISOString().slice(0, 10);
      const matchesDate = invoiceDate === selectedDate;
      const matchesType = filterType === 'all' || invoice.type === filterType;
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      
      return matchesDate && matchesType && matchesStatus;
    });
  }, [selectedDate, filterType, filterStatus]);

  const paidInvoices = useMemo(() => {
    return todaysInvoices.filter(invoice => invoice.status === 'paid');
  }, [todaysInvoices]);

  const pendingInvoices = useMemo(() => {
    return todaysInvoices.filter(invoice => invoice.status !== 'paid');
  }, [todaysInvoices]);

  // Calculate summary statistics
  const totalCreated = todaysInvoices.length;
  const totalPaid = paidInvoices.length;
  const totalAmount = todaysInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const pendingAmount = todaysInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

  // Group by type for analysis
  const invoicesByType = useMemo(() => {
    const grouped = todaysInvoices.reduce((acc, invoice) => {
      if (!acc[invoice.type]) {
        acc[invoice.type] = { count: 0, amount: 0, paid: 0 };
      }
      acc[invoice.type].count += 1;
      acc[invoice.type].amount += invoice.amount;
      acc[invoice.type].paid += invoice.paidAmount;
      return acc;
    }, {} as Record<string, { count: number; amount: number; paid: number }>);
    
    return Object.entries(grouped).map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      ...data
    }));
  }, [todaysInvoices]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning" | "success"> = {
      pending: 'default',
      partial: 'secondary',
      paid: 'success',
      overdue: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const exportReport = () => {
    toast.success('Report exported successfully');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Invoice Report</h1>
          <p className="text-muted-foreground">Comprehensive overview of invoice creation and payment activity</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contribution">Contribution</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setFilterType('all');
                  setFilterStatus('all');
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalCreated}</div>
                <div className="text-sm text-muted-foreground">Invoices Created</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{totalPaid}</div>
                <div className="text-sm text-muted-foreground">Invoices Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">EC$ {paidAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Amount Collected</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">EC$ {pendingAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Outstanding</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Created vs Paid Analysis</CardTitle>
          <CardDescription>Comparison of invoice creation and payment activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalCreated}</div>
                <div className="text-sm text-muted-foreground">Total Created</div>
                <div className="text-xs text-gray-500">EC$ {totalAmount.toFixed(2)}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalPaid}</div>
                <div className="text-sm text-muted-foreground">Total Paid</div>
                <div className="text-xs text-gray-500">EC$ {paidAmount.toFixed(2)}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{totalCreated - totalPaid}</div>
                <div className="text-sm text-muted-foreground">Outstanding</div>
                <div className="text-xs text-gray-500">EC$ {pendingAmount.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Collection Rate:</span>
                <span className="font-semibold">
                  {totalCreated > 0 ? ((totalPaid / totalCreated) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Amount Collection Rate:</span>
                <span className="font-semibold">
                  {totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid Amount</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Collection Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesByType.map((typeData) => (
                <TableRow key={typeData.type}>
                  <TableCell className="font-medium">{typeData.type}</TableCell>
                  <TableCell>{typeData.count}</TableCell>
                  <TableCell>EC$ {typeData.amount.toFixed(2)}</TableCell>
                  <TableCell>EC$ {typeData.paid.toFixed(2)}</TableCell>
                  <TableCell>EC$ {(typeData.amount - typeData.paid).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${typeData.amount > 0 && (typeData.paid / typeData.amount) > 0.8 ? 'text-green-600' : 'text-orange-600'}`}>
                      {typeData.amount > 0 ? ((typeData.paid / typeData.amount) * 100).toFixed(1) : 0}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Invoice Lists */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Invoices ({totalCreated})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({totalPaid})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({totalCreated - totalPaid})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices for {selectedDate}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="capitalize">{invoice.type}</TableCell>
                      <TableCell>{invoice.payerName}</TableCell>
                      <TableCell>{invoice.currency} {invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{invoice.currency} {invoice.paidAmount.toFixed(2)}</TableCell>
                      <TableCell>{invoice.currency} {invoice.balanceAmount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {todaysInvoices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices found for the selected date and filters
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="paid">
          <Card>
            <CardHeader>
              <CardTitle>Paid Invoices for {selectedDate}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="capitalize">{invoice.type}</TableCell>
                      <TableCell>{invoice.payerName}</TableCell>
                      <TableCell>{invoice.currency} {invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{invoice.paidDate || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invoices for {selectedDate}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="capitalize">{invoice.type}</TableCell>
                      <TableCell>{invoice.payerName}</TableCell>
                      <TableCell>{invoice.currency} {invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{invoice.currency} {invoice.balanceAmount.toFixed(2)}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DailyInvoiceReport;