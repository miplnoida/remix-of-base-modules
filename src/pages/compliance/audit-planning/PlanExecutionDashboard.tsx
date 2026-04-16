import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  Calendar,
  AlertCircle,
  FileText,
  Camera,
  ListChecks,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { fieldAuditService, type PlanExecutionDashboard as Dashboard } from '@/services/fieldAuditService';
import { toast } from 'sonner';

export default function PlanExecutionDashboard() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!planId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const load = async () => {
    try {
      setLoading(true);
      const d = await fieldAuditService.getPlanExecutionDashboard(planId!);
      setData(d);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'bg-success/10 text-success',
      IN_PROGRESS: 'bg-warning/10 text-warning',
      RESCHEDULED: 'bg-blue-500/10 text-blue-600',
      NOT_DONE: 'bg-destructive/10 text-destructive',
      CANCELLED: 'bg-destructive/10 text-destructive',
    };
    return map[s] ?? 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading dashboard…</div>;
  }
  if (!data) {
    return <div className="p-6 text-muted-foreground">Plan not found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Plan Execution — ${data.planNumber}`}
        subtitle={`Week ${data.weekStartDate} → ${data.weekEndDate} • Status: ${data.status}`}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Field', href: '/compliance/field/my-plans' },
          { label: 'Execution Dashboard' },
        ]}
      />

      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard icon={<Calendar className="h-5 w-5" />} label="Planned" value={data.kpis.planned} />
        <KpiCard icon={<PlayCircle className="h-5 w-5 text-warning" />} label="In Progress" value={data.kpis.inProgress} />
        <KpiCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} label="Completed" value={data.kpis.completed} />
        <KpiCard icon={<Clock className="h-5 w-5 text-blue-600" />} label="Rescheduled" value={data.kpis.rescheduled} />
        <KpiCard icon={<AlertCircle className="h-5 w-5 text-destructive" />} label="Not Done" value={data.kpis.notDone} />
        <KpiCard icon={<Camera className="h-5 w-5" />} label="Evidence" value={data.kpis.totalEvidence} />
        <KpiCard icon={<ListChecks className="h-5 w-5" />} label="Findings" value={data.kpis.totalFindings} />
        <KpiCard icon={<FileText className="h-5 w-5" />} label="Reports" value={data.kpis.totalReports} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit Execution Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employer / Area</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead className="text-center">Evidence</TableHead>
                <TableHead className="text-center">Findings</TableHead>
                <TableHead>Report</TableHead>
                <TableHead className="text-center">Follow-ups</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.visits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No visits in this plan.
                  </TableCell>
                </TableRow>
              )}
              {data.visits.map((v) => (
                <TableRow key={v.planItemId}>
                  <TableCell className="whitespace-nowrap">{v.visitDate}</TableCell>
                  <TableCell className="font-medium">
                    {v.employerName ?? v.areaName ?? '—'}
                    {v.employerId && (
                      <div className="text-xs text-muted-foreground">{v.employerId}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{v.visitType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadge(v.executionStatus)}>
                      {v.executionStatus.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    {v.checklistTotal === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-1">
                        <Progress value={v.checklistPct} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {v.checklistAnswered}/{v.checklistTotal} ({v.checklistPct}%)
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{v.evidenceCount}</TableCell>
                  <TableCell className="text-center">{v.findingsCount}</TableCell>
                  <TableCell>
                    {v.hasReport ? (
                      <Badge variant={v.reportStatus === 'FINAL' ? 'default' : 'secondary'}>
                        {v.reportStatus}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not generated</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{v.followUpCount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {v.inspectionId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/compliance/field/audit-report/${v.inspectionId}`)}
                        >
                          Report
                        </Button>
                      )}
                      <Link to="/compliance/field/execution">
                        <Button size="sm" variant="default">
                          Open <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
