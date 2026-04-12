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
      // Get members with their queue info
      const { data: members } = await supabase
        .from("ce_queue_members")
        .select("user_id, role, queue_id")
        .eq("is_active", true);

      if (!members?.length) { setLoading(false); return; }

      // Count open violations per user
      const userIds = [...new Set(members.map((m: any) => m.user_id))];
      const workloadMap: Record<string, { user_id: string; role: string; queue_count: number; violation_count: number }> = {};
      
      userIds.forEach(uid => {
        const userMembers = members.filter((m: any) => m.user_id === uid);
        workloadMap[uid] = {
          user_id: uid,
          role: userMembers[0]?.role || "MEMBER",
          queue_count: userMembers.length,
          violation_count: 0,
        };
      });

      // Count violations assigned to each officer
      const { data: violations } = await supabase
        .from("ce_violations")
        .select("assigned_to_user_id")
        .in("status", ["OPEN", "UNDER_REVIEW", "ESCALATED"])
        .in("assigned_to_user_id", userIds);

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
                  <TableHead>Officer ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Queues</TableHead>
                  <TableHead>Active Violations</TableHead>
                  <TableHead>Load</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workload.map((w) => (
                  <TableRow key={w.user_id}>
                    <TableCell className="font-mono text-sm">{w.user_id.slice(0, 8)}…</TableCell>
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
