/**
 * Asset Assignments — grid over `comm_asset_assignment`.
 * Lets administrators map any active media asset to a scope
 * (Organization / Department / Module / Template / Location / Document Type)
 * with priority and effective dates.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const sb = supabase as any;

const SCOPE_TYPES = ["ORGANIZATION", "DEPARTMENT", "MODULE", "TEMPLATE", "LOCATION", "DOCUMENT_TYPE"] as const;
const ASSET_TYPES = [
  "letterhead", "email_signature", "disclaimer", "print_footer",
  "logo", "seal", "watermark",
] as const;

interface Assignment {
  id: string;
  asset_id: string;
  asset_type: string;
  scope_type: string;
  scope_id: string;
  language: string | null;
  priority: number;
  is_default: boolean;
  effective_from: string | null;
  effective_to: string | null;
  active: boolean;
  notes: string | null;
}

interface AssetOption { id: string; name: string; asset_type: string | null; is_active: boolean | null; }

export default function AssetAssignmentsPage() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [draft, setDraft] = useState<Partial<Assignment>>({
    scope_type: "ORGANIZATION", asset_type: "letterhead", priority: 100, active: true, is_default: false,
  });

  async function load() {
    setLoading(true);
    const [{ data: aRows }, { data: aOpts }] = await Promise.all([
      sb.from("comm_asset_assignment").select("*").order("scope_type").order("priority"),
      sb.from("comm_media_asset").select("id,name,asset_type,is_active").eq("is_active", true).order("name"),
    ]);
    setRows((aRows ?? []) as Assignment[]);
    setAssets((aOpts ?? []) as AssetOption[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((r) => r.scope_type === filter)),
    [rows, filter],
  );

  async function save() {
    if (!draft.asset_id || !draft.asset_type || !draft.scope_type || !draft.scope_id) {
      toast.error("Please check the form for valid information!", {
        description: "Asset, asset type, scope and scope ID are required.",
      });
      return;
    }
    const { error } = await sb.from("comm_asset_assignment").insert([{
      asset_id: draft.asset_id,
      asset_type: draft.asset_type,
      scope_type: draft.scope_type,
      scope_id: draft.scope_id,
      language: draft.language ?? null,
      priority: draft.priority ?? 100,
      is_default: !!draft.is_default,
      effective_from: draft.effective_from ?? null,
      effective_to: draft.effective_to ?? null,
      active: draft.active ?? true,
      notes: draft.notes ?? null,
    }]);
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success("Assignment created");
    setOpen(false);
    setDraft({ scope_type: "ORGANIZATION", asset_type: "letterhead", priority: 100, active: true, is_default: false });
    load();
  }

  async function remove(id: string) {
    const { error } = await sb.from("comm_asset_assignment").delete().eq("id", id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Assignment removed");
    load();
  }

  return (
    <div className="space-y-3 p-2">
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <strong>Advanced — system administrators only.</strong> Fine-grained mapping of media assets to scopes (organization, department, module, template, location, document type). Most users should manage selections from the per-module profile pages instead.
      </div>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Asset Assignments</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All scopes</SelectItem>
              {SCOPE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Asset type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.scope_type}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.scope_id}</div>
                  </TableCell>
                  <TableCell>{r.asset_type}</TableCell>
                  <TableCell className="font-mono text-xs">{assets.find((a) => a.id === r.asset_id)?.name ?? r.asset_id}</TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell className="text-xs">
                    {r.effective_from ?? "—"} → {r.effective_to ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No assignments yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New asset assignment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scope type</Label>
              <Select value={draft.scope_type} onValueChange={(v) => setDraft((d) => ({ ...d, scope_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCOPE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scope ID</Label>
              <Input value={draft.scope_id ?? ""} onChange={(e) => setDraft((d) => ({ ...d, scope_id: e.target.value }))} placeholder="UUID / code" />
            </div>
            <div>
              <Label>Asset type</Label>
              <Select value={draft.asset_type} onValueChange={(v) => setDraft((d) => ({ ...d, asset_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Asset (active only)</Label>
              <Select value={draft.asset_id} onValueChange={(v) => setDraft((d) => ({ ...d, asset_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                <SelectContent>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Input type="number" value={draft.priority ?? 100} onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Language (optional)</Label>
              <Input value={draft.language ?? ""} onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))} placeholder="en, fr…" />
            </div>
            <div>
              <Label>Effective from</Label>
              <Input type="date" value={draft.effective_from ?? ""} onChange={(e) => setDraft((d) => ({ ...d, effective_from: e.target.value }))} />
            </div>
            <div>
              <Label>Effective to</Label>
              <Input type="date" value={draft.effective_to ?? ""} onChange={(e) => setDraft((d) => ({ ...d, effective_to: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
