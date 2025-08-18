import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RotateCcw, ChevronDown, ChevronUp, Eye, Edit, Trash2, Printer, MoreHorizontal, Download, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import EmployerC3Form from "./forms/EmployerC3Form";
import SelfEmployedC3Form from "./forms/SelfEmployedC3Form";
import VoluntaryC3Form from "./forms/VoluntaryC3Form";

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
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add');
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
    setEditingRecord(null);
    setViewingRecord(null);
    setFormMode('add');
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
    setViewingRecord(record);
    setFormMode('view');
    setContributionType(record.type === 'Employer' ? 'employer' : 
                       record.type === 'Self-Employed' ? 'self-employed' : 'voluntary');
    setShowForm(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormMode('edit');
    setContributionType(record.type === 'Employer' ? 'employer' : 
                       record.type === 'Self-Employed' ? 'self-employed' : 'voluntary');
    setShowForm(true);
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
        
          <div className="flex items-center gap-3">
          {formMode === 'add' ? <>
          <Button 
            variant="outline" 
            onClick={() => {
            setShowForm(false);
            setEditingRecord(null);
            setViewingRecord(null);
            setFormMode('add');
          }}
            className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sm:hidden">Back</span>
          </Button>
        </> : null}
            <h1 className="text-3xl font-bold tracking-tight">
              {formMode === 'add' ? 'New C3 Submission' : 
               formMode === 'edit' ? 'Edit C3 Record' : 'View C3 Record'}
            </h1>
            
          </div>
          
          <div className="flex gap-2 self-start lg:self-center mt-4 lg:mt-0">
            {/* <Button onClick={() => {
            setShowForm(false);
            setEditingRecord(null);
            setViewingRecord(null);
            setFormMode('add');
          }} variant="outline"
          className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
          >
            Back to Manage C3
          </Button> */}
                          <Button type="button" variant="outline"  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md" >
                            Draft
                          </Button>
                          <Button type="button" className="flex items-center gap-2 border-r-4 border-r-[#33529C]" >
                            Submit
                          </Button>
                        </div>
        </div>

        {/* Tabbed Form Interface */}
        <Tabs value={contributionType} onValueChange={setContributionType} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employer">Employer</TabsTrigger>
            <TabsTrigger value="self-employed">Self Contributor</TabsTrigger>
            <TabsTrigger value="voluntary">Voluntary Contribution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="employer">
            <EmployerC3Form 
              data={formMode === 'edit' ? editingRecord : formMode === 'view' ? viewingRecord : null}
              mode={formMode}
              onClose={() => {
                setShowForm(false);
                setEditingRecord(null);
                setViewingRecord(null);
                setFormMode('add');
              }} 
              onSave={(data) => {
                console.log('Employer C3 saved:', data);
                toast({
                  title: `C3 Record ${formMode === 'add' ? 'Created' : 'Updated'}`,
                  description: `Employer C3 record has been ${formMode === 'add' ? 'created' : 'updated'} successfully.`,
                });
                setShowForm(false);
                setEditingRecord(null);
                setViewingRecord(null);
                setFormMode('add');
              }}
            />
          </TabsContent>
          
          <TabsContent value="self-employed">
            <SelfEmployedC3Form 
              data={formMode === 'edit' ? editingRecord : formMode === 'view' ? viewingRecord : null}
              mode={formMode}
              onClose={() => {
                setShowForm(false);
                setEditingRecord(null);
                setViewingRecord(null);
                setFormMode('add');
              }}
              onSave={(data) => {
                console.log('Self-employed C3 saved:', data);
                toast({
                  title: `C3 Record ${formMode === 'add' ? 'Created' : 'Updated'}`,
                  description: `Self-employed C3 record has been ${formMode === 'add' ? 'created' : 'updated'} successfully.`,
                });
                setShowForm(false);
                setEditingRecord(null);
                setViewingRecord(null);
                setFormMode('add');
              }}
            />
          </TabsContent>
          
          <TabsContent value="voluntary">
            <VoluntaryC3Form 
              data={formMode === 'edit' ? editingRecord : formMode === 'view' ? viewingRecord : null}
              mode={formMode}
              onClose={() => {
                setShowForm(false);
                setEditingRecord(null);
                setViewingRecord(null);
                setFormMode('add');
              }}
              onSave={(data) => {
                console.log('Voluntary C3 saved:', data);
                toast({
                  title: `C3 Record ${formMode === 'add' ? 'Created' : 'Updated'}`,
                  description: `Voluntary C3 record has been ${formMode === 'add' ? 'created' : 'updated'} successfully.`,
                });
                setShowForm(false);
                setEditingRecord(null);
                setViewingRecord(null);
                setFormMode('add');
              }}
            />
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
          {/* <DropdownMenu>
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
          </DropdownMenu> */}
          <Button onClick={handleAddNewC3} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New C3 Submission
          </Button>
        </div>
      </div>

      {/* Contribution Type Tabs */}
      <Tabs value={contributionType} onValueChange={setContributionType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employer">Employer</TabsTrigger>
          <TabsTrigger value="self-employed">Self Contributor</TabsTrigger>
          <TabsTrigger value="voluntary">Voluntary Contribution</TabsTrigger>
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
    

      {/* C3 Data Table */}
      <div>
       
        
          <DataTable
            data={currentRecords}
            columns={[
              { key: 'payerId', label: 'Payer ID', minWidth: '100px' },
              { key: 'scheduleNo', label: 'Schedule No.', minWidth: '120px' },
              { key: 'period', label: 'Period', minWidth: '100px' },
              { key: 'dateReceived', label: 'Date Received', minWidth: '120px' },
              { key: 'enteredBy', label: 'Entered By', minWidth: '120px' },
              { key: 'verifiedBy', label: 'Verified By', minWidth: '120px', render: (value) => value || "-" },
              { key: 'dateEntered', label: 'Date Entered', minWidth: '120px' },
              { key: 'dateVerified', label: 'Date Verified', minWidth: '120px', render: (value) => value || "-" },
              { 
                key: 'status', 
                label: 'Status', 
                minWidth: '100px',
                render: (status) => getStatusBadge(status)
              },
              { key: 'type', label: 'Type', minWidth: '120px' },
              { key: 'payerName', label: 'Payer Name', minWidth: '150px' },
              { 
                key: 'amount', 
                label: 'Amount', 
                minWidth: '120px',
                render: (amount) => `$${amount.toLocaleString()}`
              },
              { key: 'cnc3ReportedReceivedBy', label: 'CNC3 Received By', minWidth: '140px' },
              { key: 'cnc3ReportedModifiedDate', label: 'CNC3 Modified Date', minWidth: '140px' },
              { key: 'cnc3ReportedModifiedBy', label: 'CNC3 Modified By', minWidth: '140px' }
            ]}
            title="C3 Records"
            searchPlaceholder="Search by Payer ID, Name, or Type"
            actions={{ view: true, edit: true }}
            onView={(record) => handleView(record)}
            onEdit={(record) => handleEdit(record)}
          />

         
        
      </div>

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