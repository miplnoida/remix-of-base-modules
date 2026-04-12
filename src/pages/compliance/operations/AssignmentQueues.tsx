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
import { Loader2, Users, RefreshCw, Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";

interface QueueRow {
  id: string;
  queue_code: string;
  queue_name: string;
  queue_type: string;
  zone_id: string;
  is_default: boolean;
  priority: number | null;
  is_active: boolean;
  zone_name?: string;
  member_count?: number;
}

interface ZoneOption { id: string; zone_code: string; zone_name: string; }

const QUEUE_TYPES = [
  { value: "OPS", label: "Operational", color: "bg-blue-100 text-blue-800" },
  { value: "REV", label: "Review", color: "bg-amber-100 text-amber-800" },
  { value: "LEG", label: "Legal", color: "bg-red-100 text-red-800" },
  { value: "FLB", label: "Fallback", color: "bg-gray-100 text-gray-800" },
];

export default function AssignmentQueues() {
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QueueRow | null>(null);
  const [form, setForm] = useState({ queue_code: "", queue_name: "", queue_type: "OPS", zone_id: "", is_default: false, priority: 10, is_active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: zoneData }] = await Promise.all([
      supabase.from("ce_assignment_queues").select("*").order("queue_type").order("queue_name"),
      supabase.from("ce_zones").select("id, zone_code, zone_name").eq("is_active", true).order("zone_code"),
    ]);
    setZones(zoneData || []);

    const zoneIds = [...new Set((data || []).map((q: any) => q.zone_id).filter(Boolean))];
    const zoneMap = Object.fromEntries((zoneData || []).map(z => [z.id, z.zone_name]));

    const { data: members } = await supabase.from("ce_queue_members").select("queue_id");
    const countMap: Record<string, number> = {};
    (members || []).forEach((m: any) => { countMap[m.queue_id] = (countMap[m.queue_id] || 0) + 1; });

    setQueues((data || []).map((q: any) => ({
      ...q,
      zone_name: zoneMap[q.zone_id] || "—",
      member_count: countMap[q.id] || 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueues(); }, [fetchQueues]);

  const typeColor = (t: string) => QUEUE_TYPES.find(qt => qt.value === t)?.color || "bg-muted text-muted-foreground";

  const openCreate = () => { setEditing(null); setForm({ queue_code: "", queue_name: "", queue_type: "OPS", zone_id: "", is_default: false, priority: 10, is_active: true }); setErrors({}); setDialogOpen(true); };
  const openEdit = (q: QueueRow) => { setEditing(q); setForm({ queue_code: q.queue_code, queue_name: q.queue_name, queue_type: q.queue_type, zone_id: q.zone_id, is_default: q.is_default, priority: q.priority || 10, is_active: q.is_active }); setErrors({}); setDialogOpen(true); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.queue_code?.trim()) e.queue_code = "Queue code is required";
    if (!form.queue_name?.trim()) e.queue_name = "Queue name is required";
    if (!form.zone_id) e.zone_id = "Zone is required";
    if (!form.queue_type) e.queue_type = "Queue type is required";
    const dup = queues.find(q => q.queue_code.toUpperCase() === form.queue_code.trim().toUpperCase() && q.id !== editing?.id);
    if (dup) e.queue_code = "Queue code already exists";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      queue_code: form.queue_code.trim().toUpperCase(),
      queue_name: form.queue_name.trim(),
      queue_type: form.queue_type,
      zone_id: form.zone_id,
      is_default: form.is_default,
      priority: form.priority,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("ce_assignment_queues").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Queue updated");
    } else {
      const { error } = await supabase.from("ce_assignment_queues").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Queue created");
    }
    setSaving(false); setDialogOpen(false); fetchQueues();
  };

  const toggleActive = async (q: QueueRow) => {
    if (q.is_active && q.member_count! > 0) {
      toast.error(`Cannot deactivate: ${q.member_count} members are enrolled in this queue`);
      return;
    }
    const { error } = await supabase.from("ce_assignment_queues").update({ is_active: !q.is_active }).eq("id", q.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(q.is_active ? "Queue deactivated" : "Queue activated");
    fetchQueues();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignment Queues</h1>
          <p className="text-muted-foreground">Manage operational, review, legal, and fallback queues across zones</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchQueues}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Queue</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> All Queues ({queues.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Queue Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm">{q.queue_code}</TableCell>
                    <TableCell className="font-medium">{q.queue_name}</TableCell>
                    <TableCell><Badge className={typeColor(q.queue_type)} variant="secondary">{q.queue_type}</Badge></TableCell>
                    <TableCell>{q.zone_name}</TableCell>
                    <TableCell>{q.member_count}</TableCell>
                    <TableCell>{q.priority ?? "—"}</TableCell>
                    <TableCell><Badge variant={q.is_active ? "default" : "secondary"}>{q.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(q)}><Power className={`h-4 w-4 ${q.is_active ? "text-destructive" : "text-green-600"}`} /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Queue" : "New Assignment Queue"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Queue Code *</Label>
              <Input value={form.queue_code} onChange={e => { setForm(f => ({ ...f, queue_code: e.target.value })); setErrors(er => ({ ...er, queue_code: "" })); }} maxLength={20} className={errors.queue_code ? "border-destructive" : ""} />
              {errors.queue_code && <p className="text-xs text-destructive mt-1">{errors.queue_code}</p>}
            </div>
            <div>
              <Label>Queue Name *</Label>
              <Input value={form.queue_name} onChange={e => { setForm(f => ({ ...f, queue_name: e.target.value })); setErrors(er => ({ ...er, queue_name: "" })); }} maxLength={100} className={errors.queue_name ? "border-destructive" : ""} />
              {errors.queue_name && <p className="text-xs text-destructive mt-1">{errors.queue_name}</p>}
            </div>
            <div>
              <Label>Queue Type *</Label>
              <Select value={form.queue_type} onValueChange={v => setForm(f => ({ ...f, queue_type: v }))}>
                <SelectTrigger className={errors.queue_type ? "border-destructive" : ""}><SelectValue /></SelectTrigger>
                <SelectContent>{QUEUE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.value} – {t.label}</SelectItem>)}</SelectContent>
              </Select>
              {errors.queue_type && <p className="text-xs text-destructive mt-1">{errors.queue_type}</p>}
            </div>
            <div>
              <Label>Zone *</Label>
              <Select value={form.zone_id} onValueChange={v => { setForm(f => ({ ...f, zone_id: v })); setErrors(er => ({ ...er, zone_id: "" })); }}>
                <SelectTrigger className={errors.zone_id ? "border-destructive" : ""}><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_code} – {z.zone_name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.zone_id && <p className="text-xs text-destructive mt-1">{errors.zone_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 10 }))} min={1} max={999} />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} id="q-default" />
                  <Label htmlFor="q-default">Default</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="q-active" />
                  <Label htmlFor="q-active">Active</Label>
                </div>
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