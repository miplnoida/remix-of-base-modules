import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { useUpdateLgHearing, useCreateLgHearing } from "@/hooks/legal/useLgWorkflow";
import { useUserCode } from "@/hooks/useUserCode";
import type { LgHearing } from "@/services/legal/lgWorkflowService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hearing?: LgHearing | null;
  lgCaseId?: string;
  mode: "create" | "outcome";
}

export function HearingOutcomeDialog({ open, onOpenChange, hearing, lgCaseId, mode }: Props) {
  const { data: hearingTypes = [] } = useLgReference("LG_HEARING_TYPE");
  const { data: outcomes = [] } = useLgReference("LG_HEARING_OUTCOME");
  const { userCode } = useUserCode();
  const update = useUpdateLgHearing();
  const create = useCreateLgHearing();

  const [form, setForm] = useState({
    hearing_type_code: "MENTION",
    hearing_date: new Date().toISOString().slice(0, 10),
    hearing_time: "09:00",
    court_name: "",
    court_room: "",
    location: "",
    outcome_code: "",
    minutes: "",
    next_hearing_date: "",
    next_hearing_time: "",
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "outcome" && hearing) {
      setForm({
        hearing_type_code: hearing.hearing_type_code,
        hearing_date: (hearing.hearing_date as any) || "",
        hearing_time: (hearing.hearing_time as any) || "",
        court_name: hearing.court_name ?? "",
        court_room: hearing.court_room ?? "",
        location: hearing.location ?? "",
        outcome_code: hearing.outcome_code ?? "",
        minutes: hearing.minutes ?? hearing.outcome_notes ?? "",
        next_hearing_date: (hearing.next_hearing_date as any) || "",
        next_hearing_time: (hearing.next_hearing_time as any) || "",
      });
    } else if (mode === "create") {
      setForm((f) => ({
        ...f,
        hearing_date: new Date().toISOString().slice(0, 10),
        hearing_time: "09:00",
        outcome_code: "",
        minutes: "",
        next_hearing_date: "",
        next_hearing_time: "",
      }));
    }
  }, [open, mode, hearing]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    try {
      if (mode === "create") {
        if (!lgCaseId) throw new Error("Missing case id");
        await create.mutateAsync({
          lg_case_id: lgCaseId,
          hearing_type_code: form.hearing_type_code,
          hearing_date: form.hearing_date,
          hearing_time: form.hearing_time,
          court_name: form.court_name || null,
          court_room: form.court_room || null,
          location: form.location || null,
          status: "SCHEDULED",
          created_by: userCode ?? null,
        });
        toast.success("Hearing scheduled");
      } else if (hearing) {
        if (!form.outcome_code) {
          toast.error("Select an outcome");
          return;
        }
        await update.mutateAsync({
          id: hearing.id,
          patch: {
            outcome_code: form.outcome_code,
            outcome_notes: form.minutes,
            minutes: form.minutes,
            status: "COMPLETED",
            next_hearing_date: form.next_hearing_date || null,
            next_hearing_time: form.next_hearing_time || null,
          },
        });
        toast.success("Hearing outcome recorded");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const pending = update.isPending || create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            {mode === "create" ? "Schedule Hearing" : "Record Hearing Outcome"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a hearing to this case calendar."
              : "Recording an outcome with a next hearing date will auto-create the follow-up hearing, task, and deadline."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-3 py-2">
          <div>
            <Label>Hearing Type</Label>
            <Select value={form.hearing_type_code} onValueChange={(v) => set("hearing_type_code", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {hearingTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.hearing_date} onChange={(e) => set("hearing_date", e.target.value)} disabled={mode === "outcome"} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={form.hearing_time} onChange={(e) => set("hearing_time", e.target.value)} disabled={mode === "outcome"} />
            </div>
          </div>
          <div>
            <Label>Court Name</Label>
            <Input value={form.court_name} onChange={(e) => set("court_name", e.target.value)} />
          </div>
          <div>
            <Label>Court Room</Label>
            <Input value={form.court_room} onChange={(e) => set("court_room", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>

          {mode === "outcome" && (
            <>
              <div className="md:col-span-2">
                <Label>Outcome *</Label>
                <Select value={form.outcome_code} onValueChange={(v) => set("outcome_code", v)}>
                  <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                  <SelectContent>
                    {outcomes.map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Minutes / Notes</Label>
                <Textarea rows={4} value={form.minutes} onChange={(e) => set("minutes", e.target.value)} />
              </div>
              <div>
                <Label>Next Hearing Date</Label>
                <Input type="date" value={form.next_hearing_date} onChange={(e) => set("next_hearing_date", e.target.value)} />
              </div>
              <div>
                <Label>Next Hearing Time</Label>
                <Input type="time" value={form.next_hearing_time} onChange={(e) => set("next_hearing_time", e.target.value)} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === "create" ? "Schedule" : "Record Outcome"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
