/**
 * Layout Blocks admin page — list + CRUD entry point.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Blocks, Loader2, Plus, Pencil, Search } from "lucide-react";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { OrgActionGate, ORG_PERMS } from "@/platform/organization/orgActionPermissions";
import { LayoutBlockEditorDialog, BLOCK_KINDS, type BlockKind, type LayoutBlockRow } from "@/components/comm/layout/LayoutBlockEditorDialog";

const sb = supabase as any;

function useBlocks() {
  return useQuery({
    queryKey: ["layout_blocks"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_layout_block")
        .select("id,code,name,description,block_kind,module_code,language_code,version,lifecycle_state,is_system,is_active,updated_at")
        .order("block_kind").order("is_system", { ascending: false }).order("name");
      if (error) throw error;
      return (data ?? []) as LayoutBlockRow[];
    },
    staleTime: 30_000,
  });
}

function Inner() {
  const { data: rows = [], isLoading } = useBlocks();
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LayoutBlockRow | null>(null);
  const [defaultKind, setDefaultKind] = useState<BlockKind>("EMAIL_HEADER");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!kindFilter || r.block_kind === kindFilter) &&
      (!needle || `${r.name} ${r.code ?? ""} ${r.description ?? ""}`.toLowerCase().includes(needle))
    );
  }, [rows, q, kindFilter]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = async (row: LayoutBlockRow) => {
    // fetch full record with config
    const { data } = await sb.from("comm_layout_block").select("*").eq("id", row.id).maybeSingle();
    setEditing(data ?? row);
    setDefaultKind(row.block_kind);
    setOpen(true);
  };

  return (
    <div className="p-2 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Blocks className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Layout Blocks</h2>
            <p className="text-sm text-muted-foreground">
              Reusable header/footer compositions used by Base Layouts. Blocks reference Organization Profile, Media Library, Text Blocks, and Disclaimers — no duplication.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded border bg-background px-2 text-sm"
            value={defaultKind}
            onChange={(e) => setDefaultKind(e.target.value as BlockKind)}
          >
            {BLOCK_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <OrgActionGate permission={ORG_PERMS.templates.manage}>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Block</Button>
          </OrgActionGate>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <select className="h-9 rounded border bg-background px-2 text-sm" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
          <option value="">All kinds</option>
          {BLOCK_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Lang</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No blocks match.</TableCell>
                  </TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => openEdit(r)}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs font-mono">{r.block_kind}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{r.code}</TableCell>
                    <TableCell className="text-xs">{r.language_code}</TableCell>
                    <TableCell><Badge variant="outline">{r.lifecycle_state}</Badge></TableCell>
                    <TableCell>{r.is_system ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}</TableCell>
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

      <LayoutBlockEditorDialog open={open} onOpenChange={setOpen} initial={editing} defaultKind={defaultKind} />
    </div>
  );
}

export default function LayoutBlocksPage() {
  return <PermissionWrapper moduleName="org_layout_blocks"><Inner /></PermissionWrapper>;
}
