import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Users, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  getCompanyUsersReport, getSelfEmployedUsersReport, getUsersReportRoles,
  exportUsersReport,
  type CompanyUserReportRow, type SelfEmployedUserReportRow, type UserRole
} from '@/services/wizReportsService';
import { exportReportToExcel } from '@/utils/reportExcelExport';

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd-MMM-yyyy HH:mm'); } catch { return d; }
}

const PAGE_SIZE = 50;

export default function WizUsersHistory() {
  const [tab, setTab] = useState<'Company' | 'SelfEmployee'>('Company');

  // Company Users
  const [companyData, setCompanyData] = useState<CompanyUserReportRow[]>([]);
  const [companyTotal, setCompanyTotal] = useState(0);
  const [companyPage, setCompanyPage] = useState(1);

  // Self Employed Users
  const [seData, setSeData] = useState<SelfEmployedUserReportRow[]>([]);
  const [seTotal, setSeTotal] = useState(0);
  const [sePage, setSePage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [sortCol, setSortCol] = useState('first_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Load roles
  useEffect(() => {
    getUsersReportRoles(null)
      .then(res => setRoles(res.data || []))
      .catch(() => {});
  }, []);

  const filteredRoles = roles.filter(r =>
    tab === 'Company' ? r.role_category === 'Company' : r.role_category === 'SelfEmployee'
  );

  const fetchCompanyUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCompanyUsersReport({
        search: searchText,
        role_id: selectedRole ? Number(selectedRole) : null,
        sort_column: sortCol,
        sort_direction: sortDir,
        page: companyPage,
        page_size: PAGE_SIZE,
      });
      setCompanyData(res.data || []);
      setCompanyTotal(res.pagination?.total_records || 0);
    } catch (err: any) {
      toast.error('Failed to load company users', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedRole, sortCol, sortDir, companyPage]);

  const fetchSEUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSelfEmployedUsersReport({
        search: searchText,
        role_id: selectedRole ? Number(selectedRole) : null,
        sort_column: sortCol,
        sort_direction: sortDir,
        page: sePage,
        page_size: PAGE_SIZE,
      });
      setSeData(res.data || []);
      setSeTotal(res.pagination?.total_records || 0);
    } catch (err: any) {
      toast.error('Failed to load self-employed users', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedRole, sortCol, sortDir, sePage]);

  useEffect(() => {
    if (tab === 'Company') fetchCompanyUsers();
    else fetchSEUsers();
  }, [tab, fetchCompanyUsers, fetchSEUsers]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleTabChange = (t: string) => {
    setTab(t as 'Company' | 'SelfEmployee');
    setSelectedRole('');
    setSearchText('');
    setSortCol('first_name');
    setSortDir('asc');
  };

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');
      const res = await exportUsersReport({
        category: tab,
        search: searchText,
        role_id: selectedRole ? Number(selectedRole) : null,
      });
      const rows = res.data || [];
      const cols = tab === 'Company'
        ? [
            { header: 'Full Name', key: 'name', width: 25 },
            { header: 'Login Id', key: 'username', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Company Name', key: 'company', width: 35 },
          ]
        : [
            { header: 'Full Name', key: 'name', width: 25 },
            { header: 'Login Id', key: 'username', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'SSN', key: 'ssn', width: 12 },
          ];
      await exportReportToExcel(rows, cols, `users-history-${tab.toLowerCase()}`, 'Users History');
      toast.success('Export complete');
    } catch (err: any) {
      toast.error('Export failed', { description: err.message });
    }
  };

  const currentPage = tab === 'Company' ? companyPage : sePage;
  const setCurrentPage = tab === 'Company' ? setCompanyPage : setSePage;
  const totalRecords = tab === 'Company' ? companyTotal : seTotal;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  // Group data by role for the grouped display
  const groupedCompanyData = React.useMemo(() => {
    const groups: Record<string, CompanyUserReportRow[]> = {};
    companyData.forEach(u => {
      const key = u.role_name || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });
    return groups;
  }, [companyData]);

  const groupedSEData = React.useMemo(() => {
    const groups: Record<string, SelfEmployedUserReportRow[]> = {};
    seData.forEach(u => {
      const key = u.role_name || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });
    return groups;
  }, [seData]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="All User History"
        breadcrumbs={[
          { label: 'Admin Dashboard', href: '/c3-management/dashboard' },
          { label: 'All User History' },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">All User History</h2>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedRole || '__all__'} onValueChange={v => { setSelectedRole(v === '__all__' ? '' : v); setCompanyPage(1); setSePage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Roles</SelectItem>
                  {filteredRoles.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.role_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search Name, Email or Login ID..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-[260px]"
              />
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/5" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="Company">Company Users</TabsTrigger>
              <TabsTrigger value="SelfEmployee">Self Employed Users</TabsTrigger>
            </TabsList>

            <TabsContent value="Company">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer" onClick={() => handleSort('first_name')}>
                        <div className="flex items-center gap-1">Full Name {sortCol === 'first_name' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('username')}>
                        <div className="flex items-center gap-1">Login Id {sortCol === 'username' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                        <div className="flex items-center gap-1">Email {sortCol === 'email' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </TableHead>
                      <TableHead>Company Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : Object.keys(groupedCompanyData).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                    ) : Object.entries(groupedCompanyData).map(([role, users]) => (
                      <React.Fragment key={role}>
                        <TableRow>
                          <TableCell colSpan={4} className="font-semibold bg-muted/30 text-primary py-2">{role}</TableCell>
                        </TableRow>
                        {users.map(u => (
                          <TableRow key={u.user_id} className="hover:bg-muted/50">
                            <TableCell className="text-primary font-medium">{u.first_name} {u.last_name}</TableCell>
                            <TableCell>{u.username}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.company_name} - {u.registration_number}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="SelfEmployee">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer" onClick={() => handleSort('first_name')}>
                        <div className="flex items-center gap-1">Full Name {sortCol === 'first_name' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('username')}>
                        <div className="flex items-center gap-1">Login Id {sortCol === 'username' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                        <div className="flex items-center gap-1">Email {sortCol === 'email' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </TableHead>
                      <TableHead>Company Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : Object.keys(groupedSEData).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                    ) : Object.entries(groupedSEData).map(([role, users]) => (
                      <React.Fragment key={role}>
                        <TableRow>
                          <TableCell colSpan={4} className="font-semibold bg-muted/30 text-primary py-2">{role}</TableCell>
                        </TableRow>
                        {users.map(u => (
                          <TableRow key={u.user_id} className="hover:bg-muted/50">
                            <TableCell className="text-primary font-medium">{u.first_name} {u.last_name}</TableCell>
                            <TableCell>{u.username}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.first_name} {u.last_name} - {u.ssn}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-primary font-medium">
              {totalRecords > 0 ? `Page ${currentPage} of ${totalPages} (${totalRecords} records)` : '0 records'}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
