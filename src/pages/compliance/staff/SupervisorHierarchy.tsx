import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Network } from "lucide-react";

export default function SupervisorHierarchy() {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: inspectors } = await supabase
        .from("ce_inspectors")
        .select("id, profile_id, supervisor_id, legacy_inspector_code, is_active, max_caseload")
        .order("supervisor_id");

      setHierarchy(inspectors || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const supervisors = hierarchy.filter(h => hierarchy.some(sub => sub.supervisor_id === h.id));
  const standalone = hierarchy.filter(h => !h.supervisor_id && !supervisors.find(s => s.id === h.id));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supervisor Hierarchy</h1>
        <p className="text-muted-foreground">Inspector-to-supervisor reporting structure</p>
      </div>

      {supervisors.map((sup) => {
        const reports = hierarchy.filter(h => h.supervisor_id === sup.id);
        return (
          <Card key={sup.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="h-5 w-5" />
                Supervisor: {sup.legacy_inspector_code || sup.profile_id?.slice(0, 12)}
                <Badge variant="default">SUPERVISOR</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Max Caseload</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.legacy_inspector_code || r.profile_id?.slice(0, 12)}</TableCell>
                      <TableCell>{r.max_caseload || "—"}</TableCell>
                      <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {standalone.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Unassigned Officers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Max Caseload</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standalone.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.legacy_inspector_code || s.profile_id?.slice(0, 12)}</TableCell>
                    <TableCell>{s.max_caseload || "—"}</TableCell>
                    <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
    </div>
  );
}
