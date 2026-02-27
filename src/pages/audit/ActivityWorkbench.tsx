import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Save, Play, CheckCircle, Eye, Edit, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAActivities, useIAActivityMutations, useIAAnnualPlans, useIADepartmentAudits } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function ActivityWorkbench() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ planId: 'all', deptAuditId: 'all', status: 'all' });
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [viewActivity, setViewActivity] = useState<any>(null);
  const [startActivityId, setStartActivityId] = useState<string | null>(null);
  const [completeActivityId, setCompleteActivityId] = useState<string | null>(null);
  const [findings, setFindings] = useState({ observations: '', findings: '', complianceStatus: '', monetaryVariance: 0, recommendation: '' });

  const { data: plans = [] } = useIAAnnualPlans();
  const { data: deptAudits = [] } = useIADepartmentAudits(filters.planId !== 'all' ? filters.planId : undefined);
  const { data: activities = [], isLoading } = useIAActivities(
    filters.deptAuditId !== 'all' ? { department_audit_id: filters.deptAuditId, status: filters.status !== 'all' ? filters.status : undefined } :
    filters.status !== 'all' ? { status: filters.status } : undefined
  );
  const { update } = useIAActivityMutations();

  const filteredActivities = activities.filter((a: any) =>
    (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.activity_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const needsPlanSelection = filters.planId === 'all';

  const handleStartActivity = (activity: any) => {
    setSelectedActivity(activity);
    setFindings({
      observations: activity.observations || '', findings: activity.findings_text || '',
      complianceStatus: activity.compliance_status || '', monetaryVariance: activity.monetary_variance || 0,
      recommendation: activity.recommendation || '',
    });
  };

  const handleSaveDraft = () => {
    if (!selectedActivity) return;
    update.mutate({ id: selectedActivity.id, observations: findings.observations, findings_text: findings.findings, compliance_status: findings.complianceStatus, monetary_variance: findings.monetaryVariance, recommendation: findings.recommendation });
  };

  const handleComplete = () => {
    if (!selectedActivity) return;
    if (!findings.complianceStatus || !findings.findings) {
      toast({ title: "Validation Error", description: "Complete all required fields before submitting.", variant: "destructive" });
      return;
    }
    update.mutate({ id: selectedActivity.id, status: 'Completed', observations: findings.observations, findings_text: findings.findings, compliance_status: findings.complianceStatus, monetary_variance: findings.monetaryVariance, recommendation: findings.recommendation }, { onSuccess: () => setSelectedActivity(null) });
  };

  const filterFields: FilterField[] = [
    { key: 'planId', label: 'Annual Plan', type: 'select', options: [{ value: 'all', label: 'All Plans' }, ...plans.map((p: any) => ({ value: p.id, label: `${p.fiscal_year} - ${p.title}` }))] },
    { key: 'deptAuditId', label: 'Dept Audit', type: 'select', options: [{ value: 'all', label: 'All Dept Audits' }, ...deptAudits.map((d: any) => ({ value: d.id, label: d.department_name || d.id }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Planned', label: 'Planned' }, { value: 'Scheduled', label: 'Scheduled' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }] },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Activity', render: (a) => <div><div className="font-medium">{a.title}</div><div className="text-xs text-muted-foreground">{a.activity_type}</div></div> },
    { key: 'scheduled_date', header: 'Date', render: (a) => a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  if (selectedActivity) {
    return (
      <PageShell
        title={selectedActivity.title}
        subtitle="Activity Workbench — Enter findings"
        breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Activity Workbench', href: '/audit/workbench' }, { label: selectedActivity.title }]}
        actions={<Button variant="outline" onClick={() => setSelectedActivity(null)}>← Back to Activities</Button>}
      >
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="findings">
              <TabsList><TabsTrigger value="findings">Findings</TabsTrigger><TabsTrigger value="attachments">Attachments</TabsTrigger></TabsList>
              <TabsContent value="findings" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Compliance Status *</Label>
                    <Select value={findings.complianceStatus} onValueChange={(v) => setFindings({ ...findings, complianceStatus: v })}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compliant">Compliant</SelectItem>
                        <SelectItem value="Partially Compliant">Partially Compliant</SelectItem>
                        <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monetary Variance ($)</Label>
                    <Input type="number" value={findings.monetaryVariance} onChange={(e) => setFindings({ ...findings, monetaryVariance: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2"><Label>Observations</Label><Textarea value={findings.observations} onChange={(e) => setFindings({ ...findings, observations: e.target.value })} placeholder="Enter observations..." className="min-h-[100px]" /></div>
                <div className="space-y-2"><Label>Findings *</Label><Textarea value={findings.findings} onChange={(e) => setFindings({ ...findings, findings: e.target.value })} placeholder="Enter findings..." className="min-h-[100px]" /></div>
                <div className="space-y-2"><Label>Recommendations</Label><Textarea value={findings.recommendation} onChange={(e) => setFindings({ ...findings, recommendation: e.target.value })} placeholder="Enter recommendations..." className="min-h-[100px]" /></div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleSaveDraft}><Save className="w-4 h-4 mr-2" />Save Draft</Button>
                  <Button onClick={handleComplete}><CheckCircle className="w-4 h-4 mr-2" />Complete Activity</Button>
                </div>
              </TabsContent>
              <TabsContent value="attachments" className="pt-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Upload supporting documents</p>
                  <Button variant="outline" className="mt-4"><FileText className="w-4 h-4 mr-2" />Select Files</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Activity Workbench"
      subtitle="Execute audit activities and enter findings"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Activity Workbench' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('execute_audit_activities')}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search activities..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ planId: 'all', deptAuditId: 'all', status: 'all' })} />
          </div>
        </CardContent>
      </Card>

      {needsPlanSelection && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p>Select an Annual Plan to load activities. Showing all activities by default.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Activities ({filteredActivities.length})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredActivities}
            emptyMessage="No activities found"
            renderActions={(activity) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewActivity(activity)}><Eye className="h-4 w-4" /></Button>
                {activity.status === 'Scheduled' && (
                  <Button size="sm" variant="outline" onClick={() => { update.mutate({ id: activity.id, status: 'In Progress' }); }}><Play className="w-4 h-4 mr-1" />Start</Button>
                )}
                {(activity.status === 'In Progress' || activity.status === 'Scheduled') && (
                  <Button size="sm" onClick={() => handleStartActivity(activity)}><Edit className="w-4 h-4 mr-1" />Work</Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* View Activity */}
      <EntityModal open={!!viewActivity} onOpenChange={() => setViewActivity(null)} title="Activity Details" mode="view">
        {viewActivity && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewActivity.title}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewActivity.status} /></div></div>
              <div><Label className="text-muted-foreground">Type</Label><p>{viewActivity.activity_type || '-'}</p></div>
              <div><Label className="text-muted-foreground">Date</Label><p>{viewActivity.scheduled_date ? new Date(viewActivity.scheduled_date).toLocaleDateString() : '-'}</p></div>
            </div>
            {viewActivity.observations && <div><Label className="text-muted-foreground">Observations</Label><p>{viewActivity.observations}</p></div>}
            {viewActivity.findings_text && <div><Label className="text-muted-foreground">Findings</Label><p>{viewActivity.findings_text}</p></div>}
            {viewActivity.recommendation && <div><Label className="text-muted-foreground">Recommendations</Label><p>{viewActivity.recommendation}</p></div>}
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
