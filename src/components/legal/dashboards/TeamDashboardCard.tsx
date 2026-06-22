import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2 } from "lucide-react";
import { useLgTeamMetrics } from "@/hooks/legal/useLgTeamMetrics";

function tone(pct: number) {
  if (pct >= 90) return "bg-rose-100 text-rose-800 border-rose-200";
  if (pct >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

export default function TeamDashboardCard() {
  const { data, isLoading } = useLgTeamMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users2 className="h-4 w-4" /> Team workload
        </CardTitle>
        <CardDescription>Open / unassigned / high-priority cases and live capacity per team.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Unassigned</TableHead>
                <TableHead className="text-right">High Pri.</TableHead>
                <TableHead className="text-right">Avg age</TableHead>
                <TableHead>Capacity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                    No teams configured yet.
                  </TableCell>
                </TableRow>
              )}
              {(data ?? []).map((t) => (
                <TableRow key={t.team_id}>
                  <TableCell>
                    <div className="font-medium">{t.team_name}</div>
                    <div className="text-xs text-muted-foreground">{t.team_code}</div>
                  </TableCell>
                  <TableCell className="text-right">{t.open_cases}</TableCell>
                  <TableCell className="text-right">{t.assigned_cases}</TableCell>
                  <TableCell className="text-right">
                    {t.unassigned_cases > 0
                      ? <Badge variant="destructive">{t.unassigned_cases}</Badge>
                      : t.unassigned_cases}
                  </TableCell>
                  <TableCell className="text-right">{t.high_priority_cases}</TableCell>
                  <TableCell className="text-right">{t.avg_age_days || 0}d</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 w-40">
                      <Progress value={Math.min(100, t.capacity_pct)} />
                      <Badge variant="outline" className={tone(t.capacity_pct)}>
                        {t.capacity_pct}%
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {t.current_load} / {t.total_capacity}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
