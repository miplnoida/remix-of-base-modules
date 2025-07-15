import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Building2, 
  Search, 
  Plus, 
  HelpCircle, 
  ArrowLeft, 
  X,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ArrowUpDown,
  Calendar,
  Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

// Sample data with comprehensive data
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

// Date Picker Component
const DateRangePicker = ({ 
  date, 
  onSelect, 
  placeholder = "Pick a date" 
}: { 
  date: Date | null; 
  onSelect: (date: Date | null) => void; 
  placeholder?: string; 
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={date || undefined}
          onSelect={(selectedDate) => onSelect(selectedDate || null)}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

const ManageEmployers = () => {
  const navigate = useNavigate();
  
  // Search filters state
  const [searchFilters, setSearchFilters] = useState({
    regNo: '',
    name: '',
    tradeName: '',
    phone: '',
    registrationDateFrom: null as Date | null,
    registrationDateTo: null as Date | null,
    status: ''
  });

  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<keyof EmployerRecord>('regNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtered and sorted data
  const processedEmployers = useMemo(() => {
    let filtered = sampleEmployers.filter(employer => {
      if (searchFilters.regNo && !employer.regNo.toLowerCase().includes(searchFilters.regNo.toLowerCase())) return false;
      if (searchFilters.name && !employer.name.toLowerCase().includes(searchFilters.name.toLowerCase())) return false;
      if (searchFilters.tradeName && !employer.tradeName.toLowerCase().includes(searchFilters.tradeName.toLowerCase())) return false;
      if (searchFilters.phone && !employer.phone.includes(searchFilters.phone)) return false;
      if (searchFilters.status && employer.status !== searchFilters.status) return false;
      
      // Date range filter
      if (searchFilters.registrationDateFrom || searchFilters.registrationDateTo) {
        const empDate = new Date(employer.dateOfRegistration);
        if (searchFilters.registrationDateFrom && empDate < searchFilters.registrationDateFrom) return false;
        if (searchFilters.registrationDateTo && empDate > searchFilters.registrationDateTo) return false;
      }
      
      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return 0;
    });

    return filtered;
  }, [searchFilters, sortColumn, sortDirection]);

  // Paginated data
  const paginatedEmployers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return processedEmployers.slice(start, end);
  }, [processedEmployers, currentPage, pageSize]);

  const totalPages = Math.ceil(processedEmployers.length / pageSize);

  // Event handlers
  const handleSort = (column: keyof EmployerRecord) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    // Search logic is handled by the processedEmployers useMemo
  };

  const handleAddNewEmployer = () => {
    navigate('/add-employer');
  };

  const handleHelp = () => {
    alert('Search and manage employer records. Use filters to narrow down results.');
  };

  const handleReturnResults = () => {
    setSearchFilters({
      regNo: '',
      name: '',
      tradeName: '',
      phone: '',
      registrationDateFrom: null,
      registrationDateTo: null,
      status: ''
    });
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Active': { color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
      'Closed': { color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
      'Suspended': { color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
      'Inactive': { color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Inactive'];

    return (
      <Badge variant="secondary" className={config.color}>
        <div className={`w-2 h-2 rounded-full mr-1 ${config.dot}`}></div>
        {status}
      </Badge>
    );
  };

  // Table columns configuration
  const allColumns = [
    { key: 'regNo', label: 'Reg. No.', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'tradeName', label: 'Trade Name', sortable: true },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'fax', label: 'Fax', sortable: false },
    { key: 'hqAddress1', label: 'HQ Address 1', sortable: true },
    { key: 'hqAddress2', label: 'HQ Address 2', sortable: true },
    { key: 'officeCode', label: 'Office Code', sortable: true },
    { key: 'activityType', label: 'Activity Type', sortable: true },
    { key: 'industrialCode', label: 'Industrial Code', sortable: true },
    { key: 'mailingAddress1', label: 'Mailing Address 1', sortable: true },
    { key: 'mailingAddress2', label: 'Mailing Address 2', sortable: true },
    { key: 'villageCode', label: 'Village Code', sortable: true },
    { key: 'sectorCode', label: 'Sector Code', sortable: true },
    { key: 'malesEmployed', label: 'Males Employed', sortable: true },
    { key: 'femalesEmployed', label: 'Females Employed', sortable: true },
    { key: 'arrears', label: 'Arrears', sortable: true },
    { key: 'legalAction', label: 'Legal Action', sortable: true },
    { key: 'expectedMonthlyIncomeDate', label: 'Expected Monthly Income Date', sortable: true },
    { key: 'dateOfRegistration', label: 'Date of Registration', sortable: true },
    { key: 'dateWagesFirstPaid', label: 'Date Wages First Paid', sortable: true },
    { key: 'dateOfClosure', label: 'Date of Closure', sortable: true },
    { key: 'dateOfApplication', label: 'Date of Application', sortable: true },
    { key: 'dateOfEntry', label: 'Date of Entry', sortable: true },
    { key: 'dateOfIssue', label: 'Date of Issue', sortable: true },
    { key: 'dateModified', label: 'Date Modified', sortable: true },
    { key: 'dateVerified', label: 'Date Verified', sortable: true },
    { key: 'enteredBy', label: 'Entered By', sortable: true },
    { key: 'modifiedBy', label: 'Modified By', sortable: true },
    { key: 'verifiedBy', label: 'Verified By', sortable: true },
    { key: 'ownershipCode', label: 'Ownership Code', sortable: true },
    { key: 'previousOwner', label: 'Previous Owner', sortable: true },
    { key: 'previousOwnerAddress1', label: 'Previous Owner Address 1', sortable: true },
    { key: 'previousOwnerAddress2', label: 'Previous Owner Address 2', sortable: true },
    { key: 'dateOfAcquisition', label: 'Date of Acquisition', sortable: true },
    { key: 'dateOfIncorporated', label: 'Date of Incorporated', sortable: true },
    { key: 'companyPayroll', label: 'Company Payroll', sortable: true },
    { key: 'makeModel', label: 'Make Model', sortable: true },
    { key: 'diskType', label: 'Disk Type', sortable: true },
    { key: 'acquiredCode', label: 'Acquired Code', sortable: true },
    { key: 'estimatedArrearsSS', label: 'Estimated Arrears SS', sortable: true },
    { key: 'estimatedArrearsLV', label: 'Estimated Arrears LV', sortable: true },
    { key: 'estimatedArrearsPE', label: 'Estimated Arrears PE', sortable: true },
    { key: 'estimatedWagesSS', label: 'Estimated Wages SS', sortable: true },
    { key: 'estimatedWagesLV', label: 'Estimated Wages LV', sortable: true },
    { key: 'estimatedWagesPE', label: 'Estimated Wages PE', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'inspectorCode', label: 'Inspector Code', sortable: true },
    { key: 'parentRegNo', label: 'Parent Reg. No.', sortable: true },
    { key: 'reRegistrationDate', label: 'Re Registration Date', sortable: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manage Employers</h1>
              <p className="text-muted-foreground">Search, filter, and manage employer records</p>
            </div>
          </div>
        </div>

        {/* Search Panel */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Query By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Registration No. */}
              <div className="space-y-2">
                <Label htmlFor="regNo" className="text-sm font-medium">Registration No.</Label>
                <Input
                  id="regNo"
                  value={searchFilters.regNo}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, regNo: e.target.value }))}
                  placeholder="Enter registration number"
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <Input
                  id="name"
                  value={searchFilters.name}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter employer name"
                />
              </div>

              {/* Trade Name */}
              <div className="space-y-2">
                <Label htmlFor="tradeName" className="text-sm font-medium">Trade Name</Label>
                <Input
                  id="tradeName"
                  value={searchFilters.tradeName}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, tradeName: e.target.value }))}
                  placeholder="Enter trade name"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  value={searchFilters.phone}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Registration Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Registration Date (From)</Label>
                <DateRangePicker
                  date={searchFilters.registrationDateFrom}
                  onSelect={(date) => setSearchFilters(prev => ({ ...prev, registrationDateFrom: date }))}
                  placeholder="Select from date"
                />
              </div>

              {/* Registration Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Registration Date (To)</Label>
                <DateRangePicker
                  date={searchFilters.registrationDateTo}
                  onSelect={(date) => setSearchFilters(prev => ({ ...prev, registrationDateTo: date }))}
                  placeholder="Select to date"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={searchFilters.status} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="Inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        Inactive
                      </div>
                    </SelectItem>
                    <SelectItem value="Suspended">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Suspended
                      </div>
                    </SelectItem>
                    <SelectItem value="Closed">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Closed
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={handleAddNewEmployer} className="bg-green-600 hover:bg-green-700">
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
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Search Results ({processedEmployers.length} records)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    {allColumns.slice(0, 15).map((column) => (
                      <TableHead 
                        key={column.key}
                        className={column.sortable ? "cursor-pointer hover:bg-muted/50" : ""}
                        onClick={column.sortable ? () => handleSort(column.key as keyof EmployerRecord) : undefined}
                      >
                        <div className="flex items-center gap-2">
                          {column.label}
                          {column.sortable && <ArrowUpDown className="h-4 w-4" />}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployers.map((employer) => (
                    <TableRow key={employer.regNo} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-primary">{employer.regNo}</TableCell>
                      <TableCell className="font-medium">{employer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{employer.tradeName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {employer.phone}
                        </div>
                      </TableCell>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedEmployers.length)} of {processedEmployers.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageEmployers;