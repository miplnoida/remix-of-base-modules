import React, { useState, useEffect } from 'react';
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
  RotateCcw, Filter, Download, Columns, ChevronUp, ChevronDown,
  UserPlus, Key, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';

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
  D: { label: 'Draft', variant: 'secondary' },
  P: { label: 'Pending', variant: 'default' },
  V: { label: 'Verified', variant: 'outline' },
  R: { label: 'Rejected', variant: 'destructive' },
};

export default function IPRegistrationList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(10);
  
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

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Fetch from tmp_ip_master (drafts and pending)
      const { data: tmpData, error: tmpError } = await supabase
        .from('tmp_ip_master')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (tmpError) throw tmpError;

      // Fetch from ip_master (verified and rejected)
      const { data: masterData, error: masterError } = await supabase
        .from('ip_master')
        .select('*')
        .order('created_at', { ascending: false });
      
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
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleNewRegistration = async () => {
    try {
      // Generate application ID
      const { data: appIdData, error: appIdError } = await supabase
        .rpc('generate_application_id');
      
      if (appIdError) throw appIdError;

      const uniqueUuid = crypto.randomUUID();
      
      // Create new draft record
      const { data, error } = await supabase
        .from('tmp_ip_master')
        .insert({
          unique_uuid: uniqueUuid,
          application_id: appIdData,
          status: 'D',
          created_by: user?.id,
          application_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Draft created: ${appIdData}`);
      navigate(`/ip-registration/edit/${data.unique_uuid}`);
    } catch (error) {
      console.error('Error creating draft:', error);
      toast.error('Failed to create new registration');
    }
  };

  const filteredRecords = records.filter(record => {
    // Tab filter
    if (activeTab === 'pending' && record.status !== 'P' && record.status !== 'D') return false;
    if (activeTab === 'registered' && record.status !== 'V') return false;
    if (activeTab === 'inactive' && record.status !== 'R') return false;

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      const fullName = `${record.first_name || ''} ${record.middle_name || ''} ${record.last_name || ''}`.toLowerCase();
      if (!record.application_id?.toLowerCase().includes(search) &&
          !record.ssn?.toLowerCase().includes(search) &&
          !fullName.includes(search) &&
          !record.telephone?.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Advanced filters
    if (filters.ssn && !record.ssn?.includes(filters.ssn)) return false;
    if (filters.surname && !record.last_name?.toLowerCase().includes(filters.surname.toLowerCase())) return false;
    if (filters.firstName && !record.first_name?.toLowerCase().includes(filters.firstName.toLowerCase())) return false;
    if (filters.phone && !record.telephone?.includes(filters.phone)) return false;
    if (filters.gender && filters.gender !== 'all' && record.gender !== filters.gender) return false;
    if (filters.status && filters.status !== 'all' && record.status !== filters.status) return false;

    return true;
  });

  const pendingCount = records.filter(r => r.status === 'P' || r.status === 'D').length;
  const registeredCount = records.filter(r => r.status === 'V').length;
  const inactiveCount = records.filter(r => r.status === 'R').length;

  const canEdit = (record: IPRecord) => record.status === 'D';
  const canSubmit = (record: IPRecord) => record.status === 'D';
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
            Pending Verification ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="registered" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Registered Insured Person ({registeredCount})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Inactive Insured Person ({inactiveCount})
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
                        <SelectItem value="D">Draft</SelectItem>
                        <SelectItem value="P">Pending</SelectItem>
                        <SelectItem value="V">Verified</SelectItem>
                        <SelectItem value="R">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button className="flex items-center gap-2">
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
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Columns className="h-4 w-4" />
                  Columns
                </Button>
              </div>
            </div>

            {/* Records Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID/SSN</TableHead>
                    <TableHead>Sur Name</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Middle Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Of Birth</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Phone Num</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.slice(0, pageSize).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.ssn || record.application_id}
                        </TableCell>
                        <TableCell>{record.last_name || '-'}</TableCell>
                        <TableCell>{record.first_name || '-'}</TableCell>
                        <TableCell>{record.middle_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[record.status]?.variant || 'default'}>
                            {statusConfig[record.status]?.label || record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.date_of_birth ? format(new Date(record.date_of_birth), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>{record.gender || '-'}</TableCell>
                        <TableCell>{record.nationality || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(record.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{record.telephone || '-'}</TableCell>
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
