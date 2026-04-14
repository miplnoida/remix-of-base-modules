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
import { Loader2, Map, Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { useOfficeCodes } from "@/hooks/compliance/useOfficeCodes";

interface ZoneRow {
  id: string;
  zone_code: string;
  zone_name: string;
  territory: string | null;
  office_code: string | null;
  parishes: any;
  is_active: boolean;
  queue_count?: number;
  village_count?: number;
}

const EMPTY: Partial<ZoneRow> = { zone_code: "", zone_name: "", territory: "", office_code: "", is_active: true };

export default function ZoneManagement() {
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ZoneRow | null>(null);
  const [form, setForm] = useState<Partial<ZoneRow>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ce_zones").select("*").order("zone_code");

    const { data: queues } = await supabase.from("ce_assignment_queues").select("zone_id");
    const qMap: Record<string, number> = {};
    (queues || []).forEach((q: any) => { qMap[q.zone_id] = (qMap[q.zone_id] || 0) + 1; });

    const { data: villages } = await supabase.from("ce_village_zone_mapping").select("zone_id");
    const vMap: Record<string, number> = {};
    (villages || []).forEach((v: any) => { vMap[v.zone_id] = (vMap[v.zone_id] || 0) + 1; });

    setZones((data || []).map((z: any) => ({ ...z, queue_count: qMap[z.id] || 0, village_count: vMap[z.id] || 0 })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setErrors({}); setDialogOpen(true); };
  const openEdit = (z: ZoneRow) => { setEditing(z); setForm({ zone_code: z.zone_code, zone_name: z.zone_name, territory: z.territory || "", office_code: z.office_code || "", is_active: z.is_active }); setErrors({}); setDialogOpen(true); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.zone_code?.trim()) e.zone_code = "Zone code is required";
    else if (form.zone_code.trim().length > 10) e.zone_code = "Max 10 characters";
    if (!form.zone_name?.trim()) e.zone_name = "Zone name is required";
    else if (form.zone_name.trim().length > 100) e.zone_name = "Max 100 characters";
    // Check uniqueness
    const existing = zones.find(z => z.zone_code.toUpperCase() === form.zone_code?.trim().toUpperCase() && z.id !== editing?.id);
    if (existing) e.zone_code = "Zone code already exists";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      zone_code: form.zone_code!.trim().toUpperCase(),
      zone_name: form.zone_name!.trim(),
      territory: form.territory?.trim() || null,
      office_code: form.office_code?.trim() || null,
      is_active: form.is_active ?? true,
    };

    if (editing) {
      const { error } = await supabase.from("ce_zones").update(payload).eq("id", editing.id);
      if (error) { toast.error("Failed to update zone: " + error.message); setSaving(false); return; }
      toast.success("Zone updated");
    } else {
      const { error } = await supabase.from("ce_zones").insert(payload);
      if (error) { toast.error("Failed to create zone: " + error.message); setSaving(false); return; }
      toast.success("Zone created");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchZones();
  };

  const toggleActive = async (z: ZoneRow) => {
    if (z.is_active && (z.queue_count! > 0 || z.village_count! > 0)) {
      toast.error(`Cannot deactivate: ${z.queue_count} queues and ${z.village_count} village mappings depend on this zone`);
      return;
    }
    const { error } = await supabase.from("ce_zones").update({ is_active: !z.is_active }).eq("id", z.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(z.is_active ? "Zone deactivated" : "Zone activated");
    fetchZones();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Zones</h1>
          <p className="text-muted-foreground">Enterprise zonal hierarchy for compliance territory management</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Zone</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Map className="h-5 w-5" /> Zones ({zones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Code</TableHead>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Queues</TableHead>
                  <TableHead>Villages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-mono font-medium">{z.zone_code}</TableCell>
                    <TableCell>{z.zone_name}</TableCell>
                    <TableCell className="text-muted-foreground">{z.territory || "—"}</TableCell>
                    <TableCell>{z.office_code || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{z.queue_count}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{z.village_count}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={z.is_active ? "default" : "secondary"}>{z.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(z)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(z)}>
                        <Power className={`h-4 w-4 ${z.is_active ? "text-destructive" : "text-green-600"}`} />
                      </Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Zone" : "Create Zone"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Zone Code *</Label>
              <Input value={form.zone_code || ""} onChange={e => { setForm(f => ({ ...f, zone_code: e.target.value })); setErrors(er => ({ ...er, zone_code: "" })); }} maxLength={10} className={errors.zone_code ? "border-destructive" : ""} />
              {errors.zone_code && <p className="text-xs text-destructive mt-1">{errors.zone_code}</p>}
            </div>
            <div>
              <Label>Zone Name *</Label>
              <Input value={form.zone_name || ""} onChange={e => { setForm(f => ({ ...f, zone_name: e.target.value })); setErrors(er => ({ ...er, zone_name: "" })); }} maxLength={100} className={errors.zone_name ? "border-destructive" : ""} />
              {errors.zone_name && <p className="text-xs text-destructive mt-1">{errors.zone_name}</p>}
            </div>
            <div>
              <Label>Territory</Label>
              <Input value={form.territory || ""} onChange={e => setForm(f => ({ ...f, territory: e.target.value }))} placeholder="e.g. St. Kitts South" />
            </div>
            <div>
              <Label>Office Code</Label>
              <OfficeSelect value={form.office_code || ""} onChange={v => setForm(f => ({ ...f, office_code: v }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="zone-active" />
              <Label htmlFor="zone-active">Active</Label>
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