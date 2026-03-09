import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Cog, Plus, Play, Clock, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';

interface JobDef {
  code: string;
  name: string;
  frequency: string;
  description: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: 'success' | 'failed' | 'never';
  nextRun: string;
  recordsProcessed: number | null;
  category: string;
}

const jobDefinitions: JobDef[] = [
  { code: 'daily_violation_scan', name: 'Daily Violation Scan', frequency: 'Daily at 6:00 AM', description: 'Scan all employers for new filing and payment violations based on detection rules', enabled: true, lastRun: '2026-03-08 06:00', lastStatus: 'success', nextRun: '2026-03-09 06:00', recordsProcessed: 1247, category: 'Detection' },
  { code: 'weekly_escalation_review', name: 'Weekly Escalation Review', frequency: 'Monday at 7:00 AM', description: 'Review all open violations and auto-escalate overdue items per escalation rules', enabled: true, lastRun: '2026-03-03 07:00', lastStatus: 'success', nextRun: '2026-03-10 07:00', recordsProcessed: 45, category: 'Escalation' },
  { code: 'monthly_penalty_recalc', name: 'Monthly Penalty/Interest Recalculation', frequency: '1st of month at 2:00 AM', description: 'Recalculate penalties and interest on all open arrears balances', enabled: true, lastRun: '2026-03-01 02:00', lastStatus: 'success', nextRun: '2026-04-01 02:00', recordsProcessed: 892, category: 'Calculation' },
  { code: 'monthly_risk_reclass', name: 'Monthly Risk Reclassification', frequency: '1st of month at 4:00 AM', description: 'Recalculate all employer risk scores and update band classifications', enabled: true, lastRun: '2026-03-01 04:00', lastStatus: 'failed', nextRun: '2026-04-01 04:00', recordsProcessed: null, category: 'Risk' },
  { code: 'notice_generation', name: 'Notice Generation', frequency: 'Daily at 8:00 AM', description: 'Generate and queue compliance notices (warning, demand, final demand) per escalation schedule', enabled: false, lastRun: null, lastStatus: 'never', nextRun: '—', recordsProcessed: null, category: 'Notices' },
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'success') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
};

const JobConfiguration = () => {
  const [jobs, setJobs] = useState(jobDefinitions);

  const toggleJob = (code: string) => {
    setJobs(prev => prev.map(j => j.code === code ? { ...j, enabled: !j.enabled } : j));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Automation Job Configuration</h1>
          </div>
          <p className="text-muted-foreground">Configure scheduled automation jobs for compliance enforcement</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Custom Job</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Jobs</p><p className="text-2xl font-bold text-foreground">{jobs.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-success">{jobs.filter(j => j.enabled).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-muted-foreground">{jobs.filter(j => !j.enabled).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Last Failed</p><p className="text-2xl font-bold text-destructive">{jobs.filter(j => j.lastStatus === 'failed').length}</p></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.code} className={`transition-all ${!job.enabled ? 'opacity-60' : ''}`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground">{job.name}</p>
                    <Badge variant="secondary" className="text-[10px]">{job.category}</Badge>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{job.frequency}
                    </Badge>
                    <Badge variant={job.enabled ? 'default' : 'outline'} className="text-[10px]">
                      {job.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <StatusIcon status={job.lastStatus} />
                      Last run: {job.lastRun || 'Never'}
                      {job.recordsProcessed !== null && ` (${job.recordsProcessed} records)`}
                    </span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Next: {job.nextRun}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Button variant="outline" size="sm" className="gap-1" disabled={!job.enabled}>
                    <Play className="h-3 w-3" />Run Now
                  </Button>
                  <Switch checked={job.enabled} onCheckedChange={() => toggleJob(job.code)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JobConfiguration;
