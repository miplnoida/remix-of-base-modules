/**
 * EPIC-06D — Recovery Assignment Workspace
 * Tabs: Overview · Liabilities · Strategy · Diary · Transfers · Timeline · Audit
 */
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getAssignment, listLinkedLiabilities, listActions, addAction,
  listHistory, listAudit, transitionStatus, updateAssignment, unlinkLiability,
} from "@/services/legal/lgRecoveryAssignmentService";
import { computeNextAction } from "@/services/legal/lgRecoveryStrategyService";
import { listTransfers, requestTransfer, approveTransfer, rejectTransfer } from "@/services/legal/lgRecoveryTransferService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import type { RecoveryAssignmentStatus, RecoveryActionType } from "@/types/legal/recoveryAssignment";
import { LegalRecoveryContextPanel } from "@/components/legal/post-judgment/LegalRecoveryContextPanel";

export default function LgRecoveryAssignmentWorkspace() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { can } = useLgAccess();
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const actor = user?.email ?? user?.id ?? "system";

  const assignmentQ = useQuery({
    queryKey: ["ra", id],
    queryFn: () => getAssignment(id),
    enabled: !!id,
  });
  const liabilitiesQ = useQuery({
    queryKey: ["ra-liabs", id], queryFn: () => listLinkedLiabilities(id), enabled: !!id,
  });
  const actionsQ = useQuery({
    queryKey: ["ra-actions", id], queryFn: () => listActions(id), enabled: !!id,
  });
  const historyQ = useQuery({
    queryKey: ["ra-history", id], queryFn: () => listHistory(id), enabled: !!id,
  });
  const auditQ = useQuery({
    queryKey: ["ra-audit", id], queryFn: () => listAudit(id), enabled: !!id,
  });
  const transfersQ = useQuery({
    queryKey: ["ra-transfers", id], queryFn: () => listTransfers(id), enabled: !!id,
  });
  const nextActionQ = useQuery({
    queryKey: ["ra-next", id],
    queryFn: () => (assignmentQ.data ? computeNextAction(assignmentQ.data) : null),
    enabled: !!assignmentQ.data,
  });

  const a = assignmentQ.data;
  const canEdit = can("editRecoveryAssignment");

  const transition = useMutation({
    mutationFn: (next: RecoveryAssignmentStatus) => transitionStatus(id, next, actor),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ra", id] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (!can("viewRecoveryAssignment")) {
    return <div className="p-6">Access denied.</div>;
  }
  if (assignmentQ.isLoading) return <div className="p-6">Loading…</div>;
  if (!a) return <div className="p-6">Assignment not found.</div>;

  const nextTransitions: RecoveryAssignmentStatus[] = ({
    DRAFT: ["ASSIGNED", "CLOSED"],
    ASSIGNED: ["ACTIVE", "SUSPENDED", "CLOSED"],
    ACTIVE: ["SUSPENDED", "ESCALATED", "COMPLETED", "CLOSED"],
    SUSPENDED: ["ACTIVE", "CLOSED"],
    ESCALATED: ["ACTIVE", "COMPLETED", "CLOSED"],
    COMPLETED: ["CLOSED"],
    CLOSED: [],
  } as Record<RecoveryAssignmentStatus, RecoveryAssignmentStatus[]>)[a.status];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button onClick={() => nav("/legal/lg/recovery-assignments")} className="hover:underline">← Legal Recovery Assignments</button>
            <span>·</span>
            <span className="font-mono">{a.code}</span>
          </div>
          <h1 className="text-2xl font-semibold">{a.title}</h1>
          <div className="flex flex-wrap gap-2 mt-1 text-sm">
            <Badge>{a.status}</Badge>
            <Badge variant={a.health === "CRITICAL" ? "destructive" : a.health === "AT_RISK" ? "secondary" : "outline"}>
              {a.health}
            </Badge>
            <Badge variant="outline">{a.priority}</Badge>
            {a.assigned_officer_code && <Badge variant="outline">Officer: {a.assigned_officer_code}</Badge>}
            {a.assigned_team_code && <Badge variant="outline">Team: {a.assigned_team_code}</Badge>}
          </div>
        </div>
        {canEdit && nextTransitions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {nextTransitions.map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => transition.mutate(s)}>
                {s === "ESCALATED" ? "Escalate" : s === "COMPLETED" ? "Complete" : s === "CLOSED" ? "Close" : s === "SUSPENDED" ? "Suspend" : s === "ACTIVE" ? "Activate" : s === "ASSIGNED" ? "Mark Assigned" : s}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Snapshot rail */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Snap label="Liabilities" value={a.liability_count} />
        <Snap label="Assessed" value={fmtMoney(a.total_assessed)} />
        <Snap label="Paid" value={fmtMoney(a.total_paid)} />
        <Snap label="Outstanding" value={fmtMoney(a.total_outstanding)} />
        <Snap label="Recovery %" value={`${a.recovery_pct}%`} />
        <Snap label="Orders / Appeals / Enf" value={`${a.order_count} / ${a.appeal_count} / ${a.enforcement_count}`} />
      </div>

      {/* EPIC-07 Phase 5 — Legal Recovery Context */}
      <LegalRecoveryContextPanel assignmentId={id} />



      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="diary">Diary</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card><CardContent className="pt-4 space-y-2 text-sm">
            <Row k="Description" v={a.description ?? "—"} />
            <Row k="Strategy" v={a.strategy_type_code ?? "—"} />
            <Row k="Campaign" v={a.campaign_id ?? "—"} />
            <Row k="Target amount" v={fmtMoney(a.target_recovery_amount)} />
            <Row k="Target date" v={a.target_date ?? "—"} />
            <Row k="SLA policy" v={a.sla_policy_code ?? "—"} />
            <Row k="Last action" v={a.last_action_at ? new Date(a.last_action_at).toLocaleString() : "—"} />
            <Row k="Next action due" v={a.next_action_due_at ? new Date(a.next_action_due_at).toLocaleString() : "—"} />
            <Row k="Assigned at" v={a.assigned_at ? new Date(a.assigned_at).toLocaleString() : "—"} />
            <Row k="Activated at" v={a.activated_at ? new Date(a.activated_at).toLocaleString() : "—"} />
            {a.escalation_reason && <Row k="Escalation reason" v={a.escalation_reason} />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="liabilities">
          <Card><CardContent className="pt-4">
            {liabilitiesQ.isLoading && <div>Loading…</div>}
            {!liabilitiesQ.isLoading && (liabilitiesQ.data ?? []).length === 0 && (
              <div className="text-muted-foreground text-sm">No liabilities linked.</div>
            )}
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="p-2">Assessment</th><th className="p-2">Type</th><th className="p-2 text-right">Principal</th>
                    <th className="p-2 text-right">Outstanding</th><th className="p-2">Status</th><th></th></tr>
              </thead>
              <tbody>
                {(liabilitiesQ.data ?? []).map((l: any) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{l.assessment_number ?? l.id.slice(0, 8)}</td>
                    <td className="p-2">{l.liability_type}</td>
                    <td className="p-2 text-right">{fmtMoney(l.principal)}</td>
                    <td className="p-2 text-right">{fmtMoney(l.outstanding)}</td>
                    <td className="p-2"><Badge variant="outline">{l.recovery_status}</Badge></td>
                    <td className="p-2 text-right">
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={async () => {
                          await unlinkLiability(id, l.id);
                          qc.invalidateQueries({ queryKey: ["ra-liabs", id] });
                          qc.invalidateQueries({ queryKey: ["ra", id] });
                          toast.success("Unlinked");
                        }}>Unlink</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="strategy">
          <Card>
            <CardHeader><CardTitle className="text-base">Next Recommended Action</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {nextActionQ.data ? (
                <div className="border rounded p-3 bg-muted/30">
                  <div className="font-medium">{nextActionQ.data.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{nextActionQ.data.reason}</div>
                  <div className="text-xs mt-1">Due in {nextActionQ.data.due_in_days} day(s) · Strategy {nextActionQ.data.strategy_code ?? "—"}</div>
                </div>
              ) : <div className="text-muted-foreground">Computing…</div>}
              <div>
                <label className="text-xs text-muted-foreground">Current strategy</label>
                <div className="font-medium">{a.strategy_type_code ?? "None"}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diary">
          <DiaryTab assignmentId={id} actor={actor} canEdit={canEdit}
            actions={actionsQ.data ?? []} loading={actionsQ.isLoading}
            onAdded={() => {
              qc.invalidateQueries({ queryKey: ["ra-actions", id] });
              qc.invalidateQueries({ queryKey: ["ra", id] });
            }} />
        </TabsContent>

        <TabsContent value="transfers">
          <TransfersTab assignmentId={id} assignment={a} actor={actor}
            transfers={transfersQ.data ?? []} loading={transfersQ.isLoading}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ["ra-transfers", id] });
              qc.invalidateQueries({ queryKey: ["ra", id] });
            }} />
        </TabsContent>

        <TabsContent value="timeline">
          <Card><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Assignment lifecycle events</div>
            <ul className="space-y-2 text-sm">
              {(historyQ.data ?? []).map((h: any) => (
                <li key={h.id} className="border-l-2 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{h.event_type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs">{h.from_value ?? "—"} → {h.to_value ?? "—"} {h.reason && <span className="text-muted-foreground"> · {h.reason}</span>}</div>
                  <div className="text-xs text-muted-foreground">by {h.actor_code ?? "system"}</div>
                </li>
              ))}
              {(historyQ.data ?? []).length === 0 && <li className="text-muted-foreground">No history yet.</li>}
            </ul>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Field-level audit trail (last 200)</div>
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="p-2">When</th><th className="p-2">Action</th><th className="p-2">Actor</th><th className="p-2">Changed</th></tr>
              </thead>
              <tbody>
                {(auditQ.data ?? []).map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2"><Badge variant="outline">{r.action}</Badge></td>
                    <td className="p-2">{r.actor_code ?? "system"}</td>
                    <td className="p-2 font-mono">{r.changed_fields ? Object.keys(r.changed_fields).join(", ") : "—"}</td>
                  </tr>
                ))}
                {(auditQ.data ?? []).length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No audit records.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 py-1"><span className="text-muted-foreground">{k}</span><span className="col-span-2">{v}</span></div>;
}
function Snap({ label, value }: { label: string; value: React.ReactNode }) {
  return <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold mt-0.5">{value}</div></CardContent></Card>;
}
function fmtMoney(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DiaryTab({ assignmentId, actor, actions, loading, onAdded, canEdit }: {
  assignmentId: string; actor: string; actions: any[]; loading: boolean; onAdded: () => void; canEdit: boolean;
}) {
  const [type, setType] = useState<RecoveryActionType>("CALL");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card><CardContent className="pt-4 space-y-4">
      {canEdit && (
        <div className="border rounded p-3 space-y-2">
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => setType(v as RecoveryActionType)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CALL", "VISIT", "LETTER", "MEETING", "NEGOTIATION", "NOTE", "OTHER"].map((t) =>
                  <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <Textarea placeholder="Notes / outcome" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" disabled={busy || !subject}
              onClick={async () => {
                setBusy(true);
                try {
                  await addAction(assignmentId, { action_type: type, subject, notes }, actor);
                  setSubject(""); setNotes("");
                  toast.success("Diary entry added");
                  onAdded();
                } catch (e: any) { toast.error(e.message ?? "Failed"); }
                finally { setBusy(false); }
              }}>Add entry</Button>
          </div>
        </div>
      )}
      {loading && <div>Loading…</div>}
      <ul className="space-y-2">
        {actions.map((a) => (
          <li key={a.id} className="border rounded p-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{a.action_type}</Badge>
              <span className="font-medium">{a.subject ?? "(no subject)"}</span>
              <span className="text-xs text-muted-foreground ml-auto">{new Date(a.action_at).toLocaleString()}</span>
            </div>
            {a.notes && <div className="text-xs mt-1 whitespace-pre-wrap">{a.notes}</div>}
            <div className="text-xs text-muted-foreground mt-1">by {a.created_by ?? "system"}</div>
          </li>
        ))}
        {actions.length === 0 && !loading && <li className="text-muted-foreground text-sm">No diary entries.</li>}
      </ul>
    </CardContent></Card>
  );
}

function TransfersTab({ assignmentId, assignment, actor, transfers, loading, onChanged }: {
  assignmentId: string; assignment: any; actor: string; transfers: any[]; loading: boolean; onChanged: () => void;
}) {
  const { can } = useLgAccess();
  const [toOfficer, setToOfficer] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card><CardContent className="pt-4 space-y-4">
      {can("transferRecoveryAssignment") && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-medium">Request transfer</div>
          <Input placeholder="To officer code" value={toOfficer} onChange={(e) => setToOfficer(e.target.value)} />
          <Textarea placeholder="Reason for transfer" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" disabled={busy || !reason || !toOfficer}
              onClick={async () => {
                setBusy(true);
                try {
                  await requestTransfer({
                    assignment_id: assignmentId,
                    from_officer_id: assignment.assigned_officer_id,
                    from_officer_code: assignment.assigned_officer_code,
                    to_officer_code: toOfficer,
                    reason,
                    requested_by: actor,
                  });
                  setToOfficer(""); setReason("");
                  toast.success("Transfer requested");
                  onChanged();
                } catch (e: any) { toast.error(e.message ?? "Failed"); }
                finally { setBusy(false); }
              }}>Request Transfer</Button>
          </div>
        </div>
      )}
      {loading && <div>Loading…</div>}
      <ul className="space-y-2">
        {transfers.map((t) => (
          <li key={t.id} className="border rounded p-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={t.approval_state === "PENDING" ? "secondary" : t.approval_state === "APPROVED" ? "default" : "destructive"}>
                {t.approval_state}
              </Badge>
              <span>{t.from_officer_code ?? "—"} → {t.to_officer_code ?? t.to_team_code ?? "—"}</span>
              <span className="text-xs text-muted-foreground ml-auto">{new Date(t.requested_at).toLocaleString()}</span>
            </div>
            <div className="text-xs mt-1">{t.reason}</div>
            {t.approval_state === "PENDING" && can("approveRecoveryTransfer") && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline"
                  onClick={async () => { await approveTransfer(t.id, actor); toast.success("Approved"); onChanged(); }}>Approve</Button>
                <Button size="sm" variant="ghost"
                  onClick={async () => { await rejectTransfer(t.id, actor); toast.success("Rejected"); onChanged(); }}>Reject</Button>
              </div>
            )}
          </li>
        ))}
        {transfers.length === 0 && !loading && <li className="text-muted-foreground text-sm">No transfer requests.</li>}
      </ul>
    </CardContent></Card>
  );
}
