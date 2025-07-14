import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Plus, HelpCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@/components/ip/DatePicker';

interface EmployerRecord {
  regNo: string;
  name: string;
  tradeName: string;
  phone: string;
  fax: string;
  hqAddress1: string;
  hqAddress2: string;
  officeCode: string;
  activityType: string;
  industrialCode: string;
  mailingAddress1: string;
  mailingAddress2: string;
  villageCode: string;
  sectorCode: string;
  malesEmployed: number;
  femalesEmployed: number;
  arrears: number;
  legalAction: string;
  expectedMonthlyIncomeDate: string;
  dateOfRegistration: string;
  dateWagesFirstPaid: string;
  dateOfClosure: string;
  dateOfApplication: string;
  dateOfEntry: string;
  dateOfIssue: string;
  dateModified: string;
  dateVerified: string;
  enteredBy: string;
  modifiedBy: string;
  verifiedBy: string;
  ownershipCode: string;
  previousOwner: string;
  previousOwnerAddress1: string;
  previousOwnerAddress2: string;
  dateOfAcquisition: string;
  dateOfIncorporated: string;
  companyPayroll: string;
  makeModel: string;
  diskType: string;
  acquiredCode: string;
  estimatedArrearsSS: number;
  estimatedArrearsLV: number;
  estimatedArrearsPE: number;
  estimatedWagesSS: number;
  estimatedWagesLV: number;
  estimatedWagesPE: number;
  status: string;
  inspectorCode: string;
  parentRegNo: string;
  reRegistrationDate: string;
}

// Sample data
const sampleEmployers: EmployerRecord[] = [
  {
    regNo: "EMP001",
    name: "ABC Construction Ltd",
    tradeName: "ABC Construction",
    phone: "(869) 465-2345",
    fax: "(869) 465-2346",
    hqAddress1: "123 Main Street",
    hqAddress2: "Basseterre",
    officeCode: "BST001",
    activityType: "Construction",
    industrialCode: "Building of Complete Con",
    mailingAddress1: "P.O. Box 123",
    mailingAddress2: "Basseterre",
    villageCode: "Basseterre",
    sectorCode: "SEC001",
    malesEmployed: 25,
    femalesEmployed: 15,
    arrears: 5000,
    legalAction: "None",
    expectedMonthlyIncomeDate: "2024-01-15",
    dateOfRegistration: "2023-01-15",
    dateWagesFirstPaid: "2023-02-01",
    dateOfClosure: "",
    dateOfApplication: "2023-01-01",
    dateOfEntry: "2023-01-10",
    dateOfIssue: "2023-01-20",
    dateModified: "2024-01-01",
    dateVerified: "2023-01-25",
    enteredBy: "John Doe",
    modifiedBy: "Jane Smith",
    verifiedBy: "Bob Johnson",
    ownershipCode: "OWN001",
    previousOwner: "",
    previousOwnerAddress1: "",
    previousOwnerAddress2: "",
    dateOfAcquisition: "",
    dateOfIncorporated: "2023-01-01",
    companyPayroll: "Yes",
    makeModel: "Dell Optiplex",
    diskType: "SSD",
    acquiredCode: "No",
    estimatedArrearsSS: 1500,
    estimatedArrearsLV: 1000,
    estimatedArrearsPE: 2500,
    estimatedWagesSS: 15000,
    estimatedWagesLV: 10000,
    estimatedWagesPE: 25000,
    status: "Active",
    inspectorCode: "01 Vincent Sutton",
    parentRegNo: "",
    reRegistrationDate: ""
  }
];

const ManageEmployers = () => {
  const navigate = useNavigate();
  const [searchBy, setSearchBy] = useState({
    regNo: '',
    name: '',
    tradeName: '',
    phone: '',
    registrationDate: null as Date | null,
    status: ''
  });
  
  const [filteredEmployers, setFilteredEmployers] = useState<EmployerRecord[]>(sampleEmployers);

  const handleSearch = () => {
    const filtered = sampleEmployers.filter(employer => {
      if (searchBy.regNo && !employer.regNo.toLowerCase().includes(searchBy.regNo.toLowerCase())) return false;
      if (searchBy.name && !employer.name.toLowerCase().includes(searchBy.name.toLowerCase())) return false;
      if (searchBy.tradeName && !employer.tradeName.toLowerCase().includes(searchBy.tradeName.toLowerCase())) return false;
      if (searchBy.phone && !employer.phone.includes(searchBy.phone)) return false;
      if (searchBy.status && employer.status !== searchBy.status) return false;
      if (searchBy.registrationDate && employer.dateOfRegistration !== searchBy.registrationDate.toISOString().split('T')[0]) return false;
      return true;
    });
    setFilteredEmployers(filtered);
  };

  const handleAddNewEmployer = () => {
    navigate('/add-employer');
  };

  const handleHelp = () => {
    // Help functionality
    alert('Help functionality will be implemented');
  };

  const handleReturnResults = () => {
    setFilteredEmployers(sampleEmployers);
    setSearchBy({
      regNo: '',
      name: '',
      tradeName: '',
      phone: '',
      registrationDate: null,
      status: ''
    });
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          <h1 className="text-xl lg:text-3xl font-bold">Manage Employers</h1>
        </div>
      </div>

      {/* Query By Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Query By
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regNo">Reg No.</Label>
              <Input
                id="regNo"
                placeholder="Enter registration number"
                value={searchBy.regNo}
                onChange={(e) => setSearchBy(prev => ({ ...prev, regNo: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter employer name"
                value={searchBy.name}
                onChange={(e) => setSearchBy(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tradeName">Trade Name</Label>
              <Input
                id="tradeName"
                placeholder="Enter trade name"
                value={searchBy.tradeName}
                onChange={(e) => setSearchBy(prev => ({ ...prev, tradeName: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={searchBy.phone}
                onChange={(e) => setSearchBy(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Registration Date</Label>
              <DatePicker
                date={searchBy.registrationDate}
                onSelect={(date) => setSearchBy(prev => ({ ...prev, registrationDate: date }))}
                placeholder="Select registration date"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={searchBy.status} onValueChange={(value) => setSearchBy(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleAddNewEmployer} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add New Employers
            </Button>
            <Button onClick={handleHelp} variant="outline">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help
            </Button>
            <Button onClick={handleReturnResults} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Search Results ({filteredEmployers.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg. No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Trade Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Fax</TableHead>
                  <TableHead>HQ Address 1</TableHead>
                  <TableHead>HQ Address 2</TableHead>
                  <TableHead>Office Code</TableHead>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Industrial Code</TableHead>
                  <TableHead>Mailing Address 1</TableHead>
                  <TableHead>Mailing Address 2</TableHead>
                  <TableHead>Village Code</TableHead>
                  <TableHead>Sector Code</TableHead>
                  <TableHead>Males Employed</TableHead>
                  <TableHead>Females Employed</TableHead>
                  <TableHead>Arrears</TableHead>
                  <TableHead>Legal Action</TableHead>
                  <TableHead>Expected Monthly Income Date</TableHead>
                  <TableHead>Date of Registration</TableHead>
                  <TableHead>Date Wages First Paid</TableHead>
                  <TableHead>Date of Closure</TableHead>
                  <TableHead>Date of Application</TableHead>
                  <TableHead>Date of Entry</TableHead>
                  <TableHead>Date of Issue</TableHead>
                  <TableHead>Date Modified</TableHead>
                  <TableHead>Date Verified</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>Modified By</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Ownership Code</TableHead>
                  <TableHead>Previous Owner</TableHead>
                  <TableHead>Previous Owner Address 1</TableHead>
                  <TableHead>Previous Owner Address 2</TableHead>
                  <TableHead>Date of Acquisition</TableHead>
                  <TableHead>Date of Incorporated</TableHead>
                  <TableHead>Company Payroll</TableHead>
                  <TableHead>Make Model</TableHead>
                  <TableHead>Disk Type</TableHead>
                  <TableHead>Acquired Code</TableHead>
                  <TableHead>Estimated Arrears SS</TableHead>
                  <TableHead>Estimated Arrears LV</TableHead>
                  <TableHead>Estimated Arrears PE</TableHead>
                  <TableHead>Estimated Wages SS</TableHead>
                  <TableHead>Estimated Wages LV</TableHead>
                  <TableHead>Estimated Wages PE</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inspector Code</TableHead>
                  <TableHead>Parent Reg. No.</TableHead>
                  <TableHead>Re Registration Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployers.map((employer) => (
                  <TableRow key={employer.regNo}>
                    <TableCell className="font-medium">{employer.regNo}</TableCell>
                    <TableCell>{employer.name}</TableCell>
                    <TableCell>{employer.tradeName}</TableCell>
                    <TableCell>{employer.phone}</TableCell>
                    <TableCell>{employer.fax}</TableCell>
                    <TableCell>{employer.hqAddress1}</TableCell>
                    <TableCell>{employer.hqAddress2}</TableCell>
                    <TableCell>{employer.officeCode}</TableCell>
                    <TableCell>{employer.activityType}</TableCell>
                    <TableCell>{employer.industrialCode}</TableCell>
                    <TableCell>{employer.mailingAddress1}</TableCell>
                    <TableCell>{employer.mailingAddress2}</TableCell>
                    <TableCell>{employer.villageCode}</TableCell>
                    <TableCell>{employer.sectorCode}</TableCell>
                    <TableCell>{employer.malesEmployed}</TableCell>
                    <TableCell>{employer.femalesEmployed}</TableCell>
                    <TableCell>{employer.arrears}</TableCell>
                    <TableCell>{employer.legalAction}</TableCell>
                    <TableCell>{employer.expectedMonthlyIncomeDate}</TableCell>
                    <TableCell>{employer.dateOfRegistration}</TableCell>
                    <TableCell>{employer.dateWagesFirstPaid}</TableCell>
                    <TableCell>{employer.dateOfClosure}</TableCell>
                    <TableCell>{employer.dateOfApplication}</TableCell>
                    <TableCell>{employer.dateOfEntry}</TableCell>
                    <TableCell>{employer.dateOfIssue}</TableCell>
                    <TableCell>{employer.dateModified}</TableCell>
                    <TableCell>{employer.dateVerified}</TableCell>
                    <TableCell>{employer.enteredBy}</TableCell>
                    <TableCell>{employer.modifiedBy}</TableCell>
                    <TableCell>{employer.verifiedBy}</TableCell>
                    <TableCell>{employer.ownershipCode}</TableCell>
                    <TableCell>{employer.previousOwner}</TableCell>
                    <TableCell>{employer.previousOwnerAddress1}</TableCell>
                    <TableCell>{employer.previousOwnerAddress2}</TableCell>
                    <TableCell>{employer.dateOfAcquisition}</TableCell>
                    <TableCell>{employer.dateOfIncorporated}</TableCell>
                    <TableCell>{employer.companyPayroll}</TableCell>
                    <TableCell>{employer.makeModel}</TableCell>
                    <TableCell>{employer.diskType}</TableCell>
                    <TableCell>{employer.acquiredCode}</TableCell>
                    <TableCell>{employer.estimatedArrearsSS}</TableCell>
                    <TableCell>{employer.estimatedArrearsLV}</TableCell>
                    <TableCell>{employer.estimatedArrearsPE}</TableCell>
                    <TableCell>{employer.estimatedWagesSS}</TableCell>
                    <TableCell>{employer.estimatedWagesLV}</TableCell>
                    <TableCell>{employer.estimatedWagesPE}</TableCell>
                    <TableCell>
                      <Badge variant={employer.status === 'Active' ? 'default' : 'secondary'}>
                        {employer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{employer.inspectorCode}</TableCell>
                    <TableCell>{employer.parentRegNo}</TableCell>
                    <TableCell>{employer.reRegistrationDate}</TableCell>
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

export default ManageEmployers;