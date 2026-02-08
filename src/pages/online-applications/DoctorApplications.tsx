import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Stethoscope, Search, Filter, RefreshCw, Eye, CheckCircle, XCircle, AlertTriangle, Info, Loader2, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  useDoctorApplications,
  useApproveDoctorApplication,
  useRejectDoctorApplication,
  DoctorApplication,
  getDoctorStatusVariant,
} from '@/hooks/useDoctorApplications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTableSort } from '@/hooks/useTableSort';
import { useTablePagination } from '@/hooks/useTablePagination';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { TablePagination } from '@/components/shared/TablePagination';

export default function DoctorApplications() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    application: DoctorApplication | null;
  }>({ open: false, type: 'approve', application: null });
  const [actionRemarks, setActionRemarks] = useState('');

  // Fetch applications from external API
  const { 
    data: applications, 
    isLoading, 
    error, 
    isFetching,
    refresh,
    dataUpdatedAt 
  } = useDoctorApplications({ 
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const approveApplication = useApproveDoctorApplication();
  const rejectApplication = useRejectDoctorApplication();

  const isAdmin = user?.role === 'admin' || hasPermission('system_administration');
  const isOfficer = hasPermission('process_claims') || hasPermission('approve_benefits');
  const canApprove = isAdmin || isOfficer;

  const getStatusBadge = (status: string, label?: string) => {
    return <Badge variant={getDoctorStatusVariant(status)}>{label ?? status}</Badge>;
  };

  // Filter applications client-side for search
  const filteredApplications = (applications || []).filter(app => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (app.referenceNumber || app.applicationId)?.toLowerCase().includes(searchLower) ||
      app.fullName?.toLowerCase().includes(searchLower) ||
      app.email?.toLowerCase().includes(searchLower) ||
      app.mobile?.toLowerCase().includes(searchLower) ||
      app.specialty?.toLowerCase().includes(searchLower) ||
      app.licenseNumber?.toLowerCase().includes(searchLower)
    );
  });

  // Sorting
  const { sortedData, sortConfig, handleSort } = useTableSort(filteredApplications, {
    key: 'submittedAt',
    direction: 'desc',
  });

  // Pagination
  const { paginatedData, pagination, goToPage, changePageSize, resetPagination } = useTablePagination(sortedData, 10);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [searchTerm, statusFilter]);

  const handleApprove = (application: DoctorApplication) => {
    setActionDialog({ open: true, type: 'approve', application });
    setActionRemarks('');
  };

  const handleReject = (application: DoctorApplication) => {
    setActionDialog({ open: true, type: 'reject', application });
    setActionRemarks('');
  };

  const handleConfirmAction = async () => {
    if (!actionDialog.application) return;

    const apiId = actionDialog.application.applicationId;

    if (actionDialog.type === 'approve') {
      await approveApplication.mutateAsync({
        applicationId: apiId,
        remarks: actionRemarks,
      });
    } else {
      await rejectApplication.mutateAsync({
        applicationId: apiId,
        remarks: actionRemarks,
      });
    }

    setActionDialog({ open: false, type: 'approve', application: null });
    setActionRemarks('');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Doctor Applications
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage online doctor registration applications from external portal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* API Status Indicator */}
          {error ? (
            <Badge variant="destructive" className="gap-1">
              <CloudOff className="h-3 w-3" />
              Disconnected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-primary border-primary/50">
              <Cloud className="h-3 w-3" />
              Connected
            </Badge>
          )}
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={refresh}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Applications</AlertTitle>
          <AlertDescription>
            {(error as Error).message}
            <br />
            <span className="text-sm mt-2 block">
              Make sure the API is configured correctly in Administration → API Configuration and linked to "doctor-applications" module.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Sync Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Real-Time Data</AlertTitle>
        <AlertDescription className="text-sm">
          Data is fetched <strong>directly</strong> from the external API on each request. 
          {dataUpdatedAt && (
            <span className="text-muted-foreground ml-1">
              Last fetched: {format(new Date(dataUpdatedAt), 'HH:mm:ss')}
            </span>
          )}
          <br />
          Click "Refresh" to get the latest data from the external portal.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Reference No, Name, Email, Specialty, or License..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Applications 
            {!error && (
              <Badge variant="secondary">{filteredApplications.length}</Badge>
            )}
            {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Online doctor registration applications from the external portal. Click column headers to sort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!error && sortedData.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        sortKey="referenceNumber"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Reference No
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="fullName"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Name
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="specialty"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Specialty
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="mobile"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Mobile
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="email"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Email
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="submittedAt"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Submitted Date
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="currentStep"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                        className="text-right"
                      >
                        Step
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="status"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Status
                      </SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((app) => (
                      <TableRow key={app.applicationId}>
                        <TableCell className="font-medium">{app.referenceNumber || app.applicationId}</TableCell>
                        <TableCell>{app.fullName || '—'}</TableCell>
                        <TableCell>{app.specialty || '—'}</TableCell>
                        <TableCell>{app.mobileFormatted || app.mobile || '—'}</TableCell>
                        <TableCell>{app.email || '—'}</TableCell>
                        <TableCell>
                          {app.submittedAt ? format(new Date(app.submittedAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right">{app.currentStep ?? '—'}</TableCell>
                        <TableCell>{getStatusBadge(app.status, app.statusDisplay)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                navigate(`/online-applications/doctor/${encodeURIComponent(app.applicationId)}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            {canApprove && app.status?.toLowerCase() === 'submitted' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="gap-1 text-primary hover:text-primary/80"
                                  onClick={() => handleApprove(app)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Approve
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="gap-1 text-destructive hover:text-destructive"
                                  onClick={() => handleReject(app)}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                pagination={pagination}
                onPageChange={goToPage}
                onPageSizeChange={changePageSize}
              />
            </>
          ) : !error ? (
            <div className="text-center py-12 text-muted-foreground">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications found</p>
              <p className="text-sm mt-1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No doctor applications have been submitted yet'}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Approve/Reject Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onOpenChange={(open) => !open && setActionDialog({ open: false, type: 'approve', application: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {actionDialog.type === 'approve' ? 'Approve' : 'Reject'} Application
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' 
                ? 'This will approve the doctor application and notify the applicant.'
                : 'This will reject the application. Please provide a reason.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Reference No: {actionDialog.application?.referenceNumber || actionDialog.application?.applicationId}</p>
              <p className="text-sm text-muted-foreground">
                {actionDialog.application?.fullName || '—'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="remarks">
                Remarks {actionDialog.type === 'reject' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="remarks"
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder={actionDialog.type === 'approve' 
                  ? 'Optional remarks for the approval...'
                  : 'Please provide a reason for rejection...'}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ open: false, type: 'approve', application: null })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={
                (approveApplication.isPending || rejectApplication.isPending) ||
                (actionDialog.type === 'reject' && !actionRemarks.trim())
              }
            >
              {(approveApplication.isPending || rejectApplication.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {actionDialog.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
