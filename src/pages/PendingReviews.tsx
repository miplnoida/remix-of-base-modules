
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Clock, AlertTriangle, CheckCircle, Eye, Edit, ChevronDown, ChevronUp, ArrowLeft, Home } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const PendingReviews = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({
    ssn: '',
    name: '',
    dob: '',
    status: '',
    applicationDate: '',
    assignedOfficer: ''
  });

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

  const handleSearch = () => {
    console.log('Searching pending reviews with parameters:', searchParams);
  };
  const handleViewDetails = (person: any) => {
    console.log('Viewing details for:', person);
    navigate(`/person/view/${person.ssn}`, { state: { status: person.status } });
  };
  const handleReview = (item: any) => {
    console.log('Reviewing item:', item);
    // Navigate to review page or open modal
  };

  const handleApprove = (id: number) => {
    console.log('Approving item:', id);
    // Handle approval logic
  };

  const handleReject = (id: number) => {
    console.log('Rejecting item:', id);
    // Handle rejection logic
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="destructive">High</Badge>;
      case 'Medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'Low':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
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

  const getDaysWaitingBadge = (days: number) => {
    if (days > 14) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {days} days
      </Badge>;
    } else if (days > 7) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {days} days
      </Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">
        {days} days
      </Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {location.pathname === '/person/pending-reviews' && (
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
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Pending Reviews</h1>
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
      )}
      {/* Summary Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{insuredPersons.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {insuredPersons.filter(person => person.status === 'High').length}
            </div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue ({`>`}14 days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {insuredPersons.filter(person => person.dateOfResidency && new Date(person.dateOfResidency).getTime() < new Date().getTime() - 14 * 24 * 60 * 60 * 1000).length}
            </div>
            <p className="text-xs text-muted-foreground">Past target time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {Math.round(insuredPersons.reduce((sum, person) => sum + (new Date(person.applicationDate).getTime() - new Date(person.registrationDate).getTime()), 0) / insuredPersons.length)} days
            </div>
            <p className="text-xs text-muted-foreground">Average processing time</p>
          </CardContent>
        </Card>
      </div>*/}

      {/* Expandable Filter Section */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base lg:text-lg">
                    Query by
                  </CardTitle>
                  
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
                      <SelectItem value="Pending Review">Pending Review</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
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

      {/* Pending Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Pending Reviews ({insuredPersons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">Application ID</TableHead>
                  <TableHead className="min-w-[100px]">Sur Name</TableHead>
                  <TableHead className="min-w-[100px]">First Name</TableHead>
                  <TableHead className="min-w-[100px]">Middle Name</TableHead>
                  <TableHead className="min-w-[100px]">Previous Name</TableHead>
                  <TableHead className="min-w-[80px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">DOB</TableHead>
                  <TableHead className="min-w-[80px]">Sex</TableHead>
                  <TableHead className="min-w-[80px]">Alias</TableHead>
                  <TableHead className="min-w-[120px]">Primary Occup</TableHead>
                  <TableHead className="min-w-[100px]">Self Ref No.</TableHead>
                  
                  <TableHead className="min-w-[100px]">ASP Num.</TableHead>
                  <TableHead className="min-w-[150px]">Resident Addr1</TableHead>
                  <TableHead className="min-w-[150px]">Resident Addr2</TableHead>
                  <TableHead className="min-w-[120px]">District</TableHead>
                  <TableHead className="min-w-[150px]">Mail Addr1</TableHead>
                  <TableHead className="min-w-[150px]">Mail Addr2</TableHead>
                  <TableHead className="min-w-[100px]">Birth Place</TableHead>
                  <TableHead className="min-w-[100px]">Nationality</TableHead>
                  <TableHead className="min-w-[120px]">Date of Residency</TableHead>
                  <TableHead className="min-w-[100px]">Marital Status</TableHead>
                  <TableHead className="min-w-[100px]">Date Married</TableHead>
                  <TableHead className="min-w-[120px]">Spouse Name</TableHead>
                  <TableHead className="min-w-[150px]">Spouse Addr</TableHead>
                  <TableHead className="min-w-[120px]">Father's Name</TableHead>
                  <TableHead className="min-w-[120px]">Mother's Name</TableHead>
                  <TableHead className="min-w-[100px]">Beneficiary</TableHead>
                  <TableHead className="min-w-[150px]">Ben Addr</TableHead>
                  <TableHead className="min-w-[120px]">Contact</TableHead>
                  <TableHead className="min-w-[120px]">Contact Relation</TableHead>
                  <TableHead className="min-w-[150px]">Contact Addr</TableHead>
                  <TableHead className="min-w-[120px]">Phone</TableHead>
                  <TableHead className="min-w-[100px]">Work Permit</TableHead>
                  <TableHead className="min-w-[80px]">NPF</TableHead>
                  <TableHead className="min-w-[100px]">Date Died</TableHead>
                  <TableHead className="min-w-[120px]">Verify Birth</TableHead>
                  <TableHead className="min-w-[120px]">Verify Name</TableHead>
                  <TableHead className="min-w-[120px]">Verify Marital</TableHead>
                  <TableHead className="min-w-[120px]">Verify Death</TableHead>
                  <TableHead className="min-w-[120px]">Date Verified</TableHead>
                  <TableHead className="min-w-[120px]">Verified By</TableHead>
                  <TableHead className="min-w-[120px]">Application Date</TableHead>
                  <TableHead className="min-w-[120px]">Registration Date</TableHead>
                  <TableHead className="min-w-[150px] sticky right-0 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insuredPersons.map((person, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{person.ssn}</TableCell>
                    <TableCell>{person.surname}</TableCell>
                    <TableCell>{person.firstname}</TableCell>
                    <TableCell>{person.middlename}</TableCell>
                    <TableCell>{person.previousName}</TableCell>
                    <TableCell>{getStatusBadge(person.status)}</TableCell>
                    <TableCell>{new Date(person.dob).toLocaleDateString()}</TableCell>
                    <TableCell>{person.sex}</TableCell>
                    <TableCell>{person.alias}</TableCell>
                    <TableCell>{person.primaryOccup}</TableCell>
                    <TableCell>{person.selfRefNo}</TableCell>
                    
                    <TableCell>{person.aspNum}</TableCell>
                    <TableCell>{person.residentAddr1}</TableCell>
                    <TableCell>{person.residentAddr2}</TableCell>
                    <TableCell>{person.district}</TableCell>
                    <TableCell>{person.mailAddr1}</TableCell>
                    <TableCell>{person.mailAddr2}</TableCell>
                    <TableCell>{person.birthPlace}</TableCell>
                    <TableCell>{person.nationality}</TableCell>
                    <TableCell>{person.dateOfResidency}</TableCell>
                    <TableCell>{person.maritalStatus}</TableCell>
                    <TableCell>{person.dateMarried}</TableCell>
                    <TableCell>{person.spouseName}</TableCell>
                    <TableCell>{person.spouseAddr}</TableCell>
                    <TableCell>{person.fatherName}</TableCell>
                    <TableCell>{person.motherName}</TableCell>
                    <TableCell>{person.beneficiary}</TableCell>
                    <TableCell>{person.benAddr}</TableCell>
                    <TableCell>{person.contactName}</TableCell>
                    <TableCell>{person.contactRelation}</TableCell>
                    <TableCell>{person.contactAddr}</TableCell>
                    <TableCell>{person.phone}</TableCell>
                    <TableCell>{person.workPermit}</TableCell>
                    <TableCell>{person.npf}</TableCell>
                    <TableCell>{person.dateOfDeath}</TableCell>
                    <TableCell>{person.verifyBirth}</TableCell>
                    <TableCell>{person.verifyName}</TableCell>
                    <TableCell>{person.verifyMaritalStatus}</TableCell>
                    <TableCell>{person.verifyDeath}</TableCell>
                    <TableCell>{person.dateVerified}</TableCell>
                    <TableCell>{person.verifiedBy}</TableCell>
                    <TableCell>{person.applicationDate}</TableCell>
                    <TableCell>{person.registrationDate}</TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="View Details"
                          onClick={() => handleViewDetails(person)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="Edit"
                          onClick={() => handleReview(person)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          title="Approve"
                          onClick={() => handleApprove(Number(person.ssn) || 0)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          title="Reject"
                          onClick={() => handleReject(Number(person.ssn) || 0)}
                        >
                          <AlertTriangle className="h-4 w-4" />
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

export default PendingReviews;
