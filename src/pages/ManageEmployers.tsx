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
import {
  Search,
  Edit,
  Eye,
  HelpCircle,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowLeft,
  Trash2
} from 'lucide-react';

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

// Sample data with comprehensive employer records
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
  },
  {
    regNo: "EMP002",
    name: "XYZ Manufacturing Inc",
    tradeName: "XYZ Manufacturing",
    phone: "(869) 465-3456",
    fax: "(869) 465-3457",
    hqAddress1: "456 Industrial Road",
    hqAddress2: "Cayon",
    officeCode: "CAY001",
    activityType: "Manufacturing",
    industrialCode: "Farming Domestic Animals",
    mailingAddress1: "P.O. Box 456",
    mailingAddress2: "Cayon",
    villageCode: "Cayon",
    sectorCode: "SEC002",
    malesEmployed: 35,
    femalesEmployed: 28,
    arrears: 0,
    legalAction: "Pending",
    expectedMonthlyIncomeDate: "2024-02-15",
    dateOfRegistration: "2022-05-20",
    dateWagesFirstPaid: "2022-06-01",
    dateOfClosure: "",
    dateOfApplication: "2022-05-01",
    dateOfEntry: "2022-05-15",
    dateOfIssue: "2022-05-25",
    dateModified: "2024-01-15",
    dateVerified: "2022-06-01",
    enteredBy: "Mary Johnson",
    modifiedBy: "Peter Wilson",
    verifiedBy: "Alice Brown",
    ownershipCode: "OWN002",
    previousOwner: "Previous Corp",
    previousOwnerAddress1: "789 Old Street",
    previousOwnerAddress2: "Old Town",
    dateOfAcquisition: "2022-04-01",
    dateOfIncorporated: "2022-01-01",
    companyPayroll: "Yes",
    makeModel: "HP ProDesk",
    diskType: "HDD",
    acquiredCode: "Yes",
    estimatedArrearsSS: 0,
    estimatedArrearsLV: 0,
    estimatedArrearsPE: 0,
    estimatedWagesSS: 25000,
    estimatedWagesLV: 18000,
    estimatedWagesPE: 35000,
    status: "Suspended",
    inspectorCode: "02 Dexter Richardson",
    parentRegNo: "PARENT001",
    reRegistrationDate: "2023-01-01"
  }
];

const ManageEmployers = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [searchParams, setSearchParams] = useState({
    regNo: '',
    name: '',
    tradeName: '',
    phone: '',
    registrationDate: '',
    status: ''
  });

  const handleSearch = () => {
    console.log('Searching with parameters:', searchParams);
    // Implement actual search functionality here
  };

  const handleReturnResults = () => {
    console.log('Returning search results');
    // Implement return result functionality
  };

  const handleClearSearch = () => {
    setSearchParams({
      regNo: '', name: '', tradeName: '', phone: '', registrationDate: '', status: ''
    });
  };

  const handleViewDetails = (employer: EmployerRecord) => {
    console.log('Viewing details for:', employer);
    navigate(`/add-employer?mode=view&regNo=${employer.regNo}`, { state: { employerData: employer } });
  };

  const handleEditDetails = (employer: EmployerRecord) => {
    console.log('Editing details for:', employer);
    navigate(`/add-employer?mode=edit&regNo=${employer.regNo}`, { state: { employerData: employer } });
  };

  const handleDeleteEmployer = (employer: EmployerRecord) => {
    if (confirm(`Are you sure you want to delete employer "${employer.name}"? This action cannot be undone.`)) {
      console.log('Deleting employer:', employer);
      // Implement delete functionality here
      alert('Employer deleted successfully!');
    }
  };

  const handleAddNewEmployer = () => {
    navigate('/add-employer');
  };

  const handleHelp = () => {
    alert('Use the search filters to find specific employer records. All fields support partial text matching.');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'Suspended':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
      case 'Closed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Closed</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Manage Employers</h2>
        <Button 
          onClick={handleAddNewEmployer}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add New Employers
        </Button>
      </div>

      {/* Search and Filter Section - Collapsible */}
      <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base lg:text-lg">Query By</CardTitle>
                  <CardDescription className="text-sm">Reg No., Name, Trade Name, Phone, Registration Date, Status</CardDescription>
                </div>
                {isSearchOpen ? <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium">Registration No.</label>
                  <Input
                    placeholder="Enter registration number"
                    value={searchParams.regNo}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, regNo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Enter employer name"
                    value={searchParams.name}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Trade Name</label>
                  <Input
                    placeholder="Enter trade name"
                    value={searchParams.tradeName}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, tradeName: e.target.value }))}
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
                  <label className="text-sm font-medium">Registration Date</label>
                  <Input
                    type="date"
                    value={searchParams.registrationDate}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, registrationDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={searchParams.status} onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 lg:gap-3">
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={handleHelp}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </Button>
                <Button variant="outline" onClick={handleReturnResults}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return Results
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Employer Listing Section - Table Layout with All Columns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Search Results ({sampleEmployers.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Reg. No.</TableHead>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[150px]">Trade Name</TableHead>
                  <TableHead className="min-w-[120px]">Phone</TableHead>
                  <TableHead className="min-w-[120px]">Fax</TableHead>
                  <TableHead className="min-w-[150px]">HQ Address 1</TableHead>
                  <TableHead className="min-w-[150px]">HQ Address 2</TableHead>
                  <TableHead className="min-w-[120px]">Office Code</TableHead>
                  <TableHead className="min-w-[130px]">Activity Type</TableHead>
                  <TableHead className="min-w-[150px]">Industrial Code</TableHead>
                  <TableHead className="min-w-[150px]">Mailing Address 1</TableHead>
                  <TableHead className="min-w-[150px]">Mailing Address 2</TableHead>
                  <TableHead className="min-w-[120px]">Village Code</TableHead>
                  <TableHead className="min-w-[120px]">Sector Code</TableHead>
                  <TableHead className="min-w-[120px]">Males Employed</TableHead>
                  <TableHead className="min-w-[130px]">Females Employed</TableHead>
                  <TableHead className="min-w-[100px]">Arrears</TableHead>
                  <TableHead className="min-w-[120px]">Legal Action</TableHead>
                  <TableHead className="min-w-[180px]">Expected Monthly Income Date</TableHead>
                  <TableHead className="min-w-[150px]">Date of Registration</TableHead>
                  <TableHead className="min-w-[160px]">Date Wages First Paid</TableHead>
                  <TableHead className="min-w-[130px]">Date of Closure</TableHead>
                  <TableHead className="min-w-[140px]">Date of Application</TableHead>
                  <TableHead className="min-w-[120px]">Date of Entry</TableHead>
                  <TableHead className="min-w-[120px]">Date of Issue</TableHead>
                  <TableHead className="min-w-[130px]">Date Modified</TableHead>
                  <TableHead className="min-w-[130px]">Date Verified</TableHead>
                  <TableHead className="min-w-[120px]">Entered By</TableHead>
                  <TableHead className="min-w-[120px]">Modified By</TableHead>
                  <TableHead className="min-w-[120px]">Verified By</TableHead>
                  <TableHead className="min-w-[130px]">Ownership Code</TableHead>
                  <TableHead className="min-w-[130px]">Previous Owner</TableHead>
                  <TableHead className="min-w-[180px]">Previous Owner Address 1</TableHead>
                  <TableHead className="min-w-[180px]">Previous Owner Address 2</TableHead>
                  <TableHead className="min-w-[150px]">Date of Acquisition</TableHead>
                  <TableHead className="min-w-[150px]">Date of Incorporated</TableHead>
                  <TableHead className="min-w-[130px]">Company Payroll</TableHead>
                  <TableHead className="min-w-[120px]">Make Model</TableHead>
                  <TableHead className="min-w-[100px]">Disk Type</TableHead>
                  <TableHead className="min-w-[120px]">Acquired Code</TableHead>
                  <TableHead className="min-w-[150px]">Estimated Arrears SS</TableHead>
                  <TableHead className="min-w-[150px]">Estimated Arrears LV</TableHead>
                  <TableHead className="min-w-[150px]">Estimated Arrears PE</TableHead>
                  <TableHead className="min-w-[140px]">Estimated Wages SS</TableHead>
                  <TableHead className="min-w-[140px]">Estimated Wages LV</TableHead>
                  <TableHead className="min-w-[140px]">Estimated Wages PE</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[130px]">Inspector Code</TableHead>
                  <TableHead className="min-w-[130px]">Parent Reg. No.</TableHead>
                  <TableHead className="min-w-[160px]">Re Registration Date</TableHead>
                  <TableHead className="min-w-[150px] sticky right-0 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleEmployers.map((employer, index) => (
                  <TableRow key={index}>
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
                    <TableCell>{getStatusBadge(employer.status)}</TableCell>
                    <TableCell>{employer.inspectorCode}</TableCell>
                    <TableCell>{employer.parentRegNo}</TableCell>
                    <TableCell>{employer.reRegistrationDate}</TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(employer)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditDetails(employer)}
                          className="h-8 w-8 p-0"
                          title="Edit Details"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEmployer(employer)}
                          className="h-8 w-8 p-0"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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

export default ManageEmployers;