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
import { Loader2, Route, Plus, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OfficeSelect } from "@/components/compliance/OfficeSelect";

interface RuleRow {
  id: string;
  rule_name: string;
  priority: number;
  violation_type_id: string | null;
  office_code: string | null;
  zone_id: string | null;
  target_queue_id: string | null;
  target_inspector_id: string | null;
  requires_review: boolean;
  is_active: boolean;
  queue_name?: string;
  queue_type?: string;
  violation_type_name?: string;
  zone_name?: string;
}

interface QueueOption { id: string; queue_code: string; queue_name: string; queue_type: string; }
interface ViolationTypeOption { id: string; code: string; name: string; }
interface ZoneOption { id: string; zone_code: string; zone_name: string; }

export default function AssignmentRoutingRules() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [queues, setQueues] = useState<QueueOption[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationTypeOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RuleRow | null>(null);
  const [form, setForm] = useState({ rule_name: "", priority: 10, violation_type_id: "", office_code: "", zone_id: "", target_queue_id: "", requires_review: false, is_active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: ruleData }, { data: qData }, { data: vtData }, { data: zData }] = await Promise.all([
      supabase.from("ce_assignment_routing_rules").select("*").order("priority"),
      supabase.from("ce_assignment_queues").select("id, queue_code, queue_name, queue_type").eq("is_active", true).order("queue_name"),
      supabase.from("ce_violation_types").select("id, code, name").eq("is_active", true).order("code"),
      supabase.from("ce_zones").select("id, zone_code, zone_name").eq("is_active", true).order("zone_code"),
    ]);
    setQueues(qData || []);
    setViolationTypes(vtData || []);
    setZones(zData || []);
    const qMap = Object.fromEntries((qData || []).map(q => [q.id, q]));
    const vtMap = Object.fromEntries((vtData || []).map(v => [v.id, v.name]));
    const zMap = Object.fromEntries((zData || []).map(z => [z.id, z.zone_name]));

    setRules((ruleData || []).map((r: any) => ({
      ...r,
      queue_name: qMap[r.target_queue_id]?.queue_name || "—",
      queue_type: qMap[r.target_queue_id]?.queue_type || "—",
      violation_type_name: r.violation_type_id ? vtMap[r.violation_type_id] || "Unknown" : "Any",
      zone_name: r.zone_id ? zMap[r.zone_id] || "Unknown" : "Any",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ rule_name: "", priority: 10, violation_type_id: "", office_code: "", zone_id: "", target_queue_id: "", requires_review: false, is_active: true }); setErrors({}); setDialogOpen(true); };
  const openEdit = (r: RuleRow) => {
    setEditing(r);
    setForm({
      rule_name: r.rule_name, priority: r.priority,
      violation_type_id: r.violation_type_id || "", office_code: r.office_code || "",
      zone_id: r.zone_id || "", target_queue_id: r.target_queue_id || "",
      requires_review: r.requires_review, is_active: r.is_active,
    });
    setErrors({}); setDialogOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.rule_name?.trim()) e.rule_name = "Rule name is required";
    if (!form.target_queue_id) e.target_queue_id = "Target queue is required";
    if (form.priority < 1 || form.priority > 999) e.priority = "Priority must be 1-999";
    // Prevent conflicting active rules with same violation_type + office + zone combo
    const conflict = rules.find(r =>
      r.is_active && r.id !== editing?.id &&
      (r.violation_type_id || "") === form.violation_type_id &&
      (r.office_code || "") === form.office_code &&
      (r.zone_id || "") === form.zone_id &&
      r.target_queue_id === form.target_queue_id
    );
    if (conflict) e.rule_name = "A rule with the same type/office/zone/queue combination already exists";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload: any = {
      rule_name: form.rule_name.trim(),
      priority: form.priority,
      violation_type_id: form.violation_type_id || null,
      office_code: form.office_code || null,
      zone_id: form.zone_id || null,
      target_queue_id: form.target_queue_id,
      requires_review: form.requires_review,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("ce_assignment_routing_rules").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Rule updated");
    } else {
      const { error } = await supabase.from("ce_assignment_routing_rules").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Rule created");
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const toggleActive = async (r: RuleRow) => {
    const { error } = await supabase.from("ce_assignment_routing_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(r.is_active ? "Rule deactivated" : "Rule activated");
    fetchData();
  };

  const handleDelete = async (r: RuleRow) => {
    if (!confirm(`Delete rule "${r.rule_name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("ce_assignment_routing_rules").delete().eq("id", r.id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    toast.success("Rule deleted");
    fetchData();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignment Routing Rules</h1>
          <p className="text-muted-foreground">Rules that determine how violations are routed to queues based on type and office</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Rule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Route className="h-5 w-5" /> Routing Rules ({rules.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Target Queue</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.priority}</TableCell>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell>{r.violation_type_name}</TableCell>
                    <TableCell>{r.office_code || "Any"}</TableCell>
                    <TableCell>{r.zone_name}</TableCell>
                    <TableCell><Badge variant="secondary">{r.queue_type}</Badge> {r.queue_name}</TableCell>
                    <TableCell>{r.requires_review ? <Badge variant="outline">Yes</Badge> : "—"}</TableCell>
                    <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(r)}><Power className={`h-4 w-4 ${r.is_active ? "text-destructive" : "text-green-600"}`} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Routing Rule" : "New Routing Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name *</Label>
              <Input value={form.rule_name} onChange={e => { setForm(f => ({ ...f, rule_name: e.target.value })); setErrors(er => ({ ...er, rule_name: "" })); }} maxLength={100} className={errors.rule_name ? "border-destructive" : ""} />
              {errors.rule_name && <p className="text-xs text-destructive mt-1">{errors.rule_name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority *</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 10 }))} min={1} max={999} className={errors.priority ? "border-destructive" : ""} />
                {errors.priority && <p className="text-xs text-destructive mt-1">{errors.priority}</p>}
              </div>
              <div>
                <Label>Office Code</Label>
                <OfficeSelect value={form.office_code || ""} onChange={v => setForm(f => ({ ...f, office_code: v }))} allowNone noneLabel="Any" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Violation Type</Label>
                <Select value={form.violation_type_id || "any"} onValueChange={v => setForm(f => ({ ...f, violation_type_id: v === "any" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Type</SelectItem>
                    {violationTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.code} – {vt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zone</Label>
                <Select value={form.zone_id || "any"} onValueChange={v => setForm(f => ({ ...f, zone_id: v === "any" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Zone</SelectItem>
                    {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_code} – {z.zone_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target Queue *</Label>
              <Select value={form.target_queue_id} onValueChange={v => { setForm(f => ({ ...f, target_queue_id: v })); setErrors(er => ({ ...er, target_queue_id: "" })); }}>
                <SelectTrigger className={errors.target_queue_id ? "border-destructive" : ""}><SelectValue placeholder="Select target queue" /></SelectTrigger>
                <SelectContent>{queues.map(q => <SelectItem key={q.id} value={q.id}>[{q.queue_type}] {q.queue_name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.target_queue_id && <p className="text-xs text-destructive mt-1">{errors.target_queue_id}</p>}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.requires_review} onChange={e => setForm(f => ({ ...f, requires_review: e.target.checked }))} id="rr-review" />
                <Label htmlFor="rr-review">Requires Review</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="rr-active" />
                <Label htmlFor="rr-active">Active</Label>
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