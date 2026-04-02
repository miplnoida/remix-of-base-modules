import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useCardMachineChangeRequestsForApprover, CardMachineChangeRequest } from '@/hooks/useCardMachineChangeRequests';
import { useWorkflowActions, useExecuteWorkflowAction } from '@/hooks/useWorkflowActions';
import { formatDateForDisplay } from '@/lib/format-config';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrency } from '@/utils/formatCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const ALL_STATUSES = ['Pending', 'InProgress', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' => {
  switch (status) {
    case 'Pending': return 'warning';
    case 'InProgress': return 'default';
    case 'Approved': return 'success';
    case 'Rejected': return 'destructive';
    case 'Completed': return 'secondary';
    case 'Cancelled': return 'outline';
    default: return 'secondary';
  }
};

function RequestDetailModal({
  request,
  open,
  onOpenChange,
}: {
  request: CardMachineChangeRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const workflowCtx = useWorkflowActions(
    'batch_card_machine_change',
    request?.id || null
  );

  // Fetch card machine names
  const machineIds = [request?.current_card_machine_id, request?.requested_card_machine_id].filter(Boolean) as string[];
  const { data: machines } = useQuery({
    queryKey: ['card-machines-for-detail', machineIds],
    enabled: machineIds.length > 0 && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('cn_card_machine')
        .select('id, machine_code, machine_name')
        .in('id', machineIds);
      return data || [];
    },
  });

  // Fetch workflow logs
  const { data: logs } = useQuery({
    queryKey: ['workflow-logs-for-request', request?.workflow_instance_id],
    enabled: !!request?.workflow_instance_id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_logs')
        .select('*')
        .eq('instance_id', request!.workflow_instance_id!)
        .order('created_at', { ascending: true });
      return data || [];
    },
  });

  const getMachineName = (id: string | null) => {
    if (!id) return '—';
    const m = machines?.find(m => m.id === id);
    return m ? `${m.machine_code} — ${m.machine_name}` : id;
  };

  const [remarks, setRemarks] = useState('');
  const { userCode } = useUserCode();
  const executeAction = useExecuteWorkflowAction();
  const queryClient = useQueryClient();

  const handleWorkflowAction = async (actionId: string) => {
    if (!workflowCtx.taskId || !workflowCtx.instanceId || !request) return;
    try {
      await executeAction.mutateAsync({
        taskId: workflowCtx.taskId,
        actionId,
        comments: remarks || undefined,
        sourceModule: 'batch_card_machine_change',
        sourceRecordId: request.id,
      });
      toast.success('Workflow action completed successfully');
      setRemarks('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['card-machine-change-requests-approver'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-logs-for-request'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-actions'] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to execute workflow action');
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Change Request Details
            <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Batch Number</Label>
              <p className="font-mono">{request.batch_number}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Payment ID / Seq</Label>
              <p className="font-mono">{request.payment_id} / {request.payment_sequence_no}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Current Card Machine</Label>
              <p>{getMachineName(request.current_card_machine_id)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Requested Card Machine</Label>
              <p>{getMachineName(request.requested_card_machine_id)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Requested By</Label>
              <p>{request.requested_by}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Requested At</Label>
              <p>{formatDateForDisplay(request.requested_at)}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Reason for Change</Label>
            <p className="text-sm bg-muted/50 p-2 rounded mt-1">{request.comment}</p>
          </div>

          {request.skip_comment && (
            <div>
              <Label className="text-xs text-muted-foreground">Skip Reason</Label>
              <p className="text-sm bg-accent/20 p-2 rounded mt-1">{request.skip_comment}</p>
            </div>
          )}

          {/* Workflow Actions — rendered for approvers */}
          {workflowCtx.hasWorkflow && workflowCtx.canPerformActions && workflowCtx.actions.length > 0 && (
            <div className="border-t pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Workflow Actions</Label>
              <div className="space-y-2">
                {workflowCtx.actions.some(a => a.remarks_required) && (
                  <Textarea
                    placeholder="Enter remarks..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="min-h-[60px]"
                  />
                )}
                <div className="flex gap-2">
                  {workflowCtx.actions.map(action => (
                    <Button
                      key={action.id}
                      variant={action.action_type === 'Reject' ? 'destructive' : 'default'}
                      size="sm"
                      disabled={actionLoading || (action.remarks_required && !remarks.trim())}
                      onClick={() => handleWorkflowAction(action.id, action.action_type)}
                    >
                      {action.action_name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Workflow History */}
          {logs && logs.length > 0 && (
            <div className="border-t pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Workflow History</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs border-b pb-1">
                    <Badge variant="outline" className="text-[10px] shrink-0">{log.action}</Badge>
                    <div className="flex-1">
                      <span className="font-medium">{log.user_name}</span>
                      {log.comments && <span className="text-muted-foreground ml-1">— {log.comments}</span>}
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CardMachineChangeRequests: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CardMachineChangeRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filters = {
    status: statusFilter === 'all' ? undefined : [statusFilter],
    cashier: cashierFilter || undefined,
    batchNumber: batchFilter || undefined,
  };

  const { data: requests, isLoading } = useCardMachineChangeRequestsForApprover(filters);

  return (
    <PermissionWrapper moduleName="batch_detail_change_requests">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Card Machine Change Requests</h1>
          <p className="text-muted-foreground text-sm">Review and manage card machine change requests from batch closing</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ALL_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs">Cashier</Label>
                <Input
                  placeholder="Filter by cashier..."
                  value={cashierFilter}
                  onChange={e => setCashierFilter(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs">Batch Number</Label>
                <Input
                  placeholder="Filter by batch..."
                  value={batchFilter}
                  onChange={e => setBatchFilter(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setCashierFilter('');
                  setBatchFilter('');
                }}
              >
                <Filter className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Change Requests
              {requests && <Badge variant="secondary">{requests.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !requests || requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No change requests found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs">{req.batch_number}</TableCell>
                      <TableCell className="font-mono text-xs">{req.payment_id}/{req.payment_sequence_no}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(req.status)} className="text-xs">
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{req.requested_by}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateForDisplay(req.requested_at)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{req.comment}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(req);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <RequestDetailModal
          request={selectedRequest}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </div>
    </PermissionWrapper>
  );
};

export default CardMachineChangeRequests;
