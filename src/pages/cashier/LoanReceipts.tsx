import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Banknote, Download, Eye, Filter, Calculator } from 'lucide-react';
import { BackNavigation } from '@/components/ui/back-navigation';

const LoanReceipts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loanType, setLoanType] = useState('all');

  // Mock data for loan receipts
  const receipts = [
    {
      id: 'LR-2024-001',
      borrowerName: 'John Smith',
      ssn: '123-456-789',
      loanType: 'emergency',
      loanNumber: 'LOAN-2024-001',
      paymentAmount: 550.00,
      principalAmount: 450.00,
      interestAmount: 100.00,
      outstandingBalance: 4500.00,
      dateReceived: '2024-01-15',
      status: 'current',
      receiptNumber: 'LRP-240001'
    },
    {
      id: 'LR-2024-002',
      borrowerName: 'Maria Rodriguez',
      ssn: '987-654-321',
      loanType: 'housing',
      loanNumber: 'LOAN-2024-002',
      paymentAmount: 1200.00,
      principalAmount: 1000.00,
      interestAmount: 200.00,
      outstandingBalance: 15000.00,
      dateReceived: '2024-01-18',
      status: 'current',
      receiptNumber: 'LRP-240002'
    },
    {
      id: 'LR-2024-003',
      borrowerName: 'David Johnson',
      ssn: '456-789-123',
      loanType: 'education',
      loanNumber: 'LOAN-2024-003',
      paymentAmount: 350.00,
      principalAmount: 300.00,
      interestAmount: 50.00,
      outstandingBalance: 2800.00,
      dateReceived: '2024-01-20',
      status: 'late',
      receiptNumber: 'LRP-240003'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge variant="default" className="bg-green-100 text-green-800">Current</Badge>;
      case 'late':
        return <Badge variant="destructive">Late</Badge>;
      case 'delinquent':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Delinquent</Badge>;
      case 'paid_off':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Paid Off</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLoanTypeBadge = (type: string) => {
    const colors = {
      emergency: 'bg-red-100 text-red-800',
      housing: 'bg-blue-100 text-blue-800',
      education: 'bg-green-100 text-green-800',
      medical: 'bg-purple-100 text-purple-800'
    };
    return <Badge variant="outline" className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.ssn.includes(searchTerm) ||
                         receipt.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    const matchesLoanType = loanType === 'all' || receipt.loanType === loanType;
    return matchesSearch && matchesStatus && matchesLoanType;
  });

  return (
    <div className="container mx-auto p-6">
      <BackNavigation />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Loan Receipts</h1>
        <p className="text-gray-600 mt-2">Manage loan repayment receipts and payment tracking</p>
      </div>

      {/* Search and Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Name, SSN, loan #, receipt #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Payment Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="delinquent">Delinquent</SelectItem>
                  <SelectItem value="paid_off">Paid Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="loanType">Loan Type</Label>
              <Select value={loanType} onValueChange={setLoanType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">$2,100.00</div>
            <p className="text-sm text-gray-600">Total Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">$1,750.00</div>
            <p className="text-sm text-gray-600">Principal Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">$350.00</div>
            <p className="text-sm text-gray-600">Interest Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">$22,300.00</div>
            <p className="text-sm text-gray-600">Outstanding Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Loan Payment Receipts
          </CardTitle>
          <CardDescription>
            Track loan repayments from SSAS benefit recipients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Payment Amount</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{receipt.borrowerName}</div>
                        <div className="text-sm text-gray-500">{receipt.ssn}</div>
                        <div className="text-xs text-gray-400">{receipt.loanNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getLoanTypeBadge(receipt.loanType)}</TableCell>
                    <TableCell>${receipt.paymentAmount.toLocaleString()}</TableCell>
                    <TableCell>${receipt.principalAmount.toLocaleString()}</TableCell>
                    <TableCell>${receipt.interestAmount.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">${receipt.outstandingBalance.toLocaleString()}</TableCell>
                    <TableCell>{receipt.dateReceived}</TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanReceipts;