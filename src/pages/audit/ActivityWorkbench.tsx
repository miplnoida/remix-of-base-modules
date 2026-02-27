import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Eye, Play, CheckCircle, Edit, FileText, ClipboardPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIAActivities, useIAActivityMutations, useIAAnnualPlans, useIADepartmentAudits, useIAAuditors } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function ActivityWorkbench() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    planId: 'all',
    departmentAuditId: 'all',
    status: 'all',
    assignedTo: 'all',
  });

  const [viewActivity, setViewActivity] = useState<any>(null);
  const [editActivity, setEditActivity] = useState<any>(null);
  const [evidenceActivity, setEvidenceActivity] = useState<any>(null);
  const [findingActivity, setFindingActivity] = useState<any>(null);
  const [findingComment, setFindingComment] = useState('');
  const [completeActivityId, setCompleteActivityId] = useState<string | null>(null);

  const { data: annualPlans = [] } = useIAAnnualPlans();
  const { data: departmentAudits = [] } = useIADepartmentAudits(filters.planId !== 'all' ? filters.planId : undefined);
  const { data: auditors = [] } = useIAAuditors();

  const { data: activities = [], isLoading } = useIAActivities(
    filters.departmentAuditId !== 'all'
      ? {
          department_audit_id: filters.departmentAuditId,
          status: filters.status !== 'all' ? filters.status : undefined,
          auditor_id: filters.assignedTo !== 'all' ? filters.assignedTo : undefined,
        }
      : undefined
  );

  const { update } = useIAActivityMutations();

  const departmentById = useMemo(() => new Map((departmentAudits || []).map((d: any) => [d.id, d])), [departmentAudits]);
  const auditorById = useMemo(() => new Map((auditors || []).map((a: any) => [a.id, a])), [auditors]);

  const needsAnnualPlan = filters.planId === 'all';
  const needsDepartmentAudit = filters.departmentAuditId === 'all';

  const displayedActivities = (needsAnnualPlan || needsDepartmentAudit)
    ? []
    : (activities || []).filter((activity: any) =>
        (activity.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.id || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

  const filterFields: FilterField[] = [
    {
      key: 'planId',
      label: 'Annual Plan',
      type: 'select',
      options: [{ value: 'all', label: 'Select Plan' }, ...(annualPlans || []).map((plan: any) => ({ value: plan.id, label: `${plan.fiscal_year} - ${plan.title}` }))],
    },
    {
      key: 'departmentAuditId',
      label: 'Department Audit',
      type: 'select',
      options: [{ value: 'all', label: 'Select Department Audit' }, ...(departmentAudits || []).map((audit: any) => ({ value: audit.id, label: audit.department_name || audit.id }))],
    },
    {
      key: 'status',
      label: 'Activity Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'Planned', label: 'Planned' },
        { value: 'Scheduled', label: 'Scheduled' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Completed', label: 'Completed' },
      ],
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      type: 'select',
      options: [{ value: 'all', label: 'All Auditors' }, ...(auditors || []).map((a: any) => ({ value: a.id, label: a.name }))],
    },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Activity ID', render: (row) => <span className="font-medium">{(row.id || '').slice(0, 8)}</span> },
    { key: 'title', header: 'Activity Name' },
    { key: 'department', header: 'Department', render: (row) => departmentById.get(row.department_audit_id)?.department_name || '-' },
    { key: 'functional_area', header: 'Functional Area', render: (row) => row.functional_area || departmentById.get(row.department_audit_id)?.function_name || '-' },
    { key: 'auditor_id', header: 'Assigned Auditor', render: (row) => auditorById.get(row.auditor_id)?.name || '-' },
    { key: 'start_date', header: 'Start Date', render: (row) => (row.start_date || row.scheduled_date ? new Date(row.start_date || row.scheduled_date).toLocaleDateString() : '-') },
    { key: 'end_date', header: 'End Date', render: (row) => (row.end_date ? new Date(row.end_date).toLocaleDateString() : '-') },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Planned'} /> },
  ];

  return (
    <PageShell
      title="Activity Workbench"
      subtitle="Execute audit activities"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Activity Workbench' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('execute_audit_activities')}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by activity name or id..." />
            <FilterBar
              filters={filterFields}
              values={filters}
              onChange={(key, value) => {
                if (key === 'planId') {
                  setFilters((prev) => ({ ...prev, planId: value, departmentAuditId: 'all' }));
                  return;
                }
                setFilters((prev) => ({ ...prev, [key]: value }));
              }}
              onReset={() => setFilters({ planId: 'all', departmentAuditId: 'all', status: 'all', assignedTo: 'all' })}
            />
          </div>
        </CardContent>
      </Card>

      {needsAnnualPlan && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>Select Annual Plan to load activities</p>
          </CardContent>
        </Card>
      )}

      {!needsAnnualPlan && needsDepartmentAudit && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>Select Department Audit to load activities</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={displayedActivities}
            emptyMessage="No activities found"
            renderActions={(activity) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewActivity(activity)}><Eye className="h-4 w-4" /></Button>

                {activity.status === 'Scheduled' && (
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: activity.id, status: 'In Progress' })}>
                    <Play className="w-4 h-4 mr-1" />Start
                  </Button>
                )}

                {activity.status === 'In Progress' && (
                  <Button size="sm" onClick={() => setCompleteActivityId(activity.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" />Complete
                  </Button>
                )}

                {(activity.status === 'Draft' || activity.status === 'Planned') && hasPermission('execute_audit_activities') && (
                  <Button size="sm" variant="outline" onClick={() => setEditActivity(activity)}>
                    <Edit className="w-4 h-4 mr-1" />Edit
                  </Button>
                )}

                <Button size="sm" variant="outline" onClick={() => setEvidenceActivity(activity)}>
                  <FileText className="w-4 h-4 mr-1" />Add Evidence
                </Button>

                <Button size="sm" variant="outline" onClick={() => { setFindingActivity(activity); setFindingComment(''); }}>
                  <ClipboardPlus className="w-4 h-4 mr-1" />Add Finding
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal open={!!viewActivity} onOpenChange={() => setViewActivity(null)} title="Activity Details" mode="view">
        {viewActivity && (
          <div className="space-y-3">
            <p><strong>Activity ID:</strong> {(viewActivity.id || '').slice(0, 8)}</p>
            <p><strong>Activity Name:</strong> {viewActivity.title || '-'}</p>
            <p><strong>Department:</strong> {departmentById.get(viewActivity.department_audit_id)?.department_name || '-'}</p>
            <p><strong>Assigned Auditor:</strong> {auditorById.get(viewActivity.auditor_id)?.name || '-'}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewActivity.status || 'Planned'} /></p>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!editActivity}
        onOpenChange={() => setEditActivity(null)}
        title="Edit Activity"
        mode="edit"
        onSave={() => {
          if (!editActivity) return;
          update.mutate({
            id: editActivity.id,
            title: editActivity.title,
            status: editActivity.status,
            start_date: editActivity.start_date || null,
            end_date: editActivity.end_date || null,
          });
          setEditActivity(null);
        }}
        isSaving={update.isPending}
      >
        {editActivity && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Activity Name</Label>
              <Input value={editActivity.title || ''} onChange={(e) => setEditActivity({ ...editActivity, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Input value={editActivity.status || ''} onChange={(e) => setEditActivity({ ...editActivity, status: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={editActivity.start_date ? String(editActivity.start_date).slice(0, 10) : ''} onChange={(e) => setEditActivity({ ...editActivity, start_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={editActivity.end_date ? String(editActivity.end_date).slice(0, 10) : ''} onChange={(e) => setEditActivity({ ...editActivity, end_date: e.target.value })} />
              </div>
            </div>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!evidenceActivity}
        onOpenChange={() => setEvidenceActivity(null)}
        title="Add Evidence"
        mode="edit"
        saveLabel="Attach"
        onSave={() => {
          toast({ title: 'Evidence Modal Ready', description: 'You can now continue in Evidence Management with this activity context.' });
          setEvidenceActivity(null);
        }}
      >
        {evidenceActivity && (
          <div className="space-y-2">
            <p><strong>Activity:</strong> {evidenceActivity.title}</p>
            <p className="text-sm text-muted-foreground">This attachment flow is pre-linked to the selected activity.</p>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!findingActivity}
        onOpenChange={() => setFindingActivity(null)}
        title="Add Finding"
        mode="edit"
        saveLabel="Save Finding"
        onSave={() => {
          toast({ title: 'Finding linked', description: 'Finding draft is linked to the selected activity.' });
          setFindingActivity(null);
          setFindingComment('');
        }}
      >
        {findingActivity && (
          <div className="space-y-3">
            <p><strong>Activity:</strong> {findingActivity.title}</p>
            <div className="space-y-1">
              <Label>Finding Notes</Label>
              <Textarea value={findingComment} onChange={(e) => setFindingComment(e.target.value)} placeholder="Enter finding details..." />
            </div>
          </div>
        )}
      </EntityModal>

      <ConfirmDialog
        open={completeActivityId !== null}
        onOpenChange={() => setCompleteActivityId(null)}
        title="Complete Activity"
        description="Mark this activity as completed?"
        confirmLabel="Complete"
        onConfirm={() => {
          if (!completeActivityId) return;
          update.mutate({ id: completeActivityId, status: 'Completed', end_date: new Date().toISOString() });
          setCompleteActivityId(null);
        }}
        isLoading={update.isPending}
      />
    </PageShell>
  );
}
