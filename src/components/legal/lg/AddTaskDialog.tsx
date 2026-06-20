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
import { useCreateLgTask } from "@/hooks/legal/useLgWorkflow";

const TYPES = ["REVIEW", "DRAFT_NOTICE", "FILE_DOCUMENT", "ATTEND_HEARING", "FOLLOW_UP", "PAYMENT_DEFAULT_REVIEW", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; }

export function AddTaskDialog({ open, onOpenChange, lgCaseId }: Props) {
  const { userCode } = useUserCode();
  const create = useCreateLgTask();
  const [form, setForm] = useState({ task_type_code: "REVIEW", title: "", description: "", due_date: "", priority_code: "MEDIUM" });

  useEffect(() => { if (open) setForm({ task_type_code: "REVIEW", title: "", description: "", due_date: "", priority_code: "MEDIUM" }); }, [open]);

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    try {
      await create.mutateAsync({
        lg_case_id: lgCaseId,
        task_type_code: form.task_type_code,
        title: form.title.trim(),
        description: form.description || null,
        due_date: form.due_date || null,
        status: "OPEN",
        priority_code: form.priority_code,
        created_by: userCode ?? null,
      });
      toast.success("Task added");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Add Task</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.task_type_code} onValueChange={(v) => setForm((p) => ({ ...p, task_type_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority_code} onValueChange={(v) => setForm((p) => ({ ...p, priority_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
