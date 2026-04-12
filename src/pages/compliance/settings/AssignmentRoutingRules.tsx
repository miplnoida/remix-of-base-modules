import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Route } from "lucide-react";

export default function AssignmentRoutingRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ce_assignment_routing_rules")
        .select("*")
        .order("priority", { ascending: true });

      // Enrich with queue names
      const queueIds = [...new Set((data || []).map((r: any) => r.target_queue_id).filter(Boolean))];
      const { data: queues } = await supabase.from("ce_assignment_queues").select("id, queue_name, queue_type").in("id", queueIds);
      const qMap = Object.fromEntries((queues || []).map((q: any) => [q.id, q]));

      setRules((data || []).map((r: any) => ({
        ...r,
        queue_name: qMap[r.target_queue_id]?.queue_name || "—",
        queue_type: qMap[r.target_queue_id]?.queue_type || "—",
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assignment Routing Rules</h1>
        <p className="text-muted-foreground">Rules that determine how violations are routed to queues based on type and office</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5" /> Routing Rules ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Office Code</TableHead>
                  <TableHead>Target Queue</TableHead>
                  <TableHead>Queue Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.priority}</TableCell>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell>{r.violation_type_id?.slice(0, 8) || "Any"}…</TableCell>
                    <TableCell>{r.office_code || "Any"}</TableCell>
                    <TableCell>{r.queue_name}</TableCell>
                    <TableCell><Badge variant="secondary">{r.queue_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge>
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
