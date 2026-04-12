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
  name: string | null;
  email: string | null;
  phone: string | null;
  profile_id: string | null;
  legacy_inspector_code: string | null;
  inspector_code: string | null;
  designation_id: string | null;
  supervisor_id: string | null;
  max_caseload: number | null;
  is_active: boolean;
  is_primary: boolean | null;
  supervisor_name?: string;
}

export default function OfficerManagement() {
  const [officers, setOfficers] = useState<OfficerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfficerRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", legacy_inspector_code: "", inspector_code: "", max_caseload: "500", supervisor_id: "", is_active: true, is_primary: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ce_inspectors").select("*").order("name");
    const allOfficers = data || [];
    const supMap = Object.fromEntries(allOfficers.map(o => [o.id, o.name || o.legacy_inspector_code || o.id.slice(0, 8)]));
    setOfficers(allOfficers.map((o: any) => ({ ...o, supervisor_name: o.supervisor_id ? supMap[o.supervisor_id] || "—" : "—" })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  const openCreate = () => { setEditing(null); setForm({ name: "", email: "", phone: "", legacy_inspector_code: "", inspector_code: "", max_caseload: "500", supervisor_id: "", is_active: true, is_primary: false }); setErrors({}); setDialogOpen(true); };
  const openEdit = (o: OfficerRow) => {
    setEditing(o);
    setForm({
      name: o.name || "", email: o.email || "", phone: o.phone || "",
      legacy_inspector_code: o.legacy_inspector_code || "", inspector_code: o.inspector_code || "",
      max_caseload: o.max_caseload?.toString() || "500",
      supervisor_id: o.supervisor_id || "", is_active: o.is_active, is_primary: o.is_primary ?? false,
    });
    setErrors({}); setDialogOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = "Name is required";
    if (form.legacy_inspector_code?.trim()) {
      const dup = officers.find(o => o.legacy_inspector_code === form.legacy_inspector_code.trim() && o.id !== editing?.id);
      if (dup) e.legacy_inspector_code = "Legacy code already assigned to another officer";
    }
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
      name: form.name.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      legacy_inspector_code: form.legacy_inspector_code?.trim() || null,
      inspector_code: form.inspector_code?.trim() || null,
      max_caseload: parseInt(form.max_caseload) || 500,
      supervisor_id: form.supervisor_id || null,
      is_active: form.is_active,
      is_primary: form.is_primary,
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

  // Supervisors for dropdown = active officers
  const supervisorOptions = officers.filter(o => o.is_active && o.id !== editing?.id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Officers / Inspectors</h1>
          <p className="text-muted-foreground">Compliance officers registered in the enforcement module</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Officer</Button>
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
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Max Caseload</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{o.inspector_code || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{o.legacy_inspector_code || "—"}</TableCell>
                    <TableCell>{o.supervisor_name}</TableCell>
                    <TableCell>{o.max_caseload || "—"}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Officer" : "New Officer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: "" })); }} maxLength={100} className={errors.name ? "border-destructive" : ""} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inspector Code</Label>
                <Input value={form.inspector_code} onChange={e => { setForm(f => ({ ...f, inspector_code: e.target.value })); setErrors(er => ({ ...er, inspector_code: "" })); }} maxLength={20} className={errors.inspector_code ? "border-destructive" : ""} />
                {errors.inspector_code && <p className="text-xs text-destructive mt-1">{errors.inspector_code}</p>}
              </div>
              <div>
                <Label>Legacy Code</Label>
                <Input value={form.legacy_inspector_code} onChange={e => { setForm(f => ({ ...f, legacy_inspector_code: e.target.value })); setErrors(er => ({ ...er, legacy_inspector_code: "" })); }} maxLength={20} className={errors.legacy_inspector_code ? "border-destructive" : ""} />
                {errors.legacy_inspector_code && <p className="text-xs text-destructive mt-1">{errors.legacy_inspector_code}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supervisor</Label>
                <Select value={form.supervisor_id || "none"} onValueChange={v => setForm(f => ({ ...f, supervisor_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {supervisorOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name || s.legacy_inspector_code || s.id.slice(0, 8)}</SelectItem>)}
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
                <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} id="off-primary" />
                <Label htmlFor="off-primary">Primary Inspector</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}