import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useCreateLgOrder } from "@/hooks/legal/useLgEntities";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { logLgActivity } from "@/services/legal/lgAuditService";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; }

export function AddOrderDialog({ open, onOpenChange, lgCaseId }: Props) {
  const { userCode } = useUserCode();
  const create = useCreateLgOrder();
  const { data: orderTypes = [] } = useLgReference("LG_ORDER_TYPE");
  const [form, setForm] = useState({
    order_type_code: "",
    issued_by_court: "",
    issued_date: new Date().toISOString().slice(0, 10),
    effective_date: "",
    expiry_date: "",
    ordered_amount: "",
    terms: "",
  });

  useEffect(() => { if (open) setForm({ order_type_code: "", issued_by_court: "", issued_date: new Date().toISOString().slice(0, 10), effective_date: "", expiry_date: "", ordered_amount: "", terms: "" }); }, [open]);

  const submit = async () => {
    if (!form.order_type_code) { toast.error("Order type is required"); return; }
    if (!form.issued_date) { toast.error("Issued date is required"); return; }
    try {
      const o = await create.mutateAsync({
        lg_case_id: lgCaseId,
        order_type_code: form.order_type_code,
        issued_by_court: form.issued_by_court || null,
        issued_date: form.issued_date,
        effective_date: form.effective_date || null,
        expiry_date: form.expiry_date || null,
        ordered_amount: form.ordered_amount ? Number(form.ordered_amount) : null,
        terms: form.terms || null,
        created_by: userCode ?? null,
      });
      await logLgActivity({ lg_case_id: lgCaseId, activity_type: "ORDER_CREATED", description: `${o.order_no} (${form.order_type_code})`, performed_by: userCode ?? null, payload: { order_id: o.id } });
      toast.success(`Order ${o.order_no} added`);
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Gavel className="h-5 w-5" /> Add Order / Judgment</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>Order Type *</Label>
            <Select value={form.order_type_code} onValueChange={(v) => setForm((p) => ({ ...p, order_type_code: v }))}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(orderTypes.length ? orderTypes : [
                  { code: "JUDGMENT", label: "Judgment" },
                  { code: "INTERIM", label: "Interim Order" },
                  { code: "FINAL", label: "Final Order" },
                  { code: "ENFORCEMENT", label: "Enforcement" },
                ]).map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Issued by Court</Label><Input value={form.issued_by_court} onChange={(e) => setForm((p) => ({ ...p, issued_by_court: e.target.value }))} /></div>
          <div><Label>Issued Date *</Label><Input type="date" value={form.issued_date} onChange={(e) => setForm((p) => ({ ...p, issued_date: e.target.value }))} /></div>
          <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} /></div>
          <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))} /></div>
          <div><Label>Ordered Amount</Label><Input type="number" min="0" step="0.01" value={form.ordered_amount} onChange={(e) => setForm((p) => ({ ...p, ordered_amount: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Terms</Label><Textarea rows={3} value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
