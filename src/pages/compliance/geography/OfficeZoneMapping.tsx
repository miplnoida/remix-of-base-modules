import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2 } from "lucide-react";

export default function OfficeZoneMapping() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("ce_zone_office_mapping").select("*").order("office_code");
      
      // Enrich with zone names
      const zoneIds = [...new Set((data || []).map((m: any) => m.zone_id))];
      const { data: zones } = await supabase.from("ce_zones").select("id, zone_name, zone_code").in("id", zoneIds);
      const zoneMap = Object.fromEntries((zones || []).map((z: any) => [z.id, z]));

      setMappings((data || []).map((m: any) => ({
        ...m,
        zone_name: zoneMap[m.zone_id]?.zone_name || "—",
        zone_code: zoneMap[m.zone_id]?.zone_code || "—",
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Office-to-Zone Mapping</h1>
        <p className="text-muted-foreground">Map SSB office codes to compliance zones for fallback routing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Office Mappings ({mappings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office Code</TableHead>
                  <TableHead>Zone Code</TableHead>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-medium">{m.office_code}</TableCell>
                    <TableCell><Badge variant="secondary">{m.zone_code}</Badge></TableCell>
                    <TableCell>{m.zone_name}</TableCell>
                    <TableCell>{m.is_default ? <Badge>Default</Badge> : <Badge variant="secondary">Alternate</Badge>}</TableCell>
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
