import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";

export default function QueueMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ce_queue_members")
        .select("*")
        .order("queue_id");

      const queueIds = [...new Set((data || []).map((m) => m.queue_id))];
      const { data: queues } = await supabase.from("ce_assignment_queues").select("id, queue_name, queue_type").in("id", queueIds);
      const qMap = Object.fromEntries((queues || []).map((q: any) => [q.id, q]));

      setMembers((data || []).map((m) => ({
        ...m,
        queue_name: qMap[m.queue_id]?.queue_name || "—",
        queue_type: qMap[m.queue_id]?.queue_type || "—",
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const roleColor = (r: string | null) => {
    switch (r) {
      case "LEAD": return "bg-blue-100 text-blue-800";
      case "SUPERVISOR": return "bg-purple-100 text-purple-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Queue Members</h1>
        <p className="text-muted-foreground">Officers enrolled in assignment queues with their roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Inspector ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.queue_name}</TableCell>
                    <TableCell><Badge variant="secondary">{m.queue_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{m.inspector_id?.slice(0, 12)}…</TableCell>
                    <TableCell><Badge className={roleColor(m.role)} variant="secondary">{m.role || "MEMBER"}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Active" : "Inactive"}</Badge>
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
