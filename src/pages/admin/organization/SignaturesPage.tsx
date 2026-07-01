/**
 * Brand Assets → Signatures
 * Purpose-built manager for officer / departmental e-mail signatures
 * (comm_email_signature). Image / seal binaries continue to live in the
 * Media Library and are referenced by URL inside the HTML body.
 * Assignment (which signature → which module/officer/event) is done in
 * Configuration Center → Communication.
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PenLine, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { WhereUsedButton } from "@/components/comm/WhereUsedDialog";
import { toast } from "sonner";

const sb = supabase as any;

interface Signature {
  id: string;
  name: string;
  department_id: string | null;
  officer_user_code: string | null;
  html_signature: string | null;
  plain_text_signature: string | null;
  is_active: boolean;
}

const EMPTY: Partial<Signature> = { name: "", officer_user_code: "", html_signature: "", plain_text_signature: "", is_active: true };

export default function SignaturesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Signature> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["comm_email_signature", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("comm_email_signature").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Signature[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Partial<Signature>) => {
      const payload = {
        name: row.name,
        officer_user_code: row.officer_user_code || null,
        html_signature: row.html_signature || null,
        plain_text_signature: row.plain_text_signature || null,
        is_active: row.is_active ?? true,
      };
      const { error } = row.id
        ? await sb.from("comm_email_signature").update(payload).eq("id", row.id)
        : await sb.from("comm_email_signature").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["comm_email_signature"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("comm_email_signature").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["comm_email_signature"] }); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => [r.name, r.officer_user_code].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <PenLine className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Signatures</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Officer and departmental e-mail signatures. Signature images (scanned signature,
            seal) live in the{" "}
            <Link to="/admin/org/assets/media" className="underline text-primary">Media Library</Link>{" "}
            and are referenced by URL inside the HTML body. Bind a signature to a module,
            officer, workflow stage or event in{" "}
            <Link to="/admin/org/configuration-center?domain=communication" className="underline text-primary">
              Configuration Center → Communication
            </Link>.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> New</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search signatures…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs font-mono">{r.officer_user_code ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                      {r.plain_text_signature ?? (r.html_signature ? r.html_signature.replace(/<[^>]+>/g, " ").slice(0, 80) : "—")}
                    </TableCell>
                    <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <WhereUsedButton assetId={r.id} assetName={r.name} />
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${r.name}"?`) && del.mutate(r.id)}>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing.id ? "Edit signature" : "New signature"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Officer user code</Label><Input value={editing.officer_user_code ?? ""} onChange={(e) => setEditing({ ...editing, officer_user_code: e.target.value })} placeholder="e.g. JDOE" /></div>
              <div><Label>HTML signature</Label><Textarea rows={5} value={editing.html_signature ?? ""} onChange={(e) => setEditing({ ...editing, html_signature: e.target.value })} placeholder="<p><strong>John Doe</strong><br/>Director…</p>" className="font-mono text-xs" /></div>
              <div><Label>Plain text fallback</Label><Textarea rows={3} value={editing.plain_text_signature ?? ""} onChange={(e) => setEditing({ ...editing, plain_text_signature: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
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
    </div>
  );
}
