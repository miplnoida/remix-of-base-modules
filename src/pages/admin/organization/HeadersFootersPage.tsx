/**
 * Brand Assets → Headers / Footers
 * Manages structured header/footer records referenced by letterheads.
 * Two sources are surfaced here:
 *   • Media assets categorised as `letterhead_header` / `letterhead_footer`
 *     (image binaries live in Media Library).
 *   • `comm_print_footer` rows for text/HTML page footers that carry
 *     watermark URLs, page footer text, etc.
 * Assignment to a module/event is done in Configuration Center → Branding.
 */
import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelTop, Plus, Pencil, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { softArchiveOrgEntity, OM3_EVENTS } from "@/platform/organization/orgMutations";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const sb = supabase as any;

interface MediaRow { id: string; name: string; category: string; preview_url: string | null; external_url: string | null; is_active: boolean; }
interface FooterRow { id: string; name: string; footer_html: string | null; watermark_url: string | null; page_footer: string | null; version: string | null; is_active: boolean; }

function HeadersFootersPageInner() {
  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <PanelTop className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Headers &amp; Footers</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Header and footer records referenced by letterheads. Image binaries are managed in the{" "}
            <Link to="/admin/org/assets/media" className="underline text-primary">Media Library</Link>.
            Wire a header/footer into a letterhead in{" "}
            <Link to="/admin/org/assets/letterheads" className="underline text-primary">Brand Assets → Letterheads</Link>{" "}
            and then assign the letterhead to a module or event in{" "}
            <Link to="/admin/org/configuration-center?domain=branding" className="underline text-primary">Configuration Center → Branding</Link>.
          </p>
        </div>
      </div>

      <Tabs defaultValue="images">
        <TabsList>
          <TabsTrigger value="images">Header / Footer Images</TabsTrigger>
          <TabsTrigger value="print">Print Footers (HTML)</TabsTrigger>
        </TabsList>
        <TabsContent value="images"><ImagesTab /></TabsContent>
        <TabsContent value="print"><PrintFootersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ImagesTab() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["comm_media_asset", "hf"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_media_asset")
        .select("id,name,category,preview_url,external_url,is_active")
        .in("category", ["letterhead_header", "letterhead_footer"])
        .order("category").order("name");
      if (error) throw error;
      return (data ?? []) as MediaRow[];
    },
  });

  const headers = rows.filter((r) => r.category === "letterhead_header");
  const footers = rows.filter((r) => r.category === "letterhead_footer");

  return (
    <div className="space-y-4 mt-4">
      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
        <>
          <ImageGroup title="Headers" rows={headers} />
          <ImageGroup title="Footers" rows={footers} />
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Add or replace an image via <Link to="/admin/org/assets/media" className="underline">Media Library</Link>{" "}
        using category <code className="bg-muted px-1 rounded">letterhead_header</code> or <code className="bg-muted px-1 rounded">letterhead_footer</code>.
      </p>
    </div>
  );
}

function ImageGroup({ title, rows }: { title: string; rows: MediaRow[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
          <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /><h2 className="font-semibold text-sm">{title}</h2><Badge variant="secondary">{rows.length}</Badge></div>
        </div>
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No {title.toLowerCase()} yet.</div>
        ) : (
          <Table sticky>
            <TableHeader><TableRow><TableHead className="w-24">Preview</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{(r.preview_url || r.external_url) ? <img src={r.preview_url || r.external_url!} alt={r.name} className="h-10 max-w-[80px] object-contain" /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

const EMPTY_FOOTER: Partial<FooterRow> = { name: "", footer_html: "", watermark_url: "", page_footer: "", is_active: true };

function PrintFootersTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<FooterRow> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["comm_print_footer", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("comm_print_footer").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as FooterRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Partial<FooterRow>) => {
      const payload = { name: row.name, footer_html: row.footer_html || null, watermark_url: row.watermark_url || null, page_footer: row.page_footer || null, version: row.version || null, is_active: row.is_active ?? true };
      const { error } = row.id ? await sb.from("comm_print_footer").update(payload).eq("id", row.id) : await sb.from("comm_print_footer").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["comm_print_footer"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (row: FooterRow) => {
      await softArchiveOrgEntity({
        table: 'comm_print_footer',
        id: row.id,
        eventCode: OM3_EVENTS.headerFooterDeactivated,
        displayName: row.name,
        before: row as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => { toast.success("Footer deactivated"); qc.invalidateQueries({ queryKey: ["comm_print_footer"] }); },
    onError: (e: any) => toast.error(e.message ?? "Deactivate failed"),
  });

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setEditing(EMPTY_FOOTER)}><Plus className="h-4 w-4" /> New Print Footer</Button></div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No print footers yet.</div>
          ) : (
            <Table sticky>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Page Footer</TableHead><TableHead>Watermark</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{r.page_footer ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{r.watermark_url ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.version ?? "—"}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" disabled={!r.is_active} onClick={() => r.is_active && confirm(`Deactivate "${r.name}"?`) && del.mutate(r)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
            <DialogHeader><DialogTitle>{editing.id ? "Edit print footer" : "New print footer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Page footer text</Label><Input value={editing.page_footer ?? ""} onChange={(e) => setEditing({ ...editing, page_footer: e.target.value })} placeholder="Page {n} of {total}" /></div>
              <div><Label>Watermark URL</Label><Input value={editing.watermark_url ?? ""} onChange={(e) => setEditing({ ...editing, watermark_url: e.target.value })} /></div>
              <div><Label>Footer HTML</Label><Textarea rows={5} value={editing.footer_html ?? ""} onChange={(e) => setEditing({ ...editing, footer_html: e.target.value })} className="font-mono text-xs" /></div>
              <div><Label>Version</Label><Input value={editing.version ?? ""} onChange={(e) => setEditing({ ...editing, version: e.target.value })} placeholder="v1" /></div>
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
