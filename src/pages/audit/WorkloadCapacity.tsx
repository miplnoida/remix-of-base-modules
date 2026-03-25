import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIAAuditors, useIAActivities } from '@/hooks/useAuditData';
import { TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import { PageShell, StatusBadge } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamAvailabilityDashboard } from '@/components/audit/TeamAvailabilityDashboard';

export default function WorkloadCapacity() {
  const { data: auditors = [], isLoading: loadingAuditors } = useIAAuditors();
  const { data: activities = [], isLoading: loadingActivities } = useIAActivities();

  const isLoading = loadingAuditors || loadingActivities;

  const auditorWorkloads = auditors.map((auditor: any) => {
    const assignedActivities = activities.filter((act: any) => act.auditor_id === auditor.id);
    const completedActivities = assignedActivities.filter((act: any) => act.status === 'Completed');
    const inProgressActivities = assignedActivities.filter((act: any) => act.status === 'In Progress');
    const totalHours = 160;
    const assignedHours = assignedActivities.length * 8;
    const utilizationRate = totalHours > 0 ? (assignedHours / totalHours) * 100 : 0;
    return { ...auditor, totalActivities: assignedActivities.length, completedActivities: completedActivities.length, inProgressActivities: inProgressActivities.length, totalHours, assignedHours, availableHours: totalHours - assignedHours, utilizationRate };
  });

  return (
    <PageShell
      title="Auditor Workload & Capacity"
      subtitle="Monitor auditor capacity and assignments"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Workload & Capacity' }]}
      isLoading={isLoading}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Auditors</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{auditors.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Activities</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activities.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{auditorWorkloads.length > 0 ? Math.round(auditorWorkloads.reduce((s: number, a: any) => s + a.utilizationRate, 0) / auditorWorkloads.length) : 0}%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{auditorWorkloads.reduce((s: number, a: any) => s + a.completedActivities, 0)}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="workload" className="w-full">
        <TabsList>
          <TabsTrigger value="workload">Workload & Capacity</TabsTrigger>
          <TabsTrigger value="availability">Team Availability</TabsTrigger>
          <TabsTrigger value="skills">Skills Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="workload">
          <Card>
            <CardHeader><CardTitle>Auditor Capacity Overview</CardTitle></CardHeader>
            <CardContent>
              {auditorWorkloads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No auditors found.</div>
              ) : (
                <div className="space-y-6">
                  {auditorWorkloads.map((auditor: any) => (
                    <div key={auditor.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div><div className="font-medium">{auditor.name}</div><div className="text-sm text-muted-foreground">{auditor.role}</div></div>
                        <div className="flex items-center gap-4">
                          <div className="text-right"><div className="text-sm font-medium">{auditor.assignedHours} / {auditor.totalHours} hours</div><div className="text-xs text-muted-foreground">{auditor.availableHours} hrs available</div></div>
                          <StatusBadge status={`${Math.round(auditor.utilizationRate)}% Utilized`} />
                        </div>
                      </div>
                      <Progress value={auditor.utilizationRate} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{auditor.totalActivities} activities assigned</span>
                        <span>{auditor.completedActivities} completed | {auditor.inProgressActivities} in progress</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <TeamAvailabilityDashboard />
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader><CardTitle>Skills Coverage</CardTitle></CardHeader>
            <CardContent>
              {auditors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No auditors found.</div>
              ) : (
                <div className="space-y-4">
                  {auditors.map((auditor: any) => (
                    <div key={auditor.id} className="flex items-start gap-4">
                      <div className="min-w-[200px]"><div className="font-medium">{auditor.name}</div><div className="text-sm text-muted-foreground">{auditor.seniority_level}</div></div>
                      <div className="flex flex-wrap gap-2">{(auditor.skills || []).map((skill: string, idx: number) => <Badge key={idx} variant="outline">{skill}</Badge>)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
