/**
 * Communication Library → Categories (Hub)
 * Central master hub for all category taxonomies used across the communication
 * platform: asset categories, template categories, text-block categories and
 * token groups. Each tab supports Add / Edit / Enable / Disable / Delete
 * (guarded by usage) so this screen is the single source of truth even when
 * the same values can also be edited in-context on the related pages.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderTree, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { softArchiveOrgEntity, OM3_EVENTS } from "@/platform/organization/orgMutations";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const sb = supabase as any;
const AssetCategoryMasterPage = lazy(() => import("@/pages/admin/organization/AssetCategoryMasterPage"));

export default function CategoriesHubPage() {
  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <FolderTree className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Manage category masters used across assets, templates, text blocks and token groups.
            Values entered here appear in every dropdown that consumes them; inactive entries are hidden
            from create/edit forms but remain visible on existing records.
          </p>
        </div>
      </div>

      <Tabs defaultValue="asset">
        <TabsList>
          <TabsTrigger value="asset">Asset Categories</TabsTrigger>
          <TabsTrigger value="template">Template Categories</TabsTrigger>
          <TabsTrigger value="text-blocks">Text Block Categories</TabsTrigger>
          <TabsTrigger value="tokens">Token Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="asset">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
            <AssetCategoryMasterPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="template"><TemplateCategoriesTab /></TabsContent>
        <TabsContent value="text-blocks"><ReferenceValuesTab groupCode="CORE_TEXT_BLOCK_CATEGORY" usageTable="core_text_block" usageColumn="category" title="Text Block Categories" /></TabsContent>
        <TabsContent value="tokens"><ReferenceValuesTab groupCode="CORE_TOKEN_GROUP" usageTable="core_template_token" usageColumn="token_group" title="Token Groups" /></TabsContent>
      </Tabs>
    </div>
  );
}

/* --------------------------- Template Categories --------------------------- */

interface TemplateCategory {
  id: string;
  code: string;
  name: string;
  module_code: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}
const EMPTY_TCAT: Partial<TemplateCategory> = { code: "", name: "", module_code: "CORE", description: "", sort_order: 100, is_active: true };

function TemplateCategoriesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<TemplateCategory> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_template_category", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_template_category").select("*").order("module_code").order("sort_order").order("code");
      if (error) throw error;
      return (data ?? []) as TemplateCategory[];
    },
  });

  const { data: usage = new Map() } = useQuery({
    queryKey: ["core_template", "category-usage"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_template").select("category_id");
      if (error) throw error;
      const m = new Map<string, number>();
      (data ?? []).forEach((r: any) => { if (r.category_id) m.set(r.category_id, (m.get(r.category_id) ?? 0) + 1); });
      return m;
    },
  });

  const save = useMutation({
    mutationFn: async (r: Partial<TemplateCategory>) => {
      const code = r.code?.trim().toUpperCase();
      const name = r.name?.trim();
      if (!code || !name) throw new Error("Code and name are required");
      // Duplicate check (case-insensitive, per module)
      const dup = rows.find((x) => x.id !== r.id && x.module_code === (r.module_code ?? "CORE") && (x.code.toUpperCase() === code || x.name.toLowerCase() === name.toLowerCase()));
      if (dup) throw new Error(`Duplicate ${dup.code === code ? "code" : "name"} in module ${dup.module_code}`);
      const payload = { code, name, module_code: r.module_code ?? "CORE", description: r.description ?? null, sort_order: r.sort_order ?? 100, is_active: r.is_active ?? true };
      const { error } = r.id ? await sb.from("core_template_category").update(payload).eq("id", r.id) : await sb.from("core_template_category").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["core_template_category"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (row: TemplateCategory) => {
      if ((usage as Map<string, number>).get(row.id)) throw new Error("Category is in use by templates — deactivate instead.");
      // OM-3: soft archive to preserve referential integrity with template rows using this category.
      await softArchiveOrgEntity({
        table: 'core_template_category',
        id: row.id,
        eventCode: OM3_EVENTS.assetCategoryDeactivated,
        displayName: row.code,
        before: row as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => { toast.success("Category deactivated"); qc.invalidateQueries({ queryKey: ["core_template_category"] }); },
    onError: (e: any) => toast.error(e.message ?? "Deactivate failed"),
  });

  const toggle = useMutation({
    mutationFn: async (r: TemplateCategory) => {
      const { error } = await sb.from("core_template_category").update({ is_active: !r.is_active }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["core_template_category"] }),
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  return (
    <Card className="mt-3">
      <CardContent className="p-0">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Categories consumed by template designer &amp; template picker.</div>
          <Button size="sm" onClick={() => setEditing(EMPTY_TCAT)}><Plus className="h-4 w-4" /> New Category</Button>
        </div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No template categories.</div>
        ) : (
          <Table sticky>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Module</TableHead><TableHead>Description</TableHead><TableHead>Order</TableHead><TableHead>Used</TableHead><TableHead>Status</TableHead><TableHead className="w-[130px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => {
                const used = (usage as Map<string, number>).get(r.id) ?? 0;
                return (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.module_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{r.description ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.sort_order}</TableCell>
                    <TableCell><Badge variant="secondary">{used}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={() => toggle.mutate(r)} />
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" disabled={used > 0} title={used ? "In use — cannot delete" : "Delete"} onClick={() => confirm(`Delete "${r.code}"?`) && del.mutate(r)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing.id ? "Edit template category" : "New template category"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="LETTER" /></div>
              <div><Label>Module</Label><Input value={editing.module_code ?? "CORE"} onChange={(e) => setEditing({ ...editing, module_code: e.target.value.toUpperCase() })} /></div>
              <div className="col-span-2"><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Display order</Label><Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} /></div>
              <div className="flex items-end gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={save.isPending} onClick={() => save.mutate(editing)}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

/* ---------------- Reference-value tab (text-block cats & token groups) ---------------- */

interface RefValue {
  id: string;
  group_id: string;
  value_code: string;
  value_label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  module_code: string | null;
}

function ReferenceValuesTab({ groupCode, usageTable, usageColumn, title }: { groupCode: string; usageTable: string; usageColumn: string; title: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<RefValue> | null>(null);

  const { data: group } = useQuery({
    queryKey: ["core_reference_group", groupCode],
    queryFn: async () => {
      const { data, error } = await sb.from("core_reference_group").select("id,group_code,group_name").eq("group_code", groupCode).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_reference_value", groupCode],
    enabled: !!group?.id,
    queryFn: async () => {
      const { data, error } = await sb.from("core_reference_value").select("*").eq("group_id", group.id).order("sort_order").order("value_code");
      if (error) throw error;
      return (data ?? []) as RefValue[];
    },
  });

  const { data: usage = new Map() } = useQuery({
    queryKey: [usageTable, "usage-by", usageColumn],
    queryFn: async () => {
      const { data, error } = await sb.from(usageTable).select(usageColumn);
      if (error) throw error;
      const m = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const raw = r[usageColumn];
        if (!raw) return;
        const k = String(raw).toUpperCase();
        m.set(k, (m.get(k) ?? 0) + 1);
      });
      return m;
    },
  });

  const save = useMutation({
    mutationFn: async (r: Partial<RefValue>) => {
      if (!group?.id) throw new Error("Reference group not found");
      const code = r.value_code?.trim().toUpperCase();
      const label = r.value_label?.trim();
      if (!code || !label) throw new Error("Code and label are required");
      const dup = rows.find((x) => x.id !== r.id && (x.value_code.toUpperCase() === code || x.value_label.toLowerCase() === label.toLowerCase()));
      if (dup) throw new Error(`Duplicate ${dup.value_code === code ? "code" : "label"}`);
      const payload = {
        group_id: group.id, value_code: code, value_label: label,
        description: r.description ?? null, sort_order: r.sort_order ?? 100,
        is_active: r.is_active ?? true, module_code: r.module_code ?? "CORE",
        status: (r.is_active ?? true) ? "ACTIVE" : "INACTIVE",
      };
      const { error } = r.id ? await sb.from("core_reference_value").update(payload).eq("id", r.id) : await sb.from("core_reference_value").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["core_reference_value", groupCode] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (row: RefValue) => {
      if (row.is_system) throw new Error("System values cannot be deleted — deactivate instead.");
      if ((usage as Map<string, number>).get(row.value_code.toUpperCase())) throw new Error("Value is in use — deactivate instead.");
      const { error } = await sb.from("core_reference_value").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["core_reference_value", groupCode] }); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const toggle = useMutation({
    mutationFn: async (r: RefValue) => {
      const next = !r.is_active;
      const { error } = await sb.from("core_reference_value").update({ is_active: next, status: next ? "ACTIVE" : "INACTIVE" }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["core_reference_value", groupCode] }),
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  return (
    <Card className="mt-3">
      <CardContent className="p-0">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{title} — governed centrally; consumed by {usageTable}.</div>
          <Button size="sm" disabled={!group?.id} onClick={() => setEditing({ value_code: "", value_label: "", description: "", sort_order: 100, is_active: true, module_code: "CORE" })}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No entries yet.</div>
        ) : (
          <Table sticky>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Label</TableHead><TableHead>Description</TableHead><TableHead>Order</TableHead><TableHead>Used</TableHead><TableHead>System</TableHead><TableHead>Status</TableHead><TableHead className="w-[130px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => {
                const used = (usage as Map<string, number>).get(r.value_code.toUpperCase()) ?? 0;
                return (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-xs">{r.value_code}</TableCell>
                    <TableCell className="font-medium">{r.value_label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{r.description ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.sort_order}</TableCell>
                    <TableCell><Badge variant="secondary">{used}</Badge></TableCell>
                    <TableCell>{r.is_system ? <Badge variant="outline" className="text-[10px]">System</Badge> : "—"}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggle.mutate(r)} /></TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" disabled={used > 0 || r.is_system} title={r.is_system ? "System value" : used ? "In use" : "Delete"} onClick={() => confirm(`Delete "${r.value_code}"?`) && del.mutate(r)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing.id ? `Edit ${title}` : `New ${title}`}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={editing.value_code ?? ""} onChange={(e) => setEditing({ ...editing, value_code: e.target.value })} placeholder="HEADER" disabled={editing.is_system} /></div>
              <div><Label>Display order</Label><Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><Label>Label *</Label><Input value={editing.value_label ?? ""} onChange={(e) => setEditing({ ...editing, value_label: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="flex items-end gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={save.isPending} onClick={() => save.mutate(editing)}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
