import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Network, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface InspectorRow {
  id: string;
  name: string | null;
  legacy_inspector_code: string | null;
  supervisor_id: string | null;
  max_caseload: number | null;
  is_active: boolean;
}

export default function SupervisorHierarchy() {
  const [allInspectors, setAllInspectors] = useState<InspectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InspectorRow | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ce_inspectors").select("id, name, legacy_inspector_code, supervisor_id, max_caseload, is_active").order("name");
    setAllInspectors(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getName = (o: InspectorRow) => o.name || o.legacy_inspector_code || o.id.slice(0, 12);

  // Detect circular: would assigning `supervisorId` to `inspectorId` create a cycle?
  const wouldCreateCycle = (inspectorId: string, supervisorId: string): boolean => {
    const visited = new Set<string>();
    let current: string | null = supervisorId;
    while (current) {
      if (current === inspectorId) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      current = allInspectors.find(i => i.id === current)?.supervisor_id || null;
    }
    return false;
  };

  const openAssign = (o: InspectorRow) => {
    setEditing(o);
    setSelectedSupervisor(o.supervisor_id || "none");
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    const newSup = selectedSupervisor === "none" ? null : selectedSupervisor;
    if (newSup && wouldCreateCycle(editing.id, newSup)) {
      setErrors({ supervisor: "This assignment would create a circular hierarchy" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ce_inspectors").update({ supervisor_id: newSup }).eq("id", editing.id);
    if (error) { toast.error("Failed: " + error.message); setSaving(false); return; }
    toast.success("Supervisor assignment updated");
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const supervisors = allInspectors.filter(h => allInspectors.some(sub => sub.supervisor_id === h.id));
  const orphans = allInspectors.filter(h => !h.supervisor_id && !supervisors.find(s => s.id === h.id));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supervisor Hierarchy</h1>
        <p className="text-muted-foreground">Inspector-to-supervisor reporting structure</p>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {!loading && supervisors.map((sup) => {
        const reports = allInspectors.filter(h => h.supervisor_id === sup.id);
        return (
          <Card key={sup.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="h-5 w-5" />
                Supervisor: {getName(sup)}
                <Badge variant="default">SUPERVISOR</Badge>
                <Badge variant="secondary">{reports.length} reports</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Max Caseload</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{getName(r)}</TableCell>
                      <TableCell>{r.max_caseload || "—"}</TableCell>
                      <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openAssign(r)}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {!loading && orphans.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Unassigned Officers ({orphans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Max Caseload</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphans.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{getName(s)}</TableCell>
                    <TableCell>{s.max_caseload || "—"}</TableCell>
                    <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openAssign(s)} className="gap-1"><Pencil className="h-4 w-4" /> Assign</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Supervisor for {editing ? getName(editing) : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Supervisor</Label>
              <Select value={selectedSupervisor} onValueChange={v => { setSelectedSupervisor(v); setErrors({}); }}>
                <SelectTrigger className={errors.supervisor ? "border-destructive" : ""}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No Supervisor —</SelectItem>
                  {allInspectors.filter(i => i.is_active && i.id !== editing?.id).map(i => (
                    <SelectItem key={i.id} value={i.id}>{getName(i)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supervisor && <p className="text-xs text-destructive mt-1">{errors.supervisor}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}