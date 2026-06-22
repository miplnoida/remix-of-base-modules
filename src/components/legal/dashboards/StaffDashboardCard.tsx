import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { GaugeCircle } from "lucide-react";
import { useStaffWorkload } from "@/hooks/legal/useLgAssignment";

function tone(pct: number) {
  if (pct >= 90) return "bg-rose-100 text-rose-800";
  if (pct >= 70) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

interface Props { teamId?: string | null }

export default function StaffDashboardCard({ teamId = null }: Props) {
  const { data, isLoading } = useStaffWorkload(teamId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GaugeCircle className="h-4 w-4" /> Staff capacity
        </CardTitle>
        <CardDescription>Per-staff active cases, high-priority load and capacity %.</CardDescription>
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
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">High Pri.</TableHead>
                <TableHead>Capacity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    No staff configured.
                  </TableCell>
                </TableRow>
              )}
              {(data ?? []).map((s) => (
                <TableRow key={s.staff_id}>
                  <TableCell>
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{s.user_code ?? s.user_id.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.availability === "available" ? "default" : "secondary"}>
                      {s.availability}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{s.active_cases} / {s.max_active_cases}</TableCell>
                  <TableCell className="text-right">{s.high_priority_cases} / {s.max_high_priority_cases}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 w-40">
                      <Progress value={Math.min(100, s.capacity_pct)} />
                      <Badge className={tone(s.capacity_pct)}>{s.capacity_pct}%</Badge>
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
