
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Home, Search, Download, FileText, Calendar, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const ClaimHistory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    ssn: '',
    claimType: '',
    status: '',
    year: ''
  });

  // Mock claims data
  const claimsData = [
    {
      id: 1,
      claimNumber: 'CLM-2024-001',
      ssn: '123456',
      claimantName: 'John Doe',
      claimType: 'Sickness Benefit',
      dateSubmitted: '2024-01-15',
      dateProcessed: '2024-01-20',
      claimAmount: 2500.00,
      approvedAmount: 2200.00,
      status: 'Approved',
      reason: 'Medical certificate provided',
      paymentDate: '2024-01-25'
    },
    {
      id: 2,
      claimNumber: 'CLM-2024-002',
      ssn: '123456',
      claimantName: 'John Doe',
      claimType: 'Maternity Benefit',
      dateSubmitted: '2024-03-10',
      dateProcessed: '2024-03-15',
      claimAmount: 5000.00,
      approvedAmount: 5000.00,
      status: 'Approved',
      reason: 'All documents verified',
      paymentDate: '2024-03-20'
    },
    {
      id: 3,
      claimNumber: 'CLM-2024-003',
      ssn: '789012',
      claimantName: 'Jane Smith',
      claimType: 'Unemployment Benefit',
      dateSubmitted: '2024-05-05',
      dateProcessed: '2024-05-10',
      claimAmount: 8000.00,
      approvedAmount: 0.00,
      status: 'Rejected',
      reason: 'Insufficient contribution period',
      paymentDate: ''
    },
    {
      id: 4,
      claimNumber: 'CLM-2024-004',
      ssn: '789012',
      claimantName: 'Jane Smith',
      claimType: 'Work Injury Benefit',
      dateSubmitted: '2024-06-20',
      dateProcessed: '',
      claimAmount: 12000.00,
      approvedAmount: 0.00,
      status: 'Under Review',
      reason: 'Awaiting medical assessment',
      paymentDate: ''
    },
    {
      id: 5,
      claimNumber: 'CLM-2024-005',
      ssn: '456789',
      claimantName: 'Mike Johnson',
      claimType: 'Death Benefit',
      dateSubmitted: '2024-07-01',
      dateProcessed: '2024-07-08',
      claimAmount: 15000.00,
      approvedAmount: 15000.00,
      status: 'Approved',
      reason: 'All documents provided',
      paymentDate: '2024-07-15'
    }
  ];

  const handleSearch = () => {
    console.log('Searching claims with parameters:', searchParams);
  };

  const handleExport = () => {
    console.log('Exporting claims data');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>;
      case 'Rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Rejected
        </Badge>;
      case 'Under Review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Under Review
        </Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD'
    }).format(amount);
  };

  const claimTypes = [
    'Sickness Benefit',
    'Maternity Benefit',
    'Unemployment Benefit',
    'Work Injury Benefit',
    'Death Benefit',
    'Educational Benefit'
  ];

  const totalApproved = claimsData
    .filter(claim => claim.status === 'Approved')
    .reduce((sum, claim) => sum + claim.approvedAmount, 0);

  const totalClaimed = claimsData.reduce((sum, claim) => sum + claim.claimAmount, 0);

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/person/management')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Claim History</h1>
            <p className="text-sm lg:text-base text-gray-600 hidden sm:block">View and manage benefit claims history</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 self-start lg:self-center"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Main Menu</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{claimsData.length}</div>
            <p className="text-xs text-muted-foreground">All time claims</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Claims</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {claimsData.filter(c => c.status === 'Approved').length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claimed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{formatCurrency(totalClaimed)}</div>
            <p className="text-xs text-muted-foreground">Amount requested</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{formatCurrency(totalApproved)}</div>
            <p className="text-xs text-muted-foreground">Amount paid out</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Search Claim History</CardTitle>
          <CardDescription>Filter claims by SSN, type, status, or year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">SSN</label>
              <Input
                placeholder="Enter SSN"
                value={searchParams.ssn}
                onChange={(e) => setSearchParams(prev => ({ ...prev, ssn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Claim Type</label>
              <Select value={searchParams.claimType} onValueChange={(value) => setSearchParams(prev => ({ ...prev, claimType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select claim type" />
                </SelectTrigger>
                <SelectContent>
                  {claimTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={searchParams.status} onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Year</label>
              <Select value={searchParams.year} onValueChange={(value) => setSearchParams(prev => ({ ...prev, year: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claims History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Claims Records ({claimsData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Claim Number</TableHead>
                  <TableHead className="min-w-[80px]">SSN</TableHead>
                  <TableHead className="min-w-[120px]">Claimant</TableHead>
                  <TableHead className="min-w-[150px]">Claim Type</TableHead>
                  <TableHead className="min-w-[120px]">Date Submitted</TableHead>
                  <TableHead className="min-w-[120px]">Date Processed</TableHead>
                  <TableHead className="min-w-[120px]">Claim Amount</TableHead>
                  <TableHead className="min-w-[120px]">Approved Amount</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[200px]">Reason</TableHead>
                  <TableHead className="min-w-[120px]">Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimsData.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                    <TableCell>{claim.ssn}</TableCell>
                    <TableCell>{claim.claimantName}</TableCell>
                    <TableCell>{claim.claimType}</TableCell>
                    <TableCell>{claim.dateSubmitted}</TableCell>
                    <TableCell>{claim.dateProcessed || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(claim.claimAmount)}</TableCell>
                    <TableCell className="font-medium">
                      {claim.approvedAmount > 0 ? formatCurrency(claim.approvedAmount) : 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(claim.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={claim.reason}>
                      {claim.reason}
                    </TableCell>
                    <TableCell>{claim.paymentDate || 'N/A'}</TableCell>
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

export default ClaimHistory;
