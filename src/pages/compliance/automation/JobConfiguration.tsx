import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cog, Plus, Play, Pause, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const jobDefinitions = [
  { code: 'daily_violation_scan', name: 'Daily Violation Scan', frequency: 'Daily', description: 'Scan for new filing and payment violations', enabled: false },
  { code: 'weekly_escalation_review', name: 'Weekly Escalation Review', frequency: 'Weekly', description: 'Review and auto-escalate overdue violations', enabled: false },
  { code: 'monthly_penalty_recalc', name: 'Monthly Penalty/Interest Recalculation', frequency: 'Monthly', description: 'Recalculate penalties and interest on open arrears', enabled: false },
  { code: 'monthly_risk_reclass', name: 'Monthly Risk Reclassification', frequency: 'Monthly', description: 'Recalculate employer risk scores and update bands', enabled: false },
  { code: 'notice_generation', name: 'Notice Generation', frequency: 'Daily', description: 'Generate and queue compliance notices', enabled: false },
];

const JobConfiguration = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Automation Job Configuration</h1>
          </div>
          <p className="text-muted-foreground">
            Configure scheduled automation jobs for compliance enforcement
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Custom Job
        </Button>
      </div>

      <div className="grid gap-4">
        {jobDefinitions.map((job) => (
          <Card key={job.code}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <p className="font-medium text-foreground">{job.name}</p>
                  <Badge variant="secondary">{job.frequency}</Badge>
                  <Badge variant={job.enabled ? "default" : "outline"}>
                    {job.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{job.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last run: Never
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-1">
                  <Play className="h-3 w-3" />
                  Run Now
                </Button>
                <Switch checked={job.enabled} disabled />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Jobs are UI-only for now. Actual scheduling will be implemented with database tables and edge functions.
      </p>
    </div>
  );
};

export default JobConfiguration;
