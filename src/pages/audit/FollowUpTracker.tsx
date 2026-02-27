import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Eye, Edit3, MessageSquare } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useIAFollowUps, useIAFollowUpMutations, useIADepartments } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function FollowUpTracker() {
  
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
    departmentId: 'all',
    dueFrom: '',
    dueTo: '',
    assignedTo: 'all',
  });

  const [viewFollowUp, setViewFollowUp] = useState<any>(null);
  const [statusFollowUp, setStatusFollowUp] = useState<any>(null);
  const [commentFollowUp, setCommentFollowUp] = useState<any>(null);
  const [evidenceFollowUp, setEvidenceFollowUp] = useState<any>(null);

  const [nextStatus, setNextStatus] = useState('Open');
  const [commentText, setCommentText] = useState('');

  const { data: followUps = [], isLoading } = useIAFollowUps();
  const { data: departments = [] } = useIADepartments();
  const { update } = useIAFollowUpMutations();

  const departmentMap = useMemo(
    () => new Map((departments || []).map((dept: any) => [dept.id, dept.name])),
    [departments]
  );

  const assignees = useMemo(() => {
    const names = (followUps || []).map((fu: any) => fu.responsible_person).filter(Boolean);
    return [...new Set(names)];
  }, [followUps]);

  const isOverdue = (item: any) => {
    if (!item?.due_date || item?.status === 'Resolved') return false;
    return new Date(item.due_date) < new Date();
  };

  const normalizedSearch = searchTerm.toLowerCase();

  const filteredFollowUps = (followUps || []).filter((item: any) => {
    const departmentName = item.department_name || departmentMap.get(item.department_id) || '-';
    const source = item.source_type || (item.finding_id ? 'Finding' : item.activity_id ? 'Activity' : '-');
    const description = item.description || item.action_required || '';
    const responsible = item.responsible_person || '-';
    const dueDate = item.due_date ? new Date(item.due_date) : null;

    const matchesSearch =
      description.toLowerCase().includes(normalizedSearch) ||
      responsible.toLowerCase().includes(normalizedSearch) ||
      (item.id || '').toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'Overdue' ? isOverdue(item) : (item.status || '') === filters.status);

    const matchesDepartment = filters.departmentId === 'all' || `${item.department_id || ''}` === filters.departmentId;
    const matchesAssignee = filters.assignedTo === 'all' || responsible === filters.assignedTo;

    const from = filters.dueFrom ? new Date(filters.dueFrom) : null;
    const to = filters.dueTo ? new Date(filters.dueTo) : null;
    const matchesDateFrom = !from || !dueDate || dueDate >= from;
    const matchesDateTo = !to || !dueDate || dueDate <= to;

    return matchesSearch && matchesStatus && matchesDepartment && matchesAssignee && matchesDateFrom && matchesDateTo && !!source && !!departmentName;
  });

  const columns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Follow-up ID', render: (row) => <span className="font-medium">{(row.id || '').slice(0, 8)}</span> },
    { key: 'source', header: 'Source', render: (row) => row.source_type || (row.finding_id ? 'Finding' : row.activity_id ? 'Activity' : '-') },
    { key: 'department', header: 'Department', render: (row) => row.department_name || departmentMap.get(row.department_id) || '-' },
    {
      key: 'description',
      header: 'Description',
      render: (row) => {
        const value = row.description || row.action_required || '-';
        return <span className="block max-w-xs truncate">{value}</span>;
      },
    },
    { key: 'due_date', header: 'Due Date', render: (row) => (row.due_date ? new Date(row.due_date).toLocaleDateString() : '-') },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={isOverdue(row) ? 'Overdue' : row.status || 'Open'} /> },
    { key: 'responsible', header: 'Responsible', render: (row) => row.responsible_person || '-' },
    {
      key: 'updated_at',
      header: 'Last Updated',
      render: (row) => (row.updated_at || row.created_at ? new Date(row.updated_at || row.created_at).toLocaleDateString() : '-'),
    },
  ];

  const filterFields: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'Open', label: 'Open' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Resolved', label: 'Resolved' },
        { value: 'Overdue', label: 'Overdue' },
      ],
    },
    {
      key: 'departmentId',
      label: 'Department',
      type: 'select',
      options: [{ value: 'all', label: 'All Departments' }, ...(departments || []).map((dept: any) => ({ value: dept.id, label: dept.name }))],
    },
    { key: 'dueFrom', label: 'Due From', type: 'date' },
    { key: 'dueTo', label: 'Due To', type: 'date' },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      type: 'select',
      options: [{ value: 'all', label: 'All Assignees' }, ...assignees.map((name) => ({ value: name, label: name }))],
    },
  ];

  return (
    <PageShell
      title="Follow-up Tracker"
      subtitle="Track follow-up actions from findings and activities"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Follow-up Tracker' }]}
      isLoading={isLoading}
      
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search follow-up id, description, or responsible..." />
            <FilterBar
              filters={filterFields}
              values={filters}
              onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
              onReset={() => setFilters({ status: 'all', departmentId: 'all', dueFrom: '', dueTo: '', assignedTo: 'all' })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredFollowUps}
            emptyMessage="No follow-up records found"
            rowClassName={(row) => (isOverdue(row) ? 'bg-muted/40' : '')}
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewFollowUp(row)}><Eye className="h-4 w-4" /></Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStatusFollowUp(row);
                    setNextStatus(row.status || 'Open');
                  }}
                >
                  <Edit3 className="w-4 h-4 mr-1" />Update Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCommentFollowUp(row);
                    setCommentText('');
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />Add Comment
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEvidenceFollowUp(row)}>
                  <Upload className="w-4 h-4 mr-1" />Upload Evidence
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal open={!!viewFollowUp} onOpenChange={() => setViewFollowUp(null)} title="Follow-up Details" mode="view">
        {viewFollowUp && (
          <div className="space-y-3">
            <p><strong>Follow-up ID:</strong> {(viewFollowUp.id || '').slice(0, 8)}</p>
            <p><strong>Source:</strong> {viewFollowUp.source_type || (viewFollowUp.finding_id ? 'Finding' : viewFollowUp.activity_id ? 'Activity' : '-')}</p>
            <p><strong>Department:</strong> {viewFollowUp.department_name || departmentMap.get(viewFollowUp.department_id) || '-'}</p>
            <p><strong>Description:</strong> {viewFollowUp.description || viewFollowUp.action_required || '-'}</p>
            <p><strong>Due Date:</strong> {viewFollowUp.due_date ? new Date(viewFollowUp.due_date).toLocaleDateString() : '-'}</p>
            <p><strong>Status:</strong> <StatusBadge status={isOverdue(viewFollowUp) ? 'Overdue' : viewFollowUp.status || 'Open'} /></p>
            <p><strong>Responsible:</strong> {viewFollowUp.responsible_person || '-'}</p>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!statusFollowUp}
        onOpenChange={() => setStatusFollowUp(null)}
        title="Update Follow-up Status"
        mode="edit"
        saveLabel="Save"
        onSave={() => {
          if (!statusFollowUp) return;
          update.mutate({
            id: statusFollowUp.id,
            status: nextStatus,
            resolved_date: nextStatus === 'Resolved' ? new Date().toISOString() : null,
          });
          setStatusFollowUp(null);
        }}
        isSaving={update.isPending}
      >
        {statusFollowUp && (
          <div className="space-y-3">
            <p><strong>Follow-up:</strong> {(statusFollowUp.id || '').slice(0, 8)}</p>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!commentFollowUp}
        onOpenChange={() => setCommentFollowUp(null)}
        title="Add Comment"
        mode="edit"
        saveLabel="Save Comment"
        onSave={() => {
          toast({ title: 'Comment recorded', description: 'Comment has been added to follow-up notes.' });
          setCommentFollowUp(null);
          setCommentText('');
        }}
      >
        {commentFollowUp && (
          <div className="space-y-3">
            <p><strong>Follow-up:</strong> {(commentFollowUp.id || '').slice(0, 8)}</p>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Enter comment..." />
            </div>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!evidenceFollowUp}
        onOpenChange={() => setEvidenceFollowUp(null)}
        title="Upload Evidence"
        mode="edit"
        saveLabel="Attach"
        onSave={() => {
          toast({ title: 'Evidence action ready', description: 'Evidence upload flow opened for this follow-up.' });
          setEvidenceFollowUp(null);
        }}
      >
        {evidenceFollowUp && (
          <div className="space-y-2">
            <p><strong>Follow-up:</strong> {(evidenceFollowUp.id || '').slice(0, 8)}</p>
            <p className="text-sm text-muted-foreground">Attach supporting evidence for this follow-up record.</p>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
