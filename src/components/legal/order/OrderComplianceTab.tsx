import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDateForDisplay } from "@/lib/format-config";
import { listComplianceEvents, addComplianceEvent, flagBreachedOrders } from "@/services/legal/lgOrderComplianceService";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const EVENT_TYPES = [
  "PAYMENT_RECEIVED",
  "PARTIAL_PAYMENT",
  "DOCUMENT_SUBMITTED",
  "EMPLOYER_COMPLIED",
  "IP_COMPLIED",
  "MISSED_DEADLINE",
  "BREACH_RECORDED",
  "EXTENSION_GRANTED",
  "FURTHER_ORDER_REQUIRED",
];

export function OrderComplianceTab({ orderId, caseId }: { orderId: string; caseId: string }) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const access = useLgAccess();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [amount, setAmount] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["lg_order_compliance", orderId],
    queryFn: () => listComplianceEvents(orderId),
  });

  const save = async () => {
    setSaving(true);
    try {
      await addComplianceEvent({
        order_id: orderId,
        case_id: caseId,
        event_type: type,
        amount: amount ? Number(amount) : null,
        remarks: remarks || null,
        created_by: userCode ?? null,
      });
      toast.success("Compliance event recorded");
      setOpen(false); setAmount(""); setRemarks("");
      qc.invalidateQueries({ queryKey: ["lg_order_compliance", orderId] });
      qc.invalidateQueries({ queryKey: ["lg_order_detail"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  const runBreachSweep = async () => {
    const n = await flagBreachedOrders();
    toast.success(`Breach sweep: ${n} order(s) flagged`);
    qc.invalidateQueries({ queryKey: ["lg_order_detail"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Compliance Events</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runBreachSweep}>Run Breach Sweep</Button>
          {access.can("manageComplianceEvents") && (
            <Button size="sm" onClick={() => setOpen(true)}>Add Event</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && data.length === 0 && <div className="text-sm text-muted-foreground">No compliance events yet.</div>}
        {data.length > 0 && (
          <div className="space-y-2 text-sm">
            {data.map((e: any) => (
              <div key={e.id} className="border-l-2 border-primary/40 pl-3 py-1">
                <div className="text-xs text-muted-foreground">{formatDateForDisplay(e.event_date)} · {e.event_type}</div>
                <div>{e.amount != null ? `EC$${Number(e.amount).toLocaleString()} — ` : ""}{e.remarks ?? ""}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Compliance Event</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Event Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount (EC$) — optional</label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Remarks</label>
              <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
