import { PermissionWrapper } from "@/components/ui/permission-wrapper";
/**
 * Module Profiles — 1:1 with app_modules. Lists every module with its
 * owner department, default workbasket, default DMS folder and asset
 * override / inheritance flags. Editing toggles inheritance and stores
 * override asset references — never the module name itself (modules come
 * from `app_modules`).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

const sb = supabase as any;

const INHERIT_FIELDS = [
  ["inherit_letterhead_from_org", "Letterhead"],
  ["inherit_email_signature_from_org", "Email signature"],
  ["inherit_disclaimer_from_org", "Disclaimer"],
  ["inherit_print_footer_from_org", "Print footer"],
  ["inherit_logo_from_org", "Logo"],
  ["inherit_seal_from_org", "Seal"],
] as const;

interface Row {
  id: string;
  module_id: string;
  module_code: string;
  module_display: string | null;
  owner_department_id: string | null;
  default_workbasket_id: string | null;
  default_dms_folder_id: string | null;
  default_notification_category: string | null;
  ai_context_notes: string | null;
  is_active: boolean;
  [k: string]: any;
}

function ModuleProfilesPageInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    const { data: mods } = await sb.from("app_modules").select("id,name,display_name").order("name");
    const { data: profs } = await sb.from("core_module_profile").select("*");
    const byMod: Record<string, any> = Object.fromEntries((profs ?? []).map((p: any) => [p.module_id, p]));
    setRows((mods ?? []).map((m: any) => ({
      ...(byMod[m.id] ?? { module_id: m.id, module_code: m.name, is_active: true }),
      module_display: m.display_name,
    })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    const payload = {
      module_id: edit.module_id,
      module_code: edit.module_code,
      owner_department_id: edit.owner_department_id,
      default_workbasket_id: edit.default_workbasket_id,
      default_dms_folder_id: edit.default_dms_folder_id,
      default_notification_category: edit.default_notification_category,
      ai_context_notes: edit.ai_context_notes,
      is_active: edit.is_active,
      ...Object.fromEntries(INHERIT_FIELDS.map(([k]) => [k, edit[k] ?? true])),
    };
    const { error } = await sb.from("core_module_profile").upsert(payload, { onConflict: "module_id" });
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success("Module profile saved");
    setEdit(null);
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Ownership &amp; Defaults</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Define which department owns each module and which defaults it inherits or overrides.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table sticky>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Owner dept</TableHead>
                <TableHead>Workbasket</TableHead>
                <TableHead>DMS folder</TableHead>
                <TableHead>Inheritance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const overrides = INHERIT_FIELDS.filter(([k]) => r[k] === false).length;
                return (
                  <TableRow key={r.module_id}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.module_display ?? r.module_code}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.module_code}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.owner_department_id ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.default_workbasket_id ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.default_dms_folder_id ?? "—"}</TableCell>
                    <TableCell>
                      {overrides === 0 ? (
                        <Badge variant="secondary">Fully inherited</Badge>
                      ) : (
                        <Badge>{overrides} override{overrides > 1 ? "s" : ""}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{edit?.module_display ?? edit?.module_code}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Owner department ID</Label>
                <Input value={edit.owner_department_id ?? ""} onChange={(e) => setEdit({ ...edit, owner_department_id: e.target.value || null })} />
              </div>
              <div>
                <Label>Default workbasket ID</Label>
                <Input value={edit.default_workbasket_id ?? ""} onChange={(e) => setEdit({ ...edit, default_workbasket_id: e.target.value || null })} />
              </div>
              <div>
                <Label>Default DMS folder</Label>
                <Input value={edit.default_dms_folder_id ?? ""} onChange={(e) => setEdit({ ...edit, default_dms_folder_id: e.target.value || null })} />
              </div>
              <div>
                <Label>Default notification category</Label>
                <Input value={edit.default_notification_category ?? ""} onChange={(e) => setEdit({ ...edit, default_notification_category: e.target.value || null })} />
              </div>
              <div className="col-span-2">
                <Label>AI context notes</Label>
                <Input value={edit.ai_context_notes ?? ""} onChange={(e) => setEdit({ ...edit, ai_context_notes: e.target.value || null })} />
              </div>
              <div className="col-span-2 border-t pt-3">
                <p className="text-sm font-medium mb-2">Inheritance from Organization defaults</p>
                <div className="grid grid-cols-2 gap-2">
                  {INHERIT_FIELDS.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={edit[key] ?? true}
                        onCheckedChange={(v) => setEdit({ ...edit, [key]: v })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function ModuleProfilesPage() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <ModuleProfilesPageInner />
    </PermissionWrapper>
  );
}
