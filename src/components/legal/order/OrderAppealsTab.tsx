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
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateForDisplay } from "@/lib/format-config";
import { listAppealsForOrder, createAppeal, changeAppealStatus } from "@/services/legal/lgAppealService";
import { LG_APPEAL_STATUSES, LG_APPEAL_STATUS_LABEL, allowedNextLgAppealStatuses } from "@/services/legal/lgAppealStateMachine";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

export function OrderAppealsTab({ orderId, caseId }: { orderId: string; caseId: string }) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const access = useLgAccess();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [party, setParty] = useState("");
  const [grounds, setGrounds] = useState("");
  const [filingDate, setFilingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [deadline, setDeadline] = useState<string>("");
  const [override, setOverride] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["lg_appeals_order", orderId],
    queryFn: () => listAppealsForOrder(orderId),
  });

  const save = async () => {
    setSaving(true);
    try {
      await createAppeal({
        case_id: caseId,
        order_id: orderId,
        filing_party: party || null,
        grounds: grounds || null,
        filing_date: filingDate || null,
        appeal_deadline: deadline || null,
        overrideDeadline: override,
        created_by: userCode ?? null,
      });
      toast.success("Appeal filed");
      setOpen(false); setParty(""); setGrounds(""); setDeadline(""); setOverride(false);
      qc.invalidateQueries({ queryKey: ["lg_appeals_order", orderId] });
      qc.invalidateQueries({ queryKey: ["lg_order_detail"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  const advance = async (id: string, to: any) => {
    try {
      await changeAppealStatus(id, to, { userCode });
      toast.success(`Appeal → ${LG_APPEAL_STATUS_LABEL[to as keyof typeof LG_APPEAL_STATUS_LABEL]}`);
      qc.invalidateQueries({ queryKey: ["lg_appeals_order", orderId] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Appeals</CardTitle>
        {access.can("createAppeal") && <Button size="sm" onClick={() => setOpen(true)}>File Appeal</Button>}
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && data.length === 0 && <div className="text-sm text-muted-foreground">No appeals filed against this order.</div>}
        {data.length > 0 && (
          <div className="space-y-3">
            {data.map((a: any) => {
              const next = allowedNextLgAppealStatuses(a.status);
              return (
                <div key={a.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{a.appeal_no}</span>
                    <Badge variant="outline">{LG_APPEAL_STATUS_LABEL[a.status as keyof typeof LG_APPEAL_STATUS_LABEL] ?? a.status}</Badge>
                    <div className="flex-1" />
                    {access.can("editAppeal") && next.slice(0, 4).map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => advance(a.id, s)}>→ {LG_APPEAL_STATUS_LABEL[s]}</Button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Filed: {a.filing_date ? formatDateForDisplay(a.filing_date) : "—"} · Deadline: {a.appeal_deadline ? formatDateForDisplay(a.appeal_deadline) : "—"} · Decision: {a.decision_date ? formatDateForDisplay(a.decision_date) : "—"}
                  </div>
                  {a.grounds && <div className="mt-2 whitespace-pre-wrap">{a.grounds}</div>}
                  {a.outcome && <div className="mt-1 text-xs">Outcome: {a.outcome}</div>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>File Appeal</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Filing Party</label>
              <Input value={party} onChange={(e) => setParty(e.target.value)} placeholder="e.g. Respondent Employer" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Filing Date</label>
                <Input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Appeal Deadline</label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Grounds</label>
              <Textarea rows={3} value={grounds} onChange={(e) => setGrounds(e.target.value)} />
            </div>
            {access.can("overrideAppealDeadline") && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={override} onCheckedChange={(v) => setOverride(!!v)} />
                Override deadline (filing after appeal deadline)
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "File Appeal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
