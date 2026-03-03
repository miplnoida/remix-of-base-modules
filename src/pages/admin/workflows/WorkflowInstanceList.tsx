import React, { useState } from 'react';
import { formatAuditDateTime } from '@/lib/dateFormat';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Search, 
  Filter, 
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useWorkflowInstances, 
  useWorkflowNames,
  useWorkflowStatusOptions,
  WorkflowInstanceFilters 
} from '@/hooks/useWorkflowInstances';

const WorkflowInstanceList: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<WorkflowInstanceFilters>({});
  
  const { data, isLoading } = useWorkflowInstances(filters, page, 25);
  const { data: workflowNames } = useWorkflowNames();
  const statusOptions = useWorkflowStatusOptions();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
      case 'InProgress':
        return <Badge variant="outline" className="bg-info/10 text-info border-info/30">In Progress</Badge>;
      case 'Completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Completed</Badge>;
      case 'Approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      case 'Query':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Query</Badge>;
      case 'Cancelled':
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export clicked');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflow Instances</h1>
            <p className="text-muted-foreground">
              View and manage all workflow instances in the system
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by workflow name, application..."
                  className="pl-9"
                  value={filters.search || ''}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <Select
              value={filters.workflowId || '__all__'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, workflowId: value === '__all__' ? undefined : value }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Workflows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Workflows</SelectItem>
                {workflowNames?.map((wf) => (
                  <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || '__all__'}
              onValueChange={(value) => {
                setFilters(prev => ({ ...prev, status: value === '__all__' ? undefined : value }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From Date"
              className="w-[150px]"
              value={filters.dateFrom || ''}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }));
                setPage(1);
              }}
            />
            <Input
              type="date"
              placeholder="To Date"
              className="w-[150px]"
              value={filters.dateTo || ''}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }));
                setPage(1);
              }}
            />
            {(filters.search || filters.workflowId || filters.status || filters.dateFrom || filters.dateTo) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setFilters({});
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instances Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Instances</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${data?.total || 0} total workflow instance(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.instances.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow Name</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Initiator</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.instances.map((instance) => (
                    <TableRow 
                      key={instance.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/workflow-instances/${instance.id}`)}
                    >
                      <TableCell className="font-medium">{instance.workflow_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {instance.source_record_name || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {instance.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        {instance.current_step_name ? (
                          <Badge variant="secondary">{instance.current_step_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(instance.status)}</TableCell>
                      <TableCell>{instance.started_by_name || 'System'}</TableCell>
                      <TableCell>
                        {formatAuditDateTime(instance.started_at)}
                      </TableCell>
                      <TableCell>
                        {instance.completed_at 
                          ? formatAuditDateTime(instance.completed_at)
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/workflow-instances/${instance.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, data.total)} of {data.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No workflow instances found</h3>
              <p className="text-muted-foreground mt-1">
                Workflow instances will appear here when workflows are triggered.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowInstanceList;
