import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ReviewQueue() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      // Get all REV queue IDs
      const { data: revQueues } = await supabase
        .from("ce_assignment_queues")
        .select("id")
        .eq("queue_type", "REV");
      
      const queueIds = (revQueues || []).map((q: any) => q.id);
      if (queueIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from("ce_violations")
        .select("id, violation_number, employer_regno, status, priority, created_at, assigned_queue_id, zone_id")
        .in("assigned_queue_id", queueIds)
        .in("status", ["UNDER_REVIEW", "OPEN"])
        .order("created_at", { ascending: false })
        .limit(200);

      setViolations(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground">Violations assigned to review queues requiring supervisor evaluation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" /> Pending Review ({violations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : violations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No violations pending review</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Violation #</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                    <TableCell className="font-mono text-sm">{v.violation_number}</TableCell>
                    <TableCell>{v.employer_regno}</TableCell>
                    <TableCell><Badge variant="secondary">{v.status}</Badge></TableCell>
                    <TableCell><Badge variant={v.priority === "HIGH" ? "destructive" : "secondary"}>{v.priority}</Badge></TableCell>
                    <TableCell>{new Date(v.created_at).toLocaleDateString()}</TableCell>
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
