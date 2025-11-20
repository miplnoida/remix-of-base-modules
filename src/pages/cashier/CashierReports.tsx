import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, Download, CalendarIcon, Printer, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CashierReports = () => {
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date()
  });
  const [selectedBatch, setSelectedBatch] = useState('');
  const [reportType, setReportType] = useState('daily');

  // Sample data for demonstration
  const dailyReceipts = [
    { receiptNo: 'RCP-20241225-0001', time: '09:15', payer: 'John Smith', type: 'Social Security Contributions', mode: 'Cash', currency: 'XCD', amount: 450.00 },
    { receiptNo: 'RCP-20241225-0002', time: '09:32', payer: 'Mary Johnson', type: 'Rent - Recurring', mode: 'Check', currency: 'XCD', amount: 800.00 },
    { receiptNo: 'RCP-20241225-0003', time: '10:15', payer: 'Robert Davis', type: 'Levy Contributions', mode: 'Card', currency: 'US$', amount: 275.50 },
    { receiptNo: 'RCP-20241225-0004', time: '10:45', payer: 'Sarah Wilson', type: 'Loan Repayments', mode: 'Online', currency: 'XCD', amount: 1200.00 },
    { receiptNo: 'RCP-20241225-0005', time: '11:20', payer: 'Michael Brown', type: 'Miscellaneous Invoice', mode: 'Cash', currency: 'XCD', amount: 85.00 },
  ];

  const checkRegister = [
    { checkNo: '001234', bank: 'Bank of Nova Scotia', payer: 'Mary Johnson', employer: 'ABC Company Ltd', invoiceRef: 'INV-2024-001', amount: 800.00, currency: 'XCD', status: 'Cleared' },
    { checkNo: '005678', bank: 'FirstCaribbean International', payer: 'David Thompson', employer: 'XYZ Corporation', invoiceRef: 'INV-2024-002', amount: 1500.00, currency: 'XCD', status: 'Pending' },
    { checkNo: '002468', bank: 'Antigua Commercial Bank', payer: 'Lisa Anderson', employer: 'DEF Industries', invoiceRef: 'INV-2024-003', amount: 400.00, currency: 'US$', status: 'Returned' },
  ];

  const denominationData = {
    ec: [
      { denomination: '100', count: 15, total: 1500.00 },
      { denomination: '50', count: 8, total: 400.00 },
      { denomination: '20', count: 12, total: 240.00 },
      { denomination: '10', count: 25, total: 250.00 },
      { denomination: '5', count: 10, total: 50.00 },
      { denomination: '2', count: 15, total: 30.00 },
      { denomination: '1', count: 20, total: 20.00 },
      { denomination: '25¢', count: 40, total: 10.00 },
      { denomination: '10¢', count: 35, total: 3.50 },
      { denomination: '5¢', count: 20, total: 1.00 },
      { denomination: '1¢', count: 15, total: 0.15 },
    ],
    us: [
      { denomination: '100', count: 5, total: 500.00 },
      { denomination: '50', count: 3, total: 150.00 },
      { denomination: '20', count: 8, total: 160.00 },
      { denomination: '10', count: 12, total: 120.00 },
      { denomination: '5', count: 6, total: 30.00 },
      { denomination: '1', count: 25, total: 25.00 },
      { denomination: '25¢', count: 20, total: 5.00 },
      { denomination: '10¢', count: 15, total: 1.50 },
      { denomination: '5¢', count: 10, total: 0.50 },
      { denomination: '1¢', count: 8, total: 0.08 },
    ]
  };

  const glSummary = [
    { account: '1001 - Cash in Hand', debit: 2504.65, credit: 0.00 },
    { account: '1100 - Bank - Current Account', debit: 1475.50, credit: 0.00 },
    { account: '4001 - Social Security Revenue', debit: 0.00, credit: 1650.00 },
    { account: '4002 - Levy Revenue', debit: 0.00, credit: 825.50 },
    { account: '4003 - Rent Revenue', debit: 0.00, credit: 800.00 },
    { account: '2001 - Loan Payable', debit: 0.00, credit: 1200.00 },
    { account: '4999 - Miscellaneous Revenue', debit: 0.00, credit: 85.00 },
  ];

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency}$ ${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cashier Reports</h1>
            <p className="text-gray-600">Daily reports and reconciliation documents</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Reports
            </Button>
          </div>
        </div>

        {/* Report Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Reports</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                    <SelectItem value="monthly">Monthly Summary</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date || new Date() }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date || new Date() }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Batch ID</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Batches</SelectItem>
                    <SelectItem value="BATCH-2024-12-25-001">BATCH-2024-12-25-001</SelectItem>
                    <SelectItem value="BATCH-2024-12-24-001">BATCH-2024-12-24-001</SelectItem>
                    <SelectItem value="BATCH-2024-12-23-001">BATCH-2024-12-23-001</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
              <Button variant="outline">
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Tabs defaultValue="receipts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="receipts">Daily Receipts</TabsTrigger>
            <TabsTrigger value="checks">Check Register</TabsTrigger>
            <TabsTrigger value="denominations">Cash Count</TabsTrigger>
            <TabsTrigger value="balancing">Balancing Sheet</TabsTrigger>
            <TabsTrigger value="gl">GL Summary</TabsTrigger>
          </TabsList>

          {/* Daily Receipts Report */}
          <TabsContent value="receipts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daily Receipts Report</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">{dailyReceipts.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total EC$</p>
                    <p className="text-2xl font-bold">EC$ 2,535.00</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total US$</p>
                    <p className="text-2xl font-bold">US$ 275.50</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyReceipts.map((receipt) => (
                      <TableRow key={receipt.receiptNo}>
                        <TableCell className="font-mono">{receipt.receiptNo}</TableCell>
                        <TableCell>{receipt.time}</TableCell>
                        <TableCell>{receipt.payer}</TableCell>
                        <TableCell className="text-sm">{receipt.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{receipt.mode}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(receipt.amount, receipt.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Check Register */}
          <TabsContent value="checks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Check Register</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check No.</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Invoice Ref</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkRegister.map((check) => (
                      <TableRow key={check.checkNo}>
                        <TableCell className="font-mono">{check.checkNo}</TableCell>
                        <TableCell>{check.bank}</TableCell>
                        <TableCell>{check.payer}</TableCell>
                        <TableCell>{check.employer}</TableCell>
                        <TableCell className="font-mono">{check.invoiceRef}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(check.amount, check.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              check.status === 'Cleared' ? 'default' : 
                              check.status === 'Pending' ? 'warning' : 'destructive'
                            }
                          >
                            {check.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Denominations */}
          <TabsContent value="denominations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>EC$ Denomination Summary</CardTitle>
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Denomination</TableHead>
                        <TableHead className="text-center">Count</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {denominationData.ec.map((item) => (
                        <TableRow key={item.denomination}>
                          <TableCell>EC$ {item.denomination}</TableCell>
                          <TableCell className="text-center">{item.count}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center">
                          {denominationData.ec.reduce((sum, item) => sum + item.count, 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          EC$ {denominationData.ec.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>US$ Denomination Summary</CardTitle>
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Denomination</TableHead>
                        <TableHead className="text-center">Count</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {denominationData.us.map((item) => (
                        <TableRow key={item.denomination}>
                          <TableCell>US$ {item.denomination}</TableCell>
                          <TableCell className="text-center">{item.count}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center">
                          {denominationData.us.reduce((sum, item) => sum + item.count, 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          US$ {denominationData.us.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Balancing Sheet */}
          <TabsContent value="balancing">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cashier Balancing Sheet</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">System Totals</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Cash EC$:</span>
                        <span>EC$ 2,504.65</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash US$:</span>
                        <span>US$ 992.08</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Card EC$:</span>
                        <span>EC$ 500.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Card US$:</span>
                        <span>US$ 0.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check EC$:</span>
                        <span>EC$ 2,300.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check US$:</span>
                        <span>US$ 400.00</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Physical Count</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Cash EC$:</span>
                        <span>EC$ 2,504.65</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash US$:</span>
                        <span>US$ 992.08</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Card EC$:</span>
                        <span>EC$ 500.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Card US$:</span>
                        <span>US$ 0.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check EC$:</span>
                        <span>EC$ 2,300.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check US$:</span>
                        <span>US$ 400.00</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-green-800">Batch Status:</span>
                    <Badge className="bg-green-600">Balanced ✓</Badge>
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    All amounts match. No variances detected.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GL Summary */}
          <TabsContent value="gl">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>General Ledger Posting Summary</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {glSummary.map((account, index) => (
                      <TableRow key={index}>
                        <TableCell>{account.account}</TableCell>
                        <TableCell className="text-right font-mono">
                          {account.debit > 0 ? account.debit.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {account.credit > 0 ? account.credit.toFixed(2) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>Totals</TableCell>
                      <TableCell className="text-right">
                        {glSummary.reduce((sum, acc) => sum + acc.debit, 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {glSummary.reduce((sum, acc) => sum + acc.credit, 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Journal entries will be automatically posted to Sage upon batch lock confirmation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CashierReports;