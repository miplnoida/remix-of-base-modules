import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useCreateLgTask, useUpdateLgTask } from "@/hooks/legal/useLgWorkflow";
import { useLgTaskPermissions } from "@/hooks/legal/useLgTaskPermissions";
import { LG_TASK_PRIORITY_LABEL, LG_TASK_STATUS_LABEL } from "@/services/legal/lgTaskSla";
import { useLegalTeams } from "@/hooks/legal/useLegalTeams";
import { logLgActivity } from "@/services/legal/lgCaseService";

const TASK_TYPES = [
  "REVIEW", "DRAFT_NOTICE", "FILE_DOCUMENT", "ATTEND_HEARING", "FOLLOW_UP",
  "PAYMENT_DEFAULT_REVIEW", "EVIDENCE_COLLECTION", "CLIENT_COMMUNICATION", "OTHER",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lgCaseId: string;
  mode: "create" | "edit";
  task?: any;
}

export function LgTaskDialog({ open, onOpenChange, lgCaseId, mode, task }: Props) {
  const { userCode } = useUserCode();
  const perms = useLgTaskPermissions();
  const create = useCreateLgTask();
  const update = useUpdateLgTask();
  const { data: teams = [] } = useLegalTeams();

  const [form, setForm] = useState({
    task_type_code: "REVIEW",
    title: "",
    description: "",
    due_date: "",
    priority_code: "MEDIUM",
    status: "OPEN",
    at_risk_hours: 24,
    assigned_team_code: "",
    assigned_to_user_id: "",
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && task) {
      setForm({
        task_type_code: task.task_type_code ?? "REVIEW",
        title: task.title ?? "",
        description: task.description ?? "",
        due_date: task.due_date ?? "",
        priority_code: task.priority_code ?? "MEDIUM",
        status: task.status ?? "OPEN",
        at_risk_hours: task.at_risk_hours ?? 24,
        assigned_team_code: task.assigned_team_code ?? "",
        assigned_to_user_id: task.assigned_to_user_id ?? "",
      });
    } else {
      setForm({
        task_type_code: "REVIEW", title: "", description: "", due_date: "",
        priority_code: "MEDIUM", status: "OPEN", at_risk_hours: 24,
        assigned_team_code: "", assigned_to_user_id: "",
      });
    }
  }, [open, mode, task]);

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (form.at_risk_hours != null && Number(form.at_risk_hours) < 0) { toast.error("At-risk hours cannot be negative"); return; }
    if (form.due_date && mode === "create") {
      const d = new Date(form.due_date + "T00:00:00");
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (d.getTime() < today.getTime()) { toast.error("Due date cannot be in the past"); return; }
    }

    try {
      if (mode === "create") {
        if (!perms.canCreate) { toast.error("You do not have permission to create tasks"); return; }
        const created = await create.mutateAsync({
          lg_case_id: lgCaseId,
          task_type_code: form.task_type_code,
          title: form.title.trim(),
          description: form.description || null,
          due_date: form.due_date || null,
          status: "OPEN",
          priority_code: form.priority_code,
          at_risk_hours: Number(form.at_risk_hours) || 24,
          assigned_team_code: form.assigned_team_code || null,
          assigned_to_user_id: form.assigned_to_user_id || null,
          created_by: userCode ?? null,
        });
        await logLgActivity({ lg_case_id: lgCaseId, activity_type: "TASK_CREATED", description: created.title, performed_by: userCode ?? null }).catch(() => {});
        toast.success("Task created");
      } else {
        if (!perms.canEdit) { toast.error("You do not have permission to edit tasks"); return; }
        const patch: any = {
          task_type_code: form.task_type_code,
          title: form.title.trim(),
          description: form.description || null,
          due_date: form.due_date || null,
          priority_code: form.priority_code,
          status: form.status,
          at_risk_hours: Number(form.at_risk_hours) || 24,
        };
        if (perms.canReassign) {
          patch.assigned_team_code = form.assigned_team_code || null;
          patch.assigned_to_user_id = form.assigned_to_user_id || null;
        }
        await update.mutateAsync({ id: task!.id, patch });
        toast.success("Task updated");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> {mode === "create" ? "Add Task" : "Edit Task"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>Title *</Label>
            <Input value={form.title} maxLength={200} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.task_type_code} onValueChange={(v) => setForm((p) => ({ ...p, task_type_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority_code} onValueChange={(v) => setForm((p) => ({ ...p, priority_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(LG_TASK_PRIORITY_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div>
            <Label>At-Risk Window (hours before due)</Label>
            <Input type="number" min={0} value={form.at_risk_hours}
              onChange={(e) => setForm((p) => ({ ...p, at_risk_hours: Number(e.target.value) || 0 }))} />
          </div>
          {mode === "edit" && (
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LG_TASK_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {perms.canReassign && (
            <>
              <div>
                <Label>Assign to Team</Label>
                <Select value={form.assigned_team_code || "__NONE__"} onValueChange={(v) => setForm((p) => ({ ...p, assigned_team_code: v === "__NONE__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="No team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">— None —</SelectItem>
                    {teams.map((t: any) => (
                      <SelectItem key={t.team_code ?? t.id} value={t.team_code ?? t.id}>
                        {t.team_name ?? t.team_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assignee User ID (UUID)</Label>
                <Input
                  value={form.assigned_to_user_id}
                  placeholder="Leave blank for team queue"
                  onChange={(e) => setForm((p) => ({ ...p, assigned_to_user_id: e.target.value.trim() }))}
                />
              </div>
            </>
          )}
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} maxLength={2000}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === "create" ? "Add Task" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LgTaskDialog;
