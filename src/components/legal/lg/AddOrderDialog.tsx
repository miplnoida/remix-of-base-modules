import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";
import { useCreateLgOrder } from "@/hooks/legal/useLgEntities";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { LG_ORDER_STATUSES, LG_ORDER_STATUS_LABEL } from "@/services/legal/lgOrderStateMachine";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; }

const NONE = "__none__";
const sb = supabase as any;

const emptyForm = () => ({
  order_type_code: "",
  status: "DRAFT",
  hearing_id: "",
  issued_by_court: "",
  issued_date: new Date().toISOString().slice(0, 10),
  effective_date: "",
  expiry_date: "",
  compliance_date: "",
  ordered_amount: "",
  terms: "",
});

export function AddOrderDialog({ open, onOpenChange, lgCaseId }: Props) {
  const { userCode } = useUserCode();
  const create = useCreateLgOrder();
  const { data: orderTypes = [] } = useLgReference("LG_ORDER_TYPE");
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hearings = useQuery({
    queryKey: ["lg_hearing_options", lgCaseId],
    enabled: !!lgCaseId && open,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_hearing")
        .select("id, hearing_date, hearing_type_code")
        .eq("lg_case_id", lgCaseId)
        .order("hearing_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => { if (open) { setForm(emptyForm()); setErrors({}); } }, [open]);

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.order_type_code) e.order_type_code = "Order type is required";
    if (!form.issued_date) e.issued_date = "Issued date is required";
    if (form.expiry_date && form.issued_date && form.expiry_date < form.issued_date) e.expiry_date = "Expiry cannot be before issued date";
    if (form.compliance_date && form.issued_date && form.compliance_date < form.issued_date) e.compliance_date = "Compliance date cannot be before issued date";
    if (form.ordered_amount && Number(form.ordered_amount) < 0) e.ordered_amount = "Amount cannot be negative";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) { toast.error("Please fix the highlighted fields"); return; }
    try {
      const o = await create.mutateAsync({
        lg_case_id: lgCaseId,
        order_type_code: form.order_type_code,
        status: form.status as any,
        hearing_id: form.hearing_id || null,
        issued_by_court: form.issued_by_court || null,
        issued_date: form.issued_date,
        effective_date: form.effective_date || null,
        expiry_date: form.expiry_date || null,
        compliance_date: form.compliance_date || null,
        ordered_amount: form.ordered_amount ? Number(form.ordered_amount) : null,
        terms: form.terms || null,
        created_by: userCode ?? null,
      });
      toast.success(`Order ${o.order_no} added`);
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Failed to add order"); }
  };

  const errText = (k: string) => errors[k] && <p className="text-xs text-destructive mt-1">{errors[k]}</p>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Gavel className="h-5 w-5" /> Add Order / Judgment</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>Order Type *</Label>
            <Select value={form.order_type_code} onValueChange={(v) => set("order_type_code", v)}>
              <SelectTrigger className={errors.order_type_code ? "border-destructive" : ""}><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(orderTypes.length ? orderTypes : [
                  { code: "JUDGMENT", label: "Judgment" },
                  { code: "INTERIM", label: "Interim Order" },
                  { code: "FINAL", label: "Final Order" },
                  { code: "ENFORCEMENT", label: "Enforcement Order" },
                ]).map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errText("order_type_code")}
          </div>
          <div>
            <Label>Status *</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["DRAFT", "FILED", "GRANTED", "ACTIVE"].map((s) => (
                  <SelectItem key={s} value={s}>{LG_ORDER_STATUS_LABEL[s as keyof typeof LG_ORDER_STATUS_LABEL]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Linked Hearing</Label>
            <Select value={form.hearing_id || NONE} onValueChange={(v) => set("hearing_id", v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={hearings.isLoading ? "Loading…" : "None"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {(hearings.data ?? []).map((h: any) => (
                  <SelectItem key={h.id} value={h.id}>{h.hearing_date ?? "—"} · {h.hearing_type_code ?? "Hearing"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Issued by Court</Label><Input value={form.issued_by_court} onChange={(e) => set("issued_by_court", e.target.value)} /></div>
          <div><Label>Order Date *</Label><Input type="date" value={form.issued_date} onChange={(e) => set("issued_date", e.target.value)} className={errors.issued_date ? "border-destructive" : ""} />{errText("issued_date")}</div>
          <div><Label>Compliance Date</Label><Input type="date" value={form.compliance_date} onChange={(e) => set("compliance_date", e.target.value)} className={errors.compliance_date ? "border-destructive" : ""} />{errText("compliance_date")}</div>
          <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={(e) => set("effective_date", e.target.value)} /></div>
          <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} className={errors.expiry_date ? "border-destructive" : ""} />{errText("expiry_date")}</div>
          <div className="col-span-2"><Label>Amount Ordered</Label><Input type="number" min="0" step="0.01" value={form.ordered_amount} onChange={(e) => set("ordered_amount", e.target.value)} className={errors.ordered_amount ? "border-destructive" : ""} />{errText("ordered_amount")}</div>
          <div className="col-span-2"><Label>Terms / Notes</Label><Textarea rows={3} value={form.terms} onChange={(e) => set("terms", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
