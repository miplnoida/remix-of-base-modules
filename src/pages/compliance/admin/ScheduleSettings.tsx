import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Settings2, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateForDisplay } from "@/lib/format-config";

interface AutomationJob {
  id: string;
  job_code: string;
  name: string;
  description: string | null;
  schedule_cron: string | null;
  is_enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
}

/**
 * Compliance Schedule Settings
 * Read-only summary of scheduled compliance automation jobs.
 * Sourced from ce_automation_jobs. Edits happen in Job Configuration.
 */
const ScheduleSettings = () => {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["compliance-schedule-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_automation_jobs")
        .select("id, job_code, name, description, schedule_cron, is_enabled, last_run_at, last_run_status")
        .order("job_code");
      if (error) throw error;
      return (data || []) as AutomationJob[];
    },
  });

  const scheduled = jobs.filter((j) => j.schedule_cron && j.schedule_cron.trim().length > 0);
  const onDemand = jobs.filter((j) => !j.schedule_cron || j.schedule_cron.trim().length === 0);
  const enabledCount = scheduled.filter((j) => j.is_enabled).length;

  const renderStatus = (status: string | null) => {
    if (!status) return <span className="text-muted-foreground text-xs">—</span>;
    const ok = /success|complete/i.test(status);
    return (
      <Badge variant={ok ? "default" : "destructive"} className="capitalize">
        {status.toLowerCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Schedule Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cron schedules for all Compliance &amp; Enforcement automation jobs. Edit schedules and parameters in Job Configuration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/scheduler">
              <ExternalLink className="h-4 w-4 mr-1" /> Central Scheduler
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/compliance/admin/automation/jobs">
              <Settings2 className="h-4 w-4 mr-1" /> Job Configuration
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled jobs</CardDescription>
            <CardTitle className="text-3xl">{scheduled.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Currently enabled</CardDescription>
            <CardTitle className="text-3xl text-primary">{enabledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On-demand / event-driven</CardDescription>
            <CardTitle className="text-3xl">{onDemand.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scheduled Jobs</CardTitle>
          <CardDescription>Jobs with a cron expression. Toggle on/off and edit cadence in Job Configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6">Loading…</p>
          ) : scheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No scheduled jobs configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Cron</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduled.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>
                        <div className="font-medium">{j.name}</div>
                        {j.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{j.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{j.job_code}</TableCell>
                      <TableCell className="font-mono text-xs">{j.schedule_cron}</TableCell>
                      <TableCell>
                        {j.is_enabled ? (
                          <span className="inline-flex items-center gap-1 text-primary text-sm">
                            <CheckCircle2 className="h-4 w-4" /> On
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                            <XCircle className="h-4 w-4" /> Off
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {j.last_run_at ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDateForDisplay(j.last_run_at)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>{renderStatus(j.last_run_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">On-Demand / Event-Driven Jobs</CardTitle>
          <CardDescription>Jobs without a cron expression. Run manually or triggered by events.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6">Loading…</p>
          ) : onDemand.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No on-demand jobs registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onDemand.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>
                        <div className="font-medium">{j.name}</div>
                        {j.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{j.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{j.job_code}</TableCell>
                      <TableCell>
                        {j.is_enabled ? (
                          <Badge variant="default">On</Badge>
                        ) : (
                          <Badge variant="outline">Off</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {j.last_run_at ? formatDateForDisplay(j.last_run_at) : <span className="text-muted-foreground">Never</span>}
                      </TableCell>
                      <TableCell>{renderStatus(j.last_run_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleSettings;
