import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateForDisplay } from "@/lib/format-config";
import {
  listEnforcementForOrder, createEnforcement, changeEnforcementStatus,
} from "@/services/legal/lgEnforcementService";
import {
  LG_ENFORCEMENT_STATUS_LABEL, LG_ENFORCEMENT_TYPES, allowedNextLgEnforcementStatuses,
} from "@/services/legal/lgEnforcementStateMachine";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

export function OrderEnforcementTab({ orderId, caseId }: { orderId: string; caseId: string }) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const access = useLgAccess();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<string>(LG_ENFORCEMENT_TYPES[0]?.code ?? "GARNISHMENT");
  const [agency, setAgency] = useState("");
  const [target, setTarget] = useState<string>("");
  const [remarks, setRemarks] = useState("");

  const [advanceOpen, setAdvanceOpen] = useState<{ id: string; to: string } | null>(null);
  const [recovered, setRecovered] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["lg_enforcement_order", orderId],
    queryFn: () => listEnforcementForOrder(orderId),
  });

  const save = async () => {
    setSaving(true);
    try {
      await createEnforcement({
        case_id: caseId,
        order_id: orderId,
        enforcement_type: type,
        external_agency: agency || null,
        amount_targeted: target ? Number(target) : null,
        remarks: remarks || null,
        created_by: userCode ?? null,
      });
      toast.success("Enforcement created");
      setOpen(false); setAgency(""); setTarget(""); setRemarks("");
      qc.invalidateQueries({ queryKey: ["lg_enforcement_order", orderId] });
      qc.invalidateQueries({ queryKey: ["lg_order_detail"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  const advance = async () => {
    if (!advanceOpen) return;
    try {
      await changeEnforcementStatus(advanceOpen.id, advanceOpen.to as any, {
        userCode,
        amountRecovered: recovered ? Number(recovered) : null,
        outcome: outcome || null,
      });
      toast.success("Enforcement updated");
      setAdvanceOpen(null); setRecovered(""); setOutcome("");
      qc.invalidateQueries({ queryKey: ["lg_enforcement_order", orderId] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Enforcement Actions</CardTitle>
        {access.can("createEnforcement") && <Button size="sm" onClick={() => setOpen(true)}>Start Enforcement</Button>}
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && data.length === 0 && <div className="text-sm text-muted-foreground">No enforcement actions yet.</div>}
        {data.length > 0 && (
          <div className="space-y-3">
            {data.map((e: any) => {
              const next = allowedNextLgEnforcementStatuses(e.status);
              return (
                <div key={e.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">{e.enforcement_no}</span>
                    <Badge variant="outline">{e.enforcement_type}</Badge>
                    <Badge variant={e.status === "FAILED" ? "destructive" : "secondary"}>{LG_ENFORCEMENT_STATUS_LABEL[e.status as keyof typeof LG_ENFORCEMENT_STATUS_LABEL] ?? e.status}</Badge>
                    <div className="flex-1" />
                    {access.can("editOrder") && next.slice(0, 4).map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => setAdvanceOpen({ id: e.id, to: s })}>→ {LG_ENFORCEMENT_STATUS_LABEL[s]}</Button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Requested: {e.requested_date ? formatDateForDisplay(e.requested_date) : "—"} · Approved: {e.approved_date ? formatDateForDisplay(e.approved_date) : "—"} · Executed: {e.execution_date ? formatDateForDisplay(e.execution_date) : "—"}
                  </div>
                  <div className="text-xs mt-1">
                    Target: {e.amount_targeted != null ? `EC$${Number(e.amount_targeted).toLocaleString()}` : "—"} · Recovered: {e.amount_recovered != null ? `EC$${Number(e.amount_recovered).toLocaleString()}` : "—"} · Agency: {e.external_agency ?? "—"}
                  </div>
                  {e.remarks && <div className="mt-2 whitespace-pre-wrap">{e.remarks}</div>}
                  {e.outcome && <div className="mt-1 text-xs">Outcome: {e.outcome}</div>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Enforcement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Enforcement Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LG_ENFORCEMENT_TYPES.map(t => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">External Agency</label>
              <Input value={agency} onChange={(e) => setAgency(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount Targeted (EC$)</label>
              <Input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Remarks</label>
              <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!advanceOpen} onOpenChange={(v) => !v && setAdvanceOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Advance to {advanceOpen ? LG_ENFORCEMENT_STATUS_LABEL[advanceOpen.to as keyof typeof LG_ENFORCEMENT_STATUS_LABEL] : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Amount Recovered (EC$) — optional</label>
              <Input type="number" step="0.01" value={recovered} onChange={(e) => setRecovered(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Outcome</label>
              <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceOpen(null)}>Cancel</Button>
            <Button onClick={advance}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
