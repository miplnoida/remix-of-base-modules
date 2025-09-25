import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Receipt, Download, Eye, Filter } from 'lucide-react';
import { BackNavigation } from '@/components/ui/back-navigation';

const ContributionReceipts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('');

  // Mock data for contribution receipts
  const receipts = [
    {
      id: 'CR-2024-001',
      employerName: 'ABC Construction Ltd',
      employerCode: 'EMP001',
      contributionPeriod: '2024-01',
      amount: 15450.00,
      employees: 25,
      dateReceived: '2024-01-15',
      status: 'processed',
      receiptNumber: 'REC-240001'
    },
    {
      id: 'CR-2024-002',
      employerName: 'XYZ Manufacturing',
      employerCode: 'EMP002',
      contributionPeriod: '2024-01',
      amount: 32750.50,
      employees: 45,
      dateReceived: '2024-01-16',
      status: 'pending',
      receiptNumber: 'REC-240002'
    },
    {
      id: 'CR-2024-003',
      employerName: 'Secure Services Inc',
      employerCode: 'EMP003',
      contributionPeriod: '2024-01',
      amount: 8900.00,
      employees: 12,
      dateReceived: '2024-01-18',
      status: 'processed',
      receiptNumber: 'REC-240003'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Processed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.employerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6">
      <BackNavigation />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contribution Receipts</h1>
        <p className="text-gray-600 mt-2">Manage social security contribution receipts from employers</p>
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
                  placeholder="Employer name, code, or receipt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Input
                id="dateRange"
                type="month"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              />
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
            <div className="text-2xl font-bold">$57,100.50</div>
            <p className="text-sm text-gray-600">Total Contributions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">82</div>
            <p className="text-sm text-gray-600">Total Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">3</div>
            <p className="text-sm text-gray-600">Total Receipts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">2</div>
            <p className="text-sm text-gray-600">Processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Contribution Receipts
          </CardTitle>
          <CardDescription>
            View and manage contribution receipts from registered employers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date Received</TableHead>
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
                        <div className="font-medium">{receipt.employerName}</div>
                        <div className="text-sm text-gray-500">{receipt.employerCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>{receipt.contributionPeriod}</TableCell>
                    <TableCell>{receipt.employees}</TableCell>
                    <TableCell>${receipt.amount.toLocaleString()}</TableCell>
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

export default ContributionReceipts;