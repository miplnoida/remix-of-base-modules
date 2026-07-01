import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listSlaRules, upsertSlaRule, deleteSlaRule, processSlaNow, type SlaRule } from "@/services/legal/legalReferralSlaService";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Plus, Trash2, Play } from "lucide-react";
import { INT16_MAX, INT16_MIN, mapSupabaseError } from "@/lib/legal/adminValidation";

const SOURCES = ["ALL", "BENEFITS", "COMPLIANCE", "LEGAL"] as const;
const TYPES = ["ALL", "INFO_REQUEST", "DOCUMENT_REQUEST", "CLARIFICATION", "APPROVAL"] as const;

export default function LegalAdminSlaRules() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const actor = user?.email ?? "LEGAL_ADMIN";
  const [editing, setEditing] = useState<Partial<SlaRule> | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["legal-sla-rules"],
    queryFn: listSlaRules,
  });

  const saveMut = useMutation({
    mutationFn: (r: Partial<SlaRule>) => upsertSlaRule(r as any, actor),
    onSuccess: () => {
      toast.success("SLA rule saved");
      qc.invalidateQueries({ queryKey: ["legal-sla-rules"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const delMut = useMutation({
    mutationFn: deleteSlaRule,
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ["legal-sla-rules"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const runMut = useMutation({
    mutationFn: processSlaNow,
    onSuccess: (r) => toast.success(`SLA run: ${r.due_soon} due-soon, ${r.overdue} overdue, ${r.escalated} escalated`),
    onError: (e: any) => toast.error(e?.message ?? "SLA run failed"),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Legal Referral SLA Rules</h1>
          <p className="text-sm text-muted-foreground">Drives due dates, reminders and escalations for information requests.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runMut.mutate()} disabled={runMut.isPending} className="gap-1">
            <Play className="h-4 w-4" /> Run SLA Now
          </Button>
          <Button onClick={() => setEditing({ source_module: "ALL", request_type: "INFO_REQUEST", default_due_days: 5, reminder_before_days: 1, escalation_after_days: 2, active: true, priority: 100, notify_original_submitter: true, notify_supervisor: true, email_enabled: true })} className="gap-1">
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Request Type</TableHead>
              <TableHead>Due (days)</TableHead>
              <TableHead>Reminder</TableHead>
              <TableHead>Escalate After</TableHead>
              <TableHead>Escalation Workbasket</TableHead>
              <TableHead>Notify</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-6">Loading...</TableCell></TableRow>}
            {!isLoading && rules.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No rules.</TableCell></TableRow>}
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="outline">{r.source_module}</Badge></TableCell>
                <TableCell>{r.request_type}</TableCell>
                <TableCell>{r.default_due_days}</TableCell>
                <TableCell>{r.reminder_before_days}d before</TableCell>
                <TableCell>{r.escalation_after_days}d</TableCell>
                <TableCell className="text-xs">{r.escalation_workbasket ?? "—"} / {r.escalation_team ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {r.notify_original_submitter ? "Submitter " : ""}{r.notify_supervisor ? "Sup " : ""}{r.email_enabled ? "Email" : ""}
                </TableCell>
                <TableCell>{r.active ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge variant="outline">Off</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm(`Delete rule ${r.source_module}/${r.request_type}?`) && delMut.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing.id ? "Edit SLA Rule" : "New SLA Rule"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source Module</Label>
                <Select value={editing.source_module as string} onValueChange={(v) => setEditing({ ...editing, source_module: v as any })} disabled={!!editing.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Request Type</Label>
                <Select value={editing.request_type as string} onValueChange={(v) => setEditing({ ...editing, request_type: v as any })} disabled={!!editing.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Default Due (days)</Label><Input type="number" value={editing.default_due_days ?? 5} onChange={(e) => setEditing({ ...editing, default_due_days: Number(e.target.value) })} /></div>
              <div><Label>Reminder Before (days)</Label><Input type="number" value={editing.reminder_before_days ?? 1} onChange={(e) => setEditing({ ...editing, reminder_before_days: Number(e.target.value) })} /></div>
              <div><Label>Escalation After (days)</Label><Input type="number" value={editing.escalation_after_days ?? 2} onChange={(e) => setEditing({ ...editing, escalation_after_days: Number(e.target.value) })} /></div>
              <div><Label>Priority</Label><Input type="number" value={editing.priority ?? 100} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} /></div>
              <div><Label>Escalation Workbasket</Label><Input value={editing.escalation_workbasket ?? ""} onChange={(e) => setEditing({ ...editing, escalation_workbasket: e.target.value })} /></div>
              <div><Label>Escalation Team</Label><Input value={editing.escalation_team ?? ""} onChange={(e) => setEditing({ ...editing, escalation_team: e.target.value })} /></div>
              <label className="flex items-center gap-2"><Switch checked={!!editing.notify_original_submitter} onCheckedChange={(v) => setEditing({ ...editing, notify_original_submitter: v })} /> Notify Submitter</label>
              <label className="flex items-center gap-2"><Switch checked={!!editing.notify_supervisor} onCheckedChange={(v) => setEditing({ ...editing, notify_supervisor: v })} /> Notify Supervisor</label>
              <label className="flex items-center gap-2"><Switch checked={!!editing.email_enabled} onCheckedChange={(v) => setEditing({ ...editing, email_enabled: v })} /> Email Enabled</label>
              <label className="flex items-center gap-2"><Switch checked={!!editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> Active</label>
              <div className="col-span-2"><Label>Notes</Label><Input value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => saveMut.mutate(editing)} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
