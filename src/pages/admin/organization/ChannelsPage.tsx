/**
 * Communication Library → Channels
 * Channel registry (core_template_channel). Declares delivery channels
 * (email, SMS, WhatsApp, in-app, PDF, print letter, push) with their format,
 * grouping, length limits and attachment support. Provider bindings are
 * assigned per module/event in Configuration Center → Communication.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Radio, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

interface Channel {
  id: string;
  code: string;
  name: string;
  channel_group: string | null;
  format: string | null;
  max_length: number | null;
  supports_attachments: boolean;
  is_active: boolean;
  sort_order: number | null;
}

/** Central allowed channel groups. Existing legacy groups (DIGITAL/DOCUMENT/…) are
 *  merged in at runtime so no in-flight record loses its selected value. */
const CHANNEL_GROUPS = [
  "EMAIL", "SMS", "WHATSAPP", "IN_APP", "PDF", "PRINT_LETTER", "PUSH", "WEBHOOK", "REPORT_EXPORT",
  // Legacy groupings — kept selectable for backward compatibility
  "DIGITAL", "DOCUMENT", "INTEGRATION", "REGULATORY", "PRINT", "VOICE",
];
const FORMATS = ["HTML", "TEXT", "MARKDOWN", "PDF", "IMAGE", "AUDIO"];
const EMPTY: Partial<Channel> = { code: "", name: "", channel_group: "EMAIL", format: "HTML", supports_attachments: false, is_active: true };

function normGroup(v: string | null | undefined): string {
  return (v ?? "").trim().toUpperCase();
}

export default function ChannelsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Channel> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_template_channel", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_template_channel").select("*").order("sort_order", { nullsFirst: false }).order("code");
      if (error) throw error;
      return (data ?? []) as Channel[];
    },
  });

  // Union of allowed groups + whatever the DB currently has (so no in-flight value is lost)
  const groupOptions = useMemo(() => {
    const set = new Set<string>(CHANNEL_GROUPS);
    rows.forEach((r) => { const g = normGroup(r.channel_group); if (g) set.add(g); });
    return Array.from(set).sort();
  }, [rows]);

  const save = useMutation({
    mutationFn: async (r: Partial<Channel>) => {
      const group = normGroup(r.channel_group);
      if (!group) throw new Error("Channel group is required");
      if (!r.code?.trim() || !r.name?.trim()) throw new Error("Code and name are required");
      const payload = {
        code: r.code!.trim(), name: r.name!.trim(), channel_group: group,
        format: r.format || null, max_length: r.max_length ?? null,
        supports_attachments: r.supports_attachments ?? false, is_active: r.is_active ?? true,
        sort_order: r.sort_order ?? 0,
      };
      const { error } = r.id ? await sb.from("core_template_channel").update(payload).eq("id", r.id) : await sb.from("core_template_channel").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["core_template_channel"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("core_template_channel").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["core_template_channel"] }); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Channel[]>();
    rows.forEach((r) => {
      const k = normGroup(r.channel_group) || "OTHER";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <Radio className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Channels</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Delivery channels available to templates. Format, size limits and attachment support are declared here;
            provider bindings (SMTP host, SMS gateway, WhatsApp business number) are assigned per module/event in the
            Configuration Center.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> New Channel</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="flex justify-center p-12"><Loader2 className="animate-spin" /></CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground text-center">No channels registered.</CardContent></Card>
      ) : grouped.map(([group, list]) => (
        <Card key={group}>
          <CardContent className="p-0">
            <div className="px-4 py-2 border-b bg-muted/40 flex items-center gap-2">
              <h2 className="font-semibold text-sm uppercase">{group}</h2><Badge variant="secondary">{list.length}</Badge>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Format</TableHead><TableHead>Max length</TableHead><TableHead>Attach</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.format ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{r.max_length ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.supports_attachments ? "✓" : "—"}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${r.code}"?`) && del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{editing.id ? "Edit channel" : "New channel"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="EMAIL" /></div>
              <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Email" /></div>
              <div><Label>Group *</Label>
                <Select value={normGroup(editing.channel_group) || undefined} onValueChange={(v) => setEditing({ ...editing, channel_group: v })}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>{groupOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Format</Label>
                <Select value={editing.format ?? "HTML"} onValueChange={(v) => setEditing({ ...editing, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Max length</Label><Input type="number" value={editing.max_length ?? ""} onChange={(e) => setEditing({ ...editing, max_length: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? ""} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.supports_attachments ?? false} onCheckedChange={(v) => setEditing({ ...editing, supports_attachments: v })} /><Label>Attachments</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.code?.trim() || !editing.name?.trim() || !normGroup(editing.channel_group) || save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
