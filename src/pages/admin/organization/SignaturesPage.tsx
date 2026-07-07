/**
 * Brand Assets → Signatures — production manager for comm_email_signature.
 * Handles create / edit / clone / archive with scope (ORGANIZATION / DEPARTMENT /
 * MODULE / OFFICER), designation, effective dates, is_default (one per scope,
 * enforced by unique index), status lifecycle and preview.
 * Assignment / resolution happens in Configuration Center → Communication.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenLine, Plus, Pencil, Copy, Archive, Trash2, Search, Loader2, Eye, Star } from "lucide-react";
import { WhereUsedButton } from "@/components/comm/WhereUsedDialog";
import { toast } from "sonner";
import { softArchiveOrgEntity, OM3_EVENTS } from "@/platform/organization/orgMutations";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const sb = supabase as any;

type ScopeType = "ORGANIZATION" | "DEPARTMENT" | "MODULE" | "OFFICER";
type Status = "DRAFT" | "ACTIVE" | "ARCHIVED";

interface Signature {
  id: string;
  code: string | null;
  name: string;
  designation: string | null;
  scope_type: ScopeType;
  scope_code: string | null;
  officer_user_code: string | null;
  html_signature: string | null;
  plain_text_signature: string | null;
  is_default: boolean;
  effective_from: string | null;
  effective_to: string | null;
  version: number;
  status: Status;
  is_active: boolean;
}

const EMPTY: Partial<Signature> = {
  name: "", code: "", designation: "", scope_type: "ORGANIZATION", scope_code: "",
  officer_user_code: "", html_signature: "", plain_text_signature: "",
  is_default: false, effective_from: null, effective_to: null,
  version: 1, status: "ACTIVE", is_active: true,
};

const SCOPES: ScopeType[] = ["ORGANIZATION", "DEPARTMENT", "MODULE", "OFFICER"];

function SignaturesPageInner() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeType | "ALL">("ALL");
  const [editing, setEditing] = useState<Partial<Signature> | null>(null);
  const [previewing, setPreviewing] = useState<Signature | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["comm_email_signature", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("comm_email_signature").select("*").order("scope_type").order("name");
      if (error) throw error;
      return (data ?? []) as Signature[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Partial<Signature>) => {
      if (row.effective_from && row.effective_to && row.effective_from > row.effective_to) {
        throw new Error("Effective From must be on or before Effective To");
      }
      const payload: any = {
        code: row.code?.trim() || null,
        name: row.name,
        designation: row.designation || null,
        scope_type: row.scope_type || "ORGANIZATION",
        scope_code: row.scope_code?.trim() || null,
        officer_user_code: row.officer_user_code?.trim() || null,
        html_signature: row.html_signature || null,
        plain_text_signature: row.plain_text_signature || null,
        is_default: row.is_default ?? false,
        effective_from: row.effective_from || null,
        effective_to: row.effective_to || null,
        version: row.version ?? 1,
        status: row.status || "ACTIVE",
        is_active: (row.status ?? "ACTIVE") === "ACTIVE",
      };
      const { error } = row.id
        ? await sb.from("comm_email_signature").update(payload).eq("id", row.id)
        : await sb.from("comm_email_signature").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["comm_email_signature"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("comm_email_signature")
        .update({ status: "ARCHIVED", is_active: false, is_default: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Archived"); qc.invalidateQueries({ queryKey: ["comm_email_signature"] }); },
    onError: (e: any) => toast.error(e.message ?? "Archive failed"),
  });

  const del = useMutation({
    mutationFn: async (row: Signature) => {
      // Safety: refuse if any assignment references this signature id
      const { data: refs } = await sb.from("core_configuration_assignment")
        .select("id").eq("resource_type", "SIGNATURE").contains("resource_ref", { id: row.id }).limit(1);
      if (refs && refs.length > 0) throw new Error("In use by a Configuration Center assignment — archive instead.");
      // OM-3: signatures are referenced by templates + Config Center bindings; soft archive only.
      await softArchiveOrgEntity({
        table: 'comm_email_signature',
        id: row.id,
        eventCode: OM3_EVENTS.signatureDeactivated,
        displayName: row.name,
        before: row as unknown as Record<string, unknown>,
        statusColumn: 'status',
        statusValue: 'ARCHIVED',
      });
    },
    onSuccess: () => { toast.success("Signature deactivated"); qc.invalidateQueries({ queryKey: ["comm_email_signature"] }); },
    onError: (e: any) => toast.error(e.message ?? "Deactivate failed"),
  });

  const clone = (r: Signature) => setEditing({
    ...r, id: undefined, code: (r.code ?? "") + "_COPY", name: r.name + " (copy)",
    is_default: false, version: 1, status: "DRAFT",
  } as Partial<Signature>);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (scopeFilter !== "ALL" && r.scope_type !== scopeFilter) return false;
      if (!needle) return true;
      return [r.name, r.code, r.designation, r.officer_user_code, r.scope_code]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [rows, q, scopeFilter]);

  const statusVariant = (s: Status) => s === "ACTIVE" ? "default" : s === "DRAFT" ? "secondary" : "outline";

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <PenLine className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Signatures</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Officer, departmental, module and organization signatures. Signature images (scanned signature,
            seal) live in the <Link to="/admin/org/assets/media" className="underline text-primary">Media Library</Link>.
            Bind a signature to a module, workflow stage or event in{" "}
            <Link to="/admin/org/configuration-center/branding" className="underline text-primary">
              Configuration Center → Branding
            </Link>.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> New</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-2 flex-wrap items-center">
          <div className="relative max-w-sm flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search signatures…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All scopes</SelectItem>
              {SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">No signatures.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code / Name</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.code && <div className="text-[10px] font-mono text-muted-foreground">{r.code}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.scope_type}{r.scope_code ? ` · ${r.scope_code}` : ""}</Badge></TableCell>
                    <TableCell className="text-xs">{r.designation ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.officer_user_code ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.effective_from ?? "—"}{r.effective_to ? ` → ${r.effective_to}` : ""}
                    </TableCell>
                    <TableCell>{r.is_default && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)} className="text-[10px]">{r.status}</Badge></TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Preview" onClick={() => setPreviewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Clone" onClick={() => clone(r)}><Copy className="h-3.5 w-3.5" /></Button>
                      <WhereUsedButton assetId={r.id} assetName={r.name} />
                      {r.status !== "ARCHIVED" && (
                        <Button size="sm" variant="ghost" title="Archive" onClick={() => archive.mutate(r.id)}>
                          <Archive className="h-3.5 w-3.5 text-amber-600" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" title="Delete" onClick={() => confirm(`Delete "${r.name}"?`) && del.mutate(r)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{editing.id ? "Edit signature" : "New signature"}</DialogTitle></DialogHeader>
            <Tabs defaultValue="core">
              <TabsList><TabsTrigger value="core">Core</TabsTrigger><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="lifecycle">Lifecycle</TabsTrigger></TabsList>

              <TabsContent value="core" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="ORG_STD_SIG" /></div>
                  <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                  <div>
                    <Label>Scope</Label>
                    <Select value={editing.scope_type ?? "ORGANIZATION"} onValueChange={(v) => setEditing({ ...editing, scope_type: v as ScopeType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Scope code</Label><Input value={editing.scope_code ?? ""} onChange={(e) => setEditing({ ...editing, scope_code: e.target.value })} placeholder="e.g. HR, LEGAL" disabled={editing.scope_type === "ORGANIZATION"} /></div>
                  <div><Label>Designation</Label><Input value={editing.designation ?? ""} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} placeholder="Director, Manager…" /></div>
                  <div><Label>Officer user code</Label><Input value={editing.officer_user_code ?? ""} onChange={(e) => setEditing({ ...editing, officer_user_code: e.target.value })} placeholder="JDOE" /></div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-3">
                <div><Label>HTML signature</Label><Textarea rows={8} value={editing.html_signature ?? ""} onChange={(e) => setEditing({ ...editing, html_signature: e.target.value })} placeholder="<p><strong>{{officer.name}}</strong><br/>{{officer.designation}}</p>" className="font-mono text-xs" /></div>
                <div><Label>Plain-text fallback</Label><Textarea rows={4} value={editing.plain_text_signature ?? ""} onChange={(e) => setEditing({ ...editing, plain_text_signature: e.target.value })} /></div>
                {editing.html_signature && (
                  <div className="border rounded p-3 bg-muted/30">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Preview</div>
                    <div className="text-sm" dangerouslySetInnerHTML={{ __html: editing.html_signature }} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lifecycle" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Effective from</Label><Input type="date" value={editing.effective_from ?? ""} onChange={(e) => setEditing({ ...editing, effective_from: e.target.value || null })} /></div>
                  <div><Label>Effective to</Label><Input type="date" value={editing.effective_to ?? ""} onChange={(e) => setEditing({ ...editing, effective_to: e.target.value || null })} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editing.status ?? "ACTIVE"} onValueChange={(v) => setEditing({ ...editing, status: v as Status })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Version</Label><Input type="number" min={1} value={editing.version ?? 1} onChange={(e) => setEditing({ ...editing, version: Number(e.target.value) || 1 })} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_default ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} />
                  <Label>Default signature for this scope</Label>
                </div>
                <p className="text-xs text-muted-foreground">Only one default per scope is allowed. Setting this may replace the current default (a constraint will reject if a conflict exists).</p>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.name || save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {previewing && (
        <Dialog open onOpenChange={(o) => !o && setPreviewing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Preview — {previewing.name}</DialogTitle></DialogHeader>
            <div className="border rounded p-4 bg-white text-black">
              {previewing.html_signature
                ? <div dangerouslySetInnerHTML={{ __html: previewing.html_signature }} />
                : <pre className="whitespace-pre-wrap font-sans text-sm">{previewing.plain_text_signature ?? "(no content)"}</pre>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function SignaturesPage() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <SignaturesPageInner />
    </PermissionWrapper>
  );
}
