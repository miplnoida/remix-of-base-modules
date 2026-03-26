import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Search, Edit, Users, UserCheck, ChevronLeft, ChevronRight, ArrowUpDown, Link2, CheckCircle2, XCircle, AlertTriangle, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getEmployerList, getCompaniesDropdown, updateCompanyMapping,
  getCompanyMappingUsers, removeCompanyMapping,
  parseE164Phone, WizEmployer, WizCompanyDropdown,
  MappingResultData, MappingUser,
} from '@/services/wizAdminApiService';
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

  // Mapping result dialog
  const [mappingResult, setMappingResult] = useState<MappingResultData | null>(null);
  const [mappingResultOpen, setMappingResultOpen] = useState(false);

  // Unmap confirmation dialog
  const [unmapConfirmOpen, setUnmapConfirmOpen] = useState(false);
  const [unmapChildId, setUnmapChildId] = useState<string>('');
  const [unmapUsers, setUnmapUsers] = useState<MappingUser[]>([]);
  const [unmapLoading, setUnmapLoading] = useState(false);
  const [unmapFetchingUsers, setUnmapFetchingUsers] = useState(false);

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

  // Auto-populate existing child companies when parent is selected
  useEffect(() => {
    if (parentId && companies.length > 0) {
      const existingChildren = companies
        .filter(c => c.parent_company_id === Number(parentId))
        .map(c => String(c.id));
      setChildIds(existingChildren);
    } else {
      setChildIds([]);
    }
  }, [parentId, companies]);

  // ─── Unmap: click × on child badge ─────────────────────
  const handleRemoveChildClick = async (childId: string) => {
    if (!parentId) {
      // No parent selected yet, just remove from local state
      setChildIds(prev => prev.filter(x => x !== childId));
      return;
    }

    // Check if this child was already mapped (exists in companies with parent_company_id)
    const child = companies.find(c => String(c.id) === childId);
    const isExistingMapping = child?.parent_company_id === Number(parentId);

    if (!isExistingMapping) {
      // Not yet saved — just remove from local state
      setChildIds(prev => prev.filter(x => x !== childId));
      return;
    }

    // Existing mapping — fetch affected users and show confirm dialog
    setUnmapChildId(childId);
    setUnmapFetchingUsers(true);
    setUnmapConfirmOpen(true);
    setUnmapUsers([]);

    try {
      const res = await getCompanyMappingUsers(Number(parentId), Number(childId));
      setUnmapUsers(res.data?.users || []);
    } catch {
      // If API not available yet, show dialog without users
      setUnmapUsers([]);
    } finally {
      setUnmapFetchingUsers(false);
    }
  };

  const confirmUnmap = async () => {
    setUnmapLoading(true);
    try {
      await removeCompanyMapping(Number(parentId), Number(unmapChildId));
      setChildIds(prev => prev.filter(x => x !== unmapChildId));
      setUnmapConfirmOpen(false);
      toast.success('Company mapping removed successfully');
      // Refresh companies dropdown to reflect updated parent_company_id
      const res = await getCompaniesDropdown();
      setCompanies(res.data?.companies || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove mapping');
    } finally {
      setUnmapLoading(false);
    }
  };

  // ─── Save mapping with result dialog ────────────────────
  const saveMapping = async () => {
    if (!parentId) {
      toast.error('Please select a parent company');
      return;
    }
    setMappingLoading(true);
    try {
      const res = await updateCompanyMapping(Number(parentId), childIds.map(Number));

      // Check if API returned categorized result
      const data = res.data;
      if (data && (data.mapped || data.unmapped || data.already_linked)) {
        setMappingResult({
          mapped: data.mapped || [],
          unmapped: data.unmapped || [],
          already_linked: data.already_linked || [],
        });
        setMappingResultOpen(true);
        setMappingOpen(false);
      } else {
        // Fallback: legacy response without categories
        toast.success('Company mapping updated');
        setMappingOpen(false);
      }

      setParentId('');
      setChildIds([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update mapping');
    } finally {
      setMappingLoading(false);
    }
  };

  const getCompanyName = (id: string) => {
    const c = companies.find(co => String(co.id) === id);
    return c?.company_name || id;
  };

  const getParentCompanyName = () => {
    return parentId ? getCompanyName(parentId) : '';
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

  const formatMobile = (m: string | null) => {
    if (!m) return '—';
    const { dialCode, localNumber } = parseE164Phone(m);
    return localNumber ? `(${dialCode}) ${localNumber}` : '—';
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
                placeholder="Search by name, reg no, contact, email"
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
                      <TableCell className="font-medium cursor-pointer min-w-[120px]" onClick={() => navigate(`/c3-management/employer-details/${emp.id}`)}>
                        <span className="text-foreground">{emp.registration_number || '—'}</span>
                      </TableCell>
                      <TableCell>{formatDate(emp.registration_date)}</TableCell>
                      <TableCell>{emp.contact_person || '—'}</TableCell>
                      <TableCell>{emp.company_name || '—'}</TableCell>
                      <TableCell>{formatMobile(emp.mobile)}</TableCell>
                      <TableCell className="min-w-[180px]"><span className="text-foreground">{emp.email || '—'}</span></TableCell>
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
              {totalRecords > 0 ? `${pageOffset + 1}-${Math.min(pageOffset + pageLimit, totalRecords)} of ${totalRecords}` : '0 records'}
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
              <SearchableSelect
                value={parentId}
                onValueChange={setParentId}
                options={companies.map(c => ({
                  value: String(c.id),
                  label: `${c.company_name} (${c.registration_number})`,
                  searchText: c.registration_number,
                }))}
                placeholder="Search by employer name or reg number"
                searchPlaceholder="Type to search..."
              />
            </div>
            <div>
              <Label className="text-primary font-semibold">Child Companies</Label>
              <SearchableSelect
                value=""
                onValueChange={(v) => { if (v && !childIds.includes(v)) setChildIds([...childIds, v]); }}
                options={companies
                  .filter(c => String(c.id) !== parentId && !childIds.includes(String(c.id)))
                  .map(c => ({
                    value: String(c.id),
                    label: `${c.company_name} (${c.registration_number})`,
                    searchText: c.registration_number,
                  }))}
                placeholder="Select child companies"
                searchPlaceholder="Type to search..."
              />
              {childIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {childIds.map(id => {
                    const c = companies.find(co => String(co.id) === id);
                    return (
                      <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveChildClick(id)}>
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
            <Button onClick={saveMapping} disabled={mappingLoading}>
              {mappingLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Result Dialog */}
      <Dialog open={mappingResultOpen} onOpenChange={setMappingResultOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Mapping Result
            </DialogTitle>
          </DialogHeader>
          {mappingResult && (
            <div className="space-y-4">
              {/* Mapped — green */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700">Mapped</span>
                </div>
                {mappingResult.mapped.length > 0 ? (
                  <ul className="space-y-1 pl-6">
                    {mappingResult.mapped.map(c => (
                      <li key={c.id} className="text-sm text-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {c.company_name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">None</p>
                )}
              </div>

              {/* Unmapped — red */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-semibold text-destructive">Unmapped</span>
                </div>
                {mappingResult.unmapped.length > 0 ? (
                  <ul className="space-y-1 pl-6">
                    {mappingResult.unmapped.map(c => (
                      <li key={c.id} className="text-sm text-foreground flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-destructive" />
                        {c.company_name} {c.reason && <span className="text-muted-foreground">— {c.reason}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">None</p>
                )}
              </div>

              {/* Already Linked — yellow */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold text-yellow-600">Already Linked</span>
                </div>
                {mappingResult.already_linked.length > 0 ? (
                  <ul className="space-y-1 pl-6">
                    {mappingResult.already_linked.map(c => (
                      <li key={c.id} className="text-sm text-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        {c.company_name} {c.current_parent && <span className="text-muted-foreground">— linked to {c.current_parent}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">None</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setMappingResultOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unmap Confirmation Dialog */}
      <AlertDialog open={unmapConfirmOpen} onOpenChange={setUnmapConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to remove <strong>{getCompanyName(unmapChildId)}</strong> from parent company <strong>{getParentCompanyName()}</strong>.
                </p>
                {unmapFetchingUsers ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading affected users...
                  </div>
                ) : unmapUsers.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Removing this mapping will revoke access for the following user(s):
                    </p>
                    <ul className="space-y-1 pl-2">
                      {unmapUsers.map(u => (
                        <li key={u.id} className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {u.first_name} {u.last_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No users are currently associated with this mapping.</p>
                )}
                <p className="text-sm font-medium text-destructive">This action cannot be undone. Do you want to continue?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unmapLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnmap}
              disabled={unmapLoading || unmapFetchingUsers}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unmapLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WizEmployerList;
