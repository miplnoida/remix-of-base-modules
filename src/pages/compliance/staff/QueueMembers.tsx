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
import { Loader2, Users, Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";

interface MemberRow {
  id: string;
  queue_id: string;
  inspector_id: string;
  role: string | null;
  is_active: boolean;
  max_caseload_override: number | null;
  queue_name?: string;
  queue_type?: string;
  inspector_name?: string;
}

interface QueueOption { id: string; queue_code: string; queue_name: string; queue_type: string; }
interface InspectorOption { id: string; display_name: string; }

const ROLES = ["MEMBER", "LEAD", "SUPERVISOR"];

export default function QueueMembers() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [queues, setQueues] = useState<QueueOption[]>([]);
  const [inspectors, setInspectors] = useState<InspectorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [form, setForm] = useState({ queue_id: "", inspector_id: "", role: "MEMBER", is_active: true, max_caseload_override: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: memberData }, { data: queueData }, { data: inspData }, { data: profiles }] = await Promise.all([
      supabase.from("ce_queue_members").select("*").order("queue_id"),
      supabase.from("ce_assignment_queues").select("id, queue_code, queue_name, queue_type").eq("is_active", true).order("queue_name"),
      supabase.from("ce_inspectors").select("id, inspector_code, legacy_inspector_code, profile_id").eq("is_active", true),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setQueues(queueData || []);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
    const inspOptions: InspectorOption[] = (inspData || []).map(i => ({
      id: i.id,
      display_name: (i.profile_id ? profileMap[i.profile_id] : null) || i.inspector_code || i.legacy_inspector_code || i.id.slice(0, 12),
    }));
    setInspectors(inspOptions);

    const qMap = Object.fromEntries((queueData || []).map(q => [q.id, q]));
    const iMap = Object.fromEntries(inspOptions.map(i => [i.id, i]));
    setMembers((memberData || []).map((m: any) => ({
      ...m,
      queue_name: qMap[m.queue_id]?.queue_name || "—",
      queue_type: qMap[m.queue_id]?.queue_type || "—",
      inspector_name: iMap[m.inspector_id]?.display_name || m.inspector_id?.slice(0, 12),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const roleColor = (r: string | null) => {
    switch (r) {
      case "LEAD": return "bg-blue-100 text-blue-800";
      case "SUPERVISOR": return "bg-purple-100 text-purple-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const openCreate = () => { setEditing(null); setForm({ queue_id: "", inspector_id: "", role: "MEMBER", is_active: true, max_caseload_override: "" }); setErrors({}); setDialogOpen(true); };
  const openEdit = (m: MemberRow) => {
    setEditing(m);
    setForm({ queue_id: m.queue_id, inspector_id: m.inspector_id, role: m.role || "MEMBER", is_active: m.is_active, max_caseload_override: m.max_caseload_override?.toString() || "" });
    setErrors({}); setDialogOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.queue_id) e.queue_id = "Queue is required";
    if (!form.inspector_id) e.inspector_id = "Inspector is required";
    if (!editing) {
      const dup = members.find(m => m.queue_id === form.queue_id && m.inspector_id === form.inspector_id && m.is_active);
      if (dup) e.inspector_id = "This inspector is already an active member of this queue";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload: any = {
      queue_id: form.queue_id,
      inspector_id: form.inspector_id,
      role: form.role,
      is_active: form.is_active,
      max_caseload_override: form.max_caseload_override ? parseInt(form.max_caseload_override) : null,
    };
    if (editing) {
      const { error } = await supabase.from("ce_queue_members").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Member updated");
    } else {
      const { error } = await supabase.from("ce_queue_members").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Member added");
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const toggleActive = async (m: MemberRow) => {
    const { error } = await supabase.from("ce_queue_members").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(m.is_active ? "Membership deactivated" : "Membership activated");
    fetchData();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queue Members</h1>
          <p className="text-muted-foreground">Inspector-to-queue assignments and roles</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Member</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Members ({members.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Caseload Override</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.queue_name}</TableCell>
                    <TableCell><Badge variant="secondary">{m.queue_type}</Badge></TableCell>
                    <TableCell>{m.inspector_name}</TableCell>
                    <TableCell><Badge className={roleColor(m.role)}>{m.role}</Badge></TableCell>
                    <TableCell>{m.max_caseload_override ?? "—"}</TableCell>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Member" : "Add Member"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Queue *</Label>
              <Select value={form.queue_id} onValueChange={v => { setForm(f => ({ ...f, queue_id: v })); setErrors(e => ({ ...e, queue_id: "" })); }} disabled={!!editing}>
                <SelectTrigger className={errors.queue_id ? "border-destructive" : ""}><SelectValue placeholder="Select queue" /></SelectTrigger>
                <SelectContent>
                  {queues.map(q => <SelectItem key={q.id} value={q.id}>{q.queue_name} ({q.queue_type})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.queue_id && <p className="text-xs text-destructive mt-1">{errors.queue_id}</p>}
            </div>
            <div>
              <Label>Inspector *</Label>
              <Select value={form.inspector_id} onValueChange={v => { setForm(f => ({ ...f, inspector_id: v })); setErrors(e => ({ ...e, inspector_id: "" })); }} disabled={!!editing}>
                <SelectTrigger className={errors.inspector_id ? "border-destructive" : ""}><SelectValue placeholder="Select inspector" /></SelectTrigger>
                <SelectContent>
                  {inspectors.map(i => <SelectItem key={i.id} value={i.id}>{i.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.inspector_id && <p className="text-xs text-destructive mt-1">{errors.inspector_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Caseload Override</Label>
                <Input type="number" value={form.max_caseload_override} onChange={e => setForm(f => ({ ...f, max_caseload_override: e.target.value }))} min={1} placeholder="Use default" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="mem-active" />
              <Label htmlFor="mem-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
