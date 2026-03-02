import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Search, Edit, Users, ChevronLeft, ChevronRight, ArrowUpDown, User } from 'lucide-react';
import { toast } from 'sonner';
import { getSelfEmployedList, toggleSelfEmployedStatus, WizSelfEmployedRecord } from '@/services/wizSelfEmployedService';
import { format, parseISO } from 'date-fns';

const WizSelfEmployedList: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WizSelfEmployedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('ssn');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageOffset, setPageOffset] = useState(0);
  const [pageLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Status toggle confirmation
  const [toggleDialog, setToggleDialog] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<WizSelfEmployedRecord | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSelfEmployedList({
        search: search || undefined,
        sort_col: sortCol,
        sort_dir: sortDir,
        page_offset: pageOffset,
        page_limit: pageLimit,
      });
      const d = res.data;
      setRecords(d?.records || []);
      setTotalRecords(d?.totalRecords || 0);
      setTotalPages(d?.totalPages || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load self-employed list');
    } finally {
      setLoading(false);
    }
  }, [search, sortCol, sortDir, pageOffset, pageLimit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPageOffset(0);
  };

  const handleSearch = () => { setPageOffset(0); fetchData(); };

  const currentPage = Math.floor(pageOffset / pageLimit) + 1;

  const confirmToggle = (record: WizSelfEmployedRecord) => {
    setToggleTarget(record);
    setToggleDialog(true);
  };

  const executeToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await toggleSelfEmployedStatus(toggleTarget.userId);
      toast.success('Status updated successfully');
      setToggleDialog(false);
      setToggleTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd-MMM-yyyy');
    } catch { return dateStr; }
  };

  const SortableHeader = ({ label, col }: { label: string; col: string }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        {sortCol === col && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="cursor-pointer text-primary" onClick={() => navigate('/c3-management/dashboard')}>Admin Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator>-</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">Self Employee Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Self Employed List
          </CardTitle>
          <div className="flex items-center gap-2 w-96">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by self employer name or SSN"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
           <div className="flex justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="SSN" col="ssn" />
                    <SortableHeader label="C3 Reg. Date" col="insertedOn" />
                    <SortableHeader label="Name" col="name" />
                    <SortableHeader label="Email" col="email" />
                    <TableHead>Mobile</TableHead>
                    <TableHead>User Status</TableHead>
                    <TableHead>Edit</TableHead>
                    <TableHead>Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No self-employed records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((rec) => (
                      <TableRow key={rec.employeeID}>
                        <TableCell className="font-medium text-foreground">{rec.socSecNum}</TableCell>
                        <TableCell className="text-foreground">{formatDate(rec.insertedOn)}</TableCell>
                        <TableCell className="text-foreground">{rec.fullName}</TableCell>
                        <TableCell className="text-foreground">{rec.email || '—'}</TableCell>
                        <TableCell className="text-foreground">{rec.mobile || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${rec.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {rec.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <Switch
                              checked={rec.isActive}
                              onCheckedChange={() => confirmToggle(rec)}
                              className="data-[state=checked]:bg-green-500"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => navigate(`/c3-management/self-employed-details/${rec.employeeID}`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="relative text-muted-foreground hover:text-foreground"
                            onClick={() => navigate(`/c3-management/self-employed-user/${rec.userId}`)}
                            title="Users"
                          >
                            <Users className="h-4 w-4" />
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">1</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {currentPage}-{totalPages > 0 ? `${totalPages}` : 'NaN'} of {totalRecords > 0 ? totalRecords : 'undefined'}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageOffset === 0}
                    onClick={() => setPageOffset(Math.max(0, pageOffset - pageLimit))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPageOffset(pageOffset + pageLimit)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Toggle Confirmation Dialog */}
      <Dialog open={toggleDialog} onOpenChange={setToggleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to change status for <strong>{toggleTarget?.fullName}</strong>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToggleDialog(false)} disabled={toggling}>Cancel</Button>
            <Button onClick={executeToggle} disabled={toggling}>
              {toggling ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizSelfEmployedList;
