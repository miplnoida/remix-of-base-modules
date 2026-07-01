/**
 * Communication Library → Tokens
 * Merge-token registry (core_template_token). Tokens are *not* text blocks —
 * they are typed placeholders resolved at runtime from source entities.
 * Assignment / resolution wiring lives in the template designer + resolver.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Braces, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TokenResolverTester } from "@/components/comm/TokenResolverTester";

const sb = supabase as any;

interface Token {
  id: string;
  token_code: string;
  token_label: string | null;
  token_group: string | null;
  module_code: string | null;
  entity_type: string | null;
  resolver_service: string | null;
  sample_value: string | null;
  description: string | null;
  data_type: string | null;
  is_required: boolean;
  is_active: boolean;
}

const DATA_TYPES = ["string", "number", "date", "datetime", "boolean", "currency", "json"];
const EMPTY: Partial<Token> = { token_code: "", token_label: "", data_type: "string", is_active: true, is_required: false };

export default function TokensPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("__all");
  const [editing, setEditing] = useState<Partial<Token> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_template_token", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_template_token").select("*").order("module_code", { nullsFirst: false }).order("token_code");
      if (error) throw error;
      return (data ?? []) as Token[];
    },
  });

  const save = useMutation({
    mutationFn: async (r: Partial<Token>) => {
      const payload = {
        token_code: r.token_code, token_label: r.token_label || null, token_group: r.token_group || null,
        module_code: r.module_code || null, entity_type: r.entity_type || null,
        resolver_service: r.resolver_service || null, sample_value: r.sample_value || null,
        description: r.description || null, data_type: r.data_type || "string",
        is_required: r.is_required ?? false, is_active: r.is_active ?? true,
      };
      const { error } = r.id ? await sb.from("core_template_token").update(payload).eq("id", r.id) : await sb.from("core_template_token").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["core_template_token"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("core_template_token").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["core_template_token"] }); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const modules = useMemo(() => Array.from(new Set(rows.map((r) => r.module_code).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (mod !== "__all" && (r.module_code ?? "") !== mod) return false;
      if (!needle) return true;
      return [r.token_code, r.token_label, r.description, r.entity_type].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [rows, q, mod]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <Braces className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Tokens</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Merge tokens available inside templates and text blocks. Each token declares its source entity,
            resolver, data type and a sample value used for preview. Tokens are resolved at runtime — never hard-code
            values into templates.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> New Token</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3 items-end flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search tokens…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Module</Label>
            <Select value={mod} onValueChange={setMod}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All modules</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <TokenResolverTester tokens={rows} />

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : filtered.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">No tokens.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Label</TableHead><TableHead>Module</TableHead><TableHead>Entity</TableHead><TableHead>Type</TableHead><TableHead>Sample</TableHead><TableHead>Flags</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{`{{${r.token_code}}}`}</TableCell>
                    <TableCell className="text-sm">{r.token_label ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.module_code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.entity_type ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{r.data_type ?? "string"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{r.sample_value ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.is_required && <Badge variant="destructive" className="text-[10px] mr-1">required</Badge>}
                      {r.is_active ? <Badge className="text-[10px]">active</Badge> : <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${r.token_code}"?`) && del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing.id ? "Edit token" : "New token"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Token code *</Label><Input value={editing.token_code ?? ""} onChange={(e) => setEditing({ ...editing, token_code: e.target.value })} placeholder="employer.legal_name" className="font-mono" /></div>
              <div className="col-span-2"><Label>Label</Label><Input value={editing.token_label ?? ""} onChange={(e) => setEditing({ ...editing, token_label: e.target.value })} placeholder="Employer legal name" /></div>
              <div><Label>Module</Label><Input value={editing.module_code ?? ""} onChange={(e) => setEditing({ ...editing, module_code: e.target.value })} placeholder="LEGAL" /></div>
              <div><Label>Group</Label><Input value={editing.token_group ?? ""} onChange={(e) => setEditing({ ...editing, token_group: e.target.value })} placeholder="employer" /></div>
              <div><Label>Entity type</Label><Input value={editing.entity_type ?? ""} onChange={(e) => setEditing({ ...editing, entity_type: e.target.value })} placeholder="au_er_master" /></div>
              <div><Label>Resolver service</Label><Input value={editing.resolver_service ?? ""} onChange={(e) => setEditing({ ...editing, resolver_service: e.target.value })} placeholder="employerResolver" /></div>
              <div><Label>Data type</Label>
                <Select value={editing.data_type ?? "string"} onValueChange={(v) => setEditing({ ...editing, data_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DATA_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sample value</Label><Input value={editing.sample_value ?? ""} onChange={(e) => setEditing({ ...editing, sample_value: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_required ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_required: v })} /><Label>Required</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.token_code || save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
