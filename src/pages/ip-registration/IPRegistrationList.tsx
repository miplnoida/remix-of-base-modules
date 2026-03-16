import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, Edit, Send, CheckCircle, Trash2, Search, 
  Filter, Download, ChevronUp, ChevronDown,
  UserPlus, Key, Users, FileText, FileSpreadsheet, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useIPStatuses, useCountries, getStatusDescription } from '@/hooks/useIPMasterLookups';
import { ColumnSelector, Column } from '@/components/shared/ColumnSelector';
import { TablePagination } from '@/components/shared/TablePagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useIPRegistrationSubmit } from '@/hooks/useIPRegistrationSubmit';
import { WorkflowActionButtonsCompact } from '@/components/workflow/WorkflowActionButtons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF, ExportColumn, ExportData } from '@/utils/exportUtils';

// Status codes by tab
const PENDING_STATUSES = ['Z', 'P'];
const REGISTERED_STATUSES = ['E', 'V', 'A'];
const INACTIVE_STATUSES = ['C', 'T', 'I', 'S'];
const EXCLUDED_STATUS = 'D'; // Deleted - never show

interface IPRecord {
  id: string;
  unique_uuid: string;
  application_id: string;
  ssn: string | null;
  firstname: string | null;
  middle_name: string | null;
  surname: string | null;
  dob: string | null;
  sex: string | null;
  nationality: string | null;
  phone: string | null;
  telephone: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  registration_date: string | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Z: { label: 'Draft', variant: 'secondary' },
  P: { label: 'Pending', variant: 'default' },
  V: { label: 'Verified', variant: 'outline' },
  E: { label: 'Employed', variant: 'default' },
  A: { label: 'Active', variant: 'default' },
  C: { label: 'Ceased', variant: 'destructive' },
  T: { label: 'Terminated', variant: 'destructive' },
  I: { label: 'Inactive', variant: 'secondary' },
  S: { label: 'Suspended', variant: 'destructive' },
  R: { label: 'Rejected', variant: 'destructive' },
};

// Default columns configuration - merged Full Name column
const defaultColumns: Column[] = [
  { key: 'application_id', label: 'Application ID/SSN', visible: true, locked: true },
  { key: 'full_name', label: 'Full Name', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'date_of_birth', label: 'Date Of Birth', visible: true },
  { key: 'gender', label: 'Gender', visible: true },
  { key: 'nationality', label: 'Nationality', visible: true },
  { key: 'registration_date', label: 'Registration Date', visible: true },
  { key: 'telephone', label: 'Phone Num', visible: true },
];

export default function IPRegistrationList() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { user: supabaseUser } = useSupabaseAuth();
  
  // Use Supabase user if available, otherwise fall back to auth user
  const user = supabaseUser || authUser;
  const { data: ipStatuses } = useIPStatuses();
  const { data: countries } = useCountries();
  const [records, setRecords] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [deleteRecord, setDeleteRecord] = useState<IPRecord | null>(null);
  const [submitRecord, setSubmitRecord] = useState<IPRecord | null>(null);
  const { submitIPRegistration, isSubmitting } = useIPRegistrationSubmit();
  const [printingCardId, setPrintingCardId] = useState<string | null>(null);
  const [readyToPrintRecord, setReadyToPrintRecord] = useState<IPRecord | null>(null);
  
  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    ssn: '',
    dob: '',
    surname: '',
    firstName: '',
    phone: '',
    gender: '',
    status: '',
  });

  // Track whether filters are actively applied (set on Search click)
  const [appliedFilters, setAppliedFilters] = useState(false);

  // Tab counts
  const [tabCounts, setTabCounts] = useState({ pending: 0, registered: 0, inactive: 0 });

  const totalPages = Math.ceil(totalCount / pageSize);

  // Get status codes for current tab
  const getStatusesForTab = useCallback((tab: string): string[] => {
    switch (tab) {
      case 'pending':
        return PENDING_STATUSES;
      case 'registered':
        return REGISTERED_STATUSES;
      case 'inactive':
        return INACTIVE_STATUSES;
      default:
        return [];
    }
  }, []);

  // Get country description from code
  const getCountryDescription = useCallback((code: string | null): string => {
    if (!code || !countries) return code || '-';
    const country = countries.find(c => c.code === code);
    return country?.description || country?.nationality || code;
  }, [countries]);

  // Get full name from record
  const getFullName = (record: IPRecord): string => {
    const firstName = record.firstname || '';
    const middleName = record.middle_name || '';
    const lastName = record.surname || '';
    return [firstName, middleName, lastName].filter(Boolean).join(' ') || '-';
  };

  // Build a query with filters applied (reused for data + count)
  const buildFilteredQuery = useCallback((baseQuery: any, applyFilters: boolean) => {
    let query = baseQuery;

    if (applyFilters) {
      if (filters.ssn) {
        query = query.or(`ssn.ilike.%${filters.ssn}%,application_id.ilike.%${filters.ssn}%`);
      }
      if (filters.dob) {
        query = query.eq('dob', filters.dob);
      }
      if (filters.surname) {
        query = query.ilike('surname', `%${filters.surname}%`);
      }
      if (filters.firstName) {
        query = query.ilike('firstname', `%${filters.firstName}%`);
      }
      if (filters.phone) {
        query = query.or(`phone.ilike.%${filters.phone}%,telephone.ilike.%${filters.phone}%`);
      }
      if (filters.gender && filters.gender !== 'all') {
        query = query.eq('sex', filters.gender);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
    }

    return query;
  }, [filters]);

  // Fetch records with server-side pagination
  const fetchRecords = useCallback(async (applyFilters: boolean, currentPage: number, currentPageSize: number) => {
    setLoading(true);
    
    try {
      const tabStatuses = getStatusesForTab(activeTab);
      const from = (currentPage - 1) * currentPageSize;
      const to = from + currentPageSize - 1;

      // Data query with range
      let dataQuery = supabase
        .from('ip_master')
        .select('*', { count: 'exact' })
        .neq('status', EXCLUDED_STATUS);

      if (tabStatuses.length > 0) {
        dataQuery = dataQuery.in('status', tabStatuses);
      }

      dataQuery = buildFilteredQuery(dataQuery, applyFilters);

      // Apply quick search text filter server-side
      if (searchText) {
        dataQuery = dataQuery.or(
          `application_id.ilike.%${searchText}%,ssn.ilike.%${searchText}%,surname.ilike.%${searchText}%,firstname.ilike.%${searchText}%,phone.ilike.%${searchText}%,telephone.ilike.%${searchText}%`
        );
      }

      const { data, error, count } = await dataQuery
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;

      setRecords((data || []) as IPRecord[]);
      setTotalCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [activeTab, getStatusesForTab, buildFilteredQuery, searchText]);

  // Fetch tab counts efficiently using count-only queries
  const fetchCounts = useCallback(async () => {
    try {
      const [pendingRes, registeredRes, inactiveRes] = await Promise.all([
        supabase.from('ip_master').select('id', { count: 'exact', head: true }).neq('status', EXCLUDED_STATUS).in('status', PENDING_STATUSES),
        supabase.from('ip_master').select('id', { count: 'exact', head: true }).neq('status', EXCLUDED_STATUS).in('status', REGISTERED_STATUSES),
        supabase.from('ip_master').select('id', { count: 'exact', head: true }).neq('status', EXCLUDED_STATUS).in('status', INACTIVE_STATUSES),
      ]);

      setTabCounts({
        pending: pendingRes.count ?? 0,
        registered: registeredRes.count ?? 0,
        inactive: inactiveRes.count ?? 0,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }, []);

  // Reset page to 1 when tab changes
  useEffect(() => {
    setPage(1);
    setSearchText('');
    setAppliedFilters(false);
  }, [activeTab]);

  // Fetch data when page, pageSize, tab, or searchText changes
  useEffect(() => {
    fetchRecords(appliedFilters, page, pageSize);
  }, [page, pageSize, activeTab, appliedFilters, fetchRecords]);

  // Fetch tab counts on mount and when data changes
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Debounced quick search: reset to page 1 on search text change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRecords(appliedFilters, 1, pageSize);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Handle advanced filter search button click
  const handleSearch = () => {
    setAppliedFilters(true);
    setPage(1);
    fetchRecords(true, 1, pageSize);
  };

  const handleNewRegistration = () => {
    navigate('/ip-registration/new');
  };

  // Page change handler
  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || 1)));
  };

  // Page size change handler
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Get visible columns
  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);

  // Action button logic for local records only
  const canEdit = (record: IPRecord) => record.status === 'Z';
  const canDelete = (record: IPRecord) => record.status === 'Z' || record.status === 'P';
  const canSubmit = (record: IPRecord) => record.status === 'Z';
  const canApprove = (record: IPRecord) => record.status === 'P';

  const handleView = (record: IPRecord) => {
    navigate(`/ip-registration/view/${record.unique_uuid}`);
  };

  const handleEdit = (record: IPRecord) => {
    navigate(`/ip-registration/edit/${record.unique_uuid}`);
  };

  const handleSubmit = async (record: IPRecord) => {
    setSubmitRecord(record);
  };

  const confirmSubmit = async () => {
    console.log('confirmSubmit called', { submitRecord, authUser: authUser?.id, supabaseUser: supabaseUser?.id, user: user?.id });
    
    if (!submitRecord) {
      console.error('Missing record', { submitRecord });
      toast.error('Missing record information');
      setSubmitRecord(null);
      return;
    }

    // Get user ID from multiple sources as fallback
    let userId: string | undefined = user?.id;
    
    // If no user ID from context, try to get it from Supabase auth directly
    if (!userId) {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        userId = currentUser?.id;
        console.log('Got user ID from Supabase auth:', userId);
      } catch (error) {
        console.error('Error getting user from Supabase:', error);
      }
    }
    
    if (!userId) {
      console.error('Missing user ID', { authUser, supabaseUser, user });
      toast.error('User not authenticated. Please log in again.');
      setSubmitRecord(null);
      return;
    }

    try {
      console.log('Calling submitIPRegistration', { uniqueUuid: submitRecord.unique_uuid, userId });
      const result = await submitIPRegistration(submitRecord.unique_uuid, userId);
      console.log('Submit result:', result);
      
      if (result.success) {
        toast.success(result.message);
        // Refresh the records list
        await fetchRecords(appliedFilters, page, pageSize);
        await fetchCounts();
        setSubmitRecord(null);
      } else if (result.errors) {
        const firstError = Object.values(result.errors)[0];
        console.error('Validation errors:', result.errors);
        toast.error('Please check the form for valid information!', {
          description: firstError,
          style: { backgroundColor: 'hsl(var(--destructive))', color: 'white' },
          classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' }
        });
      } else {
        console.error('Submit failed:', result.message);
        toast.error(result.message || 'Failed to submit registration', {
          description: 'Please check the console for more details',
        });
        setSubmitRecord(null);
      }
    } catch (error: any) {
      console.error('Submit confirmation error:', error);
      toast.error('Failed to submit registration', {
        description: error?.message || 'An unexpected error occurred. Please try again.',
      });
      setSubmitRecord(null);
    }
  };

  const handleApprove = async (record: IPRecord) => {
    navigate(`/ip-registration/view/${record.unique_uuid}?action=approve`);
  };

  const handleReadyToPrint = (record: IPRecord) => {
    setReadyToPrintRecord(record);
  };

  const confirmReadyToPrint = async () => {
    if (!readyToPrintRecord) return;
    setPrintingCardId(readyToPrintRecord.unique_uuid);
    try {
      const { data, error } = await supabase.rpc('process_ready_to_print_card', {
        p_unique_uuid: readyToPrintRecord.unique_uuid,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success(result.message || 'Card ready. Status updated to Active.');
        await fetchRecords(appliedFilters, page, pageSize);
        await fetchCounts();
      } else {
        toast.error(result?.error || 'Failed to process card print');
      }
    } catch (error: any) {
      console.error('Ready to print error:', error);
      toast.error(error?.message || 'Failed to process card print');
    } finally {
      setPrintingCardId(null);
      setReadyToPrintRecord(null);
    }
  };

  const handleDeleteClick = (record: IPRecord) => {
    setDeleteRecord(record);
  };

  const confirmDelete = async () => {
    if (!deleteRecord) return;

    try {
      const { error } = await supabase
        .from('ip_master')
        .update({ status: 'D' })
        .eq('unique_uuid', deleteRecord.unique_uuid);

      if (error) throw error;

      toast.success('Record deleted successfully');
      fetchRecords(appliedFilters, page, pageSize);
      fetchCounts();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    } finally {
      setDeleteRecord(null);
    }
  };

  const resetFilters = () => {
    setFilters({
      ssn: '',
      dob: '',
      surname: '',
      firstName: '',
      phone: '',
      gender: '',
      status: '',
    });
    setSearchText('');
    setAppliedFilters(false);
    setPage(1);
    fetchRecords(false, 1, pageSize);
  };

  // Get statuses available for current tab (for dropdown)
  const getAvailableStatuses = useCallback(() => {
    const tabStatuses = getStatusesForTab(activeTab);
    if (!ipStatuses) return [];
    return ipStatuses.filter(s => tabStatuses.includes(s.code));
  }, [activeTab, ipStatuses, getStatusesForTab]);

  // Get registration date display - only show for non-draft/pending statuses
  const getRegistrationDate = (record: IPRecord): string => {
    if (record.status === 'Z' || record.status === 'P') {
      return '-';
    }
    if (record.registration_date) {
      return formatDisplayDate(record.registration_date) || '-';
    }
    return '-';
  };

  // Get date of birth
  const getDateOfBirth = (record: IPRecord): string => {
    const dob = record.dob;
    if (!dob) return '-';
    return formatDisplayDate(dob) || '-';
  };

  // Get gender display
  const getGenderDisplay = (record: IPRecord): string => {
    const gender = record.sex;
    if (gender === 'M') return 'Male';
    if (gender === 'F') return 'Female';
    if (gender === 'N') return 'Not-Specified';
    return gender || '-';
  };

  // Prepare export data based on visible columns (exports current page)
  const prepareExportData = useCallback((): { columns: ExportColumn[], data: ExportData[] } => {
    const exportColumns: ExportColumn[] = visibleColumns.map(col => ({
      header: col.label,
      key: col.key,
      width: col.key === 'full_name' ? 25 : 15,
    }));

    const exportData: ExportData[] = records.map(record => {
      const row: ExportData = {};
      visibleColumns.forEach(col => {
        switch (col.key) {
          case 'application_id':
            row[col.key] = record.ssn || record.application_id || '-';
            break;
          case 'full_name':
            row[col.key] = getFullName(record);
            break;
          case 'status':
            row[col.key] = ipStatuses ? getStatusDescription(record.status, ipStatuses) : (statusConfig[record.status]?.label || record.status);
            break;
          case 'date_of_birth':
            row[col.key] = getDateOfBirth(record);
            break;
          case 'gender':
            row[col.key] = getGenderDisplay(record);
            break;
          case 'nationality':
            row[col.key] = getCountryDescription(record.nationality);
            break;
          case 'registration_date':
            row[col.key] = getRegistrationDate(record);
            break;
          case 'telephone':
            row[col.key] = record.phone || record.telephone || '-';
            break;
          default:
            row[col.key] = '-';
        }
      });
      return row;
    });

    return { columns: exportColumns, data: exportData };
  }, [records, visibleColumns, ipStatuses, getCountryDescription]);

  // Handle export to Excel
  const handleExportExcel = async () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }
    try {
      const { columns, data } = prepareExportData();
      const tabName = activeTab === 'pending' ? 'Pending_Verification' : activeTab === 'registered' ? 'Registered_IP' : 'Inactive_IP';
      const fileName = `IP_Registration_${tabName}_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;
      await exportToExcel(data, columns, fileName, 'IP Registrations');
      toast.success(`Exported ${data.length} records to Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to Excel');
    }
  };

  // Handle export to PDF
  const handleExportPDF = () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }
    try {
      const { columns, data } = prepareExportData();
      const tabTitle = activeTab === 'pending' ? 'Pending Verification' : activeTab === 'registered' ? 'Registered Insured Persons' : 'Inactive Insured Persons';
      const tabName = activeTab === 'pending' ? 'Pending_Verification' : activeTab === 'registered' ? 'Registered_IP' : 'Inactive_IP';
      const fileName = `IP_Registration_${tabName}_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;
      
      exportToPDF(
        `IP Registration - ${tabTitle}`,
        columns,
        data,
        fileName,
        [
          { label: 'Total Records', value: totalCount.toString() },
          { label: 'Export Date', value: format(new Date(), 'dd/MM/yyyy HH:mm') },
        ]
      );
      toast.success(`Exported ${data.length} records to PDF`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to PDF');
    }
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }
    try {
      const { columns, data } = prepareExportData();
      
      // Build CSV content
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
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const tabName = activeTab === 'pending' ? 'Pending_Verification' : activeTab === 'registered' ? 'Registered_IP' : 'Inactive_IP';
      link.href = url;
      link.download = `IP_Registration_${tabName}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
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
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">IP Management</h1>
          <p className="text-muted-foreground">IP Management records</p>
        </div>
        <Button onClick={handleNewRegistration} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Register Insured Person
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Pending Verification ({tabCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="registered" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Registered Insured Person ({tabCounts.registered})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Inactive Insured Person ({tabCounts.inactive})
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
                    <span className="font-medium">Query by</span>
                    <span className="text-muted-foreground">Filter and search IP Management</span>
                  </div>
                  {filterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
                  <div>
                    <label className="text-sm font-medium">SSN / Application ID</label>
                    <Input 
                      placeholder="Enter SSN or Application ID" 
                      value={filters.ssn}
                      onChange={(e) => setFilters({ ...filters, ssn: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date Of Birth</label>
                    <Input 
                      type="date" 
                      value={filters.dob}
                      onChange={(e) => setFilters({ ...filters, dob: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Surname</label>
                    <Input 
                      placeholder="Enter Surname" 
                      value={filters.surname}
                      onChange={(e) => setFilters({ ...filters, surname: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">First name</label>
                    <Input 
                      placeholder="Enter First Name" 
                      value={filters.firstName}
                      onChange={(e) => setFilters({ ...filters, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input 
                      placeholder="Enter Phone Number" 
                      value={filters.phone}
                      onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Gender</label>
                    <Select value={filters.gender} onValueChange={(v) => setFilters({ ...filters, gender: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="N">Not-Specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {getAvailableStatuses().map(status => (
                          <SelectItem key={status.code} value={status.code}>
                            {status.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button className="flex items-center gap-2" onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                      Search
                    </Button>
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
                  placeholder="Search by Application ID/SSN, Name, Phone...." 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {/* Table Header with Export/Columns */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {activeTab === 'pending' && `Pending Verification (${totalCount})`}
                {activeTab === 'registered' && `Registered Insured Person (${totalCount})`}
                {activeTab === 'inactive' && `Inactive Insured Person (${totalCount})`}
              </h3>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={records.length === 0}>
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                    <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ColumnSelector 
                  columns={columns} 
                  onColumnChange={setColumns}
                />
              </div>
            </div>

            {/* Records Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map(col => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Loading applications...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        {visibleColumns.map(col => (
                          <TableCell key={col.key} className={col.key === 'application_id' ? 'font-medium' : ''}>
                            {col.key === 'application_id' && (
                              <span>{record.ssn || record.application_id}</span>
                            )}
                            {col.key === 'full_name' && getFullName(record)}
                            {col.key === 'status' && (
                              <Badge variant={statusConfig[record.status]?.variant || 'default'}>
                                {ipStatuses ? getStatusDescription(record.status, ipStatuses) : (statusConfig[record.status]?.label || record.status)}
                              </Badge>
                            )}
                            {col.key === 'date_of_birth' && getDateOfBirth(record)}
                            {col.key === 'gender' && getGenderDisplay(record)}
                            {col.key === 'nationality' && getCountryDescription(record.nationality)}
                            {col.key === 'registration_date' && getRegistrationDate(record)}
                            {col.key === 'telephone' && (record.phone || record.telephone || '-')}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* View button - always available */}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleView(record)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit(record) && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(record)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canSubmit(record) && (
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleSubmit(record)}
                                title="Submit"
                                disabled={isSubmitting}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Workflow-driven action buttons for pending status */}
                            {record.status === 'P' && (
                              <WorkflowActionButtonsCompact
                                sourceModule="insured_person_registration"
                                sourceRecordId={record.unique_uuid}
                                onActionComplete={() => {
                                  fetchRecords(appliedFilters, page, pageSize);
                                  fetchCounts();
                                }}
                              />
                            )}
                            {record.status === 'V' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReadyToPrint(record)}
                                title="Ready to Print"
                                disabled={printingCardId === record.unique_uuid}
                                className="flex items-center gap-1 text-xs"
                              >
                                {printingCardId === record.unique_uuid ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                                ) : (
                                  <CreditCard className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden lg:inline">Ready to Print</span>
                              </Button>
                            )}
                            {canDelete(record) && (
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteClick(record)}
                                title="Delete"
                              >
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

            {/* Server-side Pagination Controls */}
            {totalCount > 0 && (
              <TablePagination
                pagination={{
                  page,
                  pageSize,
                  totalItems: totalCount,
                  totalPages,
                }}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Submit Confirmation Dialog */}
      <AlertDialog 
        open={!!submitRecord} 
        onOpenChange={(open) => {
          // Prevent closing during submission
          if (!open && !isSubmitting) {
            setSubmitRecord(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit the registration for verification. A 6-digit SSN will be generated.
              You will not be able to edit after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button
              onClick={confirmSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ready to Print Confirmation Dialog */}
      <AlertDialog open={!!readyToPrintRecord} onOpenChange={(open) => { if (!open && !printingCardId) setReadyToPrintRecord(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to Print?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the insured person's status to Active, set the permanent card date and card expiration based on IP Configuration settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!printingCardId}>Cancel</AlertDialogCancel>
            <Button
              onClick={confirmReadyToPrint}
              disabled={!!printingCardId}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {printingCardId ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action will mark the record as deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
