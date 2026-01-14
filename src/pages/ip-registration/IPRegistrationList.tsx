import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Eye, Edit, Send, CheckCircle, XCircle, Search, 
  RotateCcw, Filter, Download, ChevronUp, ChevronDown,
  UserPlus, Key, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useIPStatuses, getStatusDescription } from '@/hooks/useIPMasterLookups';
import { ColumnSelector, Column } from '@/components/shared/ColumnSelector';

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
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  telephone: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  is_temp: boolean;
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

// Default columns configuration
const defaultColumns: Column[] = [
  { key: 'application_id', label: 'Application ID/SSN', visible: true, locked: true },
  { key: 'last_name', label: 'Sur Name', visible: true },
  { key: 'first_name', label: 'First Name', visible: true },
  { key: 'middle_name', label: 'Middle Name', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'date_of_birth', label: 'Date Of Birth', visible: true },
  { key: 'gender', label: 'Gender', visible: true },
  { key: 'nationality', label: 'Nationality', visible: true },
  { key: 'created_at', label: 'Registration Date', visible: true },
  { key: 'telephone', label: 'Phone Num', visible: true },
];

export default function IPRegistrationList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ipStatuses } = useIPStatuses();
  const [records, setRecords] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  
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

  // Fetch records with filters applied at database level
  const fetchRecords = useCallback(async (applyFilters = false) => {
    setLoading(true);
    try {
      const tabStatuses = getStatusesForTab(activeTab);
      
      // Build base query for tmp_ip_master
      let tmpQuery = supabase
        .from('tmp_ip_master')
        .select('*')
        .neq('status', EXCLUDED_STATUS);
      
      // Build base query for ip_master
      let masterQuery = supabase
        .from('ip_master')
        .select('*')
        .neq('status', EXCLUDED_STATUS);

      // Apply filters if search was triggered
      if (applyFilters) {
        if (filters.ssn) {
          tmpQuery = tmpQuery.ilike('ssn', `%${filters.ssn}%`);
          masterQuery = masterQuery.ilike('ssn', `%${filters.ssn}%`);
        }
        if (filters.dob) {
          tmpQuery = tmpQuery.eq('date_of_birth', filters.dob);
          masterQuery = masterQuery.eq('date_of_birth', filters.dob);
        }
        if (filters.surname) {
          tmpQuery = tmpQuery.ilike('last_name', `%${filters.surname}%`);
          masterQuery = masterQuery.ilike('last_name', `%${filters.surname}%`);
        }
        if (filters.firstName) {
          tmpQuery = tmpQuery.ilike('first_name', `%${filters.firstName}%`);
          masterQuery = masterQuery.ilike('first_name', `%${filters.firstName}%`);
        }
        if (filters.phone) {
          tmpQuery = tmpQuery.ilike('telephone', `%${filters.phone}%`);
          masterQuery = masterQuery.ilike('telephone', `%${filters.phone}%`);
        }
        if (filters.gender && filters.gender !== 'all') {
          tmpQuery = tmpQuery.eq('gender', filters.gender);
          masterQuery = masterQuery.eq('gender', filters.gender);
        }
        if (filters.status && filters.status !== 'all') {
          tmpQuery = tmpQuery.eq('status', filters.status);
          masterQuery = masterQuery.eq('status', filters.status);
        }
      }

      // Apply tab-based status filter
      if (tabStatuses.length > 0) {
        tmpQuery = tmpQuery.in('status', tabStatuses);
        masterQuery = masterQuery.in('status', tabStatuses);
      }

      // Execute queries
      const [{ data: tmpData, error: tmpError }, { data: masterData, error: masterError }] = await Promise.all([
        tmpQuery.order('created_at', { ascending: false }),
        masterQuery.order('created_at', { ascending: false })
      ]);
      
      if (tmpError) throw tmpError;
      if (masterError) throw masterError;

      // Combine and mark records
      const tmpRecords: IPRecord[] = (tmpData || []).map(r => ({ ...r, is_temp: true }));
      const masterRecords: IPRecord[] = (masterData || []).map(r => ({ ...r, is_temp: false }));
      
      setRecords([...tmpRecords, ...masterRecords]);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, getStatusesForTab]);

  // Refetch when tab changes
  useEffect(() => {
    fetchRecords(false);
  }, [activeTab]);

  // Handle search button click
  const handleSearch = () => {
    fetchRecords(true);
  };

  const handleNewRegistration = () => {
    navigate('/ip-registration/new');
  };

  // Quick search filter (client-side for instant feedback)
  const filteredRecords = useMemo(() => {
    if (!searchText) return records;
    
    const search = searchText.toLowerCase();
    return records.filter(record => {
      const fullName = `${record.first_name || ''} ${record.middle_name || ''} ${record.last_name || ''}`.toLowerCase();
      return (
        record.application_id?.toLowerCase().includes(search) ||
        record.ssn?.toLowerCase().includes(search) ||
        fullName.includes(search) ||
        record.telephone?.toLowerCase().includes(search)
      );
    });
  }, [records, searchText]);

  // Calculate counts from all available records (need separate queries for accurate counts)
  const [tabCounts, setTabCounts] = useState({ pending: 0, registered: 0, inactive: 0 });
  
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch counts from both tables
        const [tmpResult, masterResult] = await Promise.all([
          supabase.from('tmp_ip_master').select('status').neq('status', EXCLUDED_STATUS),
          supabase.from('ip_master').select('status').neq('status', EXCLUDED_STATUS)
        ]);
        
        const allRecords = [...(tmpResult.data || []), ...(masterResult.data || [])];
        
        setTabCounts({
          pending: allRecords.filter(r => PENDING_STATUSES.includes(r.status)).length,
          registered: allRecords.filter(r => REGISTERED_STATUSES.includes(r.status)).length,
          inactive: allRecords.filter(r => INACTIVE_STATUSES.includes(r.status)).length,
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    
    fetchCounts();
  }, [records]); // Refetch counts when records change

  // Get visible columns
  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);

  const canEdit = (record: IPRecord) => record.status === 'Z';
  const canSubmit = (record: IPRecord) => record.status === 'Z';
  const canApprove = (record: IPRecord) => record.status === 'P' && record.created_by !== user?.id;
  const canReject = (record: IPRecord) => record.status === 'P' && record.created_by !== user?.id;

  const handleView = (record: IPRecord) => {
    navigate(`/ip-registration/view/${record.unique_uuid}`);
  };

  const handleEdit = (record: IPRecord) => {
    navigate(`/ip-registration/edit/${record.unique_uuid}`);
  };

  const handleSubmit = async (record: IPRecord) => {
    navigate(`/ip-registration/edit/${record.unique_uuid}?action=submit`);
  };

  const handleApprove = async (record: IPRecord) => {
    navigate(`/ip-registration/view/${record.unique_uuid}?action=approve`);
  };

  const handleReject = async (record: IPRecord) => {
    navigate(`/ip-registration/view/${record.unique_uuid}?action=reject`);
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
    fetchRecords(false); // Reload without filters
  };

  // Get statuses available for current tab (for dropdown)
  const getAvailableStatuses = useCallback(() => {
    const tabStatuses = getStatusesForTab(activeTab);
    if (!ipStatuses) return [];
    return ipStatuses.filter(s => tabStatuses.includes(s.code));
  }, [activeTab, ipStatuses, getStatusesForTab]);

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
                    <label className="text-sm font-medium">SSN No.</label>
                    <Input 
                      placeholder="Enter 6-Digit SSN" 
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
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">show</span>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
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

            {/* Table Header with Export/Columns */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {activeTab === 'pending' && `Pending Verification (${filteredRecords.length})`}
                {activeTab === 'registered' && `Registered Insured Person (${filteredRecords.length})`}
                {activeTab === 'inactive' && `Inactive Insured Person (${filteredRecords.length})`}
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
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
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.slice(0, pageSize).map((record) => (
                      <TableRow key={record.id}>
                        {visibleColumns.map(col => (
                          <TableCell key={col.key} className={col.key === 'application_id' ? 'font-medium' : ''}>
                            {col.key === 'application_id' && (record.ssn || record.application_id)}
                            {col.key === 'last_name' && (record.last_name || '-')}
                            {col.key === 'first_name' && (record.first_name || '-')}
                            {col.key === 'middle_name' && (record.middle_name || '-')}
                            {col.key === 'status' && (
                              <Badge variant={statusConfig[record.status]?.variant || 'default'}>
                                {ipStatuses ? getStatusDescription(record.status, ipStatuses) : (statusConfig[record.status]?.label || record.status)}
                              </Badge>
                            )}
                            {col.key === 'date_of_birth' && (record.date_of_birth ? format(new Date(record.date_of_birth), 'dd/MM/yyyy') : '-')}
                            {col.key === 'gender' && (record.gender || '-')}
                            {col.key === 'nationality' && (record.nationality || '-')}
                            {col.key === 'created_at' && format(new Date(record.created_at), 'dd/MM/yyyy')}
                            {col.key === 'telephone' && (record.telephone || '-')}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex items-center gap-1">
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
                                variant="destructive"
                                size="icon"
                                onClick={() => handleSubmit(record)}
                                title="Submit"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {canApprove(record) && (
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleApprove(record)}
                                title="Approve"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {canReject(record) && (
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleReject(record)}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
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
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
