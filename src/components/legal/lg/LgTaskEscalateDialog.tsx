import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useEscalateLgTask } from "@/hooks/legal/useLgWorkflow";
import { useLgTaskPermissions } from "@/hooks/legal/useLgTaskPermissions";
import { useLegalTeams } from "@/hooks/legal/useLegalTeams";
import { logLgActivity } from "@/services/legal/lgAuditService";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: any;
}

export function LgTaskEscalateDialog({ open, onOpenChange, task }: Props) {
  const { userCode } = useUserCode();
  const perms = useLgTaskPermissions();
  const escalate = useEscalateLgTask();
  const { data: teams = [] } = useLegalTeams();

  const [reason, setReason] = useState("");
  const [toUser, setToUser] = useState("");
  const [toTeam, setToTeam] = useState("");

  const submit = async () => {
    if (!perms.canEscalate) { toast.error("No permission to escalate"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    try {
      await escalate.mutateAsync({
        id: task.id,
        reason: reason.trim(),
        actor: userCode ?? null,
        toUserId: toUser.trim() || undefined,
        toTeamCode: toTeam || undefined,
      });
      await logLgActivity({
        lg_case_id: task.lg_case_id,
        activity_type: "TASK_ESCALATED",
        description: `${task.title} — ${reason.trim()}`,
        performed_by: userCode ?? null,
      }).catch(() => {});
      toast.success("Task escalated");
      onOpenChange(false);
      setReason(""); setToUser(""); setToTeam("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to escalate");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Escalate Task
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-md border p-2 bg-muted/40">
            <div className="font-medium">{task.title}</div>
            <div className="text-xs text-muted-foreground">
              Current escalation level: {task.escalation_level ?? 0}
            </div>
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being escalated?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Escalate to Team</Label>
              <Select value={toTeam || "__KEEP__"} onValueChange={(v) => setToTeam(v === "__KEEP__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Keep current" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__KEEP__">— Keep current —</SelectItem>
                  {teams.map((t: any) => (
                    <SelectItem key={t.team_code ?? t.id} value={t.team_code ?? t.id}>
                      {t.team_name ?? t.team_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escalate to User (UUID)</Label>
              <Input value={toUser} onChange={(e) => setToUser(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={escalate.isPending}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={escalate.isPending}>
            {escalate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LgTaskEscalateDialog;
