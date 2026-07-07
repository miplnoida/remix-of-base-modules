import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { OrgActionGate, ORG_PERMS } from "@/platform/organization/orgActionPermissions";
/**
 * Asset Category Master — admin CRUD for `comm_asset_category_master`.
 *
 * Lets organisation admins create new asset categories/tabs that drive the
 * Communication Assets & Branding library without a code deployment.
 *
 * System default categories are protected:
 *   • cannot be deleted (DB trigger enforces — deactivate instead)
 *   • code is locked, but description / file rules / sort can be edited
 *   • category in use by any asset cannot be deleted (DB trigger enforces)
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ShieldCheck, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useAssetCategories, useSaveAssetCategory, useDeleteAssetCategory,
  type AssetCategoryRow,
} from "@/hooks/comm/useAssetCategories";

type Draft = Partial<AssetCategoryRow>;

const emptyDraft = (): Draft => ({
  category_code: "",
  category_name: "",
  group_name: "",
  description: "",
  used_in: [],
  recommended_size: "",
  accepted_file_types: "image/*,.pdf,.svg,.webp",
  max_file_size_kb: 2000,
  aspect: "any",
  tips: [],
  sort_order: 999,
  is_active: true,
  is_system_default: false,
});

function AssetCategoryMasterPageInner() {
  const { data: rows = [], isLoading } = useAssetCategories();
  const save = useSaveAssetCategory();
  const del = useDeleteAssetCategory();

  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("All");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const groups = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.group_name)))], [rows]);

  const filtered = rows.filter((r) => {
    if (groupFilter !== "All" && r.group_name !== groupFilter) return false;
    if (q && !`${r.category_code} ${r.category_name} ${r.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const openNew = () => { setDraft(emptyDraft()); setOpen(true); };
  const openEdit = (r: AssetCategoryRow) => { setDraft(r); setOpen(true); };

  const handleSave = async () => {
    if (!draft.category_code || !draft.category_name || !draft.group_name) {
      toast.error("Code, name and group are required"); return;
    }
    if (!/^[a-z0-9_]+$/.test(draft.category_code)) {
      toast.error("Code must be lowercase letters, numbers, underscores only"); return;
    }
    await save.mutateAsync(draft);
    setOpen(false);
  };

  const handleDelete = (r: AssetCategoryRow) => {
    if (!confirm(`Delete category "${r.category_name}"? This cannot be undone.\n\nTip: prefer "Deactivate" for protected/used categories.`)) return;
    del.mutate(r.id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Asset Category Master</CardTitle>
              <CardDescription>
                Define the tabs and categories used by Communication Assets & Branding. System default
                categories are protected — they can be deactivated but not deleted.
              </CardDescription>
            </div>
            <OrgActionGate permission={ORG_PERMS.assetCategories.manage}>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Category</Button>
            </OrgActionGate>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search code, name, description…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1">
              {groups.map((g) => (
                <Button key={g} size="sm" variant={g === groupFilter ? "default" : "outline"} onClick={() => setGroupFilter(g)}>
                  {g}
                </Button>
              ))}
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Group / Tab</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Max KB</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No categories match.</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-xs">{r.category_code}</TableCell>
                    <TableCell className="font-medium">{r.category_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.group_name}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{r.accepted_file_types}</TableCell>
                    <TableCell className="text-xs">{r.max_file_size_kb}</TableCell>
                    <TableCell className="text-xs">{r.sort_order}</TableCell>
                    <TableCell>
                      {r.is_system_default && <Badge className="text-[10px] mr-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"><ShieldCheck className="h-3 w-3 mr-1" />Default</Badge>}
                      <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">{r.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(r)}
                        title={r.is_system_default ? "System default — deactivate instead" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {draft.is_system_default && (
              <div className="flex items-start gap-2 p-3 rounded bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs">
                <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>This is a system default category. You can adjust description, accepted files, size limits and guidance, but the code is locked to keep existing assets working.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code *</Label>
                <Input
                  value={draft.category_code ?? ""}
                  onChange={(e) => setDraft({ ...draft, category_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                  placeholder="e.g. press_release_header"
                  disabled={!!draft.is_system_default}
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Lowercase, numbers, underscores. Cannot change once assets reference it.</p>
              </div>
              <div>
                <Label>Display Name *</Label>
                <Input value={draft.category_name ?? ""} onChange={(e) => setDraft({ ...draft, category_name: e.target.value })} placeholder="e.g. Press Release Header" />
              </div>
              <div>
                <Label>Group / Tab *</Label>
                <Input
                  value={draft.group_name ?? ""}
                  onChange={(e) => setDraft({ ...draft, group_name: e.target.value })}
                  placeholder="e.g. Branding, Documents, Marketing"
                  list="group-options"
                />
                <datalist id="group-options">
                  {groups.filter((g) => g !== "All").map((g) => <option key={g} value={g} />)}
                </datalist>
                <p className="text-[11px] text-muted-foreground mt-1">Categories sharing a group appear under the same tab.</p>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} maxLength={500} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Accepted file types</Label>
                <Input
                  value={draft.accepted_file_types ?? ""}
                  onChange={(e) => setDraft({ ...draft, accepted_file_types: e.target.value })}
                  placeholder="image/png,image/svg+xml"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Comma-separated MIME types / extensions. Used by upload picker.</p>
              </div>
              <div>
                <Label>Max file size (KB)</Label>
                <Input type="number" min={1} value={draft.max_file_size_kb ?? 2000} onChange={(e) => setDraft({ ...draft, max_file_size_kb: parseInt(e.target.value) || 2000 })} />
              </div>
              <div>
                <Label>Recommended size</Label>
                <Input value={draft.recommended_size ?? ""} onChange={(e) => setDraft({ ...draft, recommended_size: e.target.value })} placeholder="e.g. 1200 × 240 px" />
              </div>
              <div>
                <Label>Aspect</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={draft.aspect ?? "any"}
                  onChange={(e) => setDraft({ ...draft, aspect: e.target.value })}
                >
                  <option value="any">Any</option>
                  <option value="square">Square</option>
                  <option value="wide">Wide</option>
                  <option value="tall">Tall</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Used in (one per line)</Label>
              <Textarea
                value={(draft.used_in ?? []).join("\n")}
                onChange={(e) => setDraft({ ...draft, used_in: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                rows={3}
                placeholder={"Sign-in page\nMember portal home"}
              />
            </div>

            <div>
              <Label>Guidance tips (one per line)</Label>
              <Textarea
                value={(draft.tips ?? []).join("\n")}
                onChange={(e) => setDraft({ ...draft, tips: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                rows={3}
                placeholder={"Use transparent background\nKeep critical content centred"}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="cat-active" checked={draft.is_active ?? true} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              <Label htmlFor="cat-active">Active (visible in tabs and pickers)</Label>
            </div>

            <div className="flex items-start gap-2 p-3 rounded bg-muted text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>Deactivate a category instead of deleting it — existing assets keep working. Deletion is blocked for system defaults and any category already used by an asset.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssetCategoryMasterPage() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <AssetCategoryMasterPageInner />
    </PermissionWrapper>
  );
}
