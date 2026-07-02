import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useChangeLgOrderStatus } from "@/hooks/legal/useLgEntities";
import { allowedNextLgOrderStatuses, LG_ORDER_STATUS_LABEL, type LgOrderStatus } from "@/services/legal/lgOrderStateMachine";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: any | null;
  caseId?: string;
}

export function LgOrderStatusDialog({ open, onOpenChange, order, caseId }: Props) {
  const { userCode } = useUserCode();
  const change = useChangeLgOrderStatus(caseId);
  const nexts = allowedNextLgOrderStatuses(order?.status);
  const [toStatus, setToStatus] = useState<LgOrderStatus | "">("");
  const [note, setNote] = useState("");
  const [enforcementRef, setEnforcementRef] = useState("");

  useEffect(() => {
    if (open) {
      setToStatus(nexts[0] ?? "");
      setNote("");
      setEnforcementRef(order?.enforcement_ref ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

  const submit = async () => {
    if (!order || !toStatus) return;
    try {
      await change.mutateAsync({
        id: order.id,
        toStatus: toStatus as LgOrderStatus,
        userCode: userCode ?? null,
        note: note || null,
        enforcementRef: enforcementRef || null,
      });
      toast.success(`Order ${order.order_no} → ${LG_ORDER_STATUS_LABEL[toStatus as LgOrderStatus]}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Status change failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Change order status</DialogTitle></DialogHeader>
        {!order ? null : nexts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">This order is {LG_ORDER_STATUS_LABEL[(order.status ?? "DRAFT") as LgOrderStatus]} and cannot be transitioned further.</p>
        ) : (
          <div className="space-y-3 py-2">
            <div className="text-sm">Order <b>{order.order_no}</b> — currently <b>{LG_ORDER_STATUS_LABEL[(order.status ?? "DRAFT") as LgOrderStatus] ?? order.status}</b></div>
            <div>
              <Label>New status *</Label>
              <Select value={toStatus} onValueChange={(v) => setToStatus(v as LgOrderStatus)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {nexts.map((s) => <SelectItem key={s} value={s}>{LG_ORDER_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(toStatus === "BREACHED" || toStatus === "ACTIVE" || order.status === "BREACHED") && (
              <div><Label>Enforcement reference</Label><Input value={enforcementRef} onChange={(e) => setEnforcementRef(e.target.value)} placeholder="e.g. Writ / execution number" /></div>
            )}
            <div><Label>Note</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context recorded in audit trail" /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={change.isPending}>Close</Button>
          {nexts.length > 0 && (
            <Button onClick={submit} disabled={!toStatus || change.isPending}>{change.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Apply</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
