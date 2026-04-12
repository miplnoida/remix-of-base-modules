import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRightLeft } from "lucide-react";

export default function Reassignment() {
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: members } = await supabase
        .from("ce_queue_members")
        .select("inspector_id, role, queue_id")
        .eq("is_active", true);

      if (!members?.length) { setLoading(false); return; }

      const inspectorIds = [...new Set(members.map((m) => m.inspector_id))];
      const workloadMap: Record<string, { inspector_id: string; role: string | null; queue_count: number; violation_count: number }> = {};

      inspectorIds.forEach(iid => {
        const userMembers = members.filter((m) => m.inspector_id === iid);
        workloadMap[iid] = {
          inspector_id: iid,
          role: userMembers[0]?.role || "MEMBER",
          queue_count: userMembers.length,
          violation_count: 0,
        };
      });

      // Count violations assigned to each officer via assigned_to_user_id
      const { data: violations } = await supabase
        .from("ce_violations")
        .select("assigned_to_user_id")
        .in("status", ["OPEN", "UNDER_REVIEW", "ESCALATED"])
        .not("assigned_to_user_id", "is", null);

      (violations || []).forEach((v: any) => {
        if (workloadMap[v.assigned_to_user_id]) {
          workloadMap[v.assigned_to_user_id].violation_count++;
        }
      });

      setWorkload(Object.values(workloadMap).sort((a, b) => b.violation_count - a.violation_count));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reassign / Workload</h1>
        <p className="text-muted-foreground">View officer workload distribution and manage reassignment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Officer Workload ({workload.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspector ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Queues</TableHead>
                  <TableHead>Active Violations</TableHead>
                  <TableHead>Load</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workload.map((w) => (
                  <TableRow key={w.inspector_id}>
                    <TableCell className="font-mono text-sm">{w.inspector_id.slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant="secondary">{w.role}</Badge></TableCell>
                    <TableCell>{w.queue_count}</TableCell>
                    <TableCell>{w.violation_count}</TableCell>
                    <TableCell>
                      <Badge variant={w.violation_count > 400 ? "destructive" : w.violation_count > 200 ? "default" : "secondary"}>
                        {w.violation_count > 400 ? "High" : w.violation_count > 200 ? "Medium" : "Low"}
                      </Badge>
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
