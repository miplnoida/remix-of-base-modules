import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useUserCode } from "@/hooks/useUserCode";
import { useAssignCase } from "@/hooks/legal/useLgAssignment";
import { useLgStaff } from "@/hooks/legal/useLgStaff";
import { useLegalTeams } from "@/hooks/legal/useLegalTeams";
import {
  triggerLegalAssignmentNoticeAfterAssign,
  getLegalAssignmentAutomationMode,
  type AssignmentNoticeTriggerResult,
} from "@/modules/legal/communication/legalAssignmentWorkflow";

interface Props {
  caseId: string;
  caseNo?: string;
  currentTeamCode?: string | null;
  currentAssigneeId?: string | null;
  priority?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAssigned?: () => void;
}

const REASONS = [
  { value: "reassign", label: "Reassign" },
  { value: "escalation", label: "Escalation" },
  { value: "workload", label: "Workload balancing" },
  { value: "override", label: "Manager override" },
];

export default function ReassignCaseDialog(props: Props) {
  const { caseId, caseNo, currentTeamCode, currentAssigneeId, priority, open, onOpenChange, onAssigned } = props;
  const { userCode } = useUserCode();
  const assign = useAssignCase();
  const teams = useLegalTeams();
  const staff = useLgStaff();

  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [teamCode, setTeamCode] = useState<string>(currentTeamCode ?? "");
  const [userId, setUserId] = useState<string>("");
  const [reason, setReason] = useState<string>("reassign");
  const [notes, setNotes] = useState<string>("");
  const [commRunning, setCommRunning] = useState(false);
  const [commResult, setCommResult] = useState<AssignmentNoticeTriggerResult | null>(null);
  const automationMode = getLegalAssignmentAutomationMode();

  useEffect(() => {
    if (open) {
      setMode("auto");
      setTeamCode(currentTeamCode ?? "");
      setUserId("");
      setReason("reassign");
      setNotes("");
      setCommResult(null);
    }
  }, [open, currentTeamCode]);

  const teamRows = (teams.data ?? []) as any[];
  const selectedTeam = teamRows.find((t) => t.team_code === teamCode);
  const eligibleStaff = (staff.data ?? []).filter(
    (s) => s.is_active && s.availability === "available" && (!selectedTeam || s.team_id === selectedTeam.id),
  );

  async function submit() {
    try {
      const res = await assign.mutateAsync({
        lg_case_id: caseId,
        actor_user_code: userCode || "system",
        reason: reason as any,
        override_user_id: mode === "manual" ? (userId || null) : null,
        override_team_code: mode === "manual" ? (teamCode || null) : null,
      });
      const assignedUserId = (res as any)?.assigned_user_id as string | null | undefined;
      const assignedCode = (res as any)?.assigned_user_code as string | null | undefined;
      if ((res as any).queued) {
        toast.warning("Case queued — no eligible staff with capacity.");
      } else {
        toast.success(`Assignment saved — ${assignedCode ?? "team queue"}`);
      }

      // EPIC L7A — trigger Communication Hub after assignment when we know the user.
      if (assignedUserId) {
        setCommRunning(true);
        try {
          const cr = await triggerLegalAssignmentNoticeAfterAssign({
            caseId,
            caseReference: caseNo ?? null,
            assignedUserId,
            actorUserCode: userCode ?? null,
            previousAssignedUserId: currentAssigneeId ?? null,
            priority: priority ?? null,
            reason: notes || reason,
          });
          setCommResult(cr);
          if (cr.duplicate) toast.info("Communication Hub: assignment notice already prepared/sent for this assignee");
          else if (cr.sent) toast.success(`Communication Hub: internal notice sent${cr.requestNo ? ` (${cr.requestNo})` : ""}`);
          else if (cr.prepared) toast.success("Communication Hub: internal notice prepared");
          else if (cr.blocked) toast.warning(`Communication Hub: blocked — ${cr.blockers.join(", ") || cr.note}`);
        } catch (e: any) {
          toast.error(`Communication Hub error: ${e?.message ?? "unknown"}`);
        } finally {
          setCommRunning(false);
        }
      }

      onAssigned?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Reassignment failed");
    }
  }

  const busy = assign.isPending || commRunning;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Reassign {caseNo ?? "case"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Currently on team <Badge variant="outline" className="ml-1">{currentTeamCode ?? "—"}</Badge>
            {currentAssigneeId && <> · assignee <span className="font-mono ml-1">{currentAssigneeId.slice(0,8)}…</span></>}
          </div>

          <div>
            <Label className="text-xs">Mode</Label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto re-route (use routing rules)</SelectItem>
                <SelectItem value="manual">Manual override</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "manual" && (
            <>
              <div>
                <Label className="text-xs">Team</Label>
                <Select value={teamCode} onValueChange={setTeamCode}>
                  <SelectTrigger><SelectValue placeholder="Pick team" /></SelectTrigger>
                  <SelectContent>
                    {teamRows.map((t) => (
                      <SelectItem key={t.id} value={t.team_code}>{t.team_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Assign to (optional)</Label>
                <Select value={userId || "none"} onValueChange={(v) => setUserId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Leave on team queue" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Leave on team queue —</SelectItem>
                    {eligibleStaff.map((s) => (
                      <SelectItem key={s.id} value={s.user_id}>
                        {s.full_name} {s.user_code ? `(${s.user_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Communication Hub automation: <span className="font-medium">{automationMode}</span>
          </div>
          {commResult && (
            <div className="text-xs rounded border p-2 bg-muted/40 space-y-0.5">
              <div>Communication Hub: {commResult.sent ? "sent" : commResult.prepared ? "prepared" : commResult.duplicate ? "duplicate suppressed" : "blocked"}</div>
              <div className="text-muted-foreground">To: {commResult.recipientEmail}{commResult.recipientFallbackReason ? " (fallback)" : ""}</div>
              {commResult.blockers.length > 0 && <div className="text-destructive">Blockers: {commResult.blockers.join(", ")}</div>}
              {commResult.requestNo && <div className="font-mono">Req: {commResult.requestNo}</div>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>{commResult ? "Close" : "Cancel"}</Button>
          <Button onClick={submit} disabled={busy || !!commResult}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
