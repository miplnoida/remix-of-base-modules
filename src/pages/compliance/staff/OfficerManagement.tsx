import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck } from "lucide-react";

export default function OfficerManagement() {
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ce_inspectors")
        .select("*")
        .order("created_at", { ascending: false });

      setOfficers(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Officers / Inspectors</h1>
        <p className="text-muted-foreground">Compliance officers registered in the enforcement module</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5" /> Officers ({officers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile ID</TableHead>
                  <TableHead>Legacy Code</TableHead>
                  <TableHead>Max Caseload</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">{o.profile_id?.slice(0, 12) || "—"}…</TableCell>
                    <TableCell>{o.legacy_inspector_code || "—"}</TableCell>
                    <TableCell>{o.max_caseload || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={o.is_active ? "default" : "secondary"}>{o.is_active ? "Active" : "Inactive"}</Badge>
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
