/**
 * Brand Assets → Disclaimers
 * CRUD for legal / regulatory disclaimers (comm_disclaimer).
 * Long-form reusable copy paragraphs remain in Text Blocks; a disclaimer
 * may `text_block_id` a text block to source its body. Assignment (which
 * disclaimer → which template / channel) is done in Configuration Center →
 * Communication.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
import { ScrollText, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguageOptions } from "@/hooks/comm/useOrgMasters";

const sb = supabase as any;

interface Disclaimer {
  id: string;
  name: string;
  category: string | null;
  language: string | null;
  body: string;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  text_block_id: string | null;
}

const CATEGORIES = ["LEGAL", "PRIVACY", "CONFIDENTIALITY", "FINANCIAL", "MEDICAL", "GENERAL"];
const EMPTY: Partial<Disclaimer> = { name: "", category: "LEGAL", language: "en", body: "", is_active: true };

export default function DisclaimersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("__all");
  const [editing, setEditing] = useState<Partial<Disclaimer> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["comm_disclaimer", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("comm_disclaimer").select("*").order("category").order("name");
      if (error) throw error;
      return (data ?? []) as Disclaimer[];
    },
  });

  const save = useMutation({
    mutationFn: async (r: Partial<Disclaimer>) => {
      const payload = {
        name: r.name, category: r.category || null, language: r.language || null,
        body: r.body ?? "", effective_from: r.effective_from || null, effective_to: r.effective_to || null,
        is_active: r.is_active ?? true, text_block_id: r.text_block_id || null,
      };
      const { error } = r.id ? await sb.from("comm_disclaimer").update(payload).eq("id", r.id) : await sb.from("comm_disclaimer").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["comm_disclaimer"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("comm_disclaimer").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["comm_disclaimer"] }); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat !== "__all" && (r.category ?? "") !== cat) return false;
      if (!needle) return true;
      return [r.name, r.category, r.language, r.body].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [rows, q, cat]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <ScrollText className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Disclaimers</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Legal, privacy and regulatory disclaimers used in official communications, PDFs and portals.
            Bind a disclaimer to a template, channel or module in{" "}
            <Link to="/admin/org/configuration-center?domain=communication" className="underline text-primary">
              Configuration Center → Communication
            </Link>. Long-form reusable paragraphs live in{" "}
            <Link to="/admin/org/library/text-blocks" className="underline text-primary">Text Blocks</Link>.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> New</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3 items-end flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search disclaimers…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All categories</SelectItem>
                {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : filtered.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">No disclaimers.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Lang</TableHead><TableHead>Body</TableHead><TableHead>Effective</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="secondary">{r.category ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{r.language ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{r.body}</TableCell>
                    <TableCell className="text-xs">{r.effective_from ?? "—"} → {r.effective_to ?? "∞"}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${r.name}"?`) && del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
            <DialogHeader><DialogTitle>{editing.id ? "Edit disclaimer" : "New disclaimer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <Select value={editing.category ?? "LEGAL"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Language</Label><Input value={editing.language ?? ""} onChange={(e) => setEditing({ ...editing, language: e.target.value })} placeholder="en" /></div>
              </div>
              <div><Label>Body *</Label><Textarea rows={6} value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Effective from</Label><Input type="date" value={editing.effective_from ?? ""} onChange={(e) => setEditing({ ...editing, effective_from: e.target.value })} /></div>
                <div><Label>Effective to</Label><Input type="date" value={editing.effective_to ?? ""} onChange={(e) => setEditing({ ...editing, effective_to: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.name || !editing.body || save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
