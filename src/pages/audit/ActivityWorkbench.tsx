import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Save, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAActivities, useIAActivityMutations } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, SearchBar, DataTable, StatusBadge, ConfirmDialog } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { Link } from 'react-router-dom';

export default function ActivityWorkbench() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [findings, setFindings] = useState({ observations: '', findings: '', complianceStatus: '', monetaryVariance: 0, recommendation: '', followUpRequired: false });

  const { data: activities = [], isLoading } = useIAActivities();
  const { update } = useIAActivityMutations();

  const myActivities = activities.filter((a: any) => hasPermission('view_audit_assignments'));
  const filteredActivities = myActivities.filter((a: any) =>
    (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.activity_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartActivity = (activity: any) => {
    setSelectedActivity(activity);
    if (activity.observations) setFindings({ observations: activity.observations || '', findings: activity.findings_text || '', complianceStatus: activity.compliance_status || '', monetaryVariance: activity.monetary_variance || 0, recommendation: activity.recommendation || '', followUpRequired: activity.follow_up_required || false });
  };

  const handleSaveFindings = () => {
    if (!selectedActivity) return;
    update.mutate({ id: selectedActivity.id, observations: findings.observations, findings_text: findings.findings, compliance_status: findings.complianceStatus, monetary_variance: findings.monetaryVariance, recommendation: findings.recommendation, follow_up_required: findings.followUpRequired });
  };

  const handleCompleteActivity = () => {
    if (!findings.complianceStatus || !findings.findings) {
      toast({ title: "Validation Error", description: "Please complete all required fields before submitting.", variant: "destructive" });
      return;
    }
    update.mutate({ id: selectedActivity.id, status: 'Completed', observations: findings.observations, findings_text: findings.findings, compliance_status: findings.complianceStatus, monetary_variance: findings.monetaryVariance, recommendation: findings.recommendation }, { onSuccess: () => setSelectedActivity(null) });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Activity', render: (a) => (
      <div><div className="font-medium">{a.title}</div><div className="text-sm text-muted-foreground">{a.activity_type}</div></div>
    )},
    { key: 'activity_type', header: 'Type' },
    { key: 'scheduled_date', header: 'Date', render: (a) => a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <PageShell
      title="Activity Workbench"
      subtitle="Execute audit activities and enter findings"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Activity Workbench' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('execute_audit_activities')}
    >
      {!selectedActivity ? (
        <>
          <Card>
            <CardContent className="pt-6">
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search activities..." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>My Activities ({filteredActivities.length})</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredActivities}
                emptyMessage="No activities assigned"
                renderActions={(activity) => (
                  <Button variant="outline" size="sm" onClick={() => handleStartActivity(activity)}>
                    {activity.status === 'Completed' ? 'View' : 'Start'}
                  </Button>
                )}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{selectedActivity.title}</CardTitle>
            <Button variant="outline" onClick={() => setSelectedActivity(null)} className="w-fit">← Back to Activities</Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings">
              <TabsList><TabsTrigger value="findings">Findings</TabsTrigger><TabsTrigger value="attachments">Attachments</TabsTrigger></TabsList>
              <TabsContent value="findings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Compliance Status</Label>
                    <Select value={findings.complianceStatus} onValueChange={(v) => setFindings({...findings, complianceStatus: v})}>
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
                    <Input type="number" value={findings.monetaryVariance} onChange={(e) => setFindings({...findings, monetaryVariance: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-2"><Label>Observations</Label><Textarea value={findings.observations} onChange={(e) => setFindings({...findings, observations: e.target.value})} placeholder="Enter observations..." className="min-h-[100px]" /></div>
                <div className="space-y-2"><Label>Findings</Label><Textarea value={findings.findings} onChange={(e) => setFindings({...findings, findings: e.target.value})} placeholder="Enter findings..." className="min-h-[100px]" /></div>
                <div className="space-y-2"><Label>Recommendations</Label><Textarea value={findings.recommendation} onChange={(e) => setFindings({...findings, recommendation: e.target.value})} placeholder="Enter recommendations..." className="min-h-[100px]" /></div>
                <div className="flex justify-end space-x-4">
                  <Button variant="outline" onClick={handleSaveFindings}><Save className="w-4 h-4 mr-2" />Save Draft</Button>
                  <Button onClick={handleCompleteActivity}>Complete Activity</Button>
                </div>
              </TabsContent>
              <TabsContent value="attachments">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Upload supporting documents</p>
                  <Button variant="outline" className="mt-4"><FileText className="w-4 h-4 mr-2" />Select Files</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
