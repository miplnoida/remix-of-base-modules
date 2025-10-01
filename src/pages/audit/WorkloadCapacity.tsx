import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { auditors, auditActivities } from '@/data/auditData';
import { TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkloadCapacity() {
  // Calculate workload for each auditor
  const auditorWorkloads = auditors.map(auditor => {
    const assignedActivities = auditActivities.filter(
      act => act.auditor === auditor.email || act.assignedAuditors.includes(auditor.email)
    );
    const completedActivities = assignedActivities.filter(act => act.status === 'Completed');
    const inProgressActivities = assignedActivities.filter(act => act.status === 'In Progress');
    
    const totalHours = 160; // Assumed monthly capacity
    const assignedHours = assignedActivities.length * 8; // 8 hours per activity
    const utilizationRate = (assignedHours / totalHours) * 100;

    return {
      ...auditor,
      totalActivities: assignedActivities.length,
      completedActivities: completedActivities.length,
      inProgressActivities: inProgressActivities.length,
      totalHours,
      assignedHours,
      availableHours: totalHours - assignedHours,
      utilizationRate
    };
  });

  const getUtilizationColor = (rate: number) => {
    if (rate < 60) return 'text-green-600';
    if (rate < 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditor Workload & Capacity</h1>
        <p className="text-muted-foreground">
          Monitor auditor capacity and assignments |
          <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auditors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditors.length}</div>
            <p className="text-xs text-muted-foreground">Active auditors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditActivities.length}</div>
            <p className="text-xs text-muted-foreground">Assigned activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(auditorWorkloads.reduce((sum, a) => sum + a.utilizationRate, 0) / auditorWorkloads.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Capacity used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditorWorkloads.reduce((sum, a) => sum + a.completedActivities, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Activities done</p>
          </CardContent>
        </Card>
      </div>

      {/* Auditor Workload Details */}
      <Card>
        <CardHeader>
          <CardTitle>Auditor Capacity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {auditorWorkloads.map((auditor) => (
              <div key={auditor.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{auditor.name}</div>
                    <div className="text-sm text-muted-foreground">{auditor.role}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {auditor.assignedHours} / {auditor.totalHours} hours
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {auditor.availableHours} hours available
                      </div>
                    </div>
                    <Badge className={getUtilizationColor(auditor.utilizationRate)}>
                      {Math.round(auditor.utilizationRate)}% Utilized
                    </Badge>
                  </div>
                </div>
                <Progress value={auditor.utilizationRate} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{auditor.totalActivities} activities assigned</span>
                  <span>
                    {auditor.completedActivities} completed | {auditor.inProgressActivities} in progress
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Skills Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditors.map((auditor) => (
              <div key={auditor.id} className="flex items-start gap-4">
                <div className="min-w-[200px]">
                  <div className="font-medium">{auditor.name}</div>
                  <div className="text-sm text-muted-foreground">{auditor.seniorityLevel}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {auditor.skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
