import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Search, Edit, Users, UserCheck, ChevronLeft, ChevronRight, ArrowUpDown, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { getEmployerList, getCompaniesDropdown, updateCompanyMapping, WizEmployer, WizCompanyDropdown } from '@/services/wizAdminApiService';
import { format, parseISO } from 'date-fns';

const WizEmployerList: React.FC = () => {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<WizEmployer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('registration_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageOffset, setPageOffset] = useState(0);
  const [pageLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Company mapping dialog
  const [mappingOpen, setMappingOpen] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [childIds, setChildIds] = useState<string[]>([]);
  const [companies, setCompanies] = useState<WizCompanyDropdown[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployerList({
        search: search || undefined,
        sort_col: sortCol,
        sort_dir: sortDir,
        page_offset: pageOffset,
        page_limit: pageLimit,
      });
      setEmployers(res.data?.employers || []);
      setTotalRecords(res.total_records || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load employers');
    } finally {
      setLoading(false);
    }
  }, [search, sortCol, sortDir, pageOffset, pageLimit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPageOffset(0);
  };

  const handleSearch = () => {
    setPageOffset(0);
    fetchData();
  };

  const currentPage = Math.floor(pageOffset / pageLimit) + 1;
  const totalPages = Math.ceil(totalRecords / pageLimit);

  const openMappingDialog = async () => {
    setMappingOpen(true);
    try {
      const res = await getCompaniesDropdown();
      setCompanies(res.data?.companies || []);
    } catch (err: any) {
      toast.error('Failed to load companies');
    }
  };

  const saveMapping = async () => {
    if (!parentId) {
      toast.error('Please select a parent company');
      return;
    }
    setMappingLoading(true);
    try {
      await updateCompanyMapping(Number(parentId), childIds.map(Number));
      toast.success('Company mapping updated');
      setMappingOpen(false);
      setParentId('');
      setChildIds([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update mapping');
    } finally {
      setMappingLoading(false);
    }
  };

  const SortableHeader = ({ col, label }: { col: string; label: string }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(col)}>
      <div className="flex items-center gap-1">
        {label}
        {sortCol === col && <ArrowUpDown className="h-3 w-3" />}
      </div>
    </TableHead>
  );

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'dd-MMM-yyyy'); } catch { return d; }
  };

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbPage>Admin Dashboard</BreadcrumbPage></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Employers Details</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employer List
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by employer name or reg number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-80"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={openMappingDialog} className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Company Relationship Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader col="registration_number" label="Registration No." />
                  <SortableHeader col="registration_date" label="C3 Reg. Date" />
                  <SortableHeader col="contact_person" label="Contact Person" />
                  <SortableHeader col="company_name" label="Employer Name" />
                  <TableHead>Mobile No</TableHead>
                  <SortableHeader col="email" label="Email Id" />
                  <TableHead>Edit</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Employees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : employers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No employers found</TableCell></TableRow>
                ) : (
                  employers.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-primary font-medium cursor-pointer" onClick={() => navigate(`/c3-management/employer-details/${emp.id}`)}>
                        {emp.registration_number}
                      </TableCell>
                      <TableCell>{formatDate(emp.registration_date)}</TableCell>
                      <TableCell>{emp.contact_person}</TableCell>
                      <TableCell>{emp.company_name}</TableCell>
                      <TableCell>{emp.mobile || '—'}</TableCell>
                      <TableCell className="text-primary">{emp.email}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/c3-management/employer-details/${emp.id}`)}>
                          <Edit className="h-4 w-4 text-green-600" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="relative" onClick={() => navigate(`/c3-management/employer-users/${emp.id}`)}>
                          <Users className="h-4 w-4 text-blue-600" />
                          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{emp.user_count}</Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="relative" onClick={() => navigate(`/c3-management/employer-employees/${emp.id}`)}>
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{emp.employee_count}</Badge>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {pageOffset + 1}-{Math.min(pageOffset + pageLimit, totalRecords)} of {totalRecords}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPageOffset(Math.max(0, pageOffset - pageLimit))}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map(p => (
                <Button key={p} variant={p === currentPage ? 'default' : 'outline'} size="sm" onClick={() => setPageOffset((p - 1) * pageLimit)}>
                  {p}
                </Button>
              ))}
              {totalPages > 4 && <span className="px-2 text-muted-foreground">…</span>}
              {totalPages > 4 && (
                <Button variant="outline" size="sm" onClick={() => setPageOffset((totalPages - 1) * pageLimit)}>
                  {totalPages}
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPageOffset(pageOffset + pageLimit)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Mapping Dialog */}
      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Mapping Relationship Companies
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-primary font-semibold">Parent Company</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Search by employer name or reg number" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name} ({c.registration_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-primary font-semibold">Child Companies</Label>
              <Select value="" onValueChange={(v) => { if (!childIds.includes(v)) setChildIds([...childIds, v]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select child companies" />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter(c => String(c.id) !== parentId && !childIds.includes(String(c.id))).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name} ({c.registration_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {childIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {childIds.map(id => {
                    const c = companies.find(co => String(co.id) === id);
                    return (
                      <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => setChildIds(childIds.filter(x => x !== id))}>
                        {c?.company_name || id} ×
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingOpen(false)} className="text-destructive border-destructive">Close</Button>
            <Button onClick={saveMapping} disabled={mappingLoading} className="bg-green-600 hover:bg-green-700 text-white">
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizEmployerList;
