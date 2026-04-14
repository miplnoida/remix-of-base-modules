import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { OfficeSelect } from "@/components/compliance/OfficeSelect";

interface MappingRow {
  id: string;
  office_code: string;
  zone_id: string;
  is_default: boolean;
  is_active: boolean;
  zone_name?: string;
  zone_code?: string;
}

interface ZoneOption { id: string; zone_code: string; zone_name: string; }

export default function OfficeZoneMapping() {
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MappingRow | null>(null);
  const [form, setForm] = useState({ office_code: "", zone_id: "", is_default: false, is_active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: mapData }, { data: zoneData }] = await Promise.all([
      supabase.from("ce_zone_office_mapping").select("*").order("office_code"),
      supabase.from("ce_zones").select("id, zone_code, zone_name").eq("is_active", true).order("zone_code"),
    ]);
    setZones(zoneData || []);
    const zoneMap = Object.fromEntries((zoneData || []).map(z => [z.id, z]));
    setMappings((mapData || []).map((m: any) => ({
      ...m,
      zone_name: zoneMap[m.zone_id]?.zone_name || "—",
      zone_code: zoneMap[m.zone_id]?.zone_code || "—",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ office_code: "", zone_id: "", is_default: false, is_active: true }); setErrors({}); setDialogOpen(true); };
  const openEdit = (m: MappingRow) => { setEditing(m); setForm({ office_code: m.office_code, zone_id: m.zone_id, is_default: m.is_default, is_active: m.is_active }); setErrors({}); setDialogOpen(true); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.office_code) e.office_code = "Office code is required";
    if (!form.zone_id) e.zone_id = "Zone is required";
    // Prevent duplicate active default for same office
    if (form.is_default) {
      const conflict = mappings.find(m => m.office_code === form.office_code && m.is_default && m.is_active && m.id !== editing?.id);
      if (conflict) e.is_default = `Office ${form.office_code} already has a default mapping to ${conflict.zone_code}`;
    }
    // Prevent duplicate office+zone mapping
    const dup = mappings.find(m => m.office_code === form.office_code && m.zone_id === form.zone_id && m.id !== editing?.id);
    if (dup) e.zone_id = "This office-zone mapping already exists";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = { office_code: form.office_code, zone_id: form.zone_id, is_default: form.is_default, is_active: form.is_active };
    if (editing) {
      const { error } = await supabase.from("ce_zone_office_mapping").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Mapping updated");
    } else {
      const { error } = await supabase.from("ce_zone_office_mapping").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Mapping created");
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const toggleActive = async (m: MappingRow) => {
    const { error } = await supabase.from("ce_zone_office_mapping").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(m.is_active ? "Mapping deactivated" : "Mapping activated");
    fetchData();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Office-to-Zone Mapping</h1>
          <p className="text-muted-foreground">Map SSB office codes to compliance zones for fallback routing</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Mapping</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" /> Office Mappings ({mappings.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office Code</TableHead>
                  <TableHead>Zone Code</TableHead>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-medium">{m.office_code}</TableCell>
                    <TableCell><Badge variant="secondary">{m.zone_code}</Badge></TableCell>
                    <TableCell>{m.zone_name}</TableCell>
                    <TableCell>{m.is_default ? <Badge>Default</Badge> : <Badge variant="secondary">Alternate</Badge>}</TableCell>
                    <TableCell><Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(m)}><Power className={`h-4 w-4 ${m.is_active ? "text-destructive" : "text-green-600"}`} /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Mapping" : "New Office-Zone Mapping"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Office Code *</Label>
              <OfficeSelect value={form.office_code} onChange={v => { setForm(f => ({ ...f, office_code: v })); setErrors(e => ({ ...e, office_code: "" })); }} error={!!errors.office_code} />
              {errors.office_code && <p className="text-xs text-destructive mt-1">{errors.office_code}</p>}
            </div>
            <div>
              <Label>Zone *</Label>
              <Select value={form.zone_id} onValueChange={v => { setForm(f => ({ ...f, zone_id: v })); setErrors(e => ({ ...e, zone_id: "" })); }}>
                <SelectTrigger className={errors.zone_id ? "border-destructive" : ""}><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_code} – {z.zone_name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.zone_id && <p className="text-xs text-destructive mt-1">{errors.zone_id}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} id="map-default" />
              <Label htmlFor="map-default">Default mapping for this office</Label>
            </div>
            {errors.is_default && <p className="text-xs text-destructive">{errors.is_default}</p>}
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="map-active" />
              <Label htmlFor="map-active">Active</Label>
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