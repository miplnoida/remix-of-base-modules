import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Save,
  RefreshCw,
  CheckCircle,
  FileText,
  Printer,
  RotateCcw,
  Plus,
  Download,
  ChevronDown,
  ChevronRight,
  CalendarIcon,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState('pending');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerRecord | null>(null);
  const [editedEmployer, setEditedEmployer] = useState<EmployerRecord | null>(null);
  const [newStatus, setNewStatus] = useState('');
  
  const [searchParams, setSearchParams] = useState({
    registrationNumber: '',
    employerName: '',
    tradeName: '',
    phoneNumber: '',
    status: 'All',
    inspectorCode: '',
    // Advanced filters
    regNo: '',
    fax: '',
    hqAddress1: '',
    hqAddress2: '',
    officeCode: '',
    activityType: '',
    industrialCode: '',
    mailingAddress1: '',
    mailingAddress2: '',
    villageCode: '',
    sectorCode: '',
    ownershipCode: '',
    parentRegNo: '',
    acquiredCode: ''
  });

  const handleSearch = () => {
    console.log('Searching with parameters:', searchParams);
    // Implement actual search functionality here
  };

  const handleReset = () => {
    setSearchParams({
      registrationNumber: '',
      employerName: '',
      tradeName: '',
      phoneNumber: '',
      status: 'All',
      inspectorCode: '',
      // Advanced filters
      regNo: '',
      fax: '',
      hqAddress1: '',
      hqAddress2: '',
      officeCode: '',
      activityType: '',
      industrialCode: '',
      mailingAddress1: '',
      mailingAddress2: '',
      villageCode: '',
      sectorCode: '',
      ownershipCode: '',
      parentRegNo: '',
      acquiredCode: ''
    });
    setFromDate(undefined);
    setToDate(undefined);
  };

  const handleAddNewEmployer = () => {
    navigate('/employer/register');
  };

  // Action handlers
  const handleView = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setViewDialogOpen(true);
  };

  const handleEdit = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setEditedEmployer({ ...employer });
    setEditDialogOpen(true);
  };

  const handleDelete = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setDeleteDialogOpen(true);
  };

  const handleChangeStatus = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setNewStatus(employer.status);
    setStatusDialogOpen(true);
  };

  const confirmEdit = () => {
    if (editedEmployer) {
      // Update the employer in the data (in real app, this would be an API call)
      console.log('Updating employer:', editedEmployer);
      alert(`Successfully updated ${editedEmployer.name}`);
      setEditDialogOpen(false);
      setEditedEmployer(null);
    }
  };

  const confirmDelete = () => {
    if (selectedEmployer) {
      // Delete the employer (in real app, this would be an API call)
      console.log('Deleting employer:', selectedEmployer);
      alert(`Successfully deleted ${selectedEmployer.name}`);
      setDeleteDialogOpen(false);
      setSelectedEmployer(null);
    }
  };

  const confirmStatusChange = () => {
    if (selectedEmployer && newStatus) {
      // Update status (in real app, this would be an API call)
      console.log('Changing status:', selectedEmployer, 'to:', newStatus);
      alert(`Successfully changed status of ${selectedEmployer.name} to ${newStatus}`);
      setStatusDialogOpen(false);
      setSelectedEmployer(null);
      setNewStatus('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
      case 'Suspended':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Suspended</Badge>;
      case 'Closed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Closed</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter employers based on active tab
  const getFilteredEmployers = () => {
    switch (activeTab) {
      case 'pending':
        return sampleEmployers.filter(emp => emp.status === 'Pending' || !emp.dateVerified);
      case 'registered':
        return sampleEmployers.filter(emp => emp.status === 'Active');
      case 'ceased':
        return sampleEmployers.filter(emp => emp.status === 'Suspended' || emp.status === 'Closed');
      default:
        return sampleEmployers;
    }
  };

  const filteredEmployers = getFilteredEmployers();

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Employers</h1>
          
          {/* Section 1: Query By (Collapsible Filters Panel) */}
          <Card className="mb-6 shadow-sm">
            <Collapsible open={isFilterExpanded} onOpenChange={setIsFilterExpanded}>
              <CardHeader className="border-b bg-background">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground">Query By</CardTitle>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2 h-auto">
                      {isFilterExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              
              {/* Expanded View - Show 7 Essential Filters */}
              <CollapsibleContent className="bg-background">
                <CardContent className="p-6 bg-background">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Registration Number</label>
                      <Input
                        placeholder="Enter reg. number"
                        value={searchParams.registrationNumber}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, registrationNumber: e.target.value }))}
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Employer Name</label>
                      <Input
                        placeholder="Enter employer name"
                        value={searchParams.employerName}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, employerName: e.target.value }))}
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Trade Name</label>
                      <Input
                        placeholder="Enter trade name"
                        value={searchParams.tradeName}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, tradeName: e.target.value }))}
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone Number</label>
                      <Input
                        placeholder="Enter phone number"
                        value={searchParams.phoneNumber}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Registration Date</label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "flex-1 justify-start text-left font-normal bg-background",
                                !fromDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {fromDate ? format(fromDate, "MMM dd") : "From"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={fromDate}
                              onSelect={setFromDate}
                              initialFocus
                              className="p-3 pointer-events-auto bg-background"
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "flex-1 justify-start text-left font-normal bg-background",
                                !toDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {toDate ? format(toDate, "MMM dd") : "To"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={toDate}
                              onSelect={setToDate}
                              initialFocus
                              className="p-3 pointer-events-auto bg-background"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Inspector Code</label>
                      <Select value={searchParams.inspectorCode} onValueChange={(value) => setSearchParams(prev => ({ ...prev, inspectorCode: value }))}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select inspector" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="00 Nevis">00 Nevis</SelectItem>
                          <SelectItem value="01 Vincent Sutton">01 Vincent Sutton</SelectItem>
                          <SelectItem value="02 Dexter Richardson">02 Dexter Richardson</SelectItem>
                          <SelectItem value="N04 Sheon Lewis">N04 Sheon Lewis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                      <Select value={searchParams.status} onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="All">All</SelectItem>
                          <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                          <SelectItem value="Registered">Registered</SelectItem>
                          <SelectItem value="Ceased/Suspended">Ceased/Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      onClick={handleSearch} 
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleReset}
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Section 2: Search Result Area */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg text-gray-800">Search Result ({filteredEmployers.length})</CardTitle>
                  <CardDescription>Comprehensive employer information and management</CardDescription>
                </div>
                <Button variant="outline" className="border-gray-300">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-50 border-b">
                  <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                    Pending Verification
                  </TabsTrigger>
                  <TabsTrigger value="registered" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                    Registered Employers
                  </TabsTrigger>
                  <TabsTrigger value="ceased" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                    Ceased/Suspended Employers
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="m-0">
                  <div className="overflow-x-auto max-h-[600px]">
                    <Table className="relative">
                      <TableHeader className="sticky top-0 bg-white z-10 border-b-2">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-[100px] font-semibold">Reg. No.</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Name</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Trade Name</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Phone</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Fax</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">HQ Address 1</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">HQ Address 2</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Office Code</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Activity Type</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Industrial Code</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Mailing Address 1</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Mailing Address 2</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Village Code</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Sector Code</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Males Employed</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Females Employed</TableHead>
                          <TableHead className="min-w-[100px] font-semibold">Arrears</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Legal Action</TableHead>
                          <TableHead className="min-w-[180px] font-semibold">Expected Monthly Income Date</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Date of Registration</TableHead>
                          <TableHead className="min-w-[160px] font-semibold">Date Wages First Paid</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Date of Closure</TableHead>
                          <TableHead className="min-w-[140px] font-semibold">Date of Application</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Date of Entry</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Date of Issue</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Date Modified</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Date Verified</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Entered By</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Modified By</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Verified By</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Ownership Code</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Previous Owner</TableHead>
                          <TableHead className="min-w-[180px] font-semibold">Previous Owner Address 1</TableHead>
                          <TableHead className="min-w-[180px] font-semibold">Previous Owner Address 2</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Date of Acquisition</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Date of Incorporated</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Company Payroll</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Make Model</TableHead>
                          <TableHead className="min-w-[100px] font-semibold">Disk Type</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">Acquired Code</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Estimated Arrears SS</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Estimated Arrears LV</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Estimated Arrears PE</TableHead>
                          <TableHead className="min-w-[140px] font-semibold">Estimated Wages SS</TableHead>
                          <TableHead className="min-w-[140px] font-semibold">Estimated Wages LV</TableHead>
                          <TableHead className="min-w-[140px] font-semibold">Estimated Wages PE</TableHead>
                          <TableHead className="min-w-[100px] font-semibold">Status</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Inspector Code</TableHead>
                          <TableHead className="min-w-[130px] font-semibold">Parent Reg. No.</TableHead>
                          <TableHead className="min-w-[160px] font-semibold">Re Registration Date</TableHead>
                          <TableHead className="min-w-[200px] sticky right-0 bg-white font-semibold border-l-2">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={47} className="text-center py-8 text-gray-500">
                              No data found for the selected criteria
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredEmployers.map((employer, index) => (
                            <TableRow key={index} className="hover:bg-blue-50 transition-colors border-b">
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
                              <TableCell>${employer.arrears.toLocaleString()}</TableCell>
                              <TableCell>{employer.legalAction}</TableCell>
                              <TableCell>{employer.expectedMonthlyIncomeDate}</TableCell>
                              <TableCell>{employer.dateOfRegistration}</TableCell>
                              <TableCell>{employer.dateWagesFirstPaid}</TableCell>
                              <TableCell>{employer.dateOfClosure || '-'}</TableCell>
                              <TableCell>{employer.dateOfApplication}</TableCell>
                              <TableCell>{employer.dateOfEntry}</TableCell>
                              <TableCell>{employer.dateOfIssue}</TableCell>
                              <TableCell>{employer.dateModified}</TableCell>
                              <TableCell>{employer.dateVerified}</TableCell>
                              <TableCell>{employer.enteredBy}</TableCell>
                              <TableCell>{employer.modifiedBy}</TableCell>
                              <TableCell>{employer.verifiedBy}</TableCell>
                              <TableCell>{employer.ownershipCode}</TableCell>
                              <TableCell>{employer.previousOwner || '-'}</TableCell>
                              <TableCell>{employer.previousOwnerAddress1 || '-'}</TableCell>
                              <TableCell>{employer.previousOwnerAddress2 || '-'}</TableCell>
                              <TableCell>{employer.dateOfAcquisition || '-'}</TableCell>
                              <TableCell>{employer.dateOfIncorporated}</TableCell>
                              <TableCell>{employer.companyPayroll}</TableCell>
                              <TableCell>{employer.makeModel}</TableCell>
                              <TableCell>{employer.diskType}</TableCell>
                              <TableCell>{employer.acquiredCode}</TableCell>
                              <TableCell>${employer.estimatedArrearsSS.toLocaleString()}</TableCell>
                              <TableCell>${employer.estimatedArrearsLV.toLocaleString()}</TableCell>
                              <TableCell>${employer.estimatedArrearsPE.toLocaleString()}</TableCell>
                              <TableCell>${employer.estimatedWagesSS.toLocaleString()}</TableCell>
                              <TableCell>${employer.estimatedWagesLV.toLocaleString()}</TableCell>
                              <TableCell>${employer.estimatedWagesPE.toLocaleString()}</TableCell>
                              <TableCell>{getStatusBadge(employer.status)}</TableCell>
                              <TableCell>{employer.inspectorCode}</TableCell>
                              <TableCell>{employer.parentRegNo || '-'}</TableCell>
                              <TableCell>{employer.reRegistrationDate || '-'}</TableCell>
                              <TableCell className="sticky right-0 bg-white border-l-2">
                                <div className="flex gap-1 justify-end">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleView(employer)}
                                        className="h-8 w-8 p-0 hover:bg-blue-50"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View</TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(employer)}
                                        className="h-8 w-8 p-0 hover:bg-green-50"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(employer)}
                                        className="h-8 w-8 p-0 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleChangeStatus(employer)}
                                        className="h-8 w-8 p-0 hover:bg-orange-50"
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Change Status</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-500">
              Showing {filteredEmployers.length} of {sampleEmployers.length} employers
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="bg-blue-600 text-white">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* View Employer Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employer Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedEmployer?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedEmployer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Registration Number</Label>
                    <p className="mt-1">{selectedEmployer.regNo}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Employer Name</Label>
                    <p className="mt-1">{selectedEmployer.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Trade Name</Label>
                    <p className="mt-1">{selectedEmployer.tradeName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p className="mt-1">{selectedEmployer.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fax</Label>
                    <p className="mt-1">{selectedEmployer.fax}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">HQ Address</Label>
                    <p className="mt-1">{selectedEmployer.hqAddress1}</p>
                    <p>{selectedEmployer.hqAddress2}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Activity Type</Label>
                    <p className="mt-1">{selectedEmployer.activityType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Industrial Code</Label>
                    <p className="mt-1">{selectedEmployer.industrialCode}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Employees</Label>
                    <p className="mt-1">Males: {selectedEmployer.malesEmployed}, Females: {selectedEmployer.femalesEmployed}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedEmployer.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Registration Date</Label>
                    <p className="mt-1">{selectedEmployer.dateOfRegistration}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Inspector Code</Label>
                    <p className="mt-1">{selectedEmployer.inspectorCode}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Arrears</Label>
                    <p className="mt-1">${selectedEmployer.arrears.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Legal Action</Label>
                    <p className="mt-1">{selectedEmployer.legalAction}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Mailing Address</Label>
                    <p className="mt-1">{selectedEmployer.mailingAddress1}</p>
                    <p>{selectedEmployer.mailingAddress2}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Entered By</Label>
                    <p className="mt-1">{selectedEmployer.enteredBy}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Date Modified</Label>
                    <p className="mt-1">{selectedEmployer.dateModified}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Modified By</Label>
                    <p className="mt-1">{selectedEmployer.modifiedBy}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Employer Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employer</DialogTitle>
              <DialogDescription>
                Update employer information for {editedEmployer?.name}
              </DialogDescription>
            </DialogHeader>
            {editedEmployer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Employer Name</Label>
                    <Input
                      id="edit-name"
                      value={editedEmployer.name}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-trade-name">Trade Name</Label>
                    <Input
                      id="edit-trade-name"
                      value={editedEmployer.tradeName}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, tradeName: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editedEmployer.phone}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-fax">Fax</Label>
                    <Input
                      id="edit-fax"
                      value={editedEmployer.fax}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, fax: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-hq-address1">HQ Address 1</Label>
                    <Input
                      id="edit-hq-address1"
                      value={editedEmployer.hqAddress1}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, hqAddress1: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-hq-address2">HQ Address 2</Label>
                    <Input
                      id="edit-hq-address2"
                      value={editedEmployer.hqAddress2}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, hqAddress2: e.target.value } : null)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-activity-type">Activity Type</Label>
                    <Input
                      id="edit-activity-type"
                      value={editedEmployer.activityType}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, activityType: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-industrial-code">Industrial Code</Label>
                    <Input
                      id="edit-industrial-code"
                      value={editedEmployer.industrialCode}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, industrialCode: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-males">Males Employed</Label>
                    <Input
                      id="edit-males"
                      type="number"
                      value={editedEmployer.malesEmployed}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, malesEmployed: parseInt(e.target.value) || 0 } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-females">Females Employed</Label>
                    <Input
                      id="edit-females"
                      type="number"
                      value={editedEmployer.femalesEmployed}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, femalesEmployed: parseInt(e.target.value) || 0 } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-mailing1">Mailing Address 1</Label>
                    <Input
                      id="edit-mailing1"
                      value={editedEmployer.mailingAddress1}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, mailingAddress1: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-mailing2">Mailing Address 2</Label>
                    <Input
                      id="edit-mailing2"
                      value={editedEmployer.mailingAddress2}
                      onChange={(e) => setEditedEmployer(prev => prev ? { ...prev, mailingAddress2: e.target.value } : null)}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Employer Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedEmployer?.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Status Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Status</DialogTitle>
              <DialogDescription>
                Change the status for {selectedEmployer?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="status-select">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmStatusChange}>Change Status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ManageEmployers;