import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import {
  Search,
  Edit,
  Eye,
  HelpCircle,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Clock,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const ActiveInactiveIPListing = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [searchParams, setSearchParams] = useState({
    ssn: '',
    dob: '',
    surname: '',
    firstname: '',
    phone: '',
    gender: '',
    status: '',
    selfRefNo: ''
  });

  const insuredPersons = [
    {
      ssn: '123456',
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
      status: 'Active',
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
      witnessName: 'Witness Smith',
      dateWitnessed: '2024-01-15',
      tempCardDate: '2024-01-25',
      permCardDate: '2024-02-01',
      cardExpiration: '2029-02-01',
      dateCardReceived: '2024-02-05',
      terminationDate: '',
    },
    {
      ssn: '789012',
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
      status: 'Inactive',
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
      motherName: 'Sarah Smith',
      beneficiary: 'William Smith',
      benAddr: '456 Church Street',
      contactName: 'Emergency Contact 2',
      contactRelation: 'Brother',
      contactAddr: '789 Pine Street',
      phone: '+1869-469-5678',
      email: 'jane.smith@email.com',
      workPermit: 'No',
      npf: 'No',
      dateOfDeath: '',
      verifyBirth: 'Birth Certificate',
      verifyName: 'National ID',
      verifyMaritalStatus: 'Single Status Certificate',
      verifyDeath: '',
      dateVerified: '2024-01-12',
      verifiedBy: 'Admin User',
      applicationDate: '2024-01-18',
      registrationDate: '2024-01-25',
      witnessName: 'Witness Johnson',
      dateWitnessed: '2024-01-18',
      tempCardDate: '2024-01-28',
      permCardDate: '2024-02-05',
      cardExpiration: '2029-02-05',
      dateCardReceived: '2024-02-10',
      terminationDate: '2024-06-15',
    },
    {
      ssn: '345678',
      surname: 'Wilson',
      firstname: 'Robert',
      middlename: 'James',
      previousName: '',
      dob: '1978-11-08',
      sex: 'Male',
      alias: 'Bob',
      primaryOccup: 'Engineer',
      selfRefNo: 'IP003',
      aspNum: 'ASP789',
      status: 'Active',
      residentAddr1: '789 Beach Road',
      residentAddr2: 'Unit 5C',
      district: 'Sandy Point',
      mailAddr1: '789 Beach Road',
      mailAddr2: 'Unit 5C',
      birthPlace: 'St. Kitts',
      nationality: 'Kittitian',
      dateOfResidency: '2018-03-20',
      maritalStatus: 'Divorced',
      dateMarried: '2005-09-10',
      spouseName: '',
      spouseAddr: '',
      fatherName: 'Thomas Wilson',
      motherName: 'Patricia Wilson',
      beneficiary: 'Robert Wilson Jr.',
      benAddr: '789 Beach Road',
      contactName: 'Emergency Contact 3',
      contactRelation: 'Son',
      contactAddr: '321 Hill Street',
      phone: '+1869-465-9012',
      email: 'robert.wilson@email.com',
      workPermit: 'No',
      npf: 'Yes',
      dateOfDeath: '',
      verifyBirth: 'Birth Certificate',
      verifyName: 'Passport',
      verifyMaritalStatus: 'Divorce Decree',
      verifyDeath: '',
      dateVerified: '2024-01-14',
      verifiedBy: 'Admin User',
      applicationDate: '2024-01-22',
      registrationDate: '2024-01-30',
      witnessName: 'Witness Brown',
      dateWitnessed: '2024-01-22',
      tempCardDate: '2024-02-01',
      permCardDate: '2024-02-08',
      cardExpiration: '2029-02-08',
      dateCardReceived: '2024-02-12',
      terminationDate: '',
    }
  ];

  const handleSearch = () => {
    console.log('Searching with parameters:', searchParams);
  };

  const handleReturnResult = () => {
    console.log('Returning results');
  };

  const handleClearSearch = () => {
    setSearchParams({
      ssn: '',
      dob: '',
      surname: '',
      firstname: '',
      phone: '',
      gender: '',
      status: '',
      selfRefNo: ''
    });
  };

  const handleViewDetails = (person: any) => {
    console.log('Viewing details for:', person);
    navigate(`/person/view/${person.ssn}`);
  };

  const handleEditDetails = (person: any) => {
    console.log('Editing details for:', person);
    navigate(`/person/edit/${person.ssn}`);
  };

  const handleStatusChange = (person: any, newStatus: string) => {
    console.log('Changing status for:', person.ssn, 'to:', newStatus);
  };

  const handleRegisterPerson = () => {
    navigate('/person/register-tabs');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-primary/10 text-primary">Active</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-accent/30 text-accent-foreground">Pending</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter insured persons based on status filter
  const filteredInsuredPersons = insuredPersons.filter(person => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return person.status === 'Active';
    if (statusFilter === 'inactive') return person.status === 'Inactive';
    return true;
  });

  // Define table columns
  const columns: DataTableColumn[] = [
    { key: 'ssn', label: 'SSN', minWidth: '80px' },
    { key: 'surname', label: 'Sur Name', minWidth: '100px' },
    { key: 'firstname', label: 'First Name', minWidth: '100px' },
    { key: 'middlename', label: 'Middle Name', minWidth: '100px' },
    { key: 'previousName', label: 'Previous Name', minWidth: '100px' },
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
    { key: 'status', label: 'Status', minWidth: '80px' },
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
      {/* Action Bar */}
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      
        <div className="flex items-center gap-2">
          
        </div>

        <Button 
          onClick={handleRegisterPerson}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          Register Person
        </Button>
      </div> */}

      {/* Search and Filter Section - Collapsible */}
      {/* <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base lg:text-lg">Query by</CardTitle>
                </div>
                {isSearchOpen ? <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={searchParams.dob}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, dob: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Surname</label>
                  <Input
                    placeholder="Enter surname"
                    value={searchParams.surname}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, surname: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    placeholder="Enter first name"
                    value={searchParams.firstname}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, firstname: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    placeholder="Enter phone number"
                    value={searchParams.phone}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <Select value={searchParams.gender} onValueChange={(value) => setSearchParams(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
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
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Self Ref No</label>
                  <Input
                    placeholder="Enter self ref no"
                    value={searchParams.selfRefNo}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, selfRefNo: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={handleReturnResult} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Return Result
                </Button>
                <Button variant="outline" onClick={handleClearSearch} className="flex items-center gap-2">
                  Clear
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible> */}

      {/* Data Table */}
      <DataTable
        data={filteredInsuredPersons}
        columns={columns}
        title="Active/Inactive Insured Persons"
        searchPlaceholder="Search by SSN, Name, Phone..."
        showRecordsOptions={[10, 25, 50, 100]}
        onView={handleViewDetails}
        onEdit={handleEditDetails}
        actions={{
          view: true,
          edit: true
        }}
        idField="ssn"
        statusField="status"
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
}; 