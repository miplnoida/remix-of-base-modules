import { useState, useEffect, useCallback } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { Plus, Search, RotateCcw, ChevronDown, ChevronUp, Eye, Edit, Trash2, Printer, MoreHorizontal, Download, FileSpreadsheet, ArrowLeft, StickyNote, CheckCircle, BadgeCheck, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import EmployerC3Form from "./forms/EmployerC3Form";
import SelfEmployedC3Form from "./forms/SelfEmployedC3Form";
import VoluntaryC3Form from "./forms/VoluntaryC3Form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useC3Management, contributionTypeToPayerType, payerTypeToContributionType } from "@/hooks/useC3Management";

export default function C3Management() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // C3 Management Hook - connects to Supabase
  const {
    records: c3Records,
    loading,
    total,
    fetchRecords,
    saveDraft,
    submitRecord,
    verifyRecord,
    deleteRecord: deleteC3Record,
    saveNotes,
    validatePayer,
    getScheduleNo,
  } = useC3Management();

  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [contributionType, setContributionType] = useState("employer");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [c3NotesModalOpen, setC3NotesModalOpen] = useState(false);
  const [c3Notes, setC3Notes] = useState("");
  const [currentRecordForNotes, setCurrentRecordForNotes] = useState<any>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [recordToVerify, setRecordToVerify] = useState<any>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetFormTrigger, setResetFormTrigger] = useState(0);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add');
  const [isSaving, setIsSaving] = useState(false);
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

  // Fetch records on mount and when contribution type changes
  useEffect(() => {
    const payerType = contributionTypeToPayerType(contributionType);
    const filterStatus = searchParams.get('filter');
    
    fetchRecords({
      payer_type: payerType,
      status: filterStatus === 'pending' ? 'P' : undefined,
    });
  }, [contributionType, searchParams]);

  // Function to get the appropriate button text based on active tab
  const getAddButtonText = () => {
    switch (contributionType) {
      case "employer":
        return "Add New Employer";
      case "self-employed":
        return "Add New Self Contributor";
      case "voluntary":
        return "Add New Voluntary Contribution";
      default:
        return "Add New C3 Submission";
    }
  };

  const handleAddNewC3 = () => {
    setEditingRecord(null);
    setViewingRecord(null);
    setFormMode('add');
    setShowForm(true);
  };

  const handleSearch = useCallback(() => {
    const payerType = contributionTypeToPayerType(contributionType);
    fetchRecords({
      payer_type: payerType,
      payer_id: filters.regNo || undefined,
      period: filters.period || undefined,
      status: filters.status ? filters.status.charAt(0).toUpperCase() : undefined,
      entered_by: filters.enteredBy || undefined,
      verified_by: filters.verifiedBy || undefined,
      date_received_from: filters.dateReceived || undefined,
    });
  }, [filters, contributionType, fetchRecords]);

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
    // Refetch with default filters
    const payerType = contributionTypeToPayerType(contributionType);
    fetchRecords({ payer_type: payerType });
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

  const confirmDelete = async () => {
    if (recordToDelete) {
      const result = await deleteC3Record(recordToDelete.id);
      if (result.success) {
        toast({
          title: "Record Deleted",
          description: `C3 record ${recordToDelete.scheduleNo} has been deleted.`,
        });
      }
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handlePrint = (record: any) => {
    if (!record) {
      console.error("No record provided for printing");
      return;
    }
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

  const handleC3Notes = (record: any) => {
    if (!record) {
      console.error("No record provided for notes");
      return;
    }
    console.log("Opening C3 Notes for:", record.scheduleNo);
    setCurrentRecordForNotes(record);
    setC3Notes(record.notes || ""); // Load existing notes if available
    setC3NotesModalOpen(true);
    console.log("Modal state set to true");
  };

  const handleSaveC3Notes = async () => {
    if (currentRecordForNotes && currentRecordForNotes.id) {
      const result = await saveNotes(currentRecordForNotes.id, c3Notes);
      if (result.success) {
        toast({
          title: "C3 Notes Saved",
          description: `Notes for C3 record ${currentRecordForNotes.scheduleNo} have been saved successfully.`,
        });
      }
      setC3NotesModalOpen(false);
      setCurrentRecordForNotes(null);
      setC3Notes("");
    }
  };

  const handleCloseC3Notes = () => {
    setC3NotesModalOpen(false);
    setCurrentRecordForNotes(null);
    setC3Notes("");
  };

  const handleVerify = (record: any) => {
    if (!record) {
      console.error("No record provided for verification");
      return;
    }
    
    // If already verified, show toast and return
    if (record.isVerified || record.postingStatus === 'V') {
      toast({
        title: "Already Verified",
        description: `C3 record ${record.scheduleNo} is already verified.`,
        className: "bg-blue-100",
      });
      return;
    }
    
    // Check if record is in Pending status
    if (record.postingStatus !== 'P') {
      toast({
        title: "Cannot Verify",
        description: `Only pending records can be verified. Current status: ${record.status}`,
        variant: "destructive",
      });
      return;
    }
    
    console.log("Requesting verification for C3 record:", record.scheduleNo);
    setRecordToVerify(record);
    setVerifyDialogOpen(true);
  };

  const confirmVerification = async () => {
    if (recordToVerify && recordToVerify.id) {
      const result = await verifyRecord(recordToVerify.id);
      
      if (result.success) {
        toast({
          title: "Verification Successful",
          description: `C3 record ${recordToVerify.scheduleNo} has been verified successfully.`,
        });
      }
      
      setVerifyDialogOpen(false);
      setRecordToVerify(null);
    }
  };

  const cancelVerification = () => {
    setVerifyDialogOpen(false);
    setRecordToVerify(null);
  };

  // Reset Form Handlers
  const handleResetForm = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    // Trigger form reset by incrementing the reset trigger
    setResetFormTrigger(prev => prev + 1);
    setShowResetDialog(false);
    toast({
      title: "Form Reset",
      description: "Form has been reset successfully.",
    });
  };

  const cancelReset = () => {
    setShowResetDialog(false);
  };

  // Filter data based on active tab (type) and search term
  const contributionTypeToLabel = (type: string) => {
    if (type === 'employer') return 'Employer';
    if (type === 'self-employed') return 'Self-Employed';
    return 'Voluntary Contribution';
  };

  // Use the records from the hook, filter by search term locally
  const filteredData = c3Records.filter(record =>
    !searchTerm || 
    (record.payerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.payerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.scheduleNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.status?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Use filtered data directly (pagination is handled by the hook)
  const currentRecords = filteredData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case "Draft":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Draft</Badge>;
      case "Rejected":
      case "Deleted":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };

  // Render modals outside of form context to ensure they're always visible
  const renderModals = () => (
    <>
      {/* C3 Notes Modal */}
      {c3NotesModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl mx-4 border-2 border-gray-200"
            style={{ 
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
          >
            {/* Close button */}
            <button
              onClick={handleCloseC3Notes}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
              style={{ zIndex: 10000 }}
            >
              ×
            </button>
            
            <div className="flex items-center gap-2 mb-4 pr-8">
              <StickyNote className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">C3 Notes</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Add or edit notes for C3 record: <span className="font-semibold text-blue-600">{currentRecordForNotes?.scheduleNo}</span>
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="c3-notes" className="text-sm font-medium text-gray-700">Notes</Label>
                <Textarea
                  id="c3-notes"
                  placeholder="Enter your notes here..."
                  value={c3Notes}
                  onChange={(e) => setC3Notes(e.target.value)}
                  className="min-h-[200px] resize-none border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={handleCloseC3Notes}
                className="px-6 py-2 border-2 border-gray-300 hover:border-gray-400"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveC3Notes} 
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <StickyNote className="h-4 w-4" />
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Confirmation Dialog */}
      {verifyDialogOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          <div 
            className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md mx-4"
            style={{ 
              position: 'relative'
            }}
          >
            {/* Header with large green checkmark icon */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-600">Verify C3 Record</h2>
            </div>
            
            {/* Message */}
            <div className="text-center mb-8">
              <p className="text-lg text-gray-700">
                Are you sure? You want to verify this record
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Record: <span className="font-semibold text-blue-600">{recordToVerify?.scheduleNo}</span>
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={cancelVerification}
                className="flex-1 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 rounded-lg font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmVerification} 
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Yes, Verify
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          <div 
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4"
            style={{ 
              position: 'relative'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Reset Form</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to reset all form fields? This action cannot be undone and all entered data will be lost.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={cancelReset}
                className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              >
                Reset Form
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (showForm) {
    return (
      <>
        <div className="flex flex-col gap-6 p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
        
          <div className="flex items-start gap-3">
          {(formMode === 'add' || formMode === 'view' || formMode === 'edit') ? (
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
        ) : null}
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold tracking-tight">
                {formMode === 'add' ? 
                  (contributionType === 'employer' ? 'Add New C3 Employer' :
                   contributionType === 'self-employed' ? 'Add New C3 Self Contributor' :
                   contributionType === 'voluntary' ? 'Add New C3 Voluntary Contribution' : 'New C3 Submission') :
                 formMode === 'edit' ? 'Edit C3 Record' : 'View C3 Record'}
              </h1>
              {/* Breadcrumb */}
              <div className="mt-1">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage>C3 Records</BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {contributionType === 'employer' ? 'Employer' : contributionType === 'self-employed' ? 'Self Contributor' : 'Voluntary Contribution'}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-[#0284C7]">
                        {formMode === 'add' ? (
                          contributionType === 'employer' ? 'Add New Employer' : contributionType === 'self-employed' ? 'Add Self Contributor' : 'Add Voluntary Contribution'
                        ) : formMode === 'edit' ? (
                          contributionType === 'employer' ? 'Edit Employer' : contributionType === 'self-employed' ? 'Edit Self Contributor' : 'Edit Voluntary Contribution'
                        ) : (
                          contributionType === 'employer' ? 'Employer View' : contributionType === 'self-employed' ? 'Self Contributor View' : 'Voluntary Contribution View'
                        )}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 self-start lg:self-center mt-4 lg:mt-0">
            {formMode === 'view' ? (
              <>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => viewingRecord && handleC3Notes(viewingRecord)}
                  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                  disabled={!viewingRecord}
                >
                  <StickyNote className="h-4 w-4" />
                  C3 Notes
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    if (viewingRecord) {
                      handleVerify(viewingRecord);
                    }
                  }}
                  className={`flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md ${
                    viewingRecord?.isVerified ? 'bg-green-50 text-green-700 border-l-green-500 hover:bg-green-100' : ''
                  }`}
                  disabled={!viewingRecord}
                >
                  {viewingRecord?.isVerified ? <BadgeCheck className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  {viewingRecord?.isVerified ? 'Verified' : 'Verify'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => viewingRecord && handlePrint(viewingRecord)}
                  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                  disabled={!viewingRecord}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setFormMode('edit');
                    setEditingRecord(viewingRecord);
                  }}
                  className="flex items-center gap-2 border-r-4 border-r-[#33529C]"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </>
            ) : formMode === 'edit' ? (
              <>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => editingRecord && handleC3Notes(editingRecord)}
                  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                  disabled={!editingRecord}
                >
                  <StickyNote className="h-4 w-4" />
                  C3 Notes
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    if (editingRecord) {
                      handleVerify(editingRecord);
                    }
                  }}
                  className={`flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md ${
                    editingRecord?.isVerified ? 'bg-green-50 text-green-700 border-l-green-500 hover:bg-green-100' : ''
                  }`}
                  disabled={!editingRecord}
                >
                  {editingRecord?.isVerified ? <BadgeCheck className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  {editingRecord?.isVerified ? 'Verified' : 'Verify'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => editingRecord && handlePrint(editingRecord)}
                  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                  disabled={!editingRecord}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button type="button" variant="outline" className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md">
                  Draft
                </Button>
                <Button type="button" className="flex items-center gap-2 border-r-4 border-r-[#33529C]">
                  Submit
                </Button>
              </>
            ) : (
              // Add Mode
              <>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    // Create a mock record for Add Mode
                    const mockRecord = {
                      scheduleNo: "NEW-RECORD",
                      payerId: "NEW",
                      payerName: "New Record",
                      type: contributionTypeToLabel(contributionType),
                      isVerified: false,
                      notes: ""
                    };
                    handleC3Notes(mockRecord);
                  }}
                  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                >
                  <StickyNote className="h-4 w-4" />
                  C3 Notes
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    // Create a mock record for Add Mode
                    const mockRecord = {
                      scheduleNo: "NEW-RECORD",
                      payerId: "NEW",
                      payerName: "New Record",
                      type: contributionTypeToLabel(contributionType),
                      isVerified: false,
                      notes: ""
                    };
                    handlePrint(mockRecord);
                  }}
                  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50" 
                  onClick={handleResetForm}
                  title="Reset all form fields"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                  disabled={isSaving}
                  onClick={async () => {
                    // Save as draft - collect form data and save
                    setIsSaving(true);
                    try {
                      const payerType = contributionTypeToPayerType(contributionType);
                      // For now, save basic record as draft - forms will need to expose their data
                      toast({
                        title: "Draft Saved",
                        description: "Please use the Save button in the form to save as draft.",
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Draft
                </Button>
                <Button 
                  type="button" 
                  className="flex items-center gap-2 border-r-4 border-r-[#33529C]"
                  disabled={isSaving}
                  onClick={() => {
                    toast({
                      title: "Submit",
                      description: "Please save the form first, then submit from the list.",
                    });
                  }}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Form Interface - Show based on active tab */}
        {contributionType === "employer" && (
          <EmployerC3Form 
            initialData={formMode === 'edit' ? editingRecord : formMode === 'view' ? viewingRecord : null}
            mode={formMode}
            resetTrigger={resetFormTrigger}
            onCancel={() => {
              setShowForm(false);
              setEditingRecord(null);
              setViewingRecord(null);
              setFormMode('add');
            }}
            onSave={async (data) => {
              setIsSaving(true);
              try {
                const payerType = contributionTypeToPayerType(contributionType);
                const result = await saveDraft(data, payerType, editingRecord?.id);
                
                if (result.success) {
                  toast({
                    title: `C3 Record ${formMode === 'add' ? 'Created' : 'Updated'}`,
                    description: `Employer C3 record has been saved as draft.`,
                  });
                  setShowForm(false);
                  setEditingRecord(null);
                  setViewingRecord(null);
                  setFormMode('add');
                }
              } finally {
                setIsSaving(false);
              }
            }}
          />
        )}
        
        {contributionType === "self-employed" && (
          <SelfEmployedC3Form 
            data={formMode === 'edit' ? editingRecord : formMode === 'view' ? viewingRecord : null}
            mode={formMode}
            resetTrigger={resetFormTrigger}
            onClose={() => {
              setShowForm(false);
              setEditingRecord(null);
              setViewingRecord(null);
              setFormMode('add');
            }}
            onSave={async (data) => {
              setIsSaving(true);
              try {
                const payerType = contributionTypeToPayerType(contributionType);
                const result = await saveDraft(data, payerType, editingRecord?.id);
                
                if (result.success) {
                  toast({
                    title: `C3 Record ${formMode === 'add' ? 'Created' : 'Updated'}`,
                    description: `Self-employed C3 record has been saved as draft.`,
                  });
                  setShowForm(false);
                  setEditingRecord(null);
                  setViewingRecord(null);
                  setFormMode('add');
                }
              } finally {
                setIsSaving(false);
              }
            }}
          />
        )}
        
        {contributionType === "voluntary" && (
          <VoluntaryC3Form 
            data={formMode === 'edit' ? editingRecord : formMode === 'view' ? viewingRecord : null}
            mode={formMode}
            resetTrigger={resetFormTrigger}
            onClose={() => {
              setShowForm(false);
              setEditingRecord(null);
              setViewingRecord(null);
              setFormMode('add');
            }}
            onSave={async (data) => {
              setIsSaving(true);
              try {
                const payerType = contributionTypeToPayerType(contributionType);
                const result = await saveDraft(data, payerType, editingRecord?.id);
                
                if (result.success) {
                  toast({
                    title: `C3 Record ${formMode === 'add' ? 'Created' : 'Updated'}`,
                    description: `Voluntary C3 record has been saved as draft.`,
                  });
                  setShowForm(false);
                  setEditingRecord(null);
                  setViewingRecord(null);
                  setFormMode('add');
                }
              } finally {
                setIsSaving(false);
              }
            }}
          />
        )}
        </div>
        {renderModals()}
      </>
    );
  }

  return (
    <>
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
            {getAddButtonText()}
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
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading C3 records...</span>
              </div>
            </CardContent>
          </Card>
        ) : currentRecords.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground mb-4">No C3 records found for {contributionType === 'employer' ? 'employers' : contributionType === 'self-employed' ? 'self-contributors' : 'voluntary contributions'}.</p>
                <Button onClick={handleAddNewC3}>
                  <Plus className="h-4 w-4 mr-2" />
                  {getAddButtonText()}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
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
                render: (amount) => `$${(amount || 0).toLocaleString()}`
              },
              { key: 'cnc3ReportedReceivedBy', label: 'CNC3 Received By', minWidth: '140px' },
              { key: 'cnc3ReportedModifiedDate', label: 'CNC3 Modified Date', minWidth: '140px' },
              { key: 'cnc3ReportedModifiedBy', label: 'CNC3 Modified By', minWidth: '140px' }
            ]}
            title={`C3 Records (${total} total)`}
            searchPlaceholder="Search by Payer ID, Name, or Type"
            actions={{ view: true, edit: true }}
            onView={(record) => handleView(record)}
            onEdit={(record) => handleEdit(record)}
          />
        )}
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
      {renderModals()}
    </>
  );
}