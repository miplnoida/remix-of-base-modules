import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Edit, Loader2, Search, LayoutTemplate } from "lucide-react";
import { Link } from "react-router-dom";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { OrgActionGate, ORG_PERMS } from "@/platform/organization/orgActionPermissions";
import { TemplateDesignerDialog } from "@/components/comm/TemplateDesignerDialog";
import { TEMPLATE_CATEGORIES } from "@/lib/comm/templateCatalog";
import { DeleteActionButton } from "@/components/comm/safe-delete/DeleteActionButton";

const sb = supabase as any;

interface TemplateRow {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  subcategory: string | null;
  module_code: string | null;
  department_code: string | null;
  version: string | null;
  version_no: number | null;
  status: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  description: string | null;
  design_config: any;
}

function useTemplates() {
  return useQuery({
    queryKey: ["comm_letterhead", "list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_letterhead")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
    staleTime: 30_000,
  });
}

function statusBadge(status: string | null, active: boolean) {
  if (!active) return <Badge variant="outline">Inactive</Badge>;
  const map: Record<string, { v: any; label: string }> = {
    draft: { v: "outline", label: "Draft" },
    pending_approval: { v: "secondary", label: "Pending" },
    approved: { v: "default", label: "Approved" },
    archived: { v: "outline", label: "Archived" },
  };
  const m = map[status ?? "draft"] ?? map.draft;
  return <Badge variant={m.v}>{m.label}</Badge>;
}

function Inner() {
  const { data: rows = [], isLoading } = useTemplates();
  const [editing, setEditing] = useState<TemplateRow | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const open = editing !== undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.code, r.category, r.subcategory, r.module_code, r.department_code]
        .filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, TemplateRow[]>();
    TEMPLATE_CATEGORIES.forEach((g) => map.set(g.category, []));
    filtered.forEach((r) => {
      const k = r.category ?? "Uncategorized";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Official Communication Templates</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Enterprise template designer for every official document the Social Security Board issues —
              letters, certificates, statements and notices. Layout, branding and content blocks are assembled
              at runtime from the <Link to="/admin/organization/media-library" className="underline text-primary">Communication Assets Library</Link>.
            </p>
          </div>
        </div>
        <OrgActionGate permission={ORG_PERMS.templates.manage}>
          <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" /> New Template</Button>
        </OrgActionGate>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_CATEGORIES.map((g) => (
              <Badge key={g.category} variant="outline" className="text-xs">
                {g.category} <span className="ml-1.5 text-muted-foreground">({rows.filter((r) => r.category === g.category).length})</span>
              </Badge>
            ))}
          </div>
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search templates…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="flex justify-center p-12"><Loader2 className="animate-spin" /></CardContent></Card>
      ) : grouped.map(([category, list]) => (
        <Card key={category}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">{category}</h2>
                <Badge variant="secondary" className="text-xs">{list.length}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {TEMPLATE_CATEGORIES.find((g) => g.category === category)?.description}
              </div>
            </div>
            {list.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No templates in this category yet. <button className="underline text-primary" onClick={() => setEditing({ id: "", name: "", category, subcategory: null } as any)}>Create one</button>.
              </div>
            ) : (
              <Table sticky>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Module / Dept</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        {r.code && <div className="text-xs text-muted-foreground font-mono">{r.code}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{r.subcategory ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.module_code ?? "—"}
                        {r.department_code ? <span className="text-muted-foreground"> · {r.department_code}</span> : null}
                      </TableCell>
                      <TableCell className="text-xs">{r.version ?? "—"} <span className="text-muted-foreground">#{r.version_no ?? 1}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.effective_from ?? "—"} → {r.effective_to ?? "open"}</TableCell>
                      <TableCell>{statusBadge(r.status, r.is_active)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          <OrgActionGate permission={ORG_PERMS.templates.manage}>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Edit className="h-4 w-4" /></Button>
                          </OrgActionGate>
                          <OrgActionGate permission={ORG_PERMS.templates.manage}>
                            <DeleteActionButton entityType="comm_letterhead" entityId={r.id} entityName={r.name} />
                          </OrgActionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}

      <TemplateDesignerDialog open={open} onOpenChange={(v) => !v && setEditing(undefined)} initial={editing ?? null} />
    </div>
  );
}

export default function TemplatesDesignerPage() {
  return <PermissionWrapper moduleName="org_templates"><Inner /></PermissionWrapper>;
}
