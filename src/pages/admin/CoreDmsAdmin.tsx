import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { Plus, Database, FileType, Link as LinkIcon, ServerCog, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coreDmsService } from "@/services/core/coreDmsService";
import { StorageConfigPanel } from "@/components/admin/dms/StorageConfigPanel";

const sb = supabase as any;

function useTable<T>(table: string, key: string, orderBy: string) {
  return useQuery<T[]>({
    queryKey: [key],
    queryFn: async () => {
      const { data, error } = await sb.from(table).select("*").order(orderBy);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

/* ===== Providers ===== */
function ProvidersTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useTable<any>("core_dms_provider", "core_dms_provider", "provider_code");
  const [editing, setEditing] = useState<any | null>(null);

  const saveMut = useMutation({
    mutationFn: async (r: any) => {
      const payload = { ...r };
      delete payload.id;
      if (r.id) { const { error } = await sb.from("core_dms_provider").update(payload).eq("id", r.id); if (error) throw error; }
      else      { const { error } = await sb.from("core_dms_provider").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Provider saved"); qc.invalidateQueries({ queryKey: ["core_dms_provider"] }); setEditing(null); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const cols: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "provider_code", header: "Code", meta: { label: "Code", pinLeft: true } },
    { accessorKey: "provider_name", header: "Name", meta: { label: "Name" } },
    { accessorKey: "base_url", header: "Base URL", meta: { label: "Base URL" } },
    { accessorKey: "auth_type", header: "Auth", meta: { label: "Auth" } },
    { accessorKey: "is_default", header: "Default",
      cell: ({ getValue }) => getValue() ? <Badge>Default</Badge> : null, meta: { label: "Default" } },
    { accessorKey: "is_active", header: "Status",
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />, meta: { label: "Status" } },
  ], []);

  const actions = buildLgRowActions<any>({ onEdit: (r) => setEditing(r) });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> DMS Providers</CardTitle>
          <CardDescription>External document repositories the platform can talk to.</CardDescription></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              const r = await coreDmsService.validateConfig();
              if (r.ok) toast.success(`OK — ${r.base_url}`); else toast.error(r.reason || "Not configured");
            }}>Validate Config</Button>
            <Button size="sm" onClick={() => setEditing({ provider_code: "", provider_name: "", base_url: "", auth_type: "API_KEY", is_active: true, is_default: false })}>
              <Plus className="h-4 w-4 mr-1" /> New Provider
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <LgDataGrid id="dms-providers" columns={cols} data={rows} isLoading={isLoading} rowActions={actions} searchPlaceholder="Search providers…" />
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} DMS Provider</DialogTitle>
            <DialogDescription>Edit upstream DMS connection details.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={editing.provider_code ?? ""} onChange={e => setEditing({ ...editing, provider_code: e.target.value })} /></div>
                <div><Label>Name</Label><Input value={editing.provider_name ?? ""} onChange={e => setEditing({ ...editing, provider_name: e.target.value })} /></div>
                <div className="col-span-2"><Label>Base URL</Label><Input value={editing.base_url ?? ""} onChange={e => setEditing({ ...editing, base_url: e.target.value })} /></div>
                <div><Label>Auth Type</Label>
                  <Select value={editing.auth_type ?? "API_KEY"} onValueChange={v => setEditing({ ...editing, auth_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["API_KEY","BEARER","BASIC","OAUTH2","NONE"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Header Name</Label><Input value={editing.header_name ?? "x-api-key"} onChange={e => setEditing({ ...editing, header_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between rounded border p-2"><span className="text-sm">Default</span><Switch checked={!!editing.is_default} onCheckedChange={v => setEditing({ ...editing, is_default: v })} /></label>
                <label className="flex items-center justify-between rounded border p-2"><span className="text-sm">Active</span><Switch checked={editing.is_active !== false} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /></label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate(editing)}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ===== Document Types ===== */
function DocumentTypesTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useTable<any>("core_dms_document_type", "core_dms_document_type_all", "type_code");
  const [editing, setEditing] = useState<any | null>(null);

  const saveMut = useMutation({
    mutationFn: async (r: any) => {
      const payload = { ...r };
      if (typeof payload.allowed_extensions === "string") {
        payload.allowed_extensions = payload.allowed_extensions.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      if (r.id) { const { error } = await sb.from("core_dms_document_type").update(payload).eq("id", r.id); if (error) throw error; }
      else      { const { error } = await sb.from("core_dms_document_type").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Type saved"); qc.invalidateQueries({ queryKey: ["core_dms_document_type_all"] }); setEditing(null); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("core_dms_document_type").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Type deleted"); qc.invalidateQueries({ queryKey: ["core_dms_document_type_all"] }); },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const cols: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "module_code", header: "Module", meta: { label: "Module" } },
    { accessorKey: "type_code", header: "Code", meta: { label: "Code", pinLeft: true } },
    { accessorKey: "type_name", header: "Name", meta: { label: "Name" } },
    { accessorKey: "category_code", header: "Category", meta: { label: "Category" } },
    { accessorKey: "allowed_extensions", header: "Extensions",
      cell: ({ getValue }) => (Array.isArray(getValue()) ? (getValue() as string[]).join(", ") : "—"), meta: { label: "Extensions" } },
    { accessorKey: "max_size_mb", header: "Max MB", meta: { label: "Max MB", align: "right" } },
    { accessorKey: "requires_confidential", header: "Conf",
      cell: ({ getValue }) => getValue() ? <Badge variant="destructive">Confidential</Badge> : null, meta: { label: "Confidential" } },
    { accessorKey: "is_active", header: "Status",
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />, meta: { label: "Status" } },
  ], []);

  const actions = buildLgRowActions<any>({
    onEdit: r => setEditing({ ...r, allowed_extensions: Array.isArray(r.allowed_extensions) ? r.allowed_extensions.join(", ") : (r.allowed_extensions ?? "") }),
    onDelete: r => { if (confirm(`Delete ${r.type_code}?`)) deleteMut.mutate(r.id); },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div><CardTitle className="flex items-center gap-2"><FileType className="h-4 w-4" /> Document Types</CardTitle>
          <CardDescription>Catalogue of document types per module (drives upload UI and stage rules).</CardDescription></div>
          <Button size="sm" onClick={() => setEditing({ module_code: "LEGAL", type_code: "", type_name: "", category_code: "EVIDENCE", allowed_extensions: "pdf, doc, docx", max_size_mb: 25, is_active: true, requires_confidential: false })}>
            <Plus className="h-4 w-4 mr-1" /> New Type
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <LgDataGrid id="dms-doc-types" columns={cols} data={rows} isLoading={isLoading} rowActions={actions} searchPlaceholder="Search document types…" />
      </CardContent>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Document Type</DialogTitle>
            <DialogDescription>Defines what users can upload and how it is classified.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Module</Label><Input value={editing.module_code ?? ""} onChange={e => setEditing({ ...editing, module_code: e.target.value })} /></div>
              <div><Label>Type Code</Label><Input value={editing.type_code ?? ""} onChange={e => setEditing({ ...editing, type_code: e.target.value })} /></div>
              <div className="col-span-2"><Label>Type Name</Label><Input value={editing.type_name ?? ""} onChange={e => setEditing({ ...editing, type_name: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={editing.category_code ?? ""} onChange={e => setEditing({ ...editing, category_code: e.target.value })} /></div>
              <div><Label>Max Size (MB)</Label><Input type="number" value={editing.max_size_mb ?? 25} onChange={e => setEditing({ ...editing, max_size_mb: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Allowed Extensions (comma-separated)</Label><Input value={editing.allowed_extensions ?? ""} onChange={e => setEditing({ ...editing, allowed_extensions: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Retention (years)</Label><Input type="number" value={editing.retention_years ?? 7} onChange={e => setEditing({ ...editing, retention_years: Number(e.target.value) })} /></div>
              <label className="flex items-center justify-between rounded border p-2"><span className="text-sm">Confidential by default</span><Switch checked={!!editing.requires_confidential} onCheckedChange={v => setEditing({ ...editing, requires_confidential: v })} /></label>
              <label className="flex items-center justify-between rounded border p-2 col-span-2"><span className="text-sm">Active</span><Switch checked={editing.is_active !== false} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /></label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate(editing)}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ===== Module Mapping ===== */
function ModuleMappingTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useTable<any>("core_dms_module_mapping", "core_dms_module_mapping_all", "module_code");
  const [editing, setEditing] = useState<any | null>(null);

  const saveMut = useMutation({
    mutationFn: async (r: any) => {
      const payload = { ...r };
      if (r.id) { const { error } = await sb.from("core_dms_module_mapping").update(payload).eq("id", r.id); if (error) throw error; }
      else      { const { error } = await sb.from("core_dms_module_mapping").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Mapping saved"); qc.invalidateQueries({ queryKey: ["core_dms_module_mapping_all"] }); setEditing(null); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("core_dms_module_mapping").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Mapping deleted"); qc.invalidateQueries({ queryKey: ["core_dms_module_mapping_all"] }); },
  });

  const cols: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "module_code", header: "Module", meta: { label: "Module", pinLeft: true } },
    { accessorKey: "entity_type", header: "Entity", meta: { label: "Entity" } },
    { accessorKey: "stage_code", header: "Stage", cell: ({ getValue }) => (getValue() as string) || "—", meta: { label: "Stage" } },
    { accessorKey: "document_type_code", header: "Type", meta: { label: "Type" } },
    { accessorKey: "is_required", header: "Required",
      cell: ({ getValue }) => getValue() ? <Badge variant="destructive">Required</Badge> : <Badge variant="outline">Optional</Badge>, meta: { label: "Required" } },
    { accessorKey: "is_active", header: "Status",
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />, meta: { label: "Status" } },
  ], []);

  const actions = buildLgRowActions<any>({
    onEdit: r => setEditing(r),
    onDelete: r => { if (confirm("Delete mapping?")) deleteMut.mutate(r.id); },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div><CardTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Module → Document Type Mapping</CardTitle>
          <CardDescription>Which document types apply to which module entity / stage.</CardDescription></div>
          <Button size="sm" onClick={() => setEditing({ module_code: "LEGAL", entity_type: "LG_CASE", document_type_code: "", is_required: false, is_active: true })}>
            <Plus className="h-4 w-4 mr-1" /> New Mapping
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <LgDataGrid id="dms-module-mapping" columns={cols} data={rows} isLoading={isLoading} rowActions={actions} searchPlaceholder="Search mappings…" />
      </CardContent>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Module Mapping</DialogTitle>
            <DialogDescription>Map a document type to a module entity, optionally scoped to a stage.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Module</Label><Input value={editing.module_code ?? ""} onChange={e => setEditing({ ...editing, module_code: e.target.value })} /></div>
              <div><Label>Entity Type</Label><Input value={editing.entity_type ?? ""} onChange={e => setEditing({ ...editing, entity_type: e.target.value })} /></div>
              <div><Label>Stage Code</Label><Input value={editing.stage_code ?? ""} onChange={e => setEditing({ ...editing, stage_code: e.target.value })} /></div>
              <div><Label>Document Type</Label><Input value={editing.document_type_code ?? ""} onChange={e => setEditing({ ...editing, document_type_code: e.target.value })} /></div>
              <label className="flex items-center justify-between rounded border p-2"><span className="text-sm">Required</span><Switch checked={!!editing.is_required} onCheckedChange={v => setEditing({ ...editing, is_required: v })} /></label>
              <label className="flex items-center justify-between rounded border p-2"><span className="text-sm">Active</span><Switch checked={editing.is_active !== false} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /></label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate(editing)}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function CoreDmsAdmin() {
  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <PageHeader
        title="Central DMS Administration"
        subtitle="Configure the central Document Management System used across modules"
        breadcrumbs={[{ label: "Admin" }, { label: "Central DMS" }]}
      />
      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="types">Document Types</TabsTrigger>
          <TabsTrigger value="mapping">Module Mapping</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="mt-4"><ProvidersTab /></TabsContent>
        <TabsContent value="types" className="mt-4"><DocumentTypesTab /></TabsContent>
        <TabsContent value="mapping" className="mt-4"><ModuleMappingTab /></TabsContent>
      </Tabs>
    </div>
  );
}
