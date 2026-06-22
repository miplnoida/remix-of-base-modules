import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCreateLgCase, useLgReference } from "@/hooks/legal/useLgCases";
import { useUserCode } from "@/hooks/useUserCode";
import { logLgActivity } from "@/services/legal/lgAuditService";
import { assignCase } from "@/services/legal/lgAssignmentService";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCaseDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const create = useCreateLgCase();
  const { data: caseTypes = [] } = useLgReference("LG_CASE_TYPE");
  const { data: priorities = [] } = useLgReference("LG_PRIORITY");

  const [form, setForm] = useState({
    case_type_code: "",
    priority_code: "MEDIUM",
    summary: "",
    court_case_no: "",
    claim_amount: "",
    opened_date: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) setErrors({});
  }, [open]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.case_type_code) e.case_type_code = "Required";
    if (!form.priority_code) e.priority_code = "Required";
    if (!form.opened_date) e.opened_date = "Required";
    if (!form.summary.trim()) e.summary = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error("Please check the form for valid information!");
      return;
    }
    try {
      const created = await create.mutateAsync({
        case_type_code: form.case_type_code,
        priority_code: form.priority_code,
        summary: form.summary.trim(),
        court_case_no: form.court_case_no || null,
        claim_amount: form.claim_amount ? Number(form.claim_amount) : null,
        opened_date: form.opened_date,
        created_by: userCode ?? null,
      } as any);
      await logLgActivity({
        lg_case_id: created.id,
        activity_type: "CASE_CREATED",
        description: `${created.lg_case_no} (${form.case_type_code})`,
        performed_by: userCode ?? null,
      });
      // Auto-route via the assignment engine so Quick Cases aren't orphaned.
      try {
        const result = await assignCase({
          lg_case_id: created.id,
          actor_user_code: userCode ?? "SYSTEM",
          reason: "intake",
        });
        if (result?.queued) {
          toast.success(`Case ${created.lg_case_no} created — queued to ${result.workbasket_code ?? "team workbasket"}`);
        } else if (result?.assigned_user_code) {
          toast.success(`Case ${created.lg_case_no} created — assigned to ${result.assigned_user_code}`);
        } else {
          toast.success(`Case ${created.lg_case_no} created`);
        }
      } catch (assignErr: any) {
        // Routing failure must not block case creation.
        console.warn("Auto-assignment failed for quick case", assignErr);
        toast.success(`Case ${created.lg_case_no} created — assignment pending`);
      }
      onOpenChange(false);
      navigate(`/legal/lg/cases/${created.id}`);

    } catch (e: any) {
      toast.error(e.message ?? "Failed to create case");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Quick Case</DialogTitle>
          <DialogDescription>Lightweight intake. For full setup (parties, references, documents) use <strong>New Legal Case</strong>.</DialogDescription>

        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-3 py-2">
          <div>
            <Label>Case Type *</Label>
            <Select value={form.case_type_code} onValueChange={(v) => set("case_type_code", v)}>
              <SelectTrigger className={errors.case_type_code ? "border-destructive" : ""}><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {caseTypes.length === 0 && <SelectItem value="GENERAL">GENERAL</SelectItem>}
                {caseTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.case_type_code && <p className="text-xs text-destructive mt-1">{errors.case_type_code}</p>}
          </div>
          <div>
            <Label>Priority *</Label>
            <Select value={form.priority_code} onValueChange={(v) => set("priority_code", v)}>
              <SelectTrigger className={errors.priority_code ? "border-destructive" : ""}><SelectValue /></SelectTrigger>
              <SelectContent>
                {(priorities.length ? priorities : [{ code: "LOW", label: "Low" }, { code: "MEDIUM", label: "Medium" }, { code: "HIGH", label: "High" }, { code: "URGENT", label: "Urgent" }]).map((p) => (
                  <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opened Date *</Label>
            <Input type="date" value={form.opened_date} onChange={(e) => set("opened_date", e.target.value)} className={errors.opened_date ? "border-destructive" : ""} />
          </div>
          <div>
            <Label>Court Case No.</Label>
            <Input value={form.court_case_no} onChange={(e) => set("court_case_no", e.target.value)} />
          </div>
          <div>
            <Label>Claim Amount</Label>
            <Input type="number" step="0.01" min="0" value={form.claim_amount} onChange={(e) => set("claim_amount", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Summary *</Label>
            <Textarea rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} className={errors.summary ? "border-destructive" : ""} />
            {errors.summary && <p className="text-xs text-destructive mt-1">{errors.summary}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
