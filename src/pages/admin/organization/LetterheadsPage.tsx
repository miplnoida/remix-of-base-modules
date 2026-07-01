/**
 * Brand Assets → Letterheads
 * Structured letterhead records only. Not the template designer.
 * Each row is a page-layout definition (page size / orientation / margins) that
 * references reusable Media Library assets by asset_code (logo / seal / header
 * / footer / watermark). Templates and PDF generation resolve these letterheads
 * to lay out official letters, notices, certificates, statements and receipts.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Loader2, Search, Ruler, Plus, Pencil, Copy, Archive, Eye } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { LetterheadPreview } from "@/components/comm/LetterheadPreview";
import { WhereUsedButton } from "@/components/comm/WhereUsedDialog";

const sb = supabase as any;

interface LetterheadRow {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  subcategory: string | null;
  module_code: string | null;
  document_type: string | null;
  is_active: boolean;
  design_config: any;
}

function useLetterheads() {
  return useQuery({
    queryKey: ["comm_letterhead", "structured-list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_letterhead")
        .select("id,code,name,category,subcategory,module_code,document_type,is_active,design_config")
        .order("module_code", { ascending: true, nullsFirst: false })
        .order("code");
      if (error) throw error;
      return (data ?? []) as LetterheadRow[];
    },
    staleTime: 60_000,
  });
}

function AssetChip({ label, code }: { label: string; code?: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] mr-1 mb-1">
      <span className="text-muted-foreground">{label}:</span>
      <code className="font-mono">{code}</code>
    </span>
  );
}

type EditRow = Partial<LetterheadRow> & { design_config?: any };
const EMPTY_EDIT: EditRow = { name: "", code: "", category: "", subcategory: "", module_code: "", document_type: "", is_active: true, design_config: { page_size: "A4", orientation: "portrait", margins: { top: 20, bottom: 20, left: 20, right: 20 } } };

function Inner() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useLetterheads();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<EditRow | null>(null);
  const [previewing, setPreviewing] = useState<LetterheadRow | null>(null);

  const save = useMutation({
    mutationFn: async (r: EditRow) => {
      const payload = {
        code: r.code || null, name: r.name, category: r.category || null, subcategory: r.subcategory || null,
        module_code: r.module_code || null, document_type: r.document_type || null,
        is_active: r.is_active ?? true, design_config: r.design_config ?? {},
      };
      const { error } = r.id ? await sb.from("comm_letterhead").update(payload).eq("id", r.id) : await sb.from("comm_letterhead").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["comm_letterhead"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const archive = useMutation({
    mutationFn: async (r: LetterheadRow) => {
      const { error } = await sb.from("comm_letterhead").update({ is_active: !r.is_active }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: (_d, r) => { toast.success(r.is_active ? "Archived" : "Restored"); qc.invalidateQueries({ queryKey: ["comm_letterhead"] }); },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const clone = (r: LetterheadRow) => setEditing({
    name: `${r.name} (copy)`, code: r.code ? `${r.code}_COPY` : "",
    category: r.category ?? "", subcategory: r.subcategory ?? "",
    module_code: r.module_code ?? "", document_type: r.document_type ?? "",
    is_active: false, design_config: r.design_config ?? {},
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => [r.code, r.name, r.module_code, r.category, r.subcategory, r.document_type].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, LetterheadRow[]>();
    filtered.forEach((r) => { const k = r.module_code ?? "ORG"; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <Ruler className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Letterheads</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Manage official letterhead layouts — page size, orientation, margins and the
            header / footer / logo / seal / watermark used when generating letters, notices,
            certificates, statements and PDFs. Binaries live in the{" "}
            <Link to="/admin/org/assets/media" className="underline text-primary">Media Library</Link>{" "}
            and are referenced here by <code className="font-mono">asset_code</code>. Assign a
            letterhead to a module or event in{" "}
            <Link to="/admin/org/configuration-center?domain=branding" className="underline text-primary">
              Configuration Center → Branding
            </Link>. Message body content is authored in{" "}
            <Link to="/admin/org/library/templates" className="underline text-primary">
              Communication Library → Templates
            </Link>.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(EMPTY_EDIT)}><Plus className="h-4 w-4" /> New Letterhead</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search letterheads…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="flex justify-center p-12"><Loader2 className="animate-spin" /></CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground text-center">No letterheads found.</CardContent></Card>
      ) : grouped.map(([moduleCode, list]) => (
        <Card key={moduleCode}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Module: {moduleCode}</h2>
                <Badge variant="secondary" className="text-xs">{list.length}</Badge>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code / Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Doc Type</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Margins</TableHead>
                  <TableHead>Asset References</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => {
                  const dc = r.design_config ?? {};
                  const m = dc.margins ?? {};
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{r.code ?? "—"}</div>
                        <div className="text-sm">{r.name}</div>
                        {dc.is_default && <Badge variant="default" className="mt-1 text-[10px]">Default</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.category ?? "—"}
                        {r.subcategory && <div className="text-muted-foreground">{r.subcategory}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{r.document_type ?? "—"}</TableCell>
                      <TableCell className="text-xs">{(dc.page_size ?? "A4")} · {(dc.orientation ?? "portrait")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        T {m.top ?? "—"} · B {m.bottom ?? "—"}<br />
                        L {m.left ?? "—"} · R {m.right ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <AssetChip label="header" code={dc.header_asset_code} />
                        <AssetChip label="footer" code={dc.footer_asset_code} />
                        <AssetChip label="logo" code={dc.logo_asset_code} />
                        <AssetChip label="seal" code={dc.seal_asset_code} />
                        <AssetChip label="watermark" code={dc.watermark_asset_code} />
                      </TableCell>
                      <TableCell>
                        {r.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Archived</Badge>}
                      </TableCell>
                      <TableCell className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" title="Clone" onClick={() => clone(r)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" title="Preview" onClick={() => setPreviewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                        <WhereUsedButton assetId={r.id} assetName={r.name} />
                        <Button size="sm" variant="ghost" title={r.is_active ? "Archive" : "Restore"} onClick={() => archive.mutate(r)}>
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? "Edit letterhead" : "New letterhead"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="STANDARD_LETTERHEAD" className="font-mono" /></div>
              <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Official Letters" /></div>
              <div><Label>Subcategory</Label><Input value={editing.subcategory ?? ""} onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })} /></div>
              <div><Label>Module</Label><Input value={editing.module_code ?? ""} onChange={(e) => setEditing({ ...editing, module_code: e.target.value })} placeholder="LEGAL" /></div>
              <div><Label>Document type</Label><Input value={editing.document_type ?? ""} onChange={(e) => setEditing({ ...editing, document_type: e.target.value })} placeholder="letter | memo | notice" /></div>
              <div className="col-span-2 grid grid-cols-2 gap-3 border-t pt-3">
                <div><Label>Page size</Label>
                  <Select value={editing.design_config?.page_size ?? "A4"} onValueChange={(v) => setEditing({ ...editing, design_config: { ...(editing.design_config ?? {}), page_size: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["A4", "A5", "Letter", "Legal"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Orientation</Label>
                  <Select value={editing.design_config?.orientation ?? "portrait"} onValueChange={(v) => setEditing({ ...editing, design_config: { ...(editing.design_config ?? {}), orientation: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["portrait", "landscape"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="col-span-2"><Label>Asset codes (design_config JSON)</Label>
                <Textarea rows={5} className="font-mono text-xs" value={JSON.stringify(editing.design_config ?? {}, null, 2)}
                  onChange={(e) => { try { setEditing({ ...editing, design_config: JSON.parse(e.target.value || "{}") }); } catch { /* keep typing */ } }} />
                <p className="text-xs text-muted-foreground mt-1">Include <code>header_asset_code</code>, <code>footer_asset_code</code>, <code>logo_asset_code</code>, <code>seal_asset_code</code>, <code>watermark_asset_code</code>, <code>margins</code>.</p>
              </div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.name || save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {previewing && (
        <Dialog open onOpenChange={(o) => !o && setPreviewing(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Preview — {previewing.name}</DialogTitle>
            </DialogHeader>
            <div className="bg-muted/40 p-4 rounded overflow-auto max-h-[75vh]">
              <LetterheadPreview design={previewing.design_config ?? {}} />
            </div>
            <p className="text-xs text-muted-foreground">
              Rendered at {previewing.design_config?.page_size ?? "A4"} · {previewing.design_config?.orientation ?? "portrait"}.
              Images resolve from Media Library by <code>asset_code</code>; missing assets show a placeholder band.
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function LetterheadsPage() {
  return <PermissionWrapper moduleName="org_letterheads"><Inner /></PermissionWrapper>;
}
