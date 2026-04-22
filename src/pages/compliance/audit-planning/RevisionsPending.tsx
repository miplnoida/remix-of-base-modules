// ============================================
// PHASE 4c — Revisions Pending Review (Manager list)
// ============================================
// Lists all submitted plan revisions awaiting manager review, with a
// role-aware multi-zone filter. Plain-English status, baseline link, reason
// snippet, and quick "Open review" action.
// ============================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, GitBranch, Calendar, Eye, User, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyPlanStatus } from '@/types/weeklyPlan';
import { useComplianceRole } from '@/hooks/useComplianceRole';
import { MultiZoneFilter } from '@/components/compliance/weekly-plan/MultiZoneFilter';

interface RevisionRow {
  id: string;
  plan_number: string;
  inspector_name: string | null;
  week_start_date: string;
  week_end_date: string;
  status: string;
  version_no: number | null;
  submitted_date: string | null;
  revision_reason_code: string | null;
  revision_reason_text: string | null;
  zone_id: string | null;
  parent_plan_id: string | null;
  supersedes_plan_id: string | null;
}

async function loadPendingRevisions(): Promise<RevisionRow[]> {
  const { data, error } = await supabase
    .from('ce_weekly_plans')
    .select(
      'id, plan_number, inspector_name, week_start_date, week_end_date, status, version_no, submitted_date, revision_reason_code, revision_reason_text, zone_id, parent_plan_id, supersedes_plan_id',
    )
    .in('status', [
      WeeklyPlanStatus.REVISION_SUBMITTED,
      WeeklyPlanStatus.REVISION_QUERIED,
    ])
    .order('submitted_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RevisionRow[];
}

export default function RevisionsPending() {
  const navigate = useNavigate();
  const role = useComplianceRole();
  const [zoneFilter, setZoneFilter] = useState<string[]>([]);

  const q = useQuery({
    queryKey: ['plan-revisions-pending'],
    queryFn: loadPendingRevisions,
  });

  const rows = q.data ?? [];

  const filtered = useMemo(() => {
    if (zoneFilter.length === 0) return rows;
    return rows.filter((r) => r.zone_id && zoneFilter.includes(r.zone_id));
  }, [rows, zoneFilter]);

  const submittedCount = filtered.filter(
    (r) => r.status === WeeklyPlanStatus.REVISION_SUBMITTED,
  ).length;
  const queriedCount = filtered.filter(
    (r) => r.status === WeeklyPlanStatus.REVISION_QUERIED,
  ).length;

  const singleZoneOnly = role === 'inspector' || role === 'senior';

  return (
    <div className="container mx-auto p-6 space-y-4">
      <PageHeader
        title="Revisions Pending Review"
        subtitle="Inspector revisions on approved plans awaiting manager decision"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Field', href: '/compliance/field/plan-builder-v2' },
          { label: 'Revisions Pending' },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Awaiting Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{submittedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Queried (sent back)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{queriedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Visible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Pending revisions</CardTitle>
            <MultiZoneFilter
              value={zoneFilter}
              onChange={setZoneFilter}
              singleZoneOnly={singleZoneOnly}
              label={role === 'head' ? 'Filter zones' : 'Zone'}
            />
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {zoneFilter.length > 0
                  ? 'No revisions in the selected zone(s)'
                  : 'No revisions pending review'}
              </p>
              <p className="text-xs text-muted-foreground">
                You're all caught up.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.plan_number}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.inspector_name ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.week_start_date} → {r.week_end_date}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.status === WeeklyPlanStatus.REVISION_QUERIED
                            ? 'bg-warning/15 text-warning border-warning/40 text-[10px]'
                            : 'bg-primary/15 text-primary border-primary/40 text-[10px]'
                        }
                      >
                        <GitBranch className="h-3 w-3 mr-1" />
                        v{r.version_no ?? 2}{' '}
                        {r.status === WeeklyPlanStatus.REVISION_QUERIED
                          ? '· queried'
                          : '· submitted'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      {r.revision_reason_code && (
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {r.revision_reason_code.replace(/_/g, ' ')}
                        </div>
                      )}
                      <p className="text-xs line-clamp-2 text-foreground">
                        {r.revision_reason_text ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.submitted_date
                        ? new Date(r.submitted_date).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/compliance/field/revision-review/${r.id}`,
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Open review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
