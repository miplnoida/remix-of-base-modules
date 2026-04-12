import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck, Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";

interface OfficerRow {
  id: string;
  profile_id: string | null;
  display_name: string;
  email: string | null;
  inspector_code: string | null;
  legacy_inspector_code: string | null;
  supervisor_id: string | null;
  primary_zone_id: string | null;
  max_caseload: number | null;
  can_handle_review: boolean;
  can_handle_legal: boolean;
  office_code: string | null;
  is_active: boolean;
  supervisor_name?: string;
  zone_name?: string;
}

interface ProfileOption { id: string; full_name: string | null; email: string | null; }
interface ZoneOption { id: string; zone_name: string; zone_code: string; }

export default function OfficerManagement() {
  const [officers, setOfficers] = useState<OfficerRow[]>([]);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfficerRow | null>(null);
  const [form, setForm] = useState({
    profile_id: "", inspector_code: "", legacy_inspector_code: "",
    max_caseload: "50", supervisor_id: "", primary_zone_id: "",
    office_code: "", can_handle_review: false, can_handle_legal: false, is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    const [{ data: inspData }, { data: profiles }, { data: zones }] = await Promise.all([
      supabase.from("ce_inspectors").select("*"),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("ce_zones").select("id, zone_name, zone_code").eq("is_active", true),
    ]);
    setProfileOptions(profiles || []);
    setZoneOptions(zones || []);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const zoneMap = Object.fromEntries((zones || []).map(z => [z.id, z]));

    const allOfficers: OfficerRow[] = (inspData || []).map((o: any) => {
      const profile = o.profile_id ? profileMap[o.profile_id] : null;
      return {
        ...o,
        display_name: profile?.full_name || o.inspector_code || o.legacy_inspector_code || o.id.slice(0, 12),
        email: profile?.email || null,
        zone_name: o.primary_zone_id ? zoneMap[o.primary_zone_id]?.zone_name : null,
      };
    });

    // Resolve supervisor names
    const officerMap = Object.fromEntries(allOfficers.map(o => [o.id, o]));
    allOfficers.forEach(o => {
      o.supervisor_name = o.supervisor_id ? officerMap[o.supervisor_id]?.display_name || "—" : "—";
    });

    setOfficers(allOfficers);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  // Filter out profiles already linked to an inspector (except current editing)
  const linkedProfileIds = new Set(officers.filter(o => o.profile_id && o.id !== editing?.id).map(o => o.profile_id));
  const availableProfiles = profileOptions.filter(p => !linkedProfileIds.has(p.id));

  const openCreate = () => {
    setEditing(null);
    setForm({ profile_id: "", inspector_code: "", legacy_inspector_code: "", max_caseload: "50", supervisor_id: "", primary_zone_id: "", office_code: "", can_handle_review: false, can_handle_legal: false, is_active: true });
    setErrors({}); setDialogOpen(true);
  };

  const openEdit = (o: OfficerRow) => {
    setEditing(o);
    setForm({
      profile_id: o.profile_id || "",
      inspector_code: o.inspector_code || "",
      legacy_inspector_code: o.legacy_inspector_code || "",
      max_caseload: o.max_caseload?.toString() || "50",
      supervisor_id: o.supervisor_id || "",
      primary_zone_id: o.primary_zone_id || "",
      office_code: o.office_code || "",
      can_handle_review: o.can_handle_review,
      can_handle_legal: o.can_handle_legal,
      is_active: o.is_active,
    });
    setErrors({}); setDialogOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.profile_id) e.profile_id = "Profile link is required";
    if (form.inspector_code?.trim()) {
      const dup = officers.find(o => o.inspector_code === form.inspector_code.trim() && o.id !== editing?.id);
      if (dup) e.inspector_code = "Inspector code already exists";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload: any = {
      profile_id: form.profile_id,
      inspector_code: form.inspector_code?.trim() || null,
      legacy_inspector_code: form.legacy_inspector_code?.trim() || null,
      max_caseload: parseInt(form.max_caseload) || 50,
      supervisor_id: form.supervisor_id || null,
      primary_zone_id: form.primary_zone_id || null,
      office_code: form.office_code?.trim() || null,
      can_handle_review: form.can_handle_review,
      can_handle_legal: form.can_handle_legal,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("ce_inspectors").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Officer updated");
    } else {
      const { error } = await supabase.from("ce_inspectors").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Officer created");
    }
    setSaving(false); setDialogOpen(false); fetchOfficers();
  };

  const toggleActive = async (o: OfficerRow) => {
    const { error } = await supabase.from("ce_inspectors").update({ is_active: !o.is_active }).eq("id", o.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(o.is_active ? "Officer deactivated" : "Officer activated");
    fetchOfficers();
  };

  const supervisorOptions = officers.filter(o => o.is_active && o.id !== editing?.id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Officers / Inspectors</h1>
          <p className="text-muted-foreground">Compliance officers linked to system profiles</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Link Officer</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserCheck className="h-5 w-5" /> Officers ({officers.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Inspector Code</TableHead>
                  <TableHead>Legacy Code</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Caseload</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.display_name}</TableCell>
                    <TableCell className="font-mono text-sm">{o.inspector_code || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{o.legacy_inspector_code || "—"}</TableCell>
                    <TableCell>{o.zone_name || "—"}</TableCell>
                    <TableCell>{o.supervisor_name}</TableCell>
                    <TableCell>{o.max_caseload || "—"}</TableCell>
                    <TableCell className="space-x-1">
                      {o.can_handle_review && <Badge variant="secondary" className="text-xs">REV</Badge>}
                      {o.can_handle_legal && <Badge variant="secondary" className="text-xs">LEG</Badge>}
                    </TableCell>
                    <TableCell><Badge variant={o.is_active ? "default" : "secondary"}>{o.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(o)}><Power className={`h-4 w-4 ${o.is_active ? "text-destructive" : "text-green-600"}`} /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Officer" : "Link Officer to Compliance"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>System Profile *</Label>
              <Select value={form.profile_id} onValueChange={v => { setForm(f => ({ ...f, profile_id: v })); setErrors(e => ({ ...e, profile_id: "" })); }}>
                <SelectTrigger className={errors.profile_id ? "border-destructive" : ""}><SelectValue placeholder="Select a user profile" /></SelectTrigger>
                <SelectContent>
                  {(editing ? profileOptions : availableProfiles).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id.slice(0, 12)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.profile_id && <p className="text-xs text-destructive mt-1">{errors.profile_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inspector Code</Label>
                <Input value={form.inspector_code} onChange={e => { setForm(f => ({ ...f, inspector_code: e.target.value })); setErrors(er => ({ ...er, inspector_code: "" })); }} maxLength={20} className={errors.inspector_code ? "border-destructive" : ""} />
                {errors.inspector_code && <p className="text-xs text-destructive mt-1">{errors.inspector_code}</p>}
              </div>
              <div>
                <Label>Legacy Code</Label>
                <Input value={form.legacy_inspector_code} onChange={e => setForm(f => ({ ...f, legacy_inspector_code: e.target.value }))} maxLength={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Zone</Label>
                <Select value={form.primary_zone_id || "none"} onValueChange={v => setForm(f => ({ ...f, primary_zone_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {zoneOptions.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_name} ({z.zone_code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Office Code</Label>
                <Input value={form.office_code} onChange={e => setForm(f => ({ ...f, office_code: e.target.value }))} maxLength={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supervisor</Label>
                <Select value={form.supervisor_id || "none"} onValueChange={v => setForm(f => ({ ...f, supervisor_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {supervisorOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Caseload</Label>
                <Input type="number" value={form.max_caseload} onChange={e => setForm(f => ({ ...f, max_caseload: e.target.value }))} min={1} max={9999} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="off-active" />
                <Label htmlFor="off-active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.can_handle_review} onChange={e => setForm(f => ({ ...f, can_handle_review: e.target.checked }))} id="off-review" />
                <Label htmlFor="off-review">Can Handle Review</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.can_handle_legal} onChange={e => setForm(f => ({ ...f, can_handle_legal: e.target.checked }))} id="off-legal" />
                <Label htmlFor="off-legal">Can Handle Legal</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
