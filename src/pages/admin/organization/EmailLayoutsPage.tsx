import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layout, Loader2, Search, Plus, Pencil } from "lucide-react";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { OrgActionGate, ORG_PERMS } from "@/platform/organization/orgActionPermissions";
import { EmailLayoutDesignerDialog } from "@/components/comm/EmailLayoutDesignerDialog";

const sb = supabase as any;

function useEmailLayouts() {
  return useQuery({
    queryKey: ["email_layouts"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_template_layout")
        .select("*")
        .eq("layout_kind", "EMAIL")
        .order("is_base_layout", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function Inner() {
  const { data: rows = [], isLoading } = useEmailLayouts();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r: any) =>
      !needle || `${r.name} ${r.code} ${r.description ?? ""}`.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: any) => { setEditing(row); setOpen(true); };

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Layout className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Email Base Layouts</h1>
            <p className="text-sm text-muted-foreground">
              Reusable email shells (header, body region, footer, styling). Business templates never re-author these — they inherit through Organization / Department / Module defaults.
            </p>
          </div>
        </div>
        <OrgActionGate permission={ORG_PERMS.templates.manage}>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Layout</Button>
        </OrgActionGate>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Width</TableHead>
                  <TableHead>Font</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No email layouts yet.</TableCell></TableRow>
                ) : filtered.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => openEdit(r)}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{r.code}</TableCell>
                    <TableCell>{r.email_max_width ?? "—"}px</TableCell>
                    <TableCell className="text-xs truncate max-w-[220px]">{r.email_font_family ?? "—"}</TableCell>
                    <TableCell>{r.is_base_layout ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}</TableCell>
                    <TableCell>{r.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell>
                      <OrgActionGate permission={ORG_PERMS.templates.manage}>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </OrgActionGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmailLayoutDesignerDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}

export default function EmailLayoutsPage() {
  return <PermissionWrapper moduleName="org_email_layouts"><Inner /></PermissionWrapper>;
}
