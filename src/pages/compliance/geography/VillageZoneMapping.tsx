import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Search } from "lucide-react";

export default function VillageZoneMapping() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("ce_village_zone_mapping").select("*").order("village_code");
      
      const zoneIds = [...new Set((data || []).map((m: any) => m.zone_id))];
      const villageCodes = [...new Set((data || []).map((m: any) => m.village_code).filter(Boolean))];
      
      const { data: zones } = await supabase.from("ce_zones").select("id, zone_name, zone_code").in("id", zoneIds);
      const zoneMap = Object.fromEntries((zones || []).map((z: any) => [z.id, z]));

      // Enrich with village names from tb_villages
      const { data: villages } = await supabase.from("tb_villages").select("code, description").in("code", villageCodes);
      const villageMap = Object.fromEntries((villages || []).map((v: any) => [v.code, v.description]));

      const enriched = (data || []).map((m: any) => ({
        ...m,
        village_name: villageMap[m.village_code] || "—",
        zone_name: zoneMap[m.zone_id]?.zone_name || "—",
        zone_code: zoneMap[m.zone_id]?.zone_code || "—",
      }));
      setMappings(enriched);
      setFiltered(enriched);
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(mappings); return; }
    const s = search.toLowerCase();
    setFiltered(mappings.filter(m => 
      m.village_code?.toLowerCase().includes(s) || 
      m.village_name?.toLowerCase().includes(s) ||
      m.zone_code?.toLowerCase().includes(s)
    ));
  }, [search, mappings]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Village-to-Zone Mapping</h1>
        <p className="text-muted-foreground">Granular village-level routing to compliance zones</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search village or zone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Village Mappings ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Village Code</TableHead>
                  <TableHead>Village Name</TableHead>
                  <TableHead>Office Code</TableHead>
                  <TableHead>Zone Code</TableHead>
                  <TableHead>Zone Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono">{m.village_code}</TableCell>
                    <TableCell>{m.village_name || "—"}</TableCell>
                    <TableCell>{m.office_code || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{m.zone_code}</Badge></TableCell>
                    <TableCell>{m.zone_name}</TableCell>
                  </TableRow>
                ))}
                {filtered.length > 100 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Showing 100 of {filtered.length} — use search to narrow</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
