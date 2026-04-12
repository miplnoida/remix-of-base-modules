import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Map } from "lucide-react";

export default function ZoneManagement() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("ce_zones").select("*").order("zone_code");
      
      // Get queue counts per zone
      const { data: queues } = await supabase.from("ce_assignment_queues").select("zone_id");
      const qMap: Record<string, number> = {};
      (queues || []).forEach((q: any) => { qMap[q.zone_id] = (qMap[q.zone_id] || 0) + 1; });

      // Get village counts per zone
      const { data: villages } = await supabase.from("ce_village_zone_mapping").select("zone_id");
      const vMap: Record<string, number> = {};
      (villages || []).forEach((v: any) => { vMap[v.zone_id] = (vMap[v.zone_id] || 0) + 1; });

      setZones((data || []).map((z: any) => ({ ...z, queue_count: qMap[z.id] || 0, village_count: vMap[z.id] || 0 })));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Zones</h1>
        <p className="text-muted-foreground">Enterprise zonal hierarchy for compliance territory management</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="h-5 w-5" /> Zones ({zones.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Code</TableHead>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Queues</TableHead>
                  <TableHead>Villages Mapped</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-mono font-medium">{z.zone_code}</TableCell>
                    <TableCell>{z.zone_name}</TableCell>
                    <TableCell className="text-muted-foreground">{z.description || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{z.queue_count}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{z.village_count}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={z.is_active ? "default" : "secondary"}>{z.is_active ? "Active" : "Inactive"}</Badge>
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
