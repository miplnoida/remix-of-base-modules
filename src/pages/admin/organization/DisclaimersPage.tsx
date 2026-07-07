/**
 * Brand Assets → Disclaimers
 *
 * This screen is a **filtered admin-friendly view** over Text Blocks: the
 * body of every disclaimer is stored in `core_text_block` (category =
 * `DISCLAIMER`). This screen is the single place to manage disclaimer-type
 * content; the same rows also appear on the Text Blocks screen.
 *
 * A thin row in `comm_disclaimer` is maintained per disclaimer so that
 * `core_organization.default_disclaimer_id` and other FKs keep working, but
 * it stores only metadata (name, effective dates, category, active flag)
 * plus a pointer to the source text block — never a duplicate body.
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScrollText, Plus, Pencil, Trash2, Search, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { softArchiveOrgEntity, OM3_EVENTS } from "@/platform/organization/orgMutations";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useLanguageOptions } from "@/hooks/comm/useOrgMasters";

const sb = supabase as any;

/** Effective row = Text Block (category=DISCLAIMER) + optional mapping row */
interface DisclaimerRow {
  // text_block fields (source of truth)
  text_block_id: string;
  text_block_code: string;
  name: string;
  category: string | null;                // sub-category / audience tag (LEGAL / PRIVACY etc.)
  language_code: string;
  content_html: string | null;
  content_text: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  version_no: number;
  // mapping row (may be null for freshly-created text blocks not yet linked)
  disclaimer_id: string | null;
  audience_tag: string | null;
}

const AUDIENCE_TAGS = ["LEGAL", "PRIVACY", "CONFIDENTIALITY", "FINANCIAL", "MEDICAL", "GENERAL", "INTERNAL", "BENEFITS", "COMPLIANCE"];
const EMPTY: Partial<DisclaimerRow> = {
  name: "", audience_tag: "LEGAL", language_code: "en",
  content_html: "", content_text: "", is_active: true, version_no: 1,
};

function DisclaimersPageInner() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("__all");
  const [editing, setEditing] = useState<Partial<DisclaimerRow> | null>(null);
  const { data: languages = [] } = useLanguageOptions();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["disclaimers-view"],
    queryFn: async () => {
      // Text blocks with category=DISCLAIMER (source of truth)
      const { data: blocks, error } = await sb
        .from("core_text_block")
        .select("id,text_block_code,name,category,language_code,version_no,content_html,content_text,effective_from,effective_to,is_active")
        .in("category", ["DISCLAIMER", "disclaimer"])
        .order("name");
      if (error) throw error;
      // Mapping rows keyed by text_block_id
      const { data: mapping } = await sb
        .from("comm_disclaimer")
        .select("id,name,category,text_block_id,is_active,effective_from,effective_to");
      const byBlock = new Map<string, any>();
      (mapping ?? []).forEach((m: any) => { if (m.text_block_id) byBlock.set(m.text_block_id, m); });
      return (blocks ?? []).map((b: any): DisclaimerRow => {
        const m = byBlock.get(b.id);
        return {
          text_block_id: b.id, text_block_code: b.text_block_code, name: b.name,
          category: b.category, language_code: b.language_code, version_no: b.version_no,
          content_html: b.content_html, content_text: b.content_text,
          effective_from: b.effective_from, effective_to: b.effective_to,
          is_active: b.is_active,
          disclaimer_id: m?.id ?? null, audience_tag: m?.category ?? null,
        };
      });
    },
  });

  const save = useMutation({
    mutationFn: async (r: Partial<DisclaimerRow>) => {
      if (!r.name?.trim()) throw new Error("Name is required");
      if (!(r.content_html?.trim() || r.content_text?.trim())) throw new Error("Body is required");
      const lang = r.language_code || "en";

      // 1) Upsert the text block (source of truth)
      let textBlockId = r.text_block_id;
      const tbPayload: any = {
        name: r.name!.trim(),
        category: "DISCLAIMER",
        language_code: lang,
        content_html: r.content_html ?? null,
        content_text: r.content_text ?? (r.content_html ? stripTags(r.content_html) : null),
        body_html: r.content_html ?? null,
        body_text: r.content_text ?? (r.content_html ? stripTags(r.content_html) : null),
        effective_from: r.effective_from || null,
        effective_to: r.effective_to || null,
        is_active: r.is_active ?? true,
        version_no: r.version_no ?? 1,
      };
      if (textBlockId) {
        const { error } = await sb.from("core_text_block").update(tbPayload).eq("id", textBlockId);
        if (error) throw error;
      } else {
        tbPayload.text_block_code = `DISC-${slugify(r.name!)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
        tbPayload.scope = "GLOBAL";
        const { data, error } = await sb.from("core_text_block").insert(tbPayload).select("id").maybeSingle();
        if (error) throw error;
        textBlockId = data?.id;
      }
      if (!textBlockId) throw new Error("Failed to persist text block");

      // 2) Upsert the thin mapping row (metadata only). Body is intentionally NOT written here —
      //    Text Blocks (core_text_block) is the single source of truth for disclaimer body.
      const mapPayload: any = {
        name: r.name!.trim(),
        category: r.audience_tag || null,
        language: lang,
        effective_from: r.effective_from || null,
        effective_to: r.effective_to || null,
        is_active: r.is_active ?? true,
        text_block_id: textBlockId,
      };
      if (r.disclaimer_id) {
        const { error } = await sb.from("comm_disclaimer").update(mapPayload).eq("id", r.disclaimer_id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("comm_disclaimer").insert(mapPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["disclaimers-view"] });
      qc.invalidateQueries({ queryKey: ["core_text_block"] });
      qc.invalidateQueries({ queryKey: ["comm_disclaimer"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (row: DisclaimerRow) => {
      // OM-3: disclaimers are referenced by core_organization.default_disclaimer_id
      // and many downstream places — deactivate the mapping + backing text block
      // instead of physically deleting them.
      if (row.disclaimer_id) {
        await softArchiveOrgEntity({
          table: 'comm_disclaimer',
          id: row.disclaimer_id,
          eventCode: OM3_EVENTS.disclaimerDeactivated,
          displayName: row.name,
          before: row as unknown as Record<string, unknown>,
        });
      }
      await softArchiveOrgEntity({
        table: 'core_text_block',
        id: row.text_block_id,
        eventCode: OM3_EVENTS.textBlockDeactivated,
        displayName: row.name,
        before: { source: 'disclaimer', ...(row as unknown as Record<string, unknown>) },
        statusColumn: 'status',
        statusValue: 'ARCHIVED',
      });
    },
    onSuccess: () => {
      toast.success("Disclaimer deactivated");
      qc.invalidateQueries({ queryKey: ["disclaimers-view"] });
      qc.invalidateQueries({ queryKey: ["core_text_block"] });
      qc.invalidateQueries({ queryKey: ["comm_disclaimer"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Deactivate failed"),
  });


  const tags = useMemo(() => Array.from(new Set(rows.map((r) => r.audience_tag).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tag !== "__all" && (r.audience_tag ?? "") !== tag) return false;
      if (!needle) return true;
      return [r.name, r.text_block_code, r.audience_tag, r.language_code, r.content_text].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [rows, q, tag]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <ScrollText className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Disclaimers</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Manage disclaimer text blocks used in documents, emails, letters and notifications.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl mt-1">
            Disclaimer content is stored as{" "}
            <Link to="/admin/org/library/text-blocks?category=DISCLAIMER" className="underline text-primary">Text Blocks</Link>{" "}
            (<code>category = DISCLAIMER</code>). This page is a filtered disclaimer management view — edits here
            update the same underlying Text Block and are immediately visible on the Text Blocks screen. Bind a
            disclaimer to a template, channel or module in{" "}
            <Link to="/admin/org/configuration-center?domain=communication" className="underline text-primary">
              Configuration Center → Communication
            </Link>.
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
            <Label className="text-xs">Audience</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All audiences</SelectItem>
                {tags.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
            <Table sticky>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Audience</TableHead><TableHead>Lang</TableHead><TableHead>Body</TableHead><TableHead>Source</TableHead><TableHead>Effective</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.text_block_id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{r.text_block_code}</TableCell>
                    <TableCell><Badge variant="secondary">{r.audience_tag ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{r.language_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">{r.content_text ?? stripTags(r.content_html ?? "")}</TableCell>
                    <TableCell>
                      <Link to="/admin/org/library/text-blocks" className="inline-flex items-center gap-1 text-[10px] text-primary underline">
                        <Link2 className="h-3 w-3" /> Text Block
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{r.effective_from ?? "—"} → {r.effective_to ?? "∞"}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${r.name}" (removes the underlying Text Block too)?`) && del.mutate(r)}>
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
            <DialogHeader><DialogTitle>{editing.text_block_id ? "Edit disclaimer" : "New disclaimer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground border rounded p-2 bg-muted/40 flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5" />
                Body is stored in Text Blocks. Saving updates the underlying block (category=<code>DISCLAIMER</code>).
              </div>
              <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Audience</Label>
                  <Select value={editing.audience_tag ?? "LEGAL"} onValueChange={(v) => setEditing({ ...editing, audience_tag: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AUDIENCE_TAGS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={editing.language_code ?? "en"} onValueChange={(v) => setEditing({ ...editing, language_code: v })}>
                    <SelectTrigger><SelectValue placeholder="Select language…" /></SelectTrigger>
                    <SelectContent>{languages.map((l) => <SelectItem key={l.code} value={l.code}>{l.code} — {l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Body *</Label>
                <RichTextEditor
                  value={editing.content_html ?? ""}
                  onChange={(html) => setEditing({ ...editing, content_html: html, content_text: stripTags(html) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Effective from</Label><Input type="date" value={editing.effective_from ?? ""} onChange={(e) => setEditing({ ...editing, effective_from: e.target.value })} /></div>
                <div><Label>Effective to</Label><Input type="date" value={editing.effective_to ?? ""} onChange={(e) => setEditing({ ...editing, effective_to: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.name?.trim() || save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function stripTags(html: string): string {
  const tmp = typeof document !== "undefined" ? document.createElement("div") : null;
  if (tmp) { tmp.innerHTML = html; return tmp.textContent ?? ""; }
  return html.replace(/<[^>]+>/g, "");
}

function slugify(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "DISCLAIMER";
}
