
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, AlertTriangle, CheckCircle, Eye, Edit, ArrowLeft, Home, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';

const PendingReviews = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Add state for search filters
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({
    ssn: '',
    name: '',
    dob: '',
    status: '',
    applicationDate: '',
    assignedOfficer: ''
  });

  const handleSearch = () => {
    console.log('Searching with parameters:', searchParams);
  };

  // Replace the pendingItems mock data and table with insuredPersons data and table
  // --- Add insuredPersons mock data (from IPListing) ---
  const insuredPersons = [
    {
      ssn: 'TE0001',
      surname: 'Doe',
      firstname: 'John',
      middlename: 'Michael',
      previousName: '',
      dob: '1985-03-15',
      sex: 'Male',
      alias: '',
      primaryOccup: 'Accountant',
      selfRefNo: 'IP001',
      aspNum: 'ASP123',
      status: 'Draft',
      residentAddr1: '123 Main Street',
      residentAddr2: 'Apt 2B',
      district: 'Basseterre Zone 01',
      mailAddr1: '123 Main Street',
      mailAddr2: 'Apt 2B',
      birthPlace: 'St. Kitts',
      nationality: 'Kittitian',
      dateOfResidency: '2020-01-01',
      maritalStatus: 'Married',
      dateMarried: '2010-06-15',
      spouseName: 'Jane Doe',
      spouseAddr: '123 Main Street',
      fatherName: 'Robert Doe',
      motherName: 'Mary Doe',
      beneficiary: 'Jane Doe',
      benAddr: '123 Main Street',
      contactName: 'Emergency Contact',
      contactRelation: 'Sister',
      contactAddr: '456 Oak Street',
      phone: '+1869-465-1234',
      email: 'john.doe@email.com',
      workPermit: 'No',
      npf: 'Yes',
      dateOfDeath: '',
      verifyBirth: 'Birth Certificate',
      verifyName: 'Passport',
      verifyMaritalStatus: 'Marriage Certificate',
      verifyDeath: '',
      dateVerified: '2024-01-10',
      verifiedBy: 'Admin User',
      applicationDate: '2024-01-15',
      registrationDate: '2024-01-20',
    },
    {
      ssn: 'TE0002',
      surname: 'Smith',
      firstname: 'Jane',
      middlename: 'Elizabeth',
      previousName: 'Johnson',
      dob: '1990-07-22',
      sex: 'Female',
      alias: 'Liz',
      primaryOccup: 'Administrative Assistance',
      selfRefNo: 'IP002',
      aspNum: 'ASP456',
      status: 'Pending',
      residentAddr1: '456 Church Street',
      residentAddr2: '',
      district: 'Charlestown',
      mailAddr1: '456 Church Street',
      mailAddr2: '',
      birthPlace: 'Nevis',
      nationality: 'Nevisian',
      dateOfResidency: '2019-05-10',
      maritalStatus: 'Single',
      dateMarried: '',
      spouseName: '',
      spouseAddr: '',
      fatherName: 'William Smith',
      motherName: 'Carol Smith',
      beneficiary: 'Carol Smith',
      benAddr: '789 Pine Street',
      contactName: 'Emergency Contact',
      contactRelation: 'Mother',
      contactAddr: '789 Pine Street',
      phone: '+1869-469-5678',
      email: 'jane.smith@email.com',
      workPermit: 'Yes',
      npf: 'No',
      dateOfDeath: '',
      verifyBirth: 'Birth Certificate',
      verifyName: 'Identification Card',
      verifyMaritalStatus: 'Affidavit',
      verifyDeath: '',
      dateVerified: '2024-01-12',
      verifiedBy: 'Supervisor',
      applicationDate: '2024-01-20',
      registrationDate: '',
    }
  ];

  const handleViewDetails = (person: any) => {
    console.log('Viewing details for:', person);
    navigate(`/person/view/${person.ssn}`, { state: { status: person.status } });
  };

  const handleReview = (item: any) => {
    console.log('Reviewing item:', item);
    // Navigate to review page or open modal
  };

  const handleApprove = (id: number | string) => {
    console.log('Approving item:', id);
    // Handle approval logic
  };

  const handleReject = (id: number | string) => {
    console.log('Rejecting item:', id);
    // Handle rejection logic
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="default" className="bg-green-100 text-green-800">Draft</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Define table columns
  const columns: DataTableColumn[] = [
    { key: 'ssn', label: 'Application ID', minWidth: '80px' },
    { key: 'surname', label: 'Sur Name', minWidth: '100px' },
    { key: 'firstname', label: 'First Name', minWidth: '100px' },
    { key: 'middlename', label: 'Middle Name', minWidth: '100px' },
    { key: 'previousName', label: 'Previous Name', minWidth: '100px' },
    { key: 'status', label: 'Status', minWidth: '80px' },
    { 
      key: 'dob', 
      label: 'DOB', 
      minWidth: '100px',
      render: (value) => new Date(value).toLocaleDateString()
    },
    { key: 'sex', label: 'Sex', minWidth: '80px' },
    { key: 'alias', label: 'Alias', minWidth: '80px' },
    { key: 'primaryOccup', label: 'Primary Occup', minWidth: '120px' },
    { key: 'selfRefNo', label: 'Self Ref No.', minWidth: '100px' },
    { key: 'aspNum', label: 'ASP Num.', minWidth: '100px' },
    { key: 'residentAddr1', label: 'Resident Addr1', minWidth: '150px' },
    { key: 'residentAddr2', label: 'Resident Addr2', minWidth: '150px' },
    { key: 'district', label: 'District', minWidth: '120px' },
    { key: 'mailAddr1', label: 'Mail Addr1', minWidth: '150px' },
    { key: 'mailAddr2', label: 'Mail Addr2', minWidth: '150px' },
    { key: 'birthPlace', label: 'Birth Place', minWidth: '100px' },
    { key: 'nationality', label: 'Nationality', minWidth: '100px' },
    { key: 'dateOfResidency', label: 'Date of Residency', minWidth: '120px' },
    { key: 'maritalStatus', label: 'Marital Status', minWidth: '100px' },
    { key: 'dateMarried', label: 'Date Married', minWidth: '100px' },
    { key: 'spouseName', label: 'Spouse Name', minWidth: '120px' },
    { key: 'spouseAddr', label: 'Spouse Addr', minWidth: '150px' },
    { key: 'fatherName', label: 'Father\'s Name', minWidth: '120px' },
    { key: 'motherName', label: 'Mother\'s Name', minWidth: '120px' },
    { key: 'beneficiary', label: 'Beneficiary', minWidth: '100px' },
    { key: 'benAddr', label: 'Ben Addr', minWidth: '150px' },
    { key: 'contactName', label: 'Contact', minWidth: '120px' },
    { key: 'contactRelation', label: 'Contact Relation', minWidth: '120px' },
    { key: 'contactAddr', label: 'Contact Addr', minWidth: '150px' },
    { key: 'phone', label: 'Phone', minWidth: '120px' },
    { key: 'workPermit', label: 'Work Permit', minWidth: '100px' },
    { key: 'npf', label: 'NPF', minWidth: '80px' },
    { key: 'dateOfDeath', label: 'Date Died', minWidth: '100px' },
    { key: 'verifyBirth', label: 'Verify Birth', minWidth: '120px' },
    { key: 'verifyName', label: 'Verify Name', minWidth: '120px' },
    { key: 'verifyMaritalStatus', label: 'Verify Marital', minWidth: '120px' },
    { key: 'verifyDeath', label: 'Verify Death', minWidth: '120px' },
    { key: 'dateVerified', label: 'Date Verified', minWidth: '120px' },
    { key: 'verifiedBy', label: 'Verified By', minWidth: '120px' },
    { key: 'applicationDate', label: 'Application Date', minWidth: '120px' },
    { key: 'registrationDate', label: 'Registration Date', minWidth: '120px' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      {location.pathname === '/person/pending-reviews' && (
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
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Pending Verification</h1>
            </div>
          </div>
          
        </div>
      )}

      {/* Query by Search Filter */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className='mt-5'>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base lg:text-lg">
                    Query by
                  </CardTitle>
                  <p className='text-[#9D9D9D]'>Filter and search Pending Reviews</p>
                </div>
                {isFiltersOpen ? <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium">SSN</label>
                  <Input
                    placeholder="Enter SSN"
                    value={searchParams.ssn}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, ssn: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Enter name"
                    value={searchParams.name}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={searchParams.dob}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, dob: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={searchParams.status} onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Application Date</label>
                  <Input
                    type="date"
                    value={searchParams.applicationDate}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, applicationDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Assigned Officer</label>
                  <Input
                    placeholder="Enter officer name"
                    value={searchParams.assignedOfficer}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, assignedOfficer: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 lg:gap-3">
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={() => setSearchParams({
                  ssn: '', name: '', dob: '', status: '', applicationDate: '', assignedOfficer: ''
                })}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Data Table */}
      <DataTable
        data={insuredPersons}
        columns={columns}
        title="Pending Verification"
        searchPlaceholder="Search by Application ID, Employer Name..."
        showRecordsOptions={[10, 25, 50, 100]}
        onView={handleViewDetails}
        onEdit={handleReview}
        onApprove={handleApprove}
        onReject={handleReject}
        actions={{
          view: true,
          edit: true,
          approve: true,
          reject: true
        }}
        idField="ssn"
        statusField="status"
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
};

export default PendingReviews;