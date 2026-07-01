import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LegacyRow {
  id: string;
  template_code: string | null;
  name: string;
  channel: string | null;
  category: string | null;
  is_enabled: boolean | null;
  migration_status: string | null;
  mapped_core_template_id: string | null;
  mapped_code?: string | null;
}

export default function LegacyBridgeTab() {
  const [rows, setRows] = useState<LegacyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notification_templates")
        .select("id, template_code, name, channel, category, is_enabled, migration_status, mapped_core_template_id")
        .order("name", { ascending: true })
        .limit(1000);
      const list = (data ?? []) as LegacyRow[];
      const ids = list.map((r) => r.mapped_core_template_id).filter(Boolean) as string[];
      if (ids.length) {
        const { data: cts } = await supabase.from("core_template").select("id, code").in("id", ids);
        const map = new Map((cts ?? []).map((c: { id: string; code: string }) => [c.id, c.code]));
        list.forEach((r) => (r.mapped_code = r.mapped_core_template_id ? map.get(r.mapped_core_template_id) ?? null : null));
      }
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      (r.template_code ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const counts = {
    total: rows.length,
    mapped: rows.filter((r) => r.migration_status === "mapped").length,
    pending: rows.filter((r) => r.migration_status === "pending").length,
    deprecated: rows.filter((r) => r.migration_status === "deprecated").length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Legacy Notification Templates</CardTitle>
          <CardDescription>
            Read-only bridge. Legacy runtime continues to read <code>notification_templates</code>.
            Each row is mirrored into <code>core_template</code> so the enterprise resolver can serve it too.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary">Total: {counts.total}</Badge>
            <Badge className="bg-green-600">Mapped: {counts.mapped}</Badge>
            <Badge variant="outline">Pending: {counts.pending}</Badge>
            <Badge variant="destructive">Deprecated: {counts.deprecated}</Badge>
          </div>
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legacy Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Migration</TableHead>
                <TableHead>Mapped Core Template</TableHead>
                <TableHead>Runtime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7}>Loading…</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.template_code ?? "—"}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell><Badge variant="outline">{r.channel ?? "—"}</Badge></TableCell>
                  <TableCell>{r.category ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.migration_status === "mapped" ? "default" : "outline"}>
                      {r.migration_status ?? "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.mapped_code ? (
                      <Button asChild variant="link" size="sm" className="h-auto p-0 font-mono text-xs">
                        <Link to={`/admin/core-templates?code=${r.mapped_code}`}>{r.mapped_code}</Link>
                      </Button>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_enabled ? "default" : "secondary"}>
                      {r.is_enabled ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
