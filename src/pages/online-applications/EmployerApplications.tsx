import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Briefcase, Filter, RefreshCw, Eye, AlertTriangle, Info, Loader2, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  useEmployerApplications,
  EmployerApplication,
} from '@/hooks/useEmployerApplications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTableSort } from '@/hooks/useTableSort';
import { useTablePagination } from '@/hooks/useTablePagination';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { TablePagination } from '@/components/shared/TablePagination';
import { useApplicationWorkflowStatus, getApplicationWorkflowStatus } from '@/hooks/useApplicationWorkflowStatus';
import { WorkflowStatusCell } from '@/components/online-applications/WorkflowStatusCell';

export default function EmployerApplications() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [nameFilter, setNameFilter] = useState('');
  const [refFilter, setRefFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Pending');

  // Fetch applications from external API
  const { 
    data: applications, 
    isLoading, 
    error, 
    isFetching,
    refresh,
    dataUpdatedAt 
  } = useEmployerApplications();

  // Get reference numbers for workflow status lookup
  const referenceNumbers = useMemo(() => 
    (applications || []).map(app => app.referenceNumber || app.applicationId).filter((ref): ref is string => !!ref),
    [applications]
  );

  // Fetch workflow statuses for all applications
  const { 
    data: workflowStatusMap, 
    isLoading: isLoadingWorkflowStatus 
  } = useApplicationWorkflowStatus(referenceNumbers, 'employer', !isLoading && !error);

  // Apply filters based on business rules matching IP pattern
  const filteredApplications = useMemo(() => {
    return (applications || []).filter(app => {
      // Determine the effective status: prefer workflow status over raw API status
      const ref = app.referenceNumber || app.applicationId;
      const workflowInfo = workflowStatusMap?.[ref];
      const effectiveStatus = (workflowInfo?.workflowStatus || app.status || '').toLowerCase();

      // Status filter logic (case-insensitive)
      if (statusFilter === 'Pending') {
        const excludedStatuses = ['closed', 'completed', 'approved', 'rejected'];
        if (excludedStatuses.includes(effectiveStatus)) return false;
      } else if (statusFilter === 'Closed') {
        const closedStatuses = ['closed', 'completed', 'approved'];
        if (!closedStatuses.includes(effectiveStatus)) return false;
      } else if (statusFilter === 'Rejected') {
        if (effectiveStatus !== 'rejected') return false;
      }

      // Name filter (partial, case-insensitive)
      if (nameFilter.trim()) {
        const search = nameFilter.trim().toLowerCase();
        const nameMatch = app.contactName?.toLowerCase().includes(search);
        if (!nameMatch) return false;
      }

      // Reference Number filter (partial, case-insensitive)
      if (refFilter.trim()) {
        const search = refFilter.trim().toLowerCase();
        const refMatch = (app.referenceNumber || app.applicationId)?.toLowerCase().includes(search);
        if (!refMatch) return false;
      }

      return true;
    });
  }, [applications, statusFilter, nameFilter, refFilter, workflowStatusMap]);

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
  }, [nameFilter, refFilter, statusFilter]);

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
            <Briefcase className="h-6 w-6 text-primary" />
            Employer Applications
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage online employer registration applications from external portal
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
              Make sure the API is configured correctly in Administration → API Configuration and linked to "employer-applications" module.
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

      {/* Filters — matching IP pattern with separate Name, Ref No, Status */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contact Name</Label>
              <Input
                placeholder="Search by contact name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Reference Number</Label>
              <Input
                placeholder="Search by reference no..."
                value={refFilter}
                onChange={(e) => setRefFilter(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setNameFilter('');
                  setRefFilter('');
                  setStatusFilter('Pending');
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
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
            Online employer registration applications from the external portal. Click column headers to sort.
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
                        sortKey="contactName"
                        currentSortKey={sortConfig.key}
                        direction={sortConfig.direction}
                        onSort={handleSort}
                      >
                        Contact Name
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
                        <TableCell>{app.contactName || '—'}</TableCell>
                        <TableCell>{app.mobileFormatted || app.mobile || '—'}</TableCell>
                        <TableCell>{app.email || '—'}</TableCell>
                        <TableCell>
                          {app.submittedAt ? format(new Date(app.submittedAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <WorkflowStatusCell
                            status={getApplicationWorkflowStatus(workflowStatusMap, app.referenceNumber || app.applicationId)}
                            isLoading={isLoadingWorkflowStatus}
                            fallbackStatus={app.status}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              navigate(`/online-applications/employer/${encodeURIComponent(app.applicationId)}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
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
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications found</p>
              <p className="text-sm mt-1">
                {nameFilter || refFilter || statusFilter !== 'Pending' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No employer applications have been submitted yet'}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
