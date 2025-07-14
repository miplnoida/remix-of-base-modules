import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { 
  Building2, 
  Search, 
  Plus, 
  HelpCircle, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp,
  X,
  Download,
  Upload,
  FileText,
  Printer,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  SlidersHorizontal,
  Filter,
  Calendar,
  Phone,
  Mail,
  Settings,
  ArrowUpDown,
  CheckSquare,
  Square
} from 'lucide-react';
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
  const [selectedEmployers, setSelectedEmployers] = useState<string[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<keyof EmployerRecord>('regNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'regNo', 'name', 'tradeName', 'phone', 'status', 'dateOfRegistration', 'inspectorCode'
  ]);

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const filters: { key: string; value: string; label: string }[] = [];
    if (searchBy.regNo) filters.push({ key: 'regNo', value: searchBy.regNo, label: `Reg No: ${searchBy.regNo}` });
    if (searchBy.name) filters.push({ key: 'name', value: searchBy.name, label: `Name: ${searchBy.name}` });
    if (searchBy.tradeName) filters.push({ key: 'tradeName', value: searchBy.tradeName, label: `Trade Name: ${searchBy.tradeName}` });
    if (searchBy.phone) filters.push({ key: 'phone', value: searchBy.phone, label: `Phone: ${searchBy.phone}` });
    if (searchBy.status) filters.push({ key: 'status', value: searchBy.status, label: `Status: ${searchBy.status}` });
    if (searchBy.registrationDate) filters.push({ key: 'registrationDate', value: searchBy.registrationDate.toISOString(), label: `Date: ${searchBy.registrationDate.toLocaleDateString()}` });
    return filters;
  }, [searchBy]);

  // Filtered and sorted data
  const processedEmployers = useMemo(() => {
    let filtered = sampleEmployers.filter(employer => {
      if (searchBy.regNo && !employer.regNo.toLowerCase().includes(searchBy.regNo.toLowerCase())) return false;
      if (searchBy.name && !employer.name.toLowerCase().includes(searchBy.name.toLowerCase())) return false;
      if (searchBy.tradeName && !employer.tradeName.toLowerCase().includes(searchBy.tradeName.toLowerCase())) return false;
      if (searchBy.phone && !employer.phone.includes(searchBy.phone)) return false;
      if (searchBy.status && employer.status !== searchBy.status) return false;
      if (searchBy.registrationDate && employer.dateOfRegistration !== searchBy.registrationDate.toISOString().split('T')[0]) return false;
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
  }, [searchBy, sortColumn, sortDirection]);

  // Paginated data
  const paginatedEmployers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return processedEmployers.slice(start, end);
  }, [processedEmployers, currentPage, pageSize]);

  const totalPages = Math.ceil(processedEmployers.length / pageSize);

  const handleSort = (column: keyof EmployerRecord) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployers.length === paginatedEmployers.length) {
      setSelectedEmployers([]);
    } else {
      setSelectedEmployers(paginatedEmployers.map(emp => emp.regNo));
    }
  };

  const handleSelectEmployer = (regNo: string) => {
    setSelectedEmployers(prev => 
      prev.includes(regNo) 
        ? prev.filter(id => id !== regNo)
        : [...prev, regNo]
    );
  };

  const removeFilter = (key: string) => {
    setSearchBy(prev => ({ ...prev, [key]: key === 'registrationDate' ? null : '' }));
  };

  const clearAllFilters = () => {
    setSearchBy({
      regNo: '',
      name: '',
      tradeName: '',
      phone: '',
      registrationDate: null,
      status: ''
    });
  };

  const handleExportCSV = () => {
    const headers = visibleColumns.join(',');
    const rows = processedEmployers.map(employer => 
      visibleColumns.map(col => employer[col as keyof EmployerRecord]).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employers.csv';
    a.click();
  };

  const handleAddNewEmployer = () => {
    navigate('/add-employer');
  };

  const handleHelp = () => {
    // Help functionality
    alert('Help functionality will be implemented');
  };

  const handleReturnResults = () => {
    clearAllFilters();
    setCurrentPage(1);
    setSelectedEmployers([]);
  };

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
          <div className="flex items-center gap-3">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Manage Columns</SheetTitle>
                  <SheetDescription>
                    Select which columns to display in the table
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  {Object.keys(sampleEmployers[0]).map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={column}
                        checked={visibleColumns.includes(column)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleColumns([...visibleColumns, column]);
                          } else {
                            setVisibleColumns(visibleColumns.filter(col => col !== column));
                          }
                        }}
                      />
                      <Label htmlFor={column} className="text-sm font-medium capitalize">
                        {column.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Collapsible Search Panel */}
        <Card className="border-primary/20 shadow-lg">
          <Collapsible open={isSearchExpanded} onOpenChange={setIsSearchExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Search & Filter
                  </div>
                  {isSearchExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="relative">
                    <Input
                      id="regNo"
                      placeholder=" "
                      value={searchBy.regNo}
                      onChange={(e) => setSearchBy(prev => ({ ...prev, regNo: e.target.value }))}
                      className="peer"
                    />
                    <Label 
                      htmlFor="regNo" 
                      className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
                    >
                      Registration Number
                    </Label>
                  </div>
                  
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder=" "
                      value={searchBy.name}
                      onChange={(e) => setSearchBy(prev => ({ ...prev, name: e.target.value }))}
                      className="peer"
                    />
                    <Label 
                      htmlFor="name" 
                      className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
                    >
                      Employer Name
                    </Label>
                  </div>
                  
                  <div className="relative">
                    <Input
                      id="tradeName"
                      placeholder=" "
                      value={searchBy.tradeName}
                      onChange={(e) => setSearchBy(prev => ({ ...prev, tradeName: e.target.value }))}
                      className="peer"
                    />
                    <Label 
                      htmlFor="tradeName" 
                      className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
                    >
                      Trade Name
                    </Label>
                  </div>
                  
                  <div className="relative">
                    <Input
                      id="phone"
                      placeholder=" "
                      value={searchBy.phone}
                      onChange={(e) => setSearchBy(prev => ({ ...prev, phone: e.target.value }))}
                      className="peer"
                    />
                    <Label 
                      htmlFor="phone" 
                      className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
                    >
                      Phone Number
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Registration Date</Label>
                    <DatePicker
                      date={searchBy.registrationDate}
                      onSelect={(date) => setSearchBy(prev => ({ ...prev, registrationDate: date }))}
                      placeholder="Select date"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select value={searchBy.status} onValueChange={(value) => setSearchBy(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
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
                
                <div className="flex flex-wrap gap-2 mt-6">
                  <Button className="bg-primary hover:bg-primary/90">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button onClick={handleAddNewEmployer} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Employer
                  </Button>
                  <Button onClick={clearAllFilters} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Help
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Help & Guide</SheetTitle>
                        <SheetDescription>
                          Learn how to use the Manage Employers section effectively
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Search Tips:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Use partial matches for name searches</li>
                            <li>• Filter by status to find specific employer types</li>
                            <li>• Use date ranges for registration date filtering</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Table Actions:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Click column headers to sort</li>
                            <li>• Use checkboxes for bulk actions</li>
                            <li>• Right-click rows for context menu</li>
                          </ul>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <Button onClick={handleReturnResults} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return Results
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {activeFilters.map((filter) => (
                  <Badge key={filter.key} variant="secondary" className="flex items-center gap-1">
                    {filter.label}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeFilter(filter.key)}
                    />
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Search Results ({processedEmployers.length} records)
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedEmployers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedEmployers.length} selected
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Bulk Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedEmployers.length === paginatedEmployers.length && paginatedEmployers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    {visibleColumns.includes('regNo') && (
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('regNo')}>
                        <div className="flex items-center gap-2">
                          Reg. No.
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.includes('name') && (
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-2">
                          Name
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.includes('tradeName') && (
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('tradeName')}>
                        <div className="flex items-center gap-2">
                          Trade Name
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.includes('phone') && (
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.includes('status') && (
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-2">
                          Status
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.includes('dateOfRegistration') && (
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('dateOfRegistration')}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Registration Date
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumns.includes('inspectorCode') && (
                      <TableHead>Inspector</TableHead>
                    )}
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployers.map((employer) => (
                    <TableRow 
                      key={employer.regNo} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleSelectEmployer(employer.regNo)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedEmployers.includes(employer.regNo)}
                          onCheckedChange={() => handleSelectEmployer(employer.regNo)}
                        />
                      </TableCell>
                      {visibleColumns.includes('regNo') && (
                        <TableCell className="font-medium text-primary">{employer.regNo}</TableCell>
                      )}
                      {visibleColumns.includes('name') && (
                        <TableCell className="font-medium">{employer.name}</TableCell>
                      )}
                      {visibleColumns.includes('tradeName') && (
                        <TableCell className="text-muted-foreground">{employer.tradeName}</TableCell>
                      )}
                      {visibleColumns.includes('phone') && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {employer.phone}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell>
                          <Badge 
                            variant={employer.status === 'Active' ? 'default' : 'secondary'}
                            className={
                              employer.status === 'Active' ? 'bg-green-100 text-green-800' :
                              employer.status === 'Closed' ? 'bg-red-100 text-red-800' :
                              employer.status === 'Suspended' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            <div className={`w-2 h-2 rounded-full mr-1 ${
                              employer.status === 'Active' ? 'bg-green-500' :
                              employer.status === 'Closed' ? 'bg-red-500' :
                              employer.status === 'Suspended' ? 'bg-yellow-500' :
                              'bg-gray-500'
                            }`}></div>
                            {employer.status}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('dateOfRegistration') && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(employer.dateOfRegistration).toLocaleDateString()}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('inspectorCode') && (
                        <TableCell className="text-sm text-muted-foreground">{employer.inspectorCode}</TableCell>
                      )}
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 mr-2" />
                              Print
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
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageEmployers;