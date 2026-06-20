import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, HandshakeIcon } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useCreateLgSettlement } from "@/hooks/legal/useLgEntities";
import { logLgActivity } from "@/services/legal/lgAuditService";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; }

export function AddSettlementDialog({ open, onOpenChange, lgCaseId }: Props) {
  const { userCode } = useUserCode();
  const create = useCreateLgSettlement();
  const [form, setForm] = useState({ proposed_amount: "", currency_code: "XCD", terms: "" });

  useEffect(() => { if (open) setForm({ proposed_amount: "", currency_code: "XCD", terms: "" }); }, [open]);

  const submit = async () => {
    const amt = Number(form.proposed_amount);
    if (!(amt > 0)) { toast.error("Proposed amount must be greater than zero"); return; }
    try {
      const s = await create.mutateAsync({
        lg_case_id: lgCaseId,
        proposed_amount: amt,
        currency_code: form.currency_code || "XCD",
        terms: form.terms || null,
        proposed_by: userCode ?? null,
      });
      await logLgActivity({ lg_case_id: lgCaseId, activity_type: "SETTLEMENT_CREATED", description: `${form.currency_code} ${amt.toFixed(2)}`, performed_by: userCode ?? null, payload: { settlement_id: s.id } });
      toast.success("Settlement proposed");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><HandshakeIcon className="h-5 w-5" /> Propose Settlement</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label>Proposed Amount *</Label><Input type="number" min="0" step="0.01" value={form.proposed_amount} onChange={(e) => setForm((p) => ({ ...p, proposed_amount: e.target.value }))} /></div>
          <div><Label>Currency</Label><Input value={form.currency_code} onChange={(e) => setForm((p) => ({ ...p, currency_code: e.target.value.toUpperCase() }))} maxLength={3} /></div>
          <div className="col-span-2"><Label>Terms</Label><Textarea rows={4} value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Propose</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
