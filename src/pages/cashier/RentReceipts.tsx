import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Building, Download, Eye, Filter } from 'lucide-react';
import { BackNavigation } from '@/components/ui/back-navigation';

const RentReceipts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyType, setPropertyType] = useState('all');

  // Mock data for rent receipts
  const receipts = [
    {
      id: 'RR-2024-001',
      tenantName: 'ABC Company Ltd',
      propertyAddress: '123 Main Street, Port of Spain',
      propertyType: 'office',
      monthlyRent: 8500.00,
      period: '2024-01',
      dateReceived: '2024-01-05',
      status: 'received',
      receiptNumber: 'RENT-240001'
    },
    {
      id: 'RR-2024-002',
      tenantName: 'XYZ Medical Center',
      propertyAddress: '456 Health Ave, San Fernando',
      propertyType: 'commercial',
      monthlyRent: 12000.00,
      period: '2024-01',
      dateReceived: '2024-01-08',
      status: 'overdue',
      receiptNumber: 'RENT-240002'
    },
    {
      id: 'RR-2024-003',
      tenantName: 'TechStart Solutions',
      propertyAddress: '789 Innovation Blvd, Chaguanas',
      propertyType: 'warehouse',
      monthlyRent: 6750.00,
      period: '2024-01',
      dateReceived: '2024-01-10',
      status: 'received',
      receiptNumber: 'RENT-240003'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="default" className="bg-green-100 text-green-800">Received</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPropertyTypeBadge = (type: string) => {
    const colors = {
      office: 'bg-blue-100 text-blue-800',
      commercial: 'bg-purple-100 text-purple-800',
      warehouse: 'bg-orange-100 text-orange-800',
      residential: 'bg-green-100 text-green-800'
    };
    return <Badge variant="outline" className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    const matchesProperty = propertyType === 'all' || receipt.propertyType === propertyType;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  return (
    <div className="container mx-auto p-6">
      <BackNavigation />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Rent Receipts</h1>
        <p className="text-gray-600 mt-2">Manage property rental income and receipts</p>
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
                  placeholder="Tenant, property, or receipt..."
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
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
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
            <div className="text-2xl font-bold">$27,250.00</div>
            <p className="text-sm text-gray-600">Total Rent Collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">3</div>
            <p className="text-sm text-gray-600">Active Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">2</div>
            <p className="text-sm text-gray-600">Payments Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">1</div>
            <p className="text-sm text-gray-600">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Rent Receipts
          </CardTitle>
          <CardDescription>
            Track rental income from SSAS properties and commercial spaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
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
                      <div className="font-medium">{receipt.tenantName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{receipt.propertyAddress}</div>
                    </TableCell>
                    <TableCell>{getPropertyTypeBadge(receipt.propertyType)}</TableCell>
                    <TableCell>${receipt.monthlyRent.toLocaleString()}</TableCell>
                    <TableCell>{receipt.period}</TableCell>
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

export default RentReceipts;