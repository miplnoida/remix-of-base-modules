import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, CheckCircle2, XCircle, Send, BadgeMinus, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgFeeCharges, useLegalFeeHeads } from "@/hooks/legal/useLgFinancials";
import {
  useFeeBundlesForCase,
  useApplyBundle,
  useAddManualFee,
  usePostFeeCharge,
  useWaivers,
  useRequestWaiver,
  useApproveWaiver,
  useRejectWaiver,
  useWaiverReasons,
  useLedgerEntry,
} from "@/hooks/legal/useLgFees";

interface Props {
  lgCaseId: string;
  caseTypeCode?: string | null;
}

const CaseFeesTab: React.FC<Props> = ({ lgCaseId, caseTypeCode }) => {
  const access = useLgAccess();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const fees = useLgFeeCharges(lgCaseId);
  const waivers = useWaivers(lgCaseId);
  const heads = useLegalFeeHeads();
  const bundles = useFeeBundlesForCase(caseTypeCode);
  const reasons = useWaiverReasons();

  const applyBundle = useApplyBundle();
  const addManual = useAddManualFee();
  const post = usePostFeeCharge();
  const requestW = useRequestWaiver();
  const approveW = useApproveWaiver();
  const rejectW = useRejectWaiver();

  const [bundleId, setBundleId] = useState("");
  const [manual, setManual] = useState({ head: "", amount: "", reason: "" });
  const [waiverFor, setWaiverFor] = useState<string | null>(null);
  const [waiverForm, setWaiverForm] = useState({ reason: "", amount: "", percent: "", comments: "" });
  const [ledgerOpen, setLedgerOpen] = useState<string | null>(null);

  const auto = useMemo(() => (fees.data ?? []).filter((f: any) => f.auto_applied), [fees.data]);
  const manualFees = useMemo(() => (fees.data ?? []).filter((f: any) => !f.auto_applied && f.source_event === "MANUAL"), [fees.data]);
  const bundleFees = useMemo(() => (fees.data ?? []).filter((f: any) => f.fee_bundle_id), [fees.data]);
  const posted = useMemo(() => (fees.data ?? []).filter((f: any) => f.posting_status === "POSTED"), [fees.data]);

  const handleApplyBundle = async () => {
    if (!bundleId) return;
    try {
      await applyBundle.mutateAsync({ lgCaseId, bundleId, userCode });
      setBundleId("");
      toast({ title: "Fee bundle applied" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };
  const handleAddManual = async () => {
    const head = heads.data?.find((h) => h.id === manual.head);
    const amt = Number(manual.amount);
    if (!head || !(amt > 0)) { toast({ title: "Pick a head and enter amount", variant: "destructive" }); return; }
    try {
      await addManual.mutateAsync({ lgCaseId, feeHeadId: head.id, feeHeadCode: head.code, amount: amt, reason: manual.reason, userCode });
      setManual({ head: "", amount: "", reason: "" });
      toast({ title: "Manual fee added" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };
  const handlePost = async (chargeId: string) => {
    try { await post.mutateAsync({ chargeId, userCode }); toast({ title: "Posted to employer ledger" }); }
    catch (e: any) { toast({ title: "Posting failed", description: e.message, variant: "destructive" }); }
  };
  const submitWaiver = async () => {
    if (!waiverFor || !waiverForm.reason) { toast({ title: "Select a reason", variant: "destructive" }); return; }
    try {
      await requestW.mutateAsync({
        fee_charge_id: waiverFor,
        reason: waiverForm.reason,
        amount: waiverForm.amount ? Number(waiverForm.amount) : null,
        percent: waiverForm.percent ? Number(waiverForm.percent) / 100 : null,
        comments: waiverForm.comments,
        userCode,
      });
      setWaiverFor(null);
      setWaiverForm({ reason: "", amount: "", percent: "", comments: "" });
      toast({ title: "Waiver requested" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const feeRow = (f: any) => (
    <div key={f.id} className="border rounded p-3 text-sm">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <div className="font-medium">{f.fee_head_code} · {f.currency_code} {Number(f.amount).toFixed(2)}
            {Number(f.waived_amount) > 0 && <span className="text-xs ml-2 text-muted-foreground">(waived {Number(f.waived_amount).toFixed(2)} → net {Number(f.net_amount ?? f.amount - f.waived_amount).toFixed(2)})</span>}
          </div>
          <div className="text-xs text-muted-foreground">{f.charge_date} · {f.source_event || "—"} · {f.charge_reason || ""}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1">
            <Badge variant={f.posting_status === "POSTED" ? "default" : f.posting_status === "FAILED" ? "destructive" : "outline"}>{f.posting_status}</Badge>
            {f.waiver_status && f.waiver_status !== "NONE" && <Badge variant="secondary">Waiver {f.waiver_status}</Badge>}
            {f.auto_applied && <Badge variant="outline">AUTO</Badge>}
          </div>
          <div className="flex gap-1">
            {f.posting_status !== "POSTED" && (
              <Button size="sm" variant="default" disabled={!access.can("postFee") || post.isPending} onClick={() => handlePost(f.id)}>
                <Send className="h-3 w-3 mr-1" /> Post
              </Button>
            )}
            {f.posting_status === "POSTED" && f.ledger_entry_id && (
              <Button size="sm" variant="ghost" onClick={() => setLedgerOpen(f.ledger_entry_id)}>
                <ExternalLink className="h-3 w-3 mr-1" /> Ledger
              </Button>
            )}
            {f.waiver_status === "NONE" && (
              <Button size="sm" variant="outline" disabled={!access.can("requestWaiver")} onClick={() => setWaiverFor(f.id)}>
                <BadgeMinus className="h-3 w-3 mr-1" /> Waiver
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Legal Fees</CardTitle>
          <CardDescription>Configurable fees, auto-applied by stage/event. All postings flow to the employer financial ledger.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="auto" className="space-y-3">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="auto">Auto Fees ({auto.length})</TabsTrigger>
              <TabsTrigger value="bundles">Bundles ({bundleFees.length})</TabsTrigger>
              <TabsTrigger value="manual">Manual ({manualFees.length})</TabsTrigger>
              <TabsTrigger value="waivers">Waivers ({waivers.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="posted">Posted ({posted.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-2">
              {auto.length ? auto.map(feeRow) : <p className="text-sm text-muted-foreground">No auto-applied fees yet. Auto fees are created when the case reaches matching stages/events.</p>}
            </TabsContent>

            <TabsContent value="bundles" className="space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="min-w-[280px]">
                  <label className="text-xs text-muted-foreground">Bundle</label>
                  <select className="w-full border rounded h-9 px-2 bg-background" value={bundleId} onChange={(e) => setBundleId(e.target.value)}>
                    <option value="">Select bundle…</option>
                    {bundles.data?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.bundle_code} — {b.bundle_name}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleApplyBundle} disabled={!access.can("applyFeeBundle") || !bundleId || applyBundle.isPending}>
                  {applyBundle.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Apply Fee Bundle
                </Button>
              </div>
              <Separator />
              {bundleFees.length ? bundleFees.map(feeRow) : <p className="text-sm text-muted-foreground">No bundle fees applied.</p>}
            </TabsContent>

            <TabsContent value="manual" className="space-y-3">
              <div className="grid md:grid-cols-4 gap-2 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Fee Head</label>
                  <select className="w-full border rounded h-9 px-2 bg-background" value={manual.head} onChange={(e) => setManual((p) => ({ ...p, head: e.target.value }))}>
                    <option value="">Select…</option>
                    {heads.data?.map((h) => <option key={h.id} value={h.id}>{h.code} — {h.description}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <input type="number" min="0" step="0.01" className="w-full border rounded h-9 px-2 bg-background" value={manual.amount} onChange={(e) => setManual((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Reason</label>
                  <input className="w-full border rounded h-9 px-2 bg-background" value={manual.reason} onChange={(e) => setManual((p) => ({ ...p, reason: e.target.value }))} />
                </div>
                <div className="md:col-span-4">
                  <Button onClick={handleAddManual} disabled={!access.can("addManualFee") || addManual.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Add Manual Fee
                  </Button>
                </div>
              </div>
              <Separator />
              {manualFees.length ? manualFees.map(feeRow) : <p className="text-sm text-muted-foreground">No manual fees added.</p>}
            </TabsContent>

            <TabsContent value="waivers" className="space-y-2">
              {waivers.data?.length ? waivers.data.map((w) => (
                <div key={w.id} className="border rounded p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{w.waiver_reason_code}</div>
                      <div className="text-xs text-muted-foreground">
                        Requested by {w.requested_by ?? "—"} · {new Date(w.requested_at).toLocaleString()}
                        {w.waiver_amount != null && ` · amount ${Number(w.waiver_amount).toFixed(2)}`}
                        {w.waiver_percent != null && ` · ${(Number(w.waiver_percent) * 100).toFixed(1)}%`}
                      </div>
                      {w.comments && <div className="mt-1">{w.comments}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={w.approval_status === "APPROVED" || w.approval_status === "AUTO_APPROVED" ? "default" : w.approval_status === "REJECTED" ? "destructive" : "outline"}>{w.approval_status}</Badge>
                      {w.approval_status === "PENDING" && access.can("approveWaiver") && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" disabled={approveW.isPending} onClick={async () => { try { await approveW.mutateAsync({ waiverId: w.id, userCode }); toast({ title: "Waiver approved" }); } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" disabled={rejectW.isPending} onClick={async () => { try { await rejectW.mutateAsync({ waiverId: w.id, userCode }); toast({ title: "Waiver rejected" }); } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } }}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No waivers requested.</p>}
            </TabsContent>

            <TabsContent value="posted" className="space-y-2">
              {posted.length ? posted.map(feeRow) : <p className="text-sm text-muted-foreground">Nothing posted yet.</p>}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Waiver dialog (inline modal) */}
      {waiverFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setWaiverFor(null)}>
          <div className="bg-background border rounded-lg shadow-lg max-w-md w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold">Request Fee Waiver</div>
            <div>
              <label className="text-xs text-muted-foreground">Reason</label>
              <select className="w-full border rounded h-9 px-2 bg-background" value={waiverForm.reason} onChange={(e) => setWaiverForm((p) => ({ ...p, reason: e.target.value }))}>
                <option value="">Select…</option>
                {reasons.data?.map((r: any) => <option key={r.value_code} value={r.value_code}>{r.value_label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Amount</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded h-9 px-2 bg-background" value={waiverForm.amount} onChange={(e) => setWaiverForm((p) => ({ ...p, amount: e.target.value, percent: "" }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">— or % of fee</label>
                <input type="number" min="0" max="100" step="1" className="w-full border rounded h-9 px-2 bg-background" value={waiverForm.percent} onChange={(e) => setWaiverForm((p) => ({ ...p, percent: e.target.value, amount: "" }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Comments</label>
              <textarea rows={3} className="w-full border rounded p-2 bg-background" value={waiverForm.comments} onChange={(e) => setWaiverForm((p) => ({ ...p, comments: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setWaiverFor(null)}>Cancel</Button>
              <Button onClick={submitWaiver} disabled={requestW.isPending}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      {ledgerOpen && <LedgerEntryDialog id={ledgerOpen} onClose={() => setLedgerOpen(null)} />}
    </>
  );
};

const LedgerEntryDialog: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const { data, isLoading } = useLedgerEntry(id);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border rounded-lg shadow-lg max-w-lg w-full p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Employer Ledger Entry</div>
        {isLoading || !data ? <p className="text-sm">Loading…</p> : (
          <dl className="text-sm grid grid-cols-2 gap-2">
            <dt className="text-muted-foreground">Employer</dt><dd>{data.employer_name || data.employer_id}</dd>
            <dt className="text-muted-foreground">Period</dt><dd>{data.period}</dd>
            <dt className="text-muted-foreground">Type</dt><dd>{data.entry_type} · {data.fund_type}</dd>
            <dt className="text-muted-foreground">Debit</dt><dd>{Number(data.debit_amount).toFixed(2)}</dd>
            <dt className="text-muted-foreground">Credit</dt><dd>{Number(data.credit_amount).toFixed(2)}</dd>
            <dt className="text-muted-foreground">Status</dt><dd>{data.status}</dd>
            <dt className="text-muted-foreground">Reference</dt><dd>{data.reference_type}</dd>
            <dt className="text-muted-foreground">Posted</dt><dd>{new Date(data.posted_at).toLocaleString()} by {data.posted_by}</dd>
            <dt className="text-muted-foreground col-span-2">Description</dt><dd className="col-span-2">{data.description}</dd>
          </dl>
        )}
        <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div>
      </div>
    </div>
  );
};

export default CaseFeesTab;
