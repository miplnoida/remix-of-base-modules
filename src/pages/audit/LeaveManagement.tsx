import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, XCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useIALeaveRequests, useIALeaveRequestMutations, useIAAuditors } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, FilterBar, DataTable, EntityModal, StatusBadge, ConfirmDialog } from '@/components/common';
import type { DataTableColumn } from '@/components/common';

export default function LeaveAndVacationManagement() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const { data: leaveRequests = [], isLoading } = useIALeaveRequests();
  const { data: auditors = [] } = useIAAuditors();
  const { create, updateStatus } = useIALeaveRequestMutations();
  const [formData, setFormData] = useState({ auditor_id: '', leave_type: '', start_date: '', end_date: '', reason: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);

  const filteredLeaves = leaveRequests.filter((leave: any) =>
    filters.status === 'all' || leave.status === filters.status
  );

  const handleSubmit = () => {
    if (!formData.auditor_id || !formData.leave_type || !formData.start_date || !formData.end_date) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    create.mutate({ ...formData, status: 'Submitted' }, {
      onSuccess: () => { setIsDialogOpen(false); setFormData({ auditor_id: '', leave_type: '', start_date: '', end_date: '', reason: '' }); }
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'auditor_id', header: 'Auditor', render: (row) => auditors.find((a: any) => a.id === row.auditor_id)?.name || row.auditor_id },
    { key: 'leave_type', header: 'Type', render: (row) => <StatusBadge status={row.leave_type} /> },
    { key: 'start_date', header: 'Start Date', render: (row) => new Date(row.start_date).toLocaleDateString() },
    { key: 'end_date', header: 'End Date', render: (row) => new Date(row.end_date).toLocaleDateString() },
    { key: 'duration', header: 'Duration', render: (row) => { const d = Math.ceil((new Date(row.end_date).getTime() - new Date(row.start_date).getTime()) / (1000*60*60*24)) + 1; return `${d} day${d > 1 ? 's' : ''}`; }},
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PageShell
      title="Leave and Vacation Management"
      subtitle="Manage leave requests, vacation approvals, and time off"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Leave Management' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Leave Request</Button>}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{leaveRequests.filter((l: any) => l.status === 'Submitted').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Approved</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{leaveRequests.filter((l: any) => l.status === 'Approved').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Rejected</CardTitle><XCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{leaveRequests.filter((l: any) => l.status === 'Rejected').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><CalendarIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{leaveRequests.length}</div></CardContent></Card>
      </div>

      <FilterBar
        filters={[{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'Submitted', label: 'Pending' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }] }]}
        values={filters}
        onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ status: 'all' })}
      />

      <DataTable
        columns={columns}
        data={filteredLeaves}
        renderActions={(row) => row.status === 'Submitted' ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => setConfirmAction({ id: row.id, action: 'Approved' })}><CheckCircle className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmAction({ id: row.id, action: 'Rejected' })}><XCircle className="h-4 w-4" /></Button>
          </div>
        ) : undefined}
        emptyMessage="No leave requests found."
      />

      {/* Create Modal */}
      <EntityModal open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Submit Leave Request" mode="create" onSave={handleSubmit} isSaving={create.isPending} saveLabel="Submit Request">
        <div className="space-y-4">
          <div><Label>Auditor</Label><Select value={formData.auditor_id} onValueChange={v => setFormData({ ...formData, auditor_id: v })}><SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger><SelectContent>{auditors.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Leave Type</Label><Select value={formData.leave_type} onValueChange={v => setFormData({ ...formData, leave_type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="Annual">Annual</SelectItem><SelectItem value="Sick">Sick</SelectItem><SelectItem value="Training">Training</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} /></div>
          </div>
          <div><Label>Reason</Label><Textarea placeholder="Provide reason for leave..." rows={3} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} /></div>
        </div>
      </EntityModal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.action === 'Approved' ? 'Approve Leave' : 'Reject Leave'}
        description={`Are you sure you want to ${confirmAction?.action === 'Approved' ? 'approve' : 'reject'} this leave request?`}
        onConfirm={() => { if (confirmAction) { updateStatus.mutate({ id: confirmAction.id, status: confirmAction.action }); setConfirmAction(null); } }}
        variant={confirmAction?.action === 'Rejected' ? 'destructive' : 'default'}
      />
    </PageShell>
  );
}
