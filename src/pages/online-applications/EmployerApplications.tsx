import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Briefcase, Filter, RefreshCw, Eye, AlertTriangle, Info, Loader2, Cloud, CloudOff, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  useEmployerApplications,
  EmployerApplicationApiParams,
  EMPLOYER_APP_DEFAULT_PARAMS,
  EMPLOYER_STATUS_OPTIONS,
  EMPLOYER_SORT_BY_OPTIONS,
  EMPLOYER_SORT_ORDER_OPTIONS,
} from '@/hooks/useEmployerApplications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useApplicationWorkflowStatus, getApplicationWorkflowStatus } from '@/hooks/useApplicationWorkflowStatus';
import { WorkflowStatusCell } from '@/components/online-applications/WorkflowStatusCell';
import { toast } from 'sonner';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function EmployerApplications() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  // API-driven filter state
  const [apiParams, setApiParams] = useState<EmployerApplicationApiParams>({ ...EMPLOYER_APP_DEFAULT_PARAMS });

  // Draft filter state (applied on "Apply Filters")
  const [draft, setDraft] = useState<EmployerApplicationApiParams>({ ...EMPLOYER_APP_DEFAULT_PARAMS });

  // Fetch applications with current API params
  const {
    data: result,
    isLoading,
    error,
    isFetching,
    refresh,
    dataUpdatedAt,
  } = useEmployerApplications(apiParams);

  const applications = result?.applications || [];
  const totalRecords = result?.total || 0;
  const totalPages = result?.totalPages || 1;

  // Get reference numbers for workflow status lookup
  const referenceNumbers = useMemo(() =>
    applications.map(app => app.referenceNumber || app.applicationId).filter((ref): ref is string => !!ref),
    [applications]
  );

  const {
    data: workflowStatusMap,
    isLoading: isLoadingWorkflowStatus,
  } = useApplicationWorkflowStatus(referenceNumbers, 'employer', !isLoading && !error);

  // Draft change handler
  const updateDraft = useCallback((key: keyof EmployerApplicationApiParams, value: string | number) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  // Validate and apply filters
  const applyFilters = useCallback(() => {
    // Validate date range
    if (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo) {
      toast.error('Invalid date range', { description: '"Date From" cannot be after "Date To".' });
      return;
    }
    // Ensure limit is within bounds
    const limit = Math.max(1, Math.min(Number(draft.limit) || 20, 100));
    setApiParams({ ...draft, page: 1, limit });
  }, [draft]);

  // Reset to defaults
  const resetFilters = useCallback(() => {
    const defaults = { ...EMPLOYER_APP_DEFAULT_PARAMS };
    setDraft(defaults);
    setApiParams(defaults);
  }, []);

  // Pagination handlers (preserve current filter state)
  const goToPage = useCallback((page: number) => {
    setApiParams(prev => ({ ...prev, page }));
    setDraft(prev => ({ ...prev, page }));
  }, []);

  const changePageSize = useCallback((limit: number) => {
    const clampedLimit = Math.max(1, Math.min(limit, 100));
    setApiParams(prev => ({ ...prev, limit: clampedLimit, page: 1 }));
    setDraft(prev => ({ ...prev, limit: clampedLimit, page: 1 }));
  }, []);

  // Sort handler (API-driven)
  const handleSortChange = useCallback((sortBy: string) => {
    setApiParams(prev => {
      const newOrder = prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc';
      return { ...prev, sortBy, sortOrder: newOrder, page: 1 };
    });
    setDraft(prev => {
      const newOrder = prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc';
      return { ...prev, sortBy, sortOrder: newOrder, page: 1 };
    });
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const currentPage = apiParams.page;

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
        </AlertDescription>
      </Alert>

      {/* Filter Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Status, Email, Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={draft.status} onValueChange={(v) => updateDraft('status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYER_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                placeholder="Search by email (partial match)..."
                value={draft.email || ''}
                onChange={(e) => updateDraft('email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Search</Label>
              <Input
                placeholder="Search email, contact name, ID..."
                value={draft.search || ''}
                onChange={(e) => updateDraft('search', e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Date Range, Sort By, Sort Order */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date From</Label>
              <Input
                type="date"
                value={draft.dateFrom || ''}
                onChange={(e) => updateDraft('dateFrom', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date To</Label>
              <Input
                type="date"
                value={draft.dateTo || ''}
                onChange={(e) => updateDraft('dateTo', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sort By</Label>
              <Select value={draft.sortBy} onValueChange={(v) => updateDraft('sortBy', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYER_SORT_BY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sort Order</Label>
              <Select value={draft.sortOrder} onValueChange={(v) => updateDraft('sortOrder', v as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYER_SORT_ORDER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Page size + action buttons */}
          <div className="flex flex-wrap items-end justify-between gap-4 pt-2 border-t">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Results per page</Label>
              <Select value={String(draft.limit)} onValueChange={(v) => updateDraft('limit', Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={resetFilters}>
                <X className="h-4 w-4" />
                Reset
              </Button>
              <Button size="sm" className="gap-1.5" onClick={applyFilters} disabled={isFetching}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                Apply Filters
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
              <Badge variant="secondary">{totalRecords}</Badge>
            )}
            {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Page {currentPage} of {totalPages} · Sorted by {EMPLOYER_SORT_BY_OPTIONS.find(o => o.value === apiParams.sortBy)?.label || apiParams.sortBy} ({apiParams.sortOrder})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!error && applications.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-accent/50"
                        onClick={() => handleSortChange('created_at')}
                      >
                        Reference No {apiParams.sortBy === 'created_at' ? (apiParams.sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </TableHead>
                      <TableHead>Contact Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-accent/50"
                        onClick={() => handleSortChange('email')}
                      >
                        Email {apiParams.sortBy === 'email' ? (apiParams.sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-accent/50"
                        onClick={() => handleSortChange('submitted_at')}
                      >
                        Submitted Date {apiParams.sortBy === 'submitted_at' ? (apiParams.sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-accent/50"
                        onClick={() => handleSortChange('status')}
                      >
                        Status {apiParams.sortBy === 'status' ? (apiParams.sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
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

              {/* API-Driven Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t mt-4 gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * apiParams.limit) + 1}–{Math.min(currentPage * apiParams.limit, totalRecords)} of {totalRecords} results
                </p>

                <div className="flex items-center gap-2">
                  {/* Results per page */}
                  <div className="flex items-center gap-1.5 mr-4">
                    <span className="text-sm text-muted-foreground">Rows:</span>
                    <Select value={String(apiParams.limit)} onValueChange={(v) => changePageSize(Number(v))}>
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Navigation */}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1 || isFetching} onClick={() => goToPage(1)}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1 || isFetching} onClick={() => goToPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page number buttons */}
                  {(() => {
                    const pages: number[] = [];
                    const maxVisible = 5;
                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                    for (let i = start; i <= end; i++) pages.push(i);
                    return pages.map(p => (
                      <Button
                        key={p}
                        variant={p === currentPage ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        disabled={isFetching}
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </Button>
                    ));
                  })()}

                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages || isFetching} onClick={() => goToPage(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages || isFetching} onClick={() => goToPage(totalPages)}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-muted-foreground ml-2">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </>
          ) : !error ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications found</p>
              <p className="text-sm mt-1">
                Try adjusting your filters or click Reset to return to defaults
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
