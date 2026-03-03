
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users,
  Search,
  Plus,
  Edit,
  Eye,
  HelpCircle,
  ArrowLeft,
  Home,
  FileText,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const InsuredPersonListing = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(true);
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

  // Enhanced mock data with all required fields
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
      terminationCode: '',
      dateModified: '2024-01-20',
      userId: 'USER001',
      tranCode: 'TRN001',
      dateOfEntry: '2024-01-15'
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
      witnessName: 'Witness Brown',
      dateWitnessed: '2024-01-20',
      tempCardDate: '',
      permCardDate: '',
      cardExpiration: '',
      dateCardReceived: '',
      terminationDate: '',
      terminationCode: '',
      dateModified: '2024-01-20',
      userId: 'USER002',
      tranCode: 'TRN002',
      dateOfEntry: '2024-01-20'
    }
  ];

  const handleSearch = () => {
    console.log('Searching with parameters:', searchParams);
    // Implement actual search functionality here
  };

  const handleReturnResult = () => {
    console.log('Returning search results');
    // Implement return result functionality
  };

  const handleClose = () => {
    navigate('/');
  };

  const handleClearSearch = () => {
    setSearchParams({
      ssn: '', dob: '', surname: '', firstname: '', phone: '', gender: '', status: '', selfRefNo: ''
    });
  };

  const handleViewDetails = (person: any) => {
    console.log('Viewing details for:', person);
    // Navigate to view page or open modal
    navigate(`/person/view/${person.ssn}`);
  };

  const handleEditDetails = (person: any) => {
    console.log('Editing details for:', person);
    // Navigate to edit page or open modal
    navigate(`/person/edit/${person.ssn}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Active</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-accent/30 text-accent-foreground border-accent/20">Pending</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Insured Person Listing</h1>
            <p className="text-gray-600">Search and manage registered insured persons</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/person/register')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New IP
          </Button>
          <Button 
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Manual Entry
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Main Menu
          </Button>
        </div>
      </div>

      {/* Search and Filter Section - Now Collapsible */}
      <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Search Insured Persons</CardTitle>
                  <CardDescription>Query by: SSN, DOB, Surname, Firstname, Phone, Gender, Status, Self Ref No. etc.</CardDescription>
                </div>
                {isSearchOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                      <SelectItem value="Not Specified">Not Specified</SelectItem>
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
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Self Ref No.</label>
                  <Input
                    placeholder="Enter self ref no."
                    value={searchParams.selfRefNo}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, selfRefNo: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={handleClearSearch}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button variant="outline" onClick={handleReturnResult}>
                  <FileText className="h-4 w-4 mr-2" />
                  Return Result
                </Button>
                <Button variant="outline">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

              {/* Registered IP Insured Person Section - Table Layout with Enhanced Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Insured Persons ({insuredPersons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {insuredPersons.length === 0 ? (
            <EmptyState title="No records found" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <Table className="app-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>SSN</TableHead>
                    <TableHead>Sur Name</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Middle Name</TableHead>
                    <TableHead>Previous Name</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead>Primary Occup</TableHead>
                    <TableHead>Self Ref No.</TableHead>
                    <TableHead>ASP Num.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resident Addr1</TableHead>
                    <TableHead>Resident Addr2</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Mail Addr1</TableHead>
                    <TableHead>Mail Addr2</TableHead>
                    <TableHead>Birth Place</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Date of Residency</TableHead>
                    <TableHead>Marital Status</TableHead>
                    <TableHead>Date Married</TableHead>
                    <TableHead>Spouse Name</TableHead>
                    <TableHead>Spouse Addr</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Mother's Name</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Ben Addr</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Contact Relation</TableHead>
                    <TableHead>Contact Addr</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Work Permit</TableHead>
                    <TableHead>NPF</TableHead>
                    <TableHead>Date Died</TableHead>
                    <TableHead>Verify Birth</TableHead>
                    <TableHead>Verify Name</TableHead>
                    <TableHead>Verify Marital</TableHead>
                    <TableHead>Verify Death</TableHead>
                    <TableHead>Date Verified</TableHead>
                    <TableHead>Verified By</TableHead>
                    <TableHead>Application Date</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead className="min-w-[120px] sticky right-0 bg-background">Actions</TableHead>
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
                      <TableCell>{new Date(person.dob).toLocaleDateString()}</TableCell>
                      <TableCell>{person.sex}</TableCell>
                      <TableCell>{person.alias}</TableCell>
                      <TableCell>{person.primaryOccup}</TableCell>
                      <TableCell>{person.selfRefNo}</TableCell>
                      <TableCell>{person.aspNum}</TableCell>
                      <TableCell>{getStatusBadge(person.status)}</TableCell>
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
                            title="Edit Details"
                            onClick={() => handleEditDetails(person)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default InsuredPersonListing;
