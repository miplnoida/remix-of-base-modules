/**
 * Communication Library → Languages / Cultures
 * Full CRUD over core_language. Enforces one active default and provides
 * fallback chain configuration for template / text-block / disclaimer resolution.
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
import { Languages, Plus, Pencil, Trash2, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { softArchiveOrgEntity, OM3_EVENTS } from "@/platform/organization/orgMutations";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const sb = supabase as any;

interface Language {
  id: string;
  language_code: string;
  culture_code: string;
  display_name: string;
  native_name: string | null;
  direction: "LTR" | "RTL";
  enabled_for_org: boolean;
  is_default: boolean;
  fallback_language_code: string | null;
  is_active: boolean;
  display_order: number;
}

const EMPTY: Partial<Language> = {
  language_code: "", culture_code: "", display_name: "", native_name: "",
  direction: "LTR", enabled_for_org: true, is_default: false,
  fallback_language_code: "en", is_active: true, display_order: 100,
};

function LanguagesPageInner() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Language> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_language", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_language").select("*").order("display_order").order("culture_code");
      if (error) throw error;
      return (data ?? []) as Language[];
    },
  });

  const cultures = useMemo(() => rows.map((r) => r.culture_code), [rows]);

  const save = useMutation({
    mutationFn: async (row: Partial<Language>) => {
      // Validate fallback (must exist, cannot equal self, no direct loop)
      if (row.fallback_language_code) {
        if (row.fallback_language_code === row.culture_code) throw new Error("Fallback cannot equal the language itself");
        const target = rows.find((r) => r.culture_code === row.fallback_language_code);
        if (!target && !cultures.includes(row.fallback_language_code)) throw new Error("Fallback language does not exist");
        if (target?.fallback_language_code === row.culture_code) throw new Error("Fallback loop detected");
      }
      const payload: any = {
        language_code: row.language_code?.toLowerCase().trim(),
        culture_code: row.culture_code?.trim(),
        display_name: row.display_name?.trim(),
        native_name: row.native_name?.trim() || null,
        direction: row.direction ?? "LTR",
        enabled_for_org: row.enabled_for_org ?? true,
        is_default: row.is_default ?? false,
        fallback_language_code: row.fallback_language_code || null,
        is_active: row.is_active ?? true,
        display_order: row.display_order ?? 100,
      };
      // If setting default: unset other defaults first (client-side, unique index would else reject)
      if (payload.is_default) {
        await sb.from("core_language").update({ is_default: false })
          .neq("culture_code", payload.culture_code).eq("is_default", true);
      }
      const { error } = row.id
        ? await sb.from("core_language").update(payload).eq("id", row.id)
        : await sb.from("core_language").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["core_language"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (row: Language) => {
      if (row.is_default) throw new Error("Cannot deactivate the default language — set another default first.");
      // Refuse if referenced as a fallback
      const referenced = rows.find((r) => r.fallback_language_code === row.culture_code);
      if (referenced) throw new Error(`In use as fallback by "${referenced.culture_code}"`);
      // OM-3: soft archive instead of hard delete so downstream localisation rows stay resolvable.
      await softArchiveOrgEntity({
        table: 'core_language',
        id: row.id,
        eventCode: OM3_EVENTS.languageDeactivated,
        displayName: row.culture_code,
        before: row as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => { toast.success("Language deactivated"); qc.invalidateQueries({ queryKey: ["core_language"] }); },
    onError: (e: any) => toast.error(e.message ?? "Deactivate failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: keyof Language; value: boolean }) => {
      const { error } = await sb.from("core_language").update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["core_language"] }),
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const defaultCount = rows.filter((r) => r.is_default && r.is_active).length;

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-start gap-3">
        <Languages className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Languages &amp; Cultures</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            The master list of languages / cultures for templates, notifications, disclaimers and UI localization.
            Exactly one language must be marked default; other languages fall back through the chain when a
            localized asset is missing.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> New</Button>
      </div>

      {defaultCount === 0 && (
        <div className="border border-destructive/40 bg-destructive/10 text-sm text-destructive rounded p-3">
          No default language is configured. Template / text-block resolution will fall back to <code>en</code>.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Culture</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Display / Native</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead>Fallback</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="w-[110px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-xs">{r.culture_code}</TableCell>
                    <TableCell className="text-xs">{r.language_code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.display_name}</div>
                      {r.native_name && <div className="text-xs text-muted-foreground">{r.native_name}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.direction}</Badge></TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.fallback_language_code ?? "—"}</TableCell>
                    <TableCell>
                      <Switch checked={r.enabled_for_org} onCheckedChange={(v) => toggle.mutate({ id: r.id, field: "enabled_for_org", value: v })} />
                    </TableCell>
                    <TableCell>
                      {r.is_default
                        ? <Star className="h-4 w-4 fill-primary text-primary" />
                        : <Button size="sm" variant="ghost" onClick={() => save.mutate({ ...r, is_default: true })}>Set</Button>}
                    </TableCell>
                    <TableCell className="text-xs">{r.display_order}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${r.culture_code}"?`) && del.mutate(r)}>
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
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing.id ? "Edit language" : "New language"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Language code *</Label><Input value={editing.language_code ?? ""} onChange={(e) => setEditing({ ...editing, language_code: e.target.value })} placeholder="en" /></div>
              <div><Label>Culture code *</Label><Input value={editing.culture_code ?? ""} onChange={(e) => setEditing({ ...editing, culture_code: e.target.value })} placeholder="en-US" disabled={!!editing.id} /></div>
              <div><Label>Display name *</Label><Input value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></div>
              <div><Label>Native name</Label><Input value={editing.native_name ?? ""} onChange={(e) => setEditing({ ...editing, native_name: e.target.value })} /></div>
              <div>
                <Label>Direction</Label>
                <Select value={editing.direction ?? "LTR"} onValueChange={(v) => setEditing({ ...editing, direction: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LTR">LTR</SelectItem><SelectItem value="RTL">RTL</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fallback</Label>
                <Select value={editing.fallback_language_code ?? "__none"} onValueChange={(v) => setEditing({ ...editing, fallback_language_code: v === "__none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— None —</SelectItem>
                    {rows.filter((r) => r.culture_code !== editing.culture_code).map((r) => (
                      <SelectItem key={r.culture_code} value={r.culture_code}>{r.culture_code} — {r.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Display order</Label><Input type="number" value={editing.display_order ?? 100} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) || 100 })} /></div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2"><Switch checked={editing.enabled_for_org ?? true} onCheckedChange={(v) => setEditing({ ...editing, enabled_for_org: v })} /><Label>Enabled</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              </div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={editing.is_default ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} /><Label>Default language for the organization</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.language_code || !editing.culture_code || !editing.display_name || save.isPending} onClick={() => save.mutate(editing)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
