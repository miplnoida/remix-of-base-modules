import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, MessageSquare, Plus } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useIAFollowUps, useIAFollowUpMutations, useIADepartments, useIAFindings, useIAActivities, useIAAuditors } from '@/hooks/useAuditData';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { EngagementFilterBanner } from '@/components/audit/EngagementFilterBanner';

export default function FollowUpTracker() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const engagementIdFilter = searchParams.get('engagement_id');

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', departmentId: 'all', dueFrom: '', dueTo: '', assignedTo: 'all' });

  const [viewFollowUp, setViewFollowUp] = useState<any>(null);
  const [statusFollowUp, setStatusFollowUp] = useState<any>(null);
  const [commentFollowUp, setCommentFollowUp] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [nextStatus, setNextStatus] = useState('Open');
  const [commentText, setCommentText] = useState('');
  const [formData, setFormData] = useState({ action_required: '', description: '', due_date: '', finding_id: '', activity_id: '', department_id: '', responsible_party: '', follow_up_type: 'Standard', priority: 'Medium' });
  const resetForm = () => setFormData({ action_required: '', description: '', due_date: '', finding_id: '', activity_id: '', department_id: '', responsible_party: '', follow_up_type: 'Standard', priority: 'Medium' });

  const { data: followUps = [], isLoading } = useIAFollowUps();
  const { data: departments = [] } = useIADepartments();
  const { data: findings = [] } = useIAFindings();
  const { data: activities = [] } = useIAActivities();
  const { data: auditors = [] } = useIAAuditors();
  const { create, update } = useIAFollowUpMutations();

  const departmentMap = useMemo(() => new Map((departments || []).map((d: any) => [d.id, d.name])), [departments]);
  const getAuditorName = (id: string) => auditors.find((a: any) => a.id === id)?.name || id || '-';

  const isOverdue = (item: any) => {
    if (!item?.due_date || item?.status === 'Resolved') return false;
    return new Date(item.due_date) < new Date();
  };

  const normalizedSearch = searchTerm.toLowerCase();

  const filteredFollowUps = (followUps || []).filter((item: any) => {
    const description = item.description || item.action_required || '';
    const responsible = item.responsible_party || item.responsible_person || '-';
    const dueDate = item.due_date ? new Date(item.due_date) : null;

    const matchesSearch = description.toLowerCase().includes(normalizedSearch) || responsible.toLowerCase().includes(normalizedSearch) || (item.id || '').toLowerCase().includes(normalizedSearch);
    const matchesStatus = filters.status === 'all' || (filters.status === 'Overdue' ? isOverdue(item) : (item.status || '') === filters.status);
    const matchesDepartment = filters.departmentId === 'all' || `${item.department_id || ''}` === filters.departmentId;
    const matchesAssignee = filters.assignedTo === 'all' || (item.responsible_party || item.responsible_person) === filters.assignedTo;

    const from = filters.dueFrom ? new Date(filters.dueFrom) : null;
    const to = filters.dueTo ? new Date(filters.dueTo) : null;
    const matchesDateFrom = !from || !dueDate || dueDate >= from;
    const matchesDateTo = !to || !dueDate || dueDate <= to;

    return matchesSearch && matchesStatus && matchesDepartment && matchesAssignee && matchesDateFrom && matchesDateTo;
  });

  const handleCreate = () => {
    if (!formData.action_required || !formData.due_date) {
      toast({ title: 'Validation Error', description: 'Action Required and Due Date are required', variant: 'destructive' });
      return;
    }
    if (!formData.finding_id) {
      toast({ title: 'Validation Error', description: 'A Finding must be selected. Follow-ups must be linked to a finding.', variant: 'destructive' });
      return;
    }
    create.mutate({
      ...formData,
      status: 'Open',
      finding_id: formData.finding_id || null,
      activity_id: formData.activity_id || null,
      department_id: formData.department_id || null,
      department_name: formData.department_id ? departmentMap.get(formData.department_id) || '' : '',
    }, { onSuccess: () => { setIsCreateOpen(false); resetForm(); } });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Follow-up ID', render: (row) => <span className="font-medium text-xs font-mono">{(row.id || '').slice(0, 8)}</span> },
    { key: 'source', header: 'Source', render: (row) => row.follow_up_type || row.source_type || (row.finding_id ? 'Finding' : row.activity_id ? 'Activity' : '-') },
    { key: 'department', header: 'Department', render: (row) => row.department_name || departmentMap.get(row.department_id) || '-' },
    { key: 'description', header: 'Description', render: (row) => { const v = row.description || row.action_required || '-'; return <span className="block max-w-xs truncate">{v}</span>; } },
    { key: 'due_date', header: 'Due Date', render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={isOverdue(row) ? 'Overdue' : row.status || 'Open'} /> },
    { key: 'responsible', header: 'Responsible', render: (row) => getAuditorName(row.responsible_party || row.responsible_person) },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Open', label: 'Open' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Resolved', label: 'Resolved' }, { value: 'Overdue', label: 'Overdue' }] },
    { key: 'departmentId', label: 'Department', type: 'select', options: [{ value: 'all', label: 'All Departments' }, ...(departments || []).map((d: any) => ({ value: d.id, label: d.name }))] },
    { key: 'dueFrom', label: 'Due From', type: 'date' },
    { key: 'dueTo', label: 'Due To', type: 'date' },
  ];

  return (
    <PageShell
      title="Follow-up Tracker"
      subtitle="Track follow-up actions from findings and activities"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Follow-up Tracker' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => { resetForm(); setIsCreateOpen(true); }}><Plus className="w-4 h-4 mr-2" />New Follow-Up</Button>}
    >
      <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search follow-ups..." filters={filterFields} filterValues={filters} onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ status: 'all', departmentId: 'all', dueFrom: '', dueTo: '', assignedTo: 'all' })} />

      <Card><CardContent className="pt-6">
        <DataTable columns={columns} data={filteredFollowUps} emptyMessage="No follow-up records found" rowClassName={(row) => (isOverdue(row) ? 'bg-muted/40' : '')} onView={(row) => setViewFollowUp(row)}
          renderActions={(row) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => { setStatusFollowUp(row); setNextStatus(row.status || 'Open'); }}><Edit3 className="w-4 h-4 mr-1" />Status</Button>
              <Button size="sm" variant="outline" onClick={() => { setCommentFollowUp(row); setCommentText(''); }}><MessageSquare className="w-4 h-4 mr-1" />Comment</Button>
            </div>
          )}
        />
      </CardContent></Card>

      {/* Create Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create Follow-Up" mode="create" onSave={handleCreate} saveLabel="Create Follow-Up" isSaving={create.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Action Required *</Label><Textarea value={formData.action_required} onChange={e => setFormData({...formData, action_required: e.target.value})} placeholder="What action is required?" rows={3} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Additional details..." rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Due Date *</Label><Input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
            <div className="space-y-2"><Label>Priority</Label>
              <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Finding * (Required)</Label>
              <Select value={formData.finding_id} onValueChange={v => setFormData({...formData, finding_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select finding" /></SelectTrigger>
                <SelectContent>{findings.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Department</Label>
              <Select value={formData.department_id} onValueChange={v => setFormData({...formData, department_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Responsible Party</Label>
              <Select value={formData.responsible_party} onValueChange={v => setFormData({...formData, responsible_party: v})}>
                <SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger>
                <SelectContent>{auditors.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Follow-Up Type</Label>
              <Select value={formData.follow_up_type} onValueChange={v => setFormData({...formData, follow_up_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Standard">Standard</SelectItem><SelectItem value="SPOT_CHECK">Spot Check</SelectItem><SelectItem value="Verification">Verification</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </EntityModal>

      {/* View Modal */}
      <EntityModal open={!!viewFollowUp} onOpenChange={() => setViewFollowUp(null)} title="Follow-up Details" mode="view">
        {viewFollowUp && (
          <div className="space-y-3">
            <div><Label className="text-muted-foreground">Follow-up ID</Label><p className="font-medium">{(viewFollowUp.id || '').slice(0, 8)}</p></div>
            <div><Label className="text-muted-foreground">Source</Label><p>{viewFollowUp.follow_up_type || viewFollowUp.source_type || (viewFollowUp.finding_id ? 'Finding' : viewFollowUp.activity_id ? 'Activity' : '-')}</p></div>
            <div><Label className="text-muted-foreground">Finding</Label><p>{findings.find((f: any) => f.id === viewFollowUp.finding_id)?.title || '-'}</p></div>
            <div><Label className="text-muted-foreground">Department</Label><p>{viewFollowUp.department_name || departmentMap.get(viewFollowUp.department_id) || '-'}</p></div>
            <div><Label className="text-muted-foreground">Action Required</Label><p>{viewFollowUp.action_required || '-'}</p></div>
            <div><Label className="text-muted-foreground">Description</Label><p>{viewFollowUp.description || '-'}</p></div>
            <div><Label className="text-muted-foreground">Due Date</Label><p>{viewFollowUp.due_date ? new Date(viewFollowUp.due_date).toLocaleDateString() : '-'}</p></div>
            <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={isOverdue(viewFollowUp) ? 'Overdue' : viewFollowUp.status || 'Open'} /></div></div>
            <div><Label className="text-muted-foreground">Responsible</Label><p>{getAuditorName(viewFollowUp.responsible_party || viewFollowUp.responsible_person)}</p></div>
            <div><Label className="text-muted-foreground">Priority</Label><p>{viewFollowUp.priority || '-'}</p></div>
          </div>
        )}
      </EntityModal>

      {/* Status Update Modal */}
      <EntityModal open={!!statusFollowUp} onOpenChange={() => setStatusFollowUp(null)} title="Update Follow-up Status" mode="edit" saveLabel="Save" onSave={() => {
        if (!statusFollowUp) return;
        update.mutate({ id: statusFollowUp.id, status: nextStatus, resolved_date: nextStatus === 'Resolved' ? new Date().toISOString() : null });
        setStatusFollowUp(null);
      }} isSaving={update.isPending}>
        {statusFollowUp && (
          <div className="space-y-3">
            <div><Label className="text-muted-foreground">Follow-up</Label><p className="font-medium">{(statusFollowUp.id || '').slice(0, 8)}</p></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Resolved">Resolved</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        )}
      </EntityModal>

      {/* Comment Modal */}
      <EntityModal open={!!commentFollowUp} onOpenChange={() => setCommentFollowUp(null)} title="Add Comment" mode="edit" saveLabel="Save Comment" onSave={() => {
        if (commentFollowUp && commentText) {
          update.mutate({ id: commentFollowUp.id, resolution: commentText });
        }
        toast({ title: 'Comment recorded' });
        setCommentFollowUp(null);
        setCommentText('');
      }}>
        {commentFollowUp && (
          <div className="space-y-3">
            <div><Label className="text-muted-foreground">Follow-up</Label><p className="font-medium">{(commentFollowUp.id || '').slice(0, 8)}</p></div>
            <div className="space-y-2"><Label>Comment</Label><Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Enter comment..." /></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
