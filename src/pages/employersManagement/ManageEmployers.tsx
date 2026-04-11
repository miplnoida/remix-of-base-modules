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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import {
  Search,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  CalendarIcon,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Status mapping (er_master status codes → display labels) ──

const STATUS_MAP: Record<string, string> = {
  A: 'Active',
  P: 'Pending',
  S: 'Suspended',
  T: 'Terminated',
  D: 'De-registered',
  V: 'Verification',
  I: 'Inactive',
  E: 'Expired',
};

const displayStatus = (code: string | null) => STATUS_MAP[code ?? ''] ?? code ?? 'Unknown';

// ── Tab → status filter mapping ──

const TAB_STATUS_FILTERS: Record<string, string[]> = {
  pending: ['P', 'V'],
  registered: ['A'],
  ceased: ['S', 'T', 'D', 'I', 'E'],
};

// ── Fetch employers from er_master ──

interface EmployerRow {
  regno: string;
  name: string | null;
  trade_name: string | null;
  phone: string | null;
  activity_type: string | null;
  status: string | null;
  hq_addr1: string | null;
  hq_addr2: string | null;
  males_employed: number | null;
  females_employed: number | null;
}

async function fetchEmployersByStatus(statuses: string[]): Promise<EmployerRow[]> {
  // Supabase caps at 1000 per request — paginate to fetch all rows
  const PAGE_SIZE = 1000;
  let allData: EmployerRow[] = [];
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabase
      .from('er_master')
      .select('regno, name, trade_name, phone, activity_type, status, hq_addr1, hq_addr2, males_employed, females_employed')
      .in('status', statuses)
      .order('regno', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as EmployerRow[];
    allData = allData.concat(page);
    if (page.length < PAGE_SIZE) {
      keepFetching = false;
    } else {
      from += PAGE_SIZE;
    }
  }
  return allData;
}

async function fetchEmployerCounts(): Promise<Record<string, number>> {
  // Use individual count queries to avoid the 1000-row default limit
  const countForStatuses = async (statuses: string[]): Promise<number> => {
    const { count, error } = await supabase
      .from('er_master')
      .select('*', { count: 'exact', head: true })
      .in('status', statuses);
    if (error) throw error;
    return count ?? 0;
  };

  const [pending, registered, ceased] = await Promise.all([
    countForStatuses(TAB_STATUS_FILTERS.pending),
    countForStatuses(TAB_STATUS_FILTERS.registered),
    countForStatuses(TAB_STATUS_FILTERS.ceased),
  ]);

  return { pending, registered, ceased };
}

// ── Component ──

const ManageEmployers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('registered');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();

  const [selectedEmployer, setSelectedEmployer] = useState<EmployerRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const [searchParams, setSearchParams] = useState({
    registrationNumber: '',
    employerName: '',
    tradeName: '',
    phoneNumber: '',
    status: 'All',
  });

  // Fetch tab counts
  const { data: tabCounts } = useQuery({
    queryKey: ['manage_employers_counts'],
    queryFn: fetchEmployerCounts,
  });

  // Fetch employers for active tab
  const statuses = TAB_STATUS_FILTERS[activeTab] ?? ['A'];
  const { data: employers = [], isLoading } = useQuery({
    queryKey: ['manage_employers_list', activeTab],
    queryFn: () => fetchEmployersByStatus(statuses),
  });

  // Client-side search filter
  const filteredEmployers = employers.filter((emp) => {
    const s = searchParams;
    if (s.registrationNumber && !(emp.regno ?? '').includes(s.registrationNumber)) return false;
    if (s.employerName && !(emp.name ?? '').toLowerCase().includes(s.employerName.toLowerCase())) return false;
    if (s.tradeName && !(emp.trade_name ?? '').toLowerCase().includes(s.tradeName.toLowerCase())) return false;
    if (s.phoneNumber && !(emp.phone ?? '').includes(s.phoneNumber)) return false;
    return true;
  });

  // Map to DataTable format
  const tableData = filteredEmployers.map((emp) => ({
    regNo: emp.regno,
    name: emp.name ?? '',
    tradeName: emp.trade_name ?? '',
    phone: emp.phone ?? '',
    activityType: emp.activity_type ?? '',
    status: displayStatus(emp.status),
  }));

  const handleReset = () => {
    setSearchParams({ registrationNumber: '', employerName: '', tradeName: '', phoneNumber: '', status: 'All' });
    setFromDate(undefined);
    setToDate(undefined);
  };

  const handleView = (employer: any) => navigate(`/employers-management/view/${employer.regNo}`);
  const handleEdit = (employer: any) => navigate(`/employers-management/edit/${employer.regNo}`);

  const handleApprove = (employer: EmployerRow) => {
    setSelectedEmployer(employer);
    setApproveDialogOpen(true);
  };
  const handleReject = (employer: EmployerRow) => {
    setSelectedEmployer(employer);
    setRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedEmployer) {
      alert(`Successfully approved ${selectedEmployer.name}. Status changed to Active.`);
      setApproveDialogOpen(false);
      setSelectedEmployer(null);
    }
  };

  const confirmReject = () => {
    if (selectedEmployer && rejectionReason.trim()) {
      alert(`Successfully rejected ${selectedEmployer.name}. Rejection email sent.`);
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
      case 'Terminated':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Terminated</Badge>;
      case 'Pending':
      case 'Verification':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
      case 'De-registered':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200">De-registered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns = [
    { key: 'regNo', label: 'Reg. No' },
    { key: 'name', label: 'Employer Name' },
    { key: 'tradeName', label: 'Trade Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'activityType', label: 'Activity Type' },
    { key: 'status', label: 'Status' },
  ];

  const renderFilterPanel = () => (
    <Card className="mb-6 mt-5 shadow-sm">
      <Collapsible open={isFilterExpanded} onOpenChange={setIsFilterExpanded}>
        <CardHeader className="border-b bg-background">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-foreground">Query By</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Filter and search employers</p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2 h-auto">
                {isFilterExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent className="bg-background">
          <CardContent className="p-6 bg-background">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Reg No (6-digit)</label>
                <Input placeholder="Enter 6-digit registration No." value={searchParams.registrationNumber} onChange={(e) => setSearchParams((p) => ({ ...p, registrationNumber: e.target.value }))} className="bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Name</label>
                <Input placeholder="Enter Name" value={searchParams.employerName} onChange={(e) => setSearchParams((p) => ({ ...p, employerName: e.target.value }))} className="bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Trade Name</label>
                <Input placeholder="Enter Trade Name" value={searchParams.tradeName} onChange={(e) => setSearchParams((p) => ({ ...p, tradeName: e.target.value }))} className="bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone No.</label>
                <Input placeholder="Enter Phone Number" value={searchParams.phoneNumber} onChange={(e) => setSearchParams((p) => ({ ...p, phoneNumber: e.target.value }))} className="bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Registration Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background", !fromDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto bg-background" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                <Select value={searchParams.status} onValueChange={(value) => setSearchParams((p) => ({ ...p, status: value }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => {}}>
                <Search className="w-4 h-4 mr-2" />Search
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />Reset
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  const renderTable = (title: string, searchPlaceholder: string, actions: { view?: boolean; edit?: boolean; approve?: boolean; reject?: boolean }) => (
    <>
      {renderFilterPanel()}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tableData.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()}`} description="No employers found matching the current criteria." />
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          title={title}
          searchPlaceholder={searchPlaceholder}
          actions={actions}
          idField="regNo"
          statusField="status"
          getStatusBadge={getStatusBadge}
          onView={handleView}
          onEdit={handleEdit}
          onApprove={actions.approve ? (id) => {
            const emp = employers.find((e) => e.regno === id);
            if (emp) handleApprove(emp);
          } : undefined}
          onReject={actions.reject ? (id) => {
            const emp = employers.find((e) => e.regno === id);
            if (emp) handleReject(emp);
          } : undefined}
        />
      )}
    </>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Employers</h1>
            <Button onClick={() => navigate('/employer/register')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Register New Employer
            </Button>
          </div>

          <div className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
                  Pending Verification ({tabCounts?.pending ?? 0})
                </TabsTrigger>
                <TabsTrigger value="registered" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
                  Registered Employers ({tabCounts?.registered ?? 0})
                </TabsTrigger>
                <TabsTrigger value="ceased" className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
                  Ceased/Suspended ({tabCounts?.ceased ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-0">
                {renderTable('Pending Verification', 'Search pending applications...', { view: true, approve: true, reject: true })}
              </TabsContent>

              <TabsContent value="registered" className="mt-0">
                {renderTable('Registered Employers', 'Search registered employers...', { view: true, edit: true })}
              </TabsContent>

              <TabsContent value="ceased" className="mt-0">
                {renderTable('Ceased/Suspended Employers', 'Search ceased/suspended employers...', { view: true, edit: true })}
              </TabsContent>
            </Tabs>
          </div>
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
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmApprove}>Approve Registration</Button>
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
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea id="rejection-reason" placeholder="Enter the reason for rejection..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2" rows={4} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmReject} disabled={!rejectionReason.trim()} variant="destructive">Reject Registration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ManageEmployers;
