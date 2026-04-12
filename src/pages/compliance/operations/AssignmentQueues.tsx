import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, RefreshCw } from "lucide-react";

interface QueueRow {
  id: string;
  queue_name: string;
  queue_type: string;
  zone_id: string;
  is_active: boolean;
  zone_name?: string;
  member_count?: number;
}

export default function AssignmentQueues() {
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueues = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ce_assignment_queues")
      .select("*")
      .order("queue_type")
      .order("queue_name");

    if (data) {
      // Enrich with zone names and member counts
      const zoneIds = [...new Set(data.map((q: any) => q.zone_id).filter(Boolean))];
      const { data: zones } = await supabase.from("ce_zones").select("id, zone_name").in("id", zoneIds);
      const zoneMap = Object.fromEntries((zones || []).map((z: any) => [z.id, z.zone_name]));

      const { data: members } = await supabase.from("ce_queue_members").select("queue_id");
      const countMap: Record<string, number> = {};
      (members || []).forEach((m: any) => {
        countMap[m.queue_id] = (countMap[m.queue_id] || 0) + 1;
      });

      setQueues(
        data.map((q: any) => ({
          ...q,
          zone_name: zoneMap[q.zone_id] || "—",
          member_count: countMap[q.id] || 0,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchQueues(); }, []);

  const typeColor = (t: string) => {
    switch (t) {
      case "OPS": return "bg-blue-100 text-blue-800";
      case "REV": return "bg-amber-100 text-amber-800";
      case "LEG": return "bg-red-100 text-red-800";
      case "FLB": return "bg-gray-100 text-gray-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignment Queues</h1>
          <p className="text-muted-foreground">Manage operational, review, legal, and fallback queues across zones</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQueues}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> All Queues ({queues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.queue_name}</TableCell>
                    <TableCell>
                      <Badge className={typeColor(q.queue_type)} variant="secondary">{q.queue_type}</Badge>
                    </TableCell>
                    <TableCell>{q.zone_name}</TableCell>
                    <TableCell>{q.member_count}</TableCell>
                    <TableCell>
                      <Badge variant={q.is_active ? "default" : "secondary"}>
                        {q.is_active ? "Active" : "Inactive"}
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
