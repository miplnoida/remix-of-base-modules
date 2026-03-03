import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Download, Eye, Filter, FileText } from 'lucide-react';
import { BackNavigation } from '@/components/ui/back-navigation';

const ServiceReceipts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceType, setServiceType] = useState('all');

  // Mock data for service receipts
  const receipts = [
    {
      id: 'SR-2024-001',
      clientName: 'Michael Thompson',
      clientType: 'individual',
      serviceType: 'certificate',
      serviceDescription: 'Employment History Certificate',
      amount: 25.00,
      dateRequested: '2024-01-15',
      dateCompleted: '2024-01-16',
      status: 'completed',
      receiptNumber: 'SVC-240001',
      staffMember: 'Jane Doe'
    },
    {
      id: 'SR-2024-002',
      clientName: 'ABC Construction Ltd',
      clientType: 'employer',
      serviceType: 'verification',
      serviceDescription: 'Employee Contribution Verification',
      amount: 50.00,
      dateRequested: '2024-01-18',
      dateCompleted: null,
      status: 'processing',
      receiptNumber: 'SVC-240002',
      staffMember: 'Bob Wilson'
    },
    {
      id: 'SR-2024-003',
      clientName: 'Sarah Johnson',
      clientType: 'individual',
      serviceType: 'statement',
      serviceDescription: 'Contribution Statement (10 years)',
      amount: 15.00,
      dateRequested: '2024-01-20',
      dateCompleted: '2024-01-20',
      status: 'completed',
      receiptNumber: 'SVC-240003',
      staffMember: 'Alice Smith'
    },
    {
      id: 'SR-2024-004',
      clientName: 'XYZ Medical Center',
      clientType: 'employer',
      serviceType: 'compliance',
      serviceDescription: 'Compliance Audit Report',
      amount: 150.00,
      dateRequested: '2024-01-22',
      dateCompleted: null,
      status: 'pending',
      receiptNumber: 'SVC-240004',
      staffMember: 'Tom Brown'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-success/10 text-success">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-info/10 text-info">Processing</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/15 text-warning">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceTypeBadge = (type: string) => {
    const colors = {
      certificate: 'bg-info/10 text-info',
      verification: 'bg-success/10 text-success',
      statement: 'bg-accent text-accent-foreground',
      compliance: 'bg-warning/15 text-warning',
      appeal: 'bg-destructive/10 text-destructive'
    };
    return <Badge variant="outline" className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  const getClientTypeBadge = (type: string) => {
    return type === 'individual' ? 
      <Badge variant="outline" className="bg-muted text-muted-foreground">Individual</Badge> :
      <Badge variant="outline" className="bg-info/10 text-info">Employer</Badge>;
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    const matchesServiceType = serviceType === 'all' || receipt.serviceType === serviceType;
    return matchesSearch && matchesStatus && matchesServiceType;
  });

  return (
    <div className="container mx-auto p-6">
      <BackNavigation />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Service Receipts</h1>
        <p className="text-muted-foreground mt-2">Manage administrative service fees and document processing receipts</p>
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Client, service, receipt #..."
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="serviceType">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="verification">Verification</SelectItem>
                  <SelectItem value="statement">Statement</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="appeal">Appeal</SelectItem>
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
            <div className="text-2xl font-bold">$240.00</div>
            <p className="text-sm text-muted-foreground">Total Service Fees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">4</div>
            <p className="text-sm text-muted-foreground">Service Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">2</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">2</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Service Receipts
          </CardTitle>
          <CardDescription>
            Administrative service fees for certificates, verifications, and document processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Staff</TableHead>
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
                        <div className="font-medium">{receipt.clientName}</div>
                        <div className="text-xs">{getClientTypeBadge(receipt.clientType)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{receipt.serviceDescription}</div>
                    </TableCell>
                    <TableCell>{getServiceTypeBadge(receipt.serviceType)}</TableCell>
                    <TableCell>${receipt.amount.toLocaleString()}</TableCell>
                    <TableCell>{receipt.dateRequested}</TableCell>
                    <TableCell>{receipt.dateCompleted || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">{receipt.staffMember}</div>
                    </TableCell>
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
                          <FileText className="h-4 w-4" />
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

export default ServiceReceipts;