
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { ArrowLeft, Home, Search, Download, FileText, Calendar, DollarSign, Building, IdCard, AlertTriangle, Clock } from 'lucide-react';

const WagesHistory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    ssn: '',
    employerName: '',
    year: '',
    quarter: ''
  });

  // Mock wages data
  const wagesData = [
    {
      id: 1,
      ssn: '123456',
      employeeName: 'John Doe',
      employerName: 'ABC Company Ltd',
      employerRegNo: 'EMP001',
      year: 2024,
      quarter: 'Q1',
      grossWages: 15000.00,
      contributionRate: 5.0,
      employeeContribution: 750.00,
      employerContribution: 750.00,
      totalContribution: 1500.00,
      paymentDate: '2024-04-15',
      status: 'Paid'
    },
    {
      id: 2,
      ssn: '123456',
      employeeName: 'John Doe',
      employerName: 'ABC Company Ltd',
      employerRegNo: 'EMP001',
      year: 2024,
      quarter: 'Q2',
      grossWages: 16500.00,
      contributionRate: 5.0,
      employeeContribution: 825.00,
      employerContribution: 825.00,
      totalContribution: 1650.00,
      paymentDate: '2024-07-15',
      status: 'Paid'
    },
    { 
      id: 3,
      ssn: '789012',
      employeeName: 'Jane Smith',
      employerName: 'XYZ Corporation',
      employerRegNo: 'EMP002',
      year: 2024,
      quarter: 'Q1',
      grossWages: 12000.00,
      contributionRate: 5.0,
      employeeContribution: 600.00,
      employerContribution: 600.00,
      totalContribution: 1200.00,
      paymentDate: '2024-04-20',
      status: 'Paid'
    },
    {
      id: 4,
      ssn: '789012',
      employeeName: 'Jane Smith',
      employerName: 'XYZ Corporation',
      employerRegNo: 'EMP002',
      year: 2024,
      quarter: 'Q2',
      grossWages: 13200.00,
      contributionRate: 5.0,
      employeeContribution: 660.00,
      employerContribution: 660.00,
      totalContribution: 1320.00,
      paymentDate: '',
      status: 'Pending'
    }
  ];

  const handleSearch = () => {
    console.log('Searching wages with parameters:', searchParams);
  };

  const handleExport = () => {
    console.log('Exporting wages data');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="default" className="bg-primary/10 text-primary">Paid</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-accent/30 text-accent-foreground">Pending</Badge>;
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
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

  // Define columns for DataTable
  const columns: DataTableColumn[] = [
    {
      key: 'ssn',
      label: 'SSN',
      minWidth: '80px',
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'employeeName',
      label: 'Employee',
      minWidth: '120px'
    },
    {
      key: 'employerName',
      label: 'Employer',
      minWidth: '150px'
    },
    {
      key: 'employerRegNo',
      label: 'Reg No.',
      minWidth: '100px'
    },
    {
      key: 'year',
      label: 'Year',
      minWidth: '80px'
    },
    {
      key: 'quarter',
      label: 'Quarter',
      minWidth: '80px'
    },
    {
      key: 'grossWages',
      label: 'Gross Wages',
      minWidth: '120px',
      render: (value) => <span className="font-medium">{formatCurrency(value)}</span>
    },
    {
      key: 'contributionRate',
      label: 'Rate %',
      minWidth: '80px',
      render: (value) => `${value}%`
    },
    {
      key: 'employeeContribution',
      label: 'Employee Cont.',
      minWidth: '120px',
      render: (value) => formatCurrency(value)
    },
    {
      key: 'employerContribution',
      label: 'Employer Cont.',
      minWidth: '120px',
      render: (value) => formatCurrency(value)
    },
    {
      key: 'totalContribution',
      label: 'Total Cont.',
      minWidth: '120px',
      render: (value) => <span className="font-medium">{formatCurrency(value)}</span>
    },
    {
      key: 'paymentDate',
      label: 'Payment Date',
      minWidth: '120px',
      render: (value) => value || 'N/A'
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: '100px'
    }
  ];

  const handleViewWage = (wage: any) => {
    console.log('Viewing wage record:', wage);
    // Navigate to wage details page or open modal
  };

  const handleEditWage = (wage: any) => {
    console.log('Editing wage record:', wage);
    // Navigate to edit page or open edit modal
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
                      variant="outline" 
                      onClick={() => navigate('/person/management')}
                      className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                    >
                      <ArrowLeft className="h-4 w-4" />
                     
                      <span className="sm:hidden">Back</span>
                    </Button>
          <div className="h-6 w-px bg-gray-300" />
          
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Wages History</h1>
             </div>
        </div>
     
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wages (2024)</CardTitle>
             <div className={`p-2.5 rounded bg-gradient-to-r from-green-500 to-green-600  shadow-lg`}>
                  <IdCard className="h-4 w-4 text-muted-foreground text-white" />
                </div>
            
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{formatCurrency(57700)}</div>
            <p className="text-xs text-muted-foreground">+12% from last year</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
             <div className={`p-2.5 rounded bg-gradient-to-r from-orange-500 to-orange-600  shadow-lg`}>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground text-white" />
                </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{formatCurrency(5670)}</div>
            <p className="text-xs text-muted-foreground">Employee + Employer</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
            <div className={`p-2.5 rounded bg-gradient-to-r from-green-500 to-green-600  shadow-lg`}>
                  <IdCard className="h-4 w-4 text-muted-foreground text-white" />
                </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Unique employers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <div className={`p-2.5 rounded bg-gradient-to-r from-yellow-500 to-yellow-600  shadow-lg`}>
                  <Clock className="h-4 w-4 text-muted-foreground text-white" />
                </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Requires follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Search Wages History</CardTitle>
          <CardDescription>Filter wages records by SSN, employer, year, or quarter</CardDescription>
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
              <label className="text-sm font-medium">Employer Name</label>
              <Input
                placeholder="Enter employer name"
                value={searchParams.employerName}
                onChange={(e) => setSearchParams(prev => ({ ...prev, employerName: e.target.value }))}
              />
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
            <div>
              <label className="text-sm font-medium">Quarter</label>
              <Select value={searchParams.quarter} onValueChange={(value) => setSearchParams(prev => ({ ...prev, quarter: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
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

      {/* Wages History DataTable */}
      <DataTable
        data={wagesData}
        columns={columns}
        title="Wages Records"
        searchPlaceholder="Search wages records..."
        onView={handleViewWage}
        onEdit={handleEditWage}
        actions={{ view: false, edit: false, approve: false, reject: false }}
        statusField="status"
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
};

export default WagesHistory;
