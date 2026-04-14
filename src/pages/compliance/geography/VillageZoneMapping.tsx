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
import { Loader2, MapPin, Plus, Pencil, Power, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { OfficeSelect } from "@/components/compliance/OfficeSelect";

interface VillageMappingRow {
  id: string;
  village_code: string;
  village_name?: string;
  zone_id: string;
  office_code: string | null;
  is_active: boolean;
  mapping_source: string | null;
  zone_name?: string;
  zone_code?: string;
}

interface ZoneOption { id: string; zone_code: string; zone_name: string; }

export default function VillageZoneMapping() {
  const [mappings, setMappings] = useState<VillageMappingRow[]>([]);
  const [filtered, setFiltered] = useState<VillageMappingRow[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<VillageMappingRow | null>(null);
  const [form, setForm] = useState({ village_code: "", zone_id: "", office_code: "", is_active: true });
  const [bulkForm, setBulkForm] = useState({ zone_id: "", office_code: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: zoneData }] = await Promise.all([
      supabase.from("ce_village_zone_mapping").select("*").order("village_code"),
      supabase.from("ce_zones").select("id, zone_code, zone_name").eq("is_active", true).order("zone_code"),
    ]);
    setZones(zoneData || []);
    const zoneMap = Object.fromEntries((zoneData || []).map(z => [z.id, z]));
    const villageCodes = [...new Set((data || []).map((m: any) => m.village_code).filter(Boolean))];
    const { data: villages } = await supabase.from("tb_villages").select("code, description").in("code", villageCodes);
    const villageMap = Object.fromEntries((villages || []).map((v: any) => [v.code, v.description]));

    const enriched = (data || []).map((m: any) => ({
      ...m,
      village_name: villageMap[m.village_code] || "—",
      zone_name: zoneMap[m.zone_id]?.zone_name || "—",
      zone_code: zoneMap[m.zone_id]?.zone_code || "—",
    }));
    setMappings(enriched);
    setFiltered(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(mappings); return; }
    const s = search.toLowerCase();
    setFiltered(mappings.filter(m =>
      m.village_code?.toLowerCase().includes(s) ||
      m.village_name?.toLowerCase().includes(s) ||
      m.zone_code?.toLowerCase().includes(s)
    ));
  }, [search, mappings]);

  const openCreate = () => { setEditing(null); setForm({ village_code: "", zone_id: "", office_code: "", is_active: true }); setErrors({}); setDialogOpen(true); };
  const openEdit = (m: VillageMappingRow) => { setEditing(m); setForm({ village_code: m.village_code, zone_id: m.zone_id, office_code: m.office_code || "", is_active: m.is_active }); setErrors({}); setDialogOpen(true); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.village_code?.trim()) e.village_code = "Village code is required";
    if (!form.zone_id) e.zone_id = "Zone is required";
    const dup = mappings.find(m => m.village_code === form.village_code.trim() && m.id !== editing?.id && m.is_active);
    if (dup) e.village_code = "An active mapping for this village already exists";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      village_code: form.village_code.trim(),
      zone_id: form.zone_id,
      office_code: form.office_code?.trim() || null,
      is_active: form.is_active,
      mapping_source: "MANUAL",
    };
    if (editing) {
      const { error } = await supabase.from("ce_village_zone_mapping").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Mapping updated");
    } else {
      const { error } = await supabase.from("ce_village_zone_mapping").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Mapping created");
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const toggleActive = async (m: VillageMappingRow) => {
    const { error } = await supabase.from("ce_village_zone_mapping").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(m.is_active ? "Mapping deactivated" : "Mapping activated");
    fetchData();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkUpdate = async () => {
    if (!bulkForm.zone_id) { toast.error("Select a zone for bulk update"); return; }
    if (selectedIds.size === 0) { toast.error("Select at least one mapping"); return; }
    setSaving(true);
    const payload: any = { zone_id: bulkForm.zone_id };
    if (bulkForm.office_code) payload.office_code = bulkForm.office_code;
    const { error } = await supabase.from("ce_village_zone_mapping").update(payload).in("id", Array.from(selectedIds));
    if (error) { toast.error("Bulk update failed: " + error.message); setSaving(false); return; }
    toast.success(`${selectedIds.size} mappings updated`);
    setSelectedIds(new Set());
    setSaving(false); setBulkOpen(false); fetchData();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Village-to-Zone Mapping</h1>
          <p className="text-muted-foreground">Granular village-level routing to compliance zones</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2"><Upload className="h-4 w-4" /> Bulk Update ({selectedIds.size})</Button>
          )}
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Mapping</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search village or zone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" /> Village Mappings ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><input type="checkbox" onChange={e => { if (e.target.checked) setSelectedIds(new Set(filtered.slice(0, 100).map(m => m.id))); else setSelectedIds(new Set()); }} /></TableHead>
                  <TableHead>Village Code</TableHead>
                  <TableHead>Village Name</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} /></TableCell>
                    <TableCell className="font-mono">{m.village_code}</TableCell>
                    <TableCell>{m.village_name}</TableCell>
                    <TableCell>{m.office_code || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{m.zone_code}</Badge> {m.zone_name}</TableCell>
                    <TableCell><Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(m)}><Power className={`h-4 w-4 ${m.is_active ? "text-destructive" : "text-green-600"}`} /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length > 100 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Showing 100 of {filtered.length} — use search to narrow</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Single create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Village Mapping" : "New Village Mapping"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Village Code *</Label>
              <Input value={form.village_code} onChange={e => { setForm(f => ({ ...f, village_code: e.target.value })); setErrors(er => ({ ...er, village_code: "" })); }} maxLength={20} className={errors.village_code ? "border-destructive" : ""} disabled={!!editing} />
              {errors.village_code && <p className="text-xs text-destructive mt-1">{errors.village_code}</p>}
            </div>
            <div>
              <Label>Zone *</Label>
              <Select value={form.zone_id} onValueChange={v => { setForm(f => ({ ...f, zone_id: v })); setErrors(er => ({ ...er, zone_id: "" })); }}>
                <SelectTrigger className={errors.zone_id ? "border-destructive" : ""}><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_code} – {z.zone_name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.zone_id && <p className="text-xs text-destructive mt-1">{errors.zone_id}</p>}
            </div>
            <div>
              <Label>Office Code</Label>
              <OfficeSelect value={form.office_code || ""} onChange={v => setForm(f => ({ ...f, office_code: v }))} allowNone noneLabel="— None —" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="vm-active" />
              <Label htmlFor="vm-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk update dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Update {selectedIds.size} Mappings</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Zone *</Label>
              <Select value={bulkForm.zone_id} onValueChange={v => setBulkForm(f => ({ ...f, zone_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_code} – {z.zone_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Office Code (optional)</Label>
              <OfficeSelect value={bulkForm.office_code || ""} onChange={v => setBulkForm(f => ({ ...f, office_code: v }))} allowNone noneLabel="— No change —" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpdate} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Update {selectedIds.size} Mappings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}