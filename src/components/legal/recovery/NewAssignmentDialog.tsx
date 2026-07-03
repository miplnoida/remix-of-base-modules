import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAssignment } from "@/services/legal/lgRecoveryAssignmentService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import type { RecoveryAssignmentPriority, RecoveryStrategyCode } from "@/types/legal/recoveryAssignment";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STRATEGIES: RecoveryStrategyCode[] = ["DEMAND", "PHONE", "VISIT", "NEGOTIATION", "INSTALLMENT", "COURT_FU", "ESCALATION"];
const PRIORITIES: RecoveryAssignmentPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default function NewAssignmentDialog({ open, onOpenChange }: Props) {
  const { user } = useSupabaseAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const actor = user?.email ?? user?.id ?? "system";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RecoveryAssignmentPriority>("NORMAL");
  const [strategy, setStrategy] = useState<RecoveryStrategyCode | "NONE">("NONE");
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");

  const reset = () => {
    setTitle(""); setDescription(""); setPriority("NORMAL");
    setStrategy("NONE"); setTargetAmount(""); setTargetDate("");
  };

  const create = useMutation({
    mutationFn: () =>
      createAssignment(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          strategy_type_code: strategy === "NONE" ? null : strategy,
          target_recovery_amount: targetAmount ? Number(targetAmount) : 0,
          target_date: targetDate || null,
        },
        actor,
      ),
    onSuccess: (a) => {
      toast.success(`Legal Recovery Assignment ${a.code} created`);
      qc.invalidateQueries({ queryKey: ["lg-recovery-assignment-workbench"] });
      reset();
      onOpenChange(false);
      nav(`/legal/lg/recovery-assignments/${a.id}`);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Failed to create assignment");
    },
  });

  const canSubmit = title.trim().length > 2 && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Legal Recovery Assignment</DialogTitle>
          <DialogDescription>
            Create an assignment. Liabilities and officer can be linked after creation from the workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="ra-title">Title *</Label>
            <Input id="ra-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Overpayment Recovery — Batch A" />
          </div>
          <div>
            <Label htmlFor="ra-desc">Description</Label>
            <Textarea id="ra-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as RecoveryAssignmentPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ra-target">Target Recovery Amount</Label>
              <Input id="ra-target" type="number" min={0} value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ra-date">Target Date</Label>
              <Input id="ra-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={!canSubmit}>
            {create.isPending ? "Creating…" : "Create Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
