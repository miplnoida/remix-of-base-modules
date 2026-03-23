import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, Edit, Send, Trash2, Search, 
  Filter, Download, ChevronUp, ChevronDown, Building2, FileText, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useEmployerList } from '@/hooks/useEmployerRegistration';
import { useEmployerRegistrationSubmit } from '@/hooks/useEmployerRegistrationSubmit';
import { ER_STATUS_CODES } from '@/types/employerRegistration';
import { exportToExcel, exportToPDF, ExportColumn, ExportData } from '@/utils/exportUtils';
import { WorkflowActionButtonsCompact } from '@/components/workflow/WorkflowActionButtons';
import { useAuth } from '@/contexts/AuthContext';
import { useTablePagination } from '@/hooks/useTablePagination';
import { TablePagination } from '@/components/shared/TablePagination';

interface Filters {
  regno: string;
  name: string;
  trade_name: string;
  phone: string;
  inspector_code: string;
  status: string;
}

export default function EmployerRegistrationList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    employers, 
    counts, 
    isLoading, 
    activeTab, 
    setActiveTab, 
    refetch,
    deleteEmployer,
  } = useEmployerList();

  const { submitERRegistration, isSubmitting } = useEmployerRegistrationSubmit();

  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<Filters>({
    regno: '',
    name: '',
    trade_name: '',
    phone: '',
    inspector_code: '',
    status: '',
  });
  const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
  const [submitRecord, setSubmitRecord] = useState<any | null>(null);

  // Filter employers
  const filteredEmployers = useMemo(() => {
    let result = [...employers];

    // Apply filters
    if (filters.regno) {
      result = result.filter(e => e.regno?.toLowerCase().includes(filters.regno.toLowerCase()));
    }
    if (filters.name) {
      result = result.filter(e => e.name?.toLowerCase().includes(filters.name.toLowerCase()));
    }
    if (filters.trade_name) {
      result = result.filter(e => e.trade_name?.toLowerCase().includes(filters.trade_name.toLowerCase()));
    }
    if (filters.phone) {
      result = result.filter(e => e.phone?.includes(filters.phone) || e.mobile?.includes(filters.phone));
    }
    if (filters.inspector_code) {
      result = result.filter(e => e.inspector_code?.toLowerCase().includes(filters.inspector_code.toLowerCase()));
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter(e => e.status === filters.status);
    }

    // Quick search
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(e => 
        e.regno?.toLowerCase().includes(search) ||
        e.name?.toLowerCase().includes(search) ||
        e.trade_name?.toLowerCase().includes(search) ||
        e.phone?.includes(search) ||
        e.mobile?.includes(search)
      );
    }

    return result;
  }, [employers, filters, searchText]);

  const {
    paginatedData,
    pagination,
    goToPage,
    changePageSize,
    resetPagination,
  } = useTablePagination(filteredEmployers, 10);

  // Reset to page 1 when filters, search, or tab change
  useEffect(() => {
    resetPagination();
  }, [searchText, filters, activeTab]);

  const handleNewRegistration = () => {
    navigate('/employer-registration/new');
  };

  const handleView = (employer: any) => {
    navigate(`/employer-registration/view/${employer.regno}`);
  };

  const handleEdit = (employer: any) => {
    navigate(`/employer-registration/edit/${employer.regno}`);
  };

  const handleSubmitClick = (employer: any) => {
    setSubmitRecord(employer);
  };

  const confirmSubmit = async () => {
    if (!submitRecord || isSubmitting) return;
    
    const result = await submitERRegistration(submitRecord.regno, user?.id);
    if (result.success) {
      toast.success(result.message || 'Registration submitted successfully');
      refetch();
      setSubmitRecord(null);
    } else {
      toast.error(result.message || 'Submission failed');
      // Keep dialog open on failure so user can retry or cancel
    }
  };

  const handleDeleteClick = (employer: any) => {
    setDeleteRecord(employer);
  };

  const confirmDelete = async () => {
    if (!deleteRecord) return;
    await deleteEmployer(deleteRecord.regno);
    setDeleteRecord(null);
  };

  const handleWorkflowActionComplete = () => {
    refetch();
  };

  const resetFilters = () => {
    setFilters({
      regno: '',
      name: '',
      trade_name: '',
      phone: '',
      inspector_code: '',
      status: '',
    });
    setSearchText('');
  };

  const canEdit = (employer: any) => employer.status === 'Z';
  const canDelete = (employer: any) => employer.status === 'Z' || employer.status === 'P';
  const canSubmit = (employer: any) => employer.status === 'Z';
  // Workflow actions are shown for Pending status - handled by WorkflowActionButtonsCompact
  const showWorkflowActions = (employer: any) => employer.status === 'P';

  const getStatusBadge = (status: string) => {
    const config = ER_STATUS_CODES[status as keyof typeof ER_STATUS_CODES] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return formatDisplayDate(dateStr) || '-';
  };

  // Export functions
  const prepareExportData = useCallback((): { columns: ExportColumn[], data: ExportData[] } => {
    const columns: ExportColumn[] = [
      { header: 'Reg. No', key: 'regno', width: 10 },
      { header: 'Employer Name', key: 'name', width: 25 },
      { header: 'Trade Name', key: 'trade_name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Activity Type', key: 'activity_type', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Registration Date', key: 'registration_date', width: 15 },
    ];

    const data = filteredEmployers.map(e => ({
      regno: e.regno || '-',
      name: e.name || '-',
      trade_name: e.trade_name || '-',
      phone: e.phone || e.mobile || '-',
      activity_type: e.activity_type || '-',
      status: ER_STATUS_CODES[e.status as keyof typeof ER_STATUS_CODES]?.label || e.status,
      registration_date: formatDate(e.registration_date),
    }));

    return { columns, data };
  }, [filteredEmployers]);

  const handleExportExcel = async () => {
    if (filteredEmployers.length === 0) {
      toast.error('No records to export');
      return;
    }
    try {
      const { columns, data } = prepareExportData();
      const tabName = activeTab === 'pending' ? 'Pending' : activeTab === 'registered' ? 'Registered' : 'Ceased_Suspended';
      await exportToExcel(data, columns, `Employers_${tabName}_${format(new Date(), 'yyyy-MM-dd')}`, 'Employers');
      toast.success(`Exported ${data.length} records to Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to Excel');
    }
  };

  const handleExportPDF = () => {
    if (filteredEmployers.length === 0) {
      toast.error('No records to export');
      return;
    }
    try {
      const { columns, data } = prepareExportData();
      const tabTitle = activeTab === 'pending' ? 'Pending Verification' : activeTab === 'registered' ? 'Registered Employers' : 'Ceased/Suspended';
      exportToPDF(
        `Employer Registration - ${tabTitle}`,
        columns,
        data,
        `Employers_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}`,
        [
          { label: 'Total Records', value: data.length.toString() },
          { label: 'Export Date', value: format(new Date(), 'dd/MM/yyyy HH:mm') },
        ]
      );
      toast.success(`Exported ${data.length} records to PDF`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to PDF');
    }
  };

  const handleExportCSV = () => {
    if (filteredEmployers.length === 0) {
      toast.error('No records to export');
      return;
    }
    try {
      const { columns, data } = prepareExportData();
      const headers = columns.map(col => col.header);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          columns.map(col => {
            const value = row[col.key];
            if (value === null || value === undefined) return '';
            const stringValue = String(value).replace(/"/g, '""');
            return stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"') 
              ? `"${stringValue}"` 
              : stringValue;
          }).join(',')
        )
      ];
      const csvContent = csvRows.join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Employers_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.length} records to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to CSV');
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Manage Employers</h1>
          <p className="text-muted-foreground">Search and manage employer registrations</p>
        </div>
        <Button onClick={handleNewRegistration} className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Register New Employer
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending Verification ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="registered" className="flex items-center gap-2">
            Registered Employers ({counts.registered})
          </TabsTrigger>
          <TabsTrigger value="ceased" className="flex items-center gap-2">
            Ceased/Suspended ({counts.ceased})
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            {/* Filter Section */}
            <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer mb-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">Query By</span>
                    <span className="text-muted-foreground">Filter and search employers</span>
                  </div>
                  {filterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
                  <div>
                    <label className="text-sm font-medium">Registration Number</label>
                    <Input 
                      placeholder="Enter reg. number" 
                      value={filters.regno}
                      onChange={(e) => setFilters({ ...filters, regno: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Employer Name</label>
                    <Input 
                      placeholder="Enter employer name" 
                      value={filters.name}
                      onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Trade Name</label>
                    <Input 
                      placeholder="Enter trade name" 
                      value={filters.trade_name}
                      onChange={(e) => setFilters({ ...filters, trade_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input 
                      placeholder="Enter phone number" 
                      value={filters.phone}
                      onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Inspector Code</label>
                    <Input 
                      placeholder="Select inspector" 
                      value={filters.inspector_code}
                      onChange={(e) => setFilters({ ...filters, inspector_code: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2 col-span-2">
                    <Button variant="outline" onClick={resetFilters}>
                      Reset
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Quick Search */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search employers..." 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">show</span>
                <Select value={pagination.pageSize.toString()} onValueChange={(v) => changePageSize(parseInt(v))}>
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
                <span className="text-sm text-muted-foreground">records</span>
              </div>
            </div>

            {/* Table Header with Export */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {activeTab === 'pending' && `Pending Verification (${filteredEmployers.length})`}
                {activeTab === 'registered' && `Registered Employers (${filteredEmployers.length})`}
                {activeTab === 'ceased' && `Ceased/Suspended (${filteredEmployers.length})`}
              </h3>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={filteredEmployers.length === 0}>
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                    <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg. No</TableHead>
                    <TableHead>Employer Name</TableHead>
                    <TableHead>Trade Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No employers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((employer) => (
                      <TableRow key={employer.regno}>
                        <TableCell className="font-medium">{employer.regno}</TableCell>
                        <TableCell>{employer.name || '-'}</TableCell>
                        <TableCell>{employer.trade_name || '-'}</TableCell>
                        <TableCell>{employer.phone || employer.mobile || '-'}</TableCell>
                        <TableCell>{employer.activity_type || '-'}</TableCell>
                        <TableCell>{getStatusBadge(employer.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="icon" onClick={() => handleView(employer)} title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit(employer) && (
                              <Button variant="outline" size="icon" onClick={() => handleEdit(employer)} title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canSubmit(employer) && (
                              <Button 
                                variant="default" 
                                size="icon" 
                                onClick={() => handleSubmitClick(employer)} 
                                title="Submit"
                                disabled={isSubmitting}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Workflow-driven action buttons for Pending status */}
                            {showWorkflowActions(employer) && (
                              <WorkflowActionButtonsCompact
                                sourceModule="employers"
                                sourceRecordId={employer.regno}
                                onActionComplete={handleWorkflowActionComplete}
                              />
                            )}
                            {canDelete(employer) && (
                              <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(employer)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredEmployers.length > pageSize && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing 1 to {Math.min(pageSize, filteredEmployers.length)} of {filteredEmployers.length} entries
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteRecord?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={!!submitRecord} onOpenChange={(open) => !isSubmitting && !open && setSubmitRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Verification?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit {submitRecord?.name} for verification? Once submitted, it will be reviewed by a compliance officer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} disabled={isSubmitting} className="min-w-[100px]">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                'Submit'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
