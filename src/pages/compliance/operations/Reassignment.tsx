import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

interface WorkloadRow {
  inspector_id: string;
  inspector_name: string;
  role: string;
  queue_count: number;
  violation_count: number;
  max_caseload: number | null;
}

interface InspectorOption { id: string; name: string | null; legacy_inspector_code: string | null; }

export default function Reassignment() {
  const [workload, setWorkload] = useState<WorkloadRow[]>([]);
  const [inspectors, setInspectors] = useState<InspectorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<WorkloadRow | null>(null);
  const [targetInspector, setTargetInspector] = useState("");
  const [reassignCount, setReassignCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: members }, { data: inspData }] = await Promise.all([
      supabase.from("ce_queue_members").select("inspector_id, role, queue_id").eq("is_active", true),
      supabase.from("ce_inspectors").select("id, name, legacy_inspector_code, max_caseload").eq("is_active", true),
    ]);
    setInspectors(inspData || []);

    if (!members?.length) { setWorkload([]); setLoading(false); return; }

    const inspMap = Object.fromEntries((inspData || []).map(i => [i.id, i]));
    const inspectorIds = [...new Set(members.map(m => m.inspector_id))];
    const workloadMap: Record<string, WorkloadRow> = {};

    inspectorIds.forEach(iid => {
      const userMembers = members.filter(m => m.inspector_id === iid);
      const insp = inspMap[iid];
      workloadMap[iid] = {
        inspector_id: iid,
        inspector_name: insp?.name || insp?.legacy_inspector_code || iid.slice(0, 12),
        role: userMembers[0]?.role || "MEMBER",
        queue_count: userMembers.length,
        violation_count: 0,
        max_caseload: insp?.max_caseload || null,
      };
    });

    const { data: violations } = await supabase
      .from("ce_violations")
      .select("assigned_to_user_id")
      .in("status", ["OPEN", "UNDER_REVIEW", "ESCALATED"])
      .not("assigned_to_user_id", "is", null);

    (violations || []).forEach((v: any) => {
      if (workloadMap[v.assigned_to_user_id]) {
        workloadMap[v.assigned_to_user_id].violation_count++;
      }
    });

    setWorkload(Object.values(workloadMap).sort((a, b) => b.violation_count - a.violation_count));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openReassign = (w: WorkloadRow) => {
    setSelectedFrom(w);
    setTargetInspector("");
    setReassignCount(0);
    setDialogOpen(true);
  };

  const handleReassign = async () => {
    if (!selectedFrom || !targetInspector) { toast.error("Select a target officer"); return; }
    if (targetInspector === selectedFrom.inspector_id) { toast.error("Cannot reassign to the same officer"); return; }
    setSaving(true);

    // Get violations assigned to source officer
    const { data: viols } = await supabase
      .from("ce_violations")
      .select("id")
      .eq("assigned_to_user_id", selectedFrom.inspector_id)
      .in("status", ["OPEN", "UNDER_REVIEW"])
      .limit(reassignCount > 0 ? reassignCount : 1000);

    if (!viols?.length) { toast.error("No active violations to reassign"); setSaving(false); return; }

    const ids = viols.map(v => v.id);
    const { error } = await supabase.from("ce_violations").update({ assigned_to_user_id: targetInspector }).in("id", ids);
    if (error) { toast.error("Reassignment failed: " + error.message); setSaving(false); return; }

    // Log reassignments
    const logs = ids.map(vid => ({
      violation_id: vid,
      assigned_to_user_id: targetInspector,
      assignment_type: "REASSIGN",
      notes: `Workload balance: moved from ${selectedFrom.inspector_name}`,
    }));
    await supabase.from("ce_violation_assignments").insert(logs);

    toast.success(`${ids.length} violations reassigned`);
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const getLoadBadge = (w: WorkloadRow) => {
    const pct = w.max_caseload ? (w.violation_count / w.max_caseload) * 100 : 0;
    if (pct > 80) return <Badge variant="destructive">High ({Math.round(pct)}%)</Badge>;
    if (pct > 50) return <Badge variant="default">Medium ({Math.round(pct)}%)</Badge>;
    if (w.max_caseload) return <Badge variant="secondary">Low ({Math.round(pct)}%)</Badge>;
    return <Badge variant="secondary">{w.violation_count > 400 ? "High" : w.violation_count > 200 ? "Medium" : "Low"}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reassign / Workload</h1>
        <p className="text-muted-foreground">View officer workload distribution and manage reassignment</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Officer Workload ({workload.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : workload.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No officers with active queue memberships</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Officer</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Queues</TableHead>
                  <TableHead>Active Violations</TableHead>
                  <TableHead>Max Caseload</TableHead>
                  <TableHead>Load</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workload.map((w) => (
                  <TableRow key={w.inspector_id}>
                    <TableCell className="font-medium">{w.inspector_name}</TableCell>
                    <TableCell><Badge variant="secondary">{w.role}</Badge></TableCell>
                    <TableCell>{w.queue_count}</TableCell>
                    <TableCell>{w.violation_count}</TableCell>
                    <TableCell>{w.max_caseload ?? "—"}</TableCell>
                    <TableCell>{getLoadBadge(w)}</TableCell>
                    <TableCell className="text-right">
                      {w.violation_count > 0 && (
                        <Button variant="outline" size="sm" onClick={() => openReassign(w)} className="gap-1">
                          <ArrowRightLeft className="h-3 w-3" /> Reassign
                        </Button>
                      )}
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
          <DialogHeader><DialogTitle>Reassign from {selectedFrom?.inspector_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This officer currently has {selectedFrom?.violation_count} active violations.</p>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Target Officer *</Label>
              <Select value={targetInspector} onValueChange={setTargetInspector}>
                <SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger>
                <SelectContent>
                  {inspectors.filter(i => i.id !== selectedFrom?.inspector_id).map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name || i.legacy_inspector_code || i.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Number of violations to reassign (0 = all)</Label>
              <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={reassignCount} onChange={e => setReassignCount(parseInt(e.target.value) || 0)} min={0} max={selectedFrom?.violation_count || 1000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}