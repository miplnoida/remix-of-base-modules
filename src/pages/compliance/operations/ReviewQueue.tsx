import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface QueueOption { id: string; queue_name: string; queue_type: string; }
interface InspectorOption { id: string; display_name: string; }

export default function ReviewQueue() {
  const [violations, setViolations] = useState<any[]>([]);
  const [queues, setQueues] = useState<QueueOption[]>([]);
  const [inspectors, setInspectors] = useState<InspectorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [reassignTarget, setReassignTarget] = useState({ type: "queue", queue_id: "", inspector_id: "" });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: revQueues } = await supabase.from("ce_assignment_queues").select("id, queue_name, queue_type").eq("queue_type", "REV");
    const allQueues = revQueues || [];
    const queueIds = allQueues.map(q => q.id);

    const [{ data: inspData }, { data: profiles }] = await Promise.all([
      supabase.from("ce_inspectors").select("id, inspector_code, legacy_inspector_code, profile_id").eq("is_active", true),
      supabase.from("profiles").select("id, full_name"),
    ]);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
    const inspOptions: InspectorOption[] = (inspData || []).map(i => ({
      id: i.id,
      display_name: (i.profile_id ? profileMap[i.profile_id] : null) || i.inspector_code || i.legacy_inspector_code || i.id.slice(0, 8),
    }));
    setInspectors(inspOptions);

    const { data: allQData } = await supabase.from("ce_assignment_queues").select("id, queue_name, queue_type").eq("is_active", true).order("queue_name");
    setQueues(allQData || []);

    if (queueIds.length === 0) { setViolations([]); setLoading(false); return; }

    const { data } = await supabase
      .from("ce_violations")
      .select("id, violation_number, employer_regno, status, priority, created_at, assigned_queue_id, assigned_to_user_id, zone_id")
      .in("assigned_queue_id", queueIds)
      .in("status", ["UNDER_REVIEW", "OPEN"])
      .order("created_at", { ascending: false })
      .limit(200);

    const qMap = Object.fromEntries(allQueues.map(q => [q.id, q.queue_name]));
    const iMap = Object.fromEntries(inspOptions.map(i => [i.id, i.display_name]));

    setViolations((data || []).map((v: any) => ({
      ...v,
      queue_name: qMap[v.assigned_queue_id] || "—",
      assigned_officer_name: v.assigned_to_user_id ? iMap[v.assigned_to_user_id] || v.assigned_to_user_id.slice(0, 8) : "—",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openReassign = (v: any) => {
    setSelectedViolation(v);
    setReassignTarget({ type: "queue", queue_id: v.assigned_queue_id || "", inspector_id: "" });
    setReassignOpen(true);
  };

  const handleReassign = async () => {
    if (!selectedViolation) return;
    setSaving(true);
    const update: any = {};
    if (reassignTarget.type === "queue" && reassignTarget.queue_id) {
      update.assigned_queue_id = reassignTarget.queue_id;
      update.assigned_to_user_id = null;
    } else if (reassignTarget.type === "officer" && reassignTarget.inspector_id) {
      update.assigned_to_user_id = reassignTarget.inspector_id;
    } else { toast.error("Select a target"); setSaving(false); return; }

    const { error } = await supabase.from("ce_violations").update(update).eq("id", selectedViolation.id);
    if (error) { toast.error("Failed: " + error.message); setSaving(false); return; }

    await supabase.from("ce_violation_assignments").insert({
      violation_id: selectedViolation.id,
      assigned_queue_id: update.assigned_queue_id || selectedViolation.assigned_queue_id,
      assigned_to_user_id: update.assigned_to_user_id || null,
      assignment_type: "REASSIGN",
      notes: `Review queue reassignment`,
    });

    toast.success("Violation reassigned");
    setSaving(false); setReassignOpen(false); fetchData();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground">Violations under review or pending triage</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Eye className="h-5 w-5" /> Review Items ({violations.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : violations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No violations in review queues</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Violation #</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Queue</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.violation_number}</TableCell>
                    <TableCell>{v.employer_regno || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{v.status}</Badge></TableCell>
                    <TableCell><Badge variant={v.priority === "CRITICAL" ? "destructive" : "secondary"}>{v.priority || "—"}</Badge></TableCell>
                    <TableCell>{v.queue_name}</TableCell>
                    <TableCell>{v.assigned_officer_name}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/compliance/violations/${v.id}`)} className="gap-1"><Eye className="h-3 w-3" /> View</Button>
                      <Button variant="outline" size="sm" onClick={() => openReassign(v)} className="gap-1"><ArrowRight className="h-3 w-3" /> Reassign</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reassign Violation {selectedViolation?.violation_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reassign To</Label>
              <Select value={reassignTarget.type} onValueChange={v => setReassignTarget(t => ({ ...t, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue">Another Queue</SelectItem>
                  <SelectItem value="officer">Specific Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reassignTarget.type === "queue" && (
              <div>
                <Label>Target Queue</Label>
                <Select value={reassignTarget.queue_id} onValueChange={v => setReassignTarget(t => ({ ...t, queue_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select queue" /></SelectTrigger>
                  <SelectContent>
                    {queues.map(q => <SelectItem key={q.id} value={q.id}>{q.queue_name} ({q.queue_type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reassignTarget.type === "officer" && (
              <div>
                <Label>Target Officer</Label>
                <Select value={reassignTarget.inspector_id} onValueChange={v => setReassignTarget(t => ({ ...t, inspector_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger>
                  <SelectContent>
                    {inspectors.map(i => <SelectItem key={i.id} value={i.id}>{i.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
