import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, Eye, Edit, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { employerData } from '@/data/employerData';

interface FilterState {
  search: string;
  businessType: string;
  complianceStatus: string;
  contributionStatus: string;
}

const ManageEmployersNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('status') || 'active';
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    businessType: '',
    complianceStatus: '',
    contributionStatus: ''
  });

  // Filter employers by status
  const getEmployersByStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return employerData.filter(emp => 
          emp.contributionStatus === 'Pending' || 
          emp.complianceStatus === 'Under Audit'
        );
      case 'active':
        return employerData.filter(emp => emp.employerStatus === 'Active');
      case 'ceased':
        return employerData.filter(emp => 
          emp.employerStatus === 'Inactive' || 
          emp.complianceStatus === 'Non-Compliant'
        );
      default:
        return employerData;
    }
  };

  // Apply filters to the employers list
  const getFilteredEmployers = (status: string) => {
    const baseEmployers = getEmployersByStatus(status);
    
    return baseEmployers.filter(employer => {
      const matchesSearch = !filters.search || 
        employer.employerName.toLowerCase().includes(filters.search.toLowerCase()) ||
        employer.employerId.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesBusinessType = !filters.businessType || 
        filters.businessType === 'all-types' ||
        employer.businessType === filters.businessType;
      
      const matchesComplianceStatus = !filters.complianceStatus || 
        filters.complianceStatus === 'all-compliance' ||
        employer.complianceStatus === filters.complianceStatus;
      
      const matchesContributionStatus = !filters.contributionStatus || 
        filters.contributionStatus === 'all-contribution' ||
        employer.contributionStatus === filters.contributionStatus;

      return matchesSearch && matchesBusinessType && matchesComplianceStatus && matchesContributionStatus;
    });
  };

  const getStatusBadge = (employer: any) => {
    if (employer.employerStatus === 'Active') {
      return <Badge variant="default">Active</Badge>;
    } else if (employer.employerStatus === 'Inactive') {
      return <Badge variant="secondary">Inactive</Badge>;
    } else if (employer.contributionStatus === 'Pending') {
      return <Badge variant="default">Pending</Badge>;
    } else if (employer.complianceStatus === 'Under Audit') {
      return <Badge variant="default">Under Review</Badge>;
    }
    return <Badge variant="outline">{employer.employerStatus}</Badge>;
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      businessType: '',
      complianceStatus: '',
      contributionStatus: ''
    });
  };

  const FilterSection = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Search & Filter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employers..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          
          <Select value={filters.businessType} onValueChange={(value) => setFilters(prev => ({ ...prev, businessType: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Business Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">All Types</SelectItem>
              <SelectItem value="Private">Private</SelectItem>
              <SelectItem value="Government">Government</SelectItem>
              <SelectItem value="Non-profit">Non-profit</SelectItem>
              <SelectItem value="Small Business">Small Business</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.complianceStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, complianceStatus: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Compliance Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-compliance">All Status</SelectItem>
              <SelectItem value="Compliant">Compliant</SelectItem>
              <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
              <SelectItem value="Under Audit">Under Audit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.contributionStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, contributionStatus: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Contribution Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-contribution">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmployersTable = ({ employers }: { employers: any[] }) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employer ID</TableHead>
              <TableHead>Employer Name</TableHead>
              <TableHead>Business Type</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Last Contribution</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employers.map((employer) => (
              <TableRow key={employer.employerId}>
                <TableCell className="font-medium">{employer.employerId}</TableCell>
                <TableCell>{employer.employerName}</TableCell>
                <TableCell>{employer.businessType}</TableCell>
                <TableCell>{employer.numberOfEmployees}</TableCell>
                <TableCell>{getStatusBadge(employer)}</TableCell>
                <TableCell>
                  <Badge variant={employer.complianceStatus === 'Compliant' ? 'default' : 'destructive'}>
                    {employer.complianceStatus}
                  </Badge>
                </TableCell>
                <TableCell>{employer.lastContributionDate}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const pendingEmployers = getFilteredEmployers('pending');
  const activeEmployers = getFilteredEmployers('active');
  const ceasedEmployers = getFilteredEmployers('ceased');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Employers</h1>
            <p className="text-muted-foreground mt-1">
              Manage employers by verification status with advanced search and filtering
            </p>
          </div>
          <Button 
            onClick={() => navigate('/employer-registration')} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Register Employer
          </Button>
        </div>

        {/* Filter Section */}
        <FilterSection />

        {/* Tabs for different employer statuses */}
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              Pending Verification
              <Badge variant="secondary">{pendingEmployers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              Active
              <Badge variant="default">{activeEmployers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ceased" className="flex items-center gap-2">
              Ceased/Suspended
              <Badge variant="destructive">{ceasedEmployers.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Pending Verification</h2>
                <p className="text-muted-foreground">Employers awaiting verification and approval</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => navigate('/employer-registration')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Employer
                </Button>
              </div>
            </div>
            <EmployersTable employers={pendingEmployers} />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Active Employers</h2>
                <p className="text-muted-foreground">Currently active and compliant employers</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => navigate('/employer-registration')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Employer
                </Button>
              </div>
            </div>
            <EmployersTable employers={activeEmployers} />
          </TabsContent>

          <TabsContent value="ceased" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Ceased/Suspended Employers</h2>
                <p className="text-muted-foreground">Inactive or non-compliant employers</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => navigate('/employer-registration')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Employer
                </Button>
              </div>
            </div>
            <EmployersTable employers={ceasedEmployers} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManageEmployersNew;