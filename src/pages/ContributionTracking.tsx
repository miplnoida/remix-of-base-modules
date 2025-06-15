
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calendar, Search, Filter, Download, Eye } from 'lucide-react';

interface ContributionRecord {
  id: string;
  employerId: string;
  employerName: string;
  period: string;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  dueDate: string;
  paidDate?: string;
}

const mockContributionData: ContributionRecord[] = [
  {
    id: 'CT001',
    employerId: 'EMP001',
    employerName: 'TechCorp Ltd',
    period: 'April 2024',
    employeeContribution: 15000,
    employerContribution: 18000,
    totalContribution: 33000,
    status: 'paid',
    dueDate: '2024-04-15',
    paidDate: '2024-04-12'
  },
  {
    id: 'CT002',
    employerId: 'EMP002',
    employerName: 'Manufacturing Inc',
    period: 'April 2024',
    employeeContribution: 25000,
    employerContribution: 30000,
    totalContribution: 55000,
    status: 'overdue',
    dueDate: '2024-04-15'
  },
  {
    id: 'CT003',
    employerId: 'EMP003',
    employerName: 'Service Solutions',
    period: 'April 2024',
    employeeContribution: 8000,
    employerContribution: 9600,
    totalContribution: 17600,
    status: 'pending',
    dueDate: '2024-04-20'
  }
];

const ContributionTracking = () => {
  const [filters, setFilters] = useState({
    employerId: '',
    employerName: '',
    period: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      'paid': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'overdue': 'bg-red-100 text-red-800',
      'partial': 'bg-orange-100 text-orange-800'
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalContributions = mockContributionData.reduce((sum, record) => sum + record.totalContribution, 0);
  const paidContributions = mockContributionData
    .filter(record => record.status === 'paid')
    .reduce((sum, record) => sum + record.totalContribution, 0);
  const pendingContributions = mockContributionData
    .filter(record => record.status === 'pending' || record.status === 'overdue')
    .reduce((sum, record) => sum + record.totalContribution, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contributions</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalContributions)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(paidContributions)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending/Overdue</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(pendingContributions)}</p>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {((paidContributions / totalContributions) * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="employer-id">Employer ID</Label>
              <Input
                id="employer-id"
                placeholder="Enter Employer ID"
                value={filters.employerId}
                onChange={(e) => setFilters(prev => ({ ...prev, employerId: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="employer-name">Employer Name</Label>
              <Input
                id="employer-name"
                placeholder="Enter Employer Name"
                value={filters.employerName}
                onChange={(e) => setFilters(prev => ({ ...prev, employerName: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="2024-04">April 2024</SelectItem>
                  <SelectItem value="2024-03">March 2024</SelectItem>
                  <SelectItem value="2024-02">February 2024</SelectItem>
                  <SelectItem value="2024-01">January 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">Date From</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="date-to">Date To</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onClick={() => setFilters({ employerId: '', employerName: '', period: '', status: '', dateFrom: '', dateTo: '' })}>
              Clear Filters
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contribution Records */}
      <Card>
        <CardHeader>
          <CardTitle>Contribution Records ({mockContributionData.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Employer ID</th>
                  <th className="text-left p-2">Employer Name</th>
                  <th className="text-left p-2">Period</th>
                  <th className="text-left p-2">Employee Contribution</th>
                  <th className="text-left p-2">Employer Contribution</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Due Date</th>
                  <th className="text-left p-2">Paid Date</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockContributionData.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{record.employerId}</td>
                    <td className="p-2">{record.employerName}</td>
                    <td className="p-2">{record.period}</td>
                    <td className="p-2">{formatCurrency(record.employeeContribution)}</td>
                    <td className="p-2">{formatCurrency(record.employerContribution)}</td>
                    <td className="p-2 font-medium">{formatCurrency(record.totalContribution)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2">{record.dueDate}</td>
                    <td className="p-2">{record.paidDate || '-'}</td>
                    <td className="p-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContributionTracking;
