import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RotateCcw, ChevronDown, ChevronUp, Eye, Edit, Trash2, Printer, MoreHorizontal, Download, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import C3InputForm from "./C3InputForm";

// Enhanced mock data for the table with all required columns
const mockC3Data = [
  {
    payerId: "EMP001",
    scheduleNo: "SCH-2024-001",
    period: "2024-01",
    dateReceived: "2024-01-15",
    enteredBy: "John Smith",
    verifiedBy: "Jane Doe",
    dateEntered: "2024-01-16",
    dateVerified: "2024-01-17",
    status: "Verified",
    type: "Employer",
    payerName: "ABC Company Ltd",
    cnc3ReportedReceivedBy: "System Admin",
    cnc3ReportedModifiedDate: "2024-01-17",
    cnc3ReportedModifiedBy: "Jane Doe",
    amount: 15750.00
  },
  {
    payerId: "SE002",
    scheduleNo: "SCH-2024-002",
    period: "2024-01",
    dateReceived: "2024-01-14",
    enteredBy: "Mike Johnson",
    verifiedBy: "",
    dateEntered: "2024-01-15",
    dateVerified: "",
    status: "Pending",
    type: "Self-Employed",
    payerName: "XYZ Consultancy",
    cnc3ReportedReceivedBy: "System Admin",
    cnc3ReportedModifiedDate: "2024-01-15",
    cnc3ReportedModifiedBy: "Mike Johnson",
    amount: 8420.00
  },
  {
    payerId: "VOL003",
    scheduleNo: "SCH-2024-003",
    period: "2024-01",
    dateReceived: "2024-01-13",
    enteredBy: "Sarah Wilson",
    verifiedBy: "Robert Brown",
    dateEntered: "2024-01-14",
    dateVerified: "2024-01-16",
    status: "Verified",
    type: "Voluntary Contribution",
    payerName: "Individual Contributor",
    cnc3ReportedReceivedBy: "System Admin",
    cnc3ReportedModifiedDate: "2024-01-16",
    cnc3ReportedModifiedBy: "Robert Brown",
    amount: 2300.00
  },
  {
    payerId: "EMP004",
    scheduleNo: "SCH-2024-004",
    period: "2024-01",
    dateReceived: "2024-01-12",
    enteredBy: "David Lee",
    verifiedBy: "",
    dateEntered: "2024-01-13",
    dateVerified: "",
    status: "Rejected",
    type: "Employer",
    payerName: "DEF Corporation",
    cnc3ReportedReceivedBy: "System Admin",
    cnc3ReportedModifiedDate: "2024-01-13",
    cnc3ReportedModifiedBy: "David Lee",
    amount: 5670.00
  }
];

export default function C3Management() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [contributionType, setContributionType] = useState("employer");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    regNo: "",
    scheduleNo: "",
    period: "",
    dateReceived: "",
    enteredBy: "",
    verifiedBy: "",
    dateEntered: "",
    status: ""
  });


  const handleAddNewC3 = () => {
    setShowForm(true);
  };

  const handleSearch = () => {
    console.log("Searching with filters:", filters, "Type:", contributionType);
    // Implement search logic here
  };

  const handleReset = () => {
    setFilters({
      regNo: "",
      scheduleNo: "",
      period: "",
      dateReceived: "",
      enteredBy: "",
      verifiedBy: "",
      dateEntered: "",
      status: ""
    });
    setSearchTerm("");
    setContributionType("employer");
  };

  const handleView = (record: any) => {
    navigate(`/c3-management/view/${record.scheduleNo}`);
  };

  const handleEdit = (record: any) => {
    navigate(`/c3-management/edit/${record.scheduleNo}`);
  };

  const handleDelete = (record: any) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      // In real app, this would call API to delete
      toast({
        title: "Record Deleted",
        description: `C3 record ${recordToDelete.scheduleNo} has been deleted.`,
      });
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handlePrint = (record: any) => {
    // Create a printable version
    const printContent = `
      <html>
        <head>
          <title>C3 Record - ${record.scheduleNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info-table { width: 100%; border-collapse: collapse; }
            .info-table th, .info-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .info-table th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>C3 Contribution Record</h1>
            <h2>Schedule No: ${record.scheduleNo}</h2>
          </div>
          <table class="info-table">
            <tr><th>Payer ID</th><td>${record.payerId}</td></tr>
            <tr><th>Payer Name</th><td>${record.payerName}</td></tr>
            <tr><th>Type</th><td>${record.type}</td></tr>
            <tr><th>Period</th><td>${record.period}</td></tr>
            <tr><th>Amount</th><td>$${record.amount.toLocaleString()}</td></tr>
            <tr><th>Status</th><td>${record.status}</td></tr>
            <tr><th>Date Received</th><td>${record.dateReceived}</td></tr>
            <tr><th>Entered By</th><td>${record.enteredBy}</td></tr>
            <tr><th>Verified By</th><td>${record.verifiedBy || '-'}</td></tr>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportExcel = () => {
    console.log("Exporting to Excel");
    // Implement Excel export
  };

  const handleExportPDF = () => {
    console.log("Exporting to PDF");
    // Implement PDF export
  };

  // Filter data based on search term
  const filteredData = mockC3Data.filter(record =>
    record.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.payerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.scheduleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredData.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };

  if (showForm) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New C3 Submission</h1>
            <p className="text-muted-foreground">Create a new C3 contribution record</p>
          </div>
          <Button onClick={() => setShowForm(false)} variant="outline">
            Back to Manage C3
          </Button>
        </div>

        {/* Tabbed Form Interface */}
        <Tabs value={contributionType} onValueChange={setContributionType} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employer">🟩 Employer</TabsTrigger>
            <TabsTrigger value="self-employed">🟨 Self Contributor</TabsTrigger>
            <TabsTrigger value="voluntary">🟦 Voluntary Contribution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="employer">
            <Card>
              <CardHeader>
                <CardTitle>Employer C3 Form</CardTitle>
                <CardDescription>For companies or organizations submitting Social Security data for their employees</CardDescription>
              </CardHeader>
              <CardContent>
                <C3InputForm type="employer" />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="self-employed">
            <Card>
              <CardHeader>
                <CardTitle>Self Contributor C3 Form</CardTitle>
                <CardDescription>For individuals contributing on behalf of themselves as self-employed workers</CardDescription>
              </CardHeader>
              <CardContent>
                <C3InputForm type="self-employed" />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="voluntary">
            <Card>
              <CardHeader>
                <CardTitle>Voluntary Contribution C3 Form</CardTitle>
                <CardDescription>For individuals not employed or self-employed, but contributing voluntarily</CardDescription>
              </CardHeader>
              <CardContent>
                <C3InputForm type="voluntary" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage C3</h1>
          <p className="text-muted-foreground">Manage and view C3 contribution records</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border shadow-md z-50">
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddNewC3} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New C3
          </Button>
        </div>
      </div>

      {/* Contribution Type Tabs */}
      <Tabs value={contributionType} onValueChange={setContributionType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employer">🟩 Employer</TabsTrigger>
          <TabsTrigger value="self-employed">🟨 Self Contributor</TabsTrigger>
          <TabsTrigger value="voluntary">🟦 Voluntary Contribution</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Query By Section */}
      <Card>
        <Collapsible open={isQueryExpanded} onOpenChange={setIsQueryExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Query By</CardTitle>
                  <CardDescription>Filter and search C3 records</CardDescription>
                </div>
                {isQueryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Filter Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regNo">
                    {contributionType === "employer" ? "Reg No (6-digit)" : "SSN"}
                  </Label>
                  <Input
                    id="regNo"
                    placeholder={contributionType === "employer" ? "Enter 6-digit registration number" : "Enter SSN"}
                    value={filters.regNo}
                    onChange={(e) => setFilters({ ...filters, regNo: e.target.value })}
                    maxLength={contributionType === "employer" ? 6 : undefined}
                    pattern={contributionType === "employer" ? "[0-9]{6}" : undefined}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduleNo">Schedule No</Label>
                  <Input
                    id="scheduleNo"
                    placeholder="Auto-populated"
                    value={filters.scheduleNo}
                    onChange={(e) => setFilters({ ...filters, scheduleNo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    placeholder="Auto-populated"
                    value={filters.period}
                    onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateReceived">Date Received</Label>
                  <Input
                    id="dateReceived"
                    type="date"
                    value={filters.dateReceived}
                    onChange={(e) => setFilters({ ...filters, dateReceived: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enteredBy">Entered By</Label>
                  <Input
                    id="enteredBy"
                    placeholder="Auto-populated"
                    value={filters.enteredBy}
                    onChange={(e) => setFilters({ ...filters, enteredBy: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verifiedBy">Verified By</Label>
                  <Input
                    id="verifiedBy"
                    placeholder="Auto-populated"
                    value={filters.verifiedBy}
                    onChange={(e) => setFilters({ ...filters, verifiedBy: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateEntered">Date Entered</Label>
                  <Input
                    id="dateEntered"
                    type="date"
                    value={filters.dateEntered}
                    onChange={(e) => setFilters({ ...filters, dateEntered: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSearch} className="gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Search Bar and Records Per Page */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by Payer Name, Reg No, Schedule No, Status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="recordsPerPage" className="text-sm">Show:</Label>
          <Select value={recordsPerPage.toString()} onValueChange={(value) => setRecordsPerPage(Number(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">records</span>
        </div>
      </div>

      {/* C3 Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>C3 Records</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords} records
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payer ID</TableHead>
                  <TableHead>Schedule No.</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Date Entered</TableHead>
                  <TableHead>Date Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payer Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>CNC3 Received By</TableHead>
                  <TableHead>CNC3 Modified Date</TableHead>
                  <TableHead>CNC3 Modified By</TableHead>
                  <TableHead className="text-center sticky right-0 bg-background border-l-2 border-border shadow-lg z-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecords.map((record, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{record.payerId}</TableCell>
                    <TableCell>{record.scheduleNo}</TableCell>
                    <TableCell>{record.period}</TableCell>
                    <TableCell>{record.dateReceived}</TableCell>
                    <TableCell>{record.enteredBy}</TableCell>
                    <TableCell>{record.verifiedBy || "-"}</TableCell>
                    <TableCell>{record.dateEntered}</TableCell>
                    <TableCell>{record.dateVerified || "-"}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>{record.payerName}</TableCell>
                    <TableCell>${record.amount.toLocaleString()}</TableCell>
                    <TableCell>{record.cnc3ReportedReceivedBy}</TableCell>
                    <TableCell>{record.cnc3ReportedModifiedDate}</TableCell>
                    <TableCell>{record.cnc3ReportedModifiedBy}</TableCell>
                    <TableCell className="sticky right-0 bg-background border-l-2 border-border shadow-lg z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background border shadow-md z-50" align="end">
                          <DropdownMenuItem onClick={() => handleView(record)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrint(record)} className="cursor-pointer">
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(record)} 
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
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
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="text-muted-foreground">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete C3 Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the C3 record "{recordToDelete?.scheduleNo}"? 
              This action cannot be undone.
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
    </div>
  );
}