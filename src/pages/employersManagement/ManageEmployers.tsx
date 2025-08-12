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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  RefreshCw,
  CheckCircle,
  Printer,
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
import { EmptyState } from '@/components/ui/empty-state';
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
  },
  // Adding pending verification employers
  {
    regNo: "PEND001",
    name: "PendingCorp Solutions",
    tradeName: "PendingCorp",
    phone: "(869) 465-4567",
    fax: "(869) 465-4568",
    hqAddress1: "789 Pending Street",
    hqAddress2: "Charlestown",
    officeCode: "CHT001",
    activityType: "IT Services",
    industrialCode: "Software Development",
    mailingAddress1: "P.O. Box 789",
    mailingAddress2: "Charlestown",
    villageCode: "Charlestown",
    sectorCode: "SEC003",
    malesEmployed: 12,
    femalesEmployed: 8,
    arrears: 0,
    legalAction: "None",
    expectedMonthlyIncomeDate: "2024-03-15",
    dateOfRegistration: "",
    dateWagesFirstPaid: "",
    dateOfClosure: "",
    dateOfApplication: "2024-02-01",
    dateOfEntry: "2024-02-05",
    dateOfIssue: "",
    dateModified: "",
    dateVerified: "",
    enteredBy: "System Admin",
    modifiedBy: "",
    verifiedBy: "",
    ownershipCode: "OWN003",
    previousOwner: "",
    previousOwnerAddress1: "",
    previousOwnerAddress2: "",
    dateOfAcquisition: "",
    dateOfIncorporated: "2024-01-01",
    companyPayroll: "No",
    makeModel: "",
    diskType: "",
    acquiredCode: "No",
    estimatedArrearsSS: 0,
    estimatedArrearsLV: 0,
    estimatedArrearsPE: 0,
    estimatedWagesSS: 8000,
    estimatedWagesLV: 6000,
    estimatedWagesPE: 12000,
    status: "Pending",
    inspectorCode: "03 Sarah Williams",
    parentRegNo: "",
    reRegistrationDate: ""
  },
  {
    regNo: "PEND002",
    name: "NewTech Innovations",
    tradeName: "NewTech",
    phone: "(869) 465-5678",
    fax: "(869) 465-5679",
    hqAddress1: "321 Innovation Drive",
    hqAddress2: "Sandy Point",
    officeCode: "SPT001",
    activityType: "Technology",
    industrialCode: "Tech Innovation",
    mailingAddress1: "P.O. Box 321",
    mailingAddress2: "Sandy Point",
    villageCode: "Sandy Point",
    sectorCode: "SEC004",
    malesEmployed: 18,
    femalesEmployed: 22,
    arrears: 0,
    legalAction: "None",
    expectedMonthlyIncomeDate: "2024-03-20",
    dateOfRegistration: "",
    dateWagesFirstPaid: "",
    dateOfClosure: "",
    dateOfApplication: "2024-02-10",
    dateOfEntry: "2024-02-15",
    dateOfIssue: "",
    dateModified: "",
    dateVerified: "",
    enteredBy: "Admin User",
    modifiedBy: "",
    verifiedBy: "",
    ownershipCode: "OWN004",
    previousOwner: "",
    previousOwnerAddress1: "",
    previousOwnerAddress2: "",
    dateOfAcquisition: "",
    dateOfIncorporated: "2024-01-15",
    companyPayroll: "Yes",
    makeModel: "",
    diskType: "",
    acquiredCode: "No",
    estimatedArrearsSS: 0,
    estimatedArrearsLV: 0,
    estimatedArrearsPE: 0,
    estimatedWagesSS: 15000,
    estimatedWagesLV: 12000,
    estimatedWagesPE: 20000,
    status: "Pending",
    inspectorCode: "04 Michael Davis",
    parentRegNo: "",
    reRegistrationDate: ""
  }
];

const ManageEmployers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  
  // Dialog states
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  
  const [searchParams, setSearchParams] = useState({
    registrationNumber: '',
    employerName: '',
    tradeName: '',
    phoneNumber: '',
    status: 'All',
    inspectorCode: '',
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
    });
    setFromDate(undefined);
    setToDate(undefined);
  };

  // Action handlers for regular employers
  const handleView = (employer: EmployerRecord) => {
    navigate(`/employers-management/view/${employer.regNo}`);
  };

  const handleEdit = (employer: EmployerRecord) => {
    navigate(`/employers-management/edit/${employer.regNo}`);
  };

  const handleDelete = (employer: EmployerRecord) => {
    if (confirm(`Are you sure you want to delete ${employer.name}?`)) {
      console.log('Deleting employer:', employer);
      alert(`Successfully deleted ${employer.name}`);
    }
  };

  // Pending Verification handlers
  const handleApprove = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setApproveDialogOpen(true);
  };

  const handleReject = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (employer: EmployerRecord) => {
    navigate(`/employers-management/view/${employer.regNo}`);
  };

  const confirmApprove = () => {
    if (selectedEmployer) {
      console.log('Approving employer:', selectedEmployer);
      alert(`Successfully approved ${selectedEmployer.name}. Status changed to Active.`);
      setApproveDialogOpen(false);
      setSelectedEmployer(null);
    }
  };

  const confirmReject = () => {
    if (selectedEmployer && rejectionReason.trim()) {
      console.log('Rejecting employer:', selectedEmployer, 'Reason:', rejectionReason);
      alert(`Successfully rejected ${selectedEmployer.name}. Rejection email sent with reason: ${rejectionReason}`);
      setRejectDialogOpen(false);
      setSelectedEmployer(null);
      setRejectionReason('');
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
      case 'Pending':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Pending</Badge>;
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
        return sampleEmployers.filter(emp => emp.status === 'Pending');
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Employers</h1>
            <Button 
              onClick={() => navigate('/employer/register')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Register New Employers
            </Button>
          </div>
          
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
                      <RefreshCw className="w-4 h-4 mr-2" />
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full h-12 grid grid-cols-3 bg-gray-50 p-1 rounded-none">
                  <TabsTrigger 
                    value="pending" 
                    className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                  >
                    Pending Verification ({sampleEmployers.filter(emp => emp.status === 'Pending').length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="registered" 
                    className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                  >
                    Registered Employers ({sampleEmployers.filter(emp => emp.status === 'Active').length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ceased" 
                    className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                  >
                    Ceased/Suspended ({sampleEmployers.filter(emp => emp.status === 'Suspended' || emp.status === 'Closed').length})
                  </TabsTrigger>
                </TabsList>

                {/* Pending Verification Tab */}
                <TabsContent value="pending" className="p-6 mt-0">
                  {filteredEmployers.length === 0 ? (
                    <EmptyState 
                      title="No pending applications"
                      description="All employer registrations have been processed."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="app-table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Application. No</TableHead>
                            <TableHead>Employer Name</TableHead>
                            <TableHead>Trade Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Activity Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmployers.map((employer) => (
                            <TableRow key={employer.regNo}>
                              <TableCell className="font-medium">{employer.regNo}</TableCell>
                              <TableCell>{employer.name}</TableCell>
                              <TableCell>{employer.tradeName}</TableCell>
                              <TableCell>{employer.phone}</TableCell>
                              <TableCell>{employer.activityType}</TableCell>
                              <TableCell>{getStatusBadge(employer.status)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => handleApprove(employer)}
                                        className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approve
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Approve Registration</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => handleReject(employer)}
                                        className="h-8 px-3"
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Reject Registration</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleViewDetails(employer)}
                                        className="h-8 px-3"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View Details
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Registration Details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Registered Employers Tab */}
                <TabsContent value="registered" className="p-6 mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="text-gray-600 font-medium">Reg. No</TableHead>
                          <TableHead className="text-gray-600 font-medium">Employer Name</TableHead>
                          <TableHead className="text-gray-600 font-medium">Trade Name</TableHead>
                          <TableHead className="text-gray-600 font-medium">Phone</TableHead>
                          <TableHead className="text-gray-600 font-medium">Activity Type</TableHead>
                          <TableHead className="text-gray-600 font-medium">Status</TableHead>
                          <TableHead className="text-gray-600 font-medium text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployers.map((employer) => (
                          <TableRow key={employer.regNo} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-gray-900">{employer.regNo}</TableCell>
                            <TableCell className="text-gray-700">{employer.name}</TableCell>
                            <TableCell className="text-gray-700">{employer.tradeName}</TableCell>
                            <TableCell className="text-gray-700">{employer.phone}</TableCell>
                            <TableCell className="text-gray-700">{employer.activityType}</TableCell>
                            <TableCell>{getStatusBadge(employer.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleView(employer)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Details</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEdit(employer)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDelete(employer)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Ceased/Suspended Employers Tab */}
                <TabsContent value="ceased" className="p-6 mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="text-gray-600 font-medium">Reg. No</TableHead>
                          <TableHead className="text-gray-600 font-medium">Employer Name</TableHead>
                          <TableHead className="text-gray-600 font-medium">Trade Name</TableHead>
                          <TableHead className="text-gray-600 font-medium">Phone</TableHead>
                          <TableHead className="text-gray-600 font-medium">Activity Type</TableHead>
                          <TableHead className="text-gray-600 font-medium">Status</TableHead>
                          <TableHead className="text-gray-600 font-medium text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployers.map((employer) => (
                          <TableRow key={employer.regNo} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-gray-900">{employer.regNo}</TableCell>
                            <TableCell className="text-gray-700">{employer.name}</TableCell>
                            <TableCell className="text-gray-700">{employer.tradeName}</TableCell>
                            <TableCell className="text-gray-700">{employer.phone}</TableCell>
                            <TableCell className="text-gray-700">{employer.activityType}</TableCell>
                            <TableCell>{getStatusBadge(employer.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleView(employer)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Details</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEdit(employer)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Approval Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Employer Registration</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve the registration for {selectedEmployer?.name}? 
                This will change their status to Active and send a confirmation notification.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmApprove} className="bg-green-600 hover:bg-green-700">
                Approve Registration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Employer Registration</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting the registration for {selectedEmployer?.name}. 
                This reason will be included in the rejection email.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmReject} 
                disabled={!rejectionReason.trim()}
                variant="destructive"
              >
                Reject Registration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ManageEmployers;