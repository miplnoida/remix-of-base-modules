import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Clock
} from 'lucide-react';

export const IPListing = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('insured-persons');
  const [isSearchOpen, setIsSearchOpen] = useState(true);

  // Handle navigation when pending reviews tab is selected - removed as tabs are no longer used here
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

  const handleClearSearch = () => {
    setSearchParams({
      ssn: '', dob: '', surname: '', firstname: '', phone: '', gender: '', status: '', selfRefNo: ''
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
    console.log('Changing status for:', person, 'to:', newStatus);
    // Update the person's status in the data
    // In a real app, this would make an API call
    person.status = newStatus;
    // Force a re-render or update state
    console.log(`Status changed from ${person.status} to ${newStatus}`);
  };

  const handleRegisterPerson = () => {
    // Navigate directly to register person page
    navigate('/person/register-tabs');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Sample pending reviews data
  const pendingReviews = [
    {
      ssn: '789012',
      surname: 'Smith',
      firstname: 'Jane',
      middlename: 'Elizabeth',
      dob: '1990-07-22',
      sex: 'Female',
      primaryOccup: 'Administrative Assistance',
      selfRefNo: 'IP002',
      aspNum: 'ASP456',
      status: 'Pending Review',
      phone: '+1869-469-5678',
      email: 'jane.smith@email.com',
      applicationDate: '2024-01-20',
      submittedBy: 'Registration Officer',
      reviewRequired: 'Document Verification'
    }
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <Button 
          onClick={handleRegisterPerson}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          Register Person
        </Button>
      </div>

      {/* Search and Filter Section - Collapsible */}
      <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base lg:text-lg">Query by</CardTitle>
                      {/* <CardDescription className="text-sm">Query by: SSN, DOB, Surname, Firstname, Phone, Gender, Status, Self Ref No. etc.</CardDescription> */}
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
                  
                  <div className="flex flex-wrap gap-2 lg:gap-3">
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
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* IP Listing Section - Table Layout with Enhanced Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Insured Persons ({insuredPersons.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">SSN</TableHead>
                      <TableHead className="min-w-[100px]">Sur Name</TableHead>
                      <TableHead className="min-w-[100px]">First Name</TableHead>
                      <TableHead className="min-w-[100px]">Middle Name</TableHead>
                      <TableHead className="min-w-[100px]">Previous Name</TableHead>
                      <TableHead className="min-w-[100px]">DOB</TableHead>
                      <TableHead className="min-w-[80px]">Sex</TableHead>
                      <TableHead className="min-w-[80px]">Alias</TableHead>
                      <TableHead className="min-w-[120px]">Primary Occup</TableHead>
                      <TableHead className="min-w-[100px]">Self Ref No.</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
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
                        <TableCell>{new Date(person.dob).toLocaleDateString()}</TableCell>
                        <TableCell>{person.sex}</TableCell>
                        <TableCell>{person.alias}</TableCell>
                        <TableCell>{person.primaryOccup}</TableCell>
                        <TableCell>{person.selfRefNo}</TableCell>
                        <TableCell>{getStatusBadge(person.status)}</TableCell>
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
                          <div className="flex space-x-1">
                            <Select onValueChange={(value) => handleStatusChange(person, value)}>
                              <SelectTrigger className="h-8 w-20 text-xs">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Verify">Verify</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Suspend">Suspend</SelectItem>
                                <SelectItem value="Ceased">Ceased</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(person)}
                              className="h-8 w-8 p-0"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditDetails(person)}
                              className="h-8 w-8 p-0"
                              title="Edit Details"
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
            </CardContent>
          </Card>
    </div>
  );
};
