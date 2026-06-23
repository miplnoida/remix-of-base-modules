// Central, module-agnostic Payment Arrangement panel.
// Renders the same UX inside Legal, Compliance, Benefits, Finance, or Employer
// screens. Calls into the central service — no module-specific tables required.

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Loader2, Plus, ShieldAlert, CornerDownRight, Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useCoreArrangementsByDebtor,
  useCoreArrangementDetail,
} from "@/hooks/core/useCorePaymentArrangements";
import {
  createArrangementFromSource,
  getArrangementsBySourceRecord,
  linkArrangementToSource,
  recordDefault,
  activateArrangement,
  type ContextModule,
  type SourceRecordRef,
} from "@/services/core/corePaymentArrangementService";
import type {
  ArrangementDebtorType,
  ArrangementFrequency,
  ArrangementStatus,
  ArrangementType,
  CorePaymentArrangement,
} from "@/types/corePaymentArrangement";

// --------------------------------------------------------------- Public API

export interface CentralPaymentArrangementPanelProps {
  contextModule: ContextModule;
  debtorType: ArrangementDebtorType;
  debtorId?: string | null;
  debtorName?: string | null;
  /** Source records this context wants to attach the arrangement to (case, action, proceeding...) */
  sourceRecords?: SourceRecordRef[];
  defaultArrangementType?: ArrangementType;
  allowCreate?: boolean;
  allowSupersede?: boolean;
  allowLinkExisting?: boolean;
  /** Optional label override for the "create" button */
  createLabelOverride?: string;
  onArrangementCreated?: (a: CorePaymentArrangement) => void;
  onArrangementLinked?: (arrangementId: string) => void;
}

// --------------------------------------------------------------- Module copy

const COPY: Record<ContextModule, {
  title: string;
  createBtn: string;
  supersedeBtn: string;
  linkedTitle: string;
  linkedDesc: string;
  otherTitle: string;
  otherDesc: string;
  trackingTitle: string;
  defaultTypes: ArrangementType[];
}> = {
  LEGAL: {
    title: "Payment Recovery Tracking",
    createBtn: "Create Legal Payment Arrangement",
    supersedeBtn: "Supersede Previous Arrangement",
    linkedTitle: "Covered Legal Actions",
    linkedDesc: "Arrangements linked to this Legal context (case / action / proceeding).",
    otherTitle: "Other Arrangements for this Debtor",
    otherDesc: "Arrangements originated by Compliance, Benefits, Finance, or other Legal cases.",
    trackingTitle: "Payment Recovery Tracking",
    defaultTypes: ["LEGAL_PRE_COURT", "LEGAL_COURT_ORDERED", "LEGAL_POST_JUDGMENT", "ENFORCEMENT_PLAN"],
  },
  COMPLIANCE: {
    title: "Payment Arrangements",
    createBtn: "Create Compliance Payment Arrangement",
    supersedeBtn: "Supersede Previous Arrangement",
    linkedTitle: "Arrangements for this Compliance Context",
    linkedDesc: "Arrangements linked to this case or violation.",
    otherTitle: "Other Arrangements for this Debtor",
    otherDesc: "Arrangements from Legal, Benefits, Finance, or other Compliance cases.",
    trackingTitle: "Recovery Tracking",
    defaultTypes: ["COMPLIANCE_PLAN", "VOLUNTARY"],
  },
  BENEFITS: {
    title: "Overpayment Recovery Arrangements",
    createBtn: "Create Recovery Arrangement",
    supersedeBtn: "Supersede Previous Arrangement",
    linkedTitle: "Arrangements for this Claim",
    linkedDesc: "Overpayment recovery plans linked to this benefit context.",
    otherTitle: "Other Arrangements for this Debtor",
    otherDesc: "Arrangements from Compliance, Legal, Finance.",
    trackingTitle: "Recovery Tracking",
    defaultTypes: ["BENEFIT_OVERPAYMENT_RECOVERY"],
  },
  FINANCE: {
    title: "Finance Payment Arrangements",
    createBtn: "Create Finance Arrangement",
    supersedeBtn: "Supersede Previous Arrangement",
    linkedTitle: "Arrangements for this Debt",
    linkedDesc: "Arrangements linked to the finance debt record.",
    otherTitle: "Other Arrangements for this Debtor",
    otherDesc: "Arrangements from other modules.",
    trackingTitle: "Recovery Tracking",
    defaultTypes: ["VOLUNTARY", "COMPLIANCE_PLAN"],
  },
  EMPLOYER: {
    title: "Employer Payment Arrangements",
    createBtn: "Create Payment Arrangement",
    supersedeBtn: "Supersede Previous Arrangement",
    linkedTitle: "Arrangements for this Employer",
    linkedDesc: "All arrangements where this employer is the debtor.",
    otherTitle: "Other Linked Arrangements",
    otherDesc: "",
    trackingTitle: "Recovery Tracking",
    defaultTypes: ["VOLUNTARY", "COMPLIANCE_PLAN"],
  },
};

// --------------------------------------------------------------- Helpers

function StatusBadge({ status }: { status: ArrangementStatus }) {
  const cls: Record<ArrangementStatus, string> = {
    DRAFT: "bg-muted text-foreground",
    PENDING_APPROVAL: "bg-amber-500 text-white",
    ACTIVE: "bg-emerald-600 text-white",
    DEFAULTED: "bg-destructive text-destructive-foreground",
    SUPERSEDED: "bg-slate-500 text-white",
    COMPLETED: "bg-sky-600 text-white",
    CANCELLED: "bg-zinc-400 text-white",
  };
  return <Badge className={`${cls[status]} whitespace-nowrap`}>{status.replace("_", " ")}</Badge>;
}
function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "XCD" }).format(Number(n ?? 0));
}

// --------------------------------------------------------------- Create dialog

function CreateDialog({
  open, onOpenChange, ctx, debtorType, debtorId, debtorName, sourceRecords,
  presetType, supersedeFromId, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctx: ContextModule;
  debtorType: ArrangementDebtorType;
  debtorId: string;
  debtorName?: string | null;
  sourceRecords: SourceRecordRef[];
  presetType: ArrangementType;
  supersedeFromId?: string | null;
  onCreated: (a: CorePaymentArrangement) => void;
}) {
  const { toast } = useToast();
  const copy = COPY[ctx];
  const [arrangementType, setArrangementType] = useState<ArrangementType>(presetType);
  const [frequency, setFrequency] = useState<ArrangementFrequency>("MONTHLY");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [downPayment, setDownPayment] = useState<string>("0");
  const [numInstallments, setNumInstallments] = useState<string>("6");
  const [principal, setPrincipal] = useState<string>("0");
  const [penalty, setPenalty] = useState<string>("0");
  const [cost, setCost] = useState<string>("0");
  const [terms, setTerms] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const total = Number(principal || 0) + Number(penalty || 0) + Number(cost || 0);

  const mut = useMutation({
    mutationFn: async () => {
      if (total <= 0) throw new Error("Arranged amount must be greater than zero.");
      return createArrangementFromSource({
        contextModule: ctx,
        debtorType,
        debtorId,
        debtorName: debtorName ?? null,
        arrangementType,
        frequency,
        startDate,
        numberOfInstallments: Number(numInstallments || 1),
        downPayment: Number(downPayment || 0),
        termsText: terms || (supersedeFromId ? `Supersession reason: ${reason}` : null),
        sourceRecords,
        amounts: {
          principal: Number(principal || 0),
          penalty: Number(penalty || 0),
          cost: Number(cost || 0),
          arranged: total,
        },
        supersedeFromArrangementId: supersedeFromId ?? null,
      });
    },
    onSuccess: (a) => {
      toast({ title: supersedeFromId ? "Arrangement superseded" : "Arrangement created" });
      onOpenChange(false);
      onCreated(a);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supersedeFromId ? copy.supersedeBtn : copy.createBtn}</DialogTitle>
        </DialogHeader>
        <form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Arrangement Type *</Label>
              <Select value={arrangementType} onValueChange={(v) => setArrangementType(v as ArrangementType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {copy.defaultTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency *</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ArrangementFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>Number of installments *</Label>
              <Input type="number" min={1} value={numInstallments} onChange={(e) => setNumInstallments(e.target.value)} /></div>
            <div><Label>Principal</Label>
              <Input type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
            <div><Label>Penalty</Label>
              <Input type="number" step="0.01" value={penalty} onChange={(e) => setPenalty(e.target.value)} /></div>
            <div><Label>Cost</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
            <div><Label>Down payment</Label>
              <Input type="number" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Terms / Notes</Label>
              <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
            {supersedeFromId && (
              <div className="md:col-span-2"><Label>Reason for supersession *</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Defaulted, court order issued, terms renegotiated" /></div>
            )}
          </div>
          <Alert>
            <AlertTitle>Total arranged: {money(total)}</AlertTitle>
            <AlertDescription className="text-xs">
              Created in DRAFT, linked to {sourceRecords.length} source record(s). Approve to activate.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {supersedeFromId ? "Supersede" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------- Link dialog

function LinkExistingDialog({
  open, onOpenChange, ctx, debtorId, debtorType, sourceRecords, onLinked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctx: ContextModule;
  debtorId: string;
  debtorType: ArrangementDebtorType;
  sourceRecords: SourceRecordRef[];
  onLinked: (id: string) => void;
}) {
  const { toast } = useToast();
  const byDebtor = useCoreArrangementsByDebtor(debtorId, debtorType);
  const [selected, setSelected] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select an arrangement to link.");
      const primary = sourceRecords[0];
      if (!primary) throw new Error("No source record available in this context.");
      await linkArrangementToSource(selected, primary, note || `Linked from ${ctx} context for monitoring`);
    },
    onSuccess: () => {
      toast({ title: "Arrangement linked" });
      onOpenChange(false);
      onLinked(selected);
      setSelected("");
      setNote("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Link Existing Arrangement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Existing arrangements for this debtor</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Select an arrangement…" /></SelectTrigger>
              <SelectContent>
                {(byDebtor.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.arrangement_no} · {a.source_module_created_by} · {a.status} · {money(a.outstanding_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(byDebtor.data ?? []).length === 0 && !byDebtor.isLoading && (
              <p className="text-xs text-muted-foreground mt-1">No existing arrangements found for this debtor.</p>
            )}
          </div>
          <div>
            <Label>Linkage note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Continue under Legal monitoring; originated in Compliance" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !selected}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------- Detail dialog

function DetailDialog({
  arrangementId, open, onOpenChange,
}: { arrangementId: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const detail = useCoreArrangementDetail(arrangementId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Arrangement Detail</DialogTitle></DialogHeader>
        {detail.isLoading ? (
          <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : detail.data ? (
          <div className="space-y-4 text-sm">
            <div className="grid md:grid-cols-4 gap-3">
              <div><div className="text-xs text-muted-foreground">No.</div><div className="font-medium">{detail.data.arrangement.arrangement_no}</div></div>
              <div><div className="text-xs text-muted-foreground">Origin</div><div>{detail.data.arrangement.source_module_created_by}</div></div>
              <div><div className="text-xs text-muted-foreground">Status</div><StatusBadge status={detail.data.arrangement.status} /></div>
              <div><div className="text-xs text-muted-foreground">Outstanding</div><div>{money(detail.data.arrangement.outstanding_balance)}</div></div>
            </div>
            <div>
              <div className="font-medium mb-1">Covered Liabilities</div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Source</TableHead><TableHead>Type</TableHead><TableHead>Ref</TableHead>
                  <TableHead className="text-right">Arranged</TableHead><TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {detail.data.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.source_module}</TableCell>
                      <TableCell>{it.liability_type}</TableCell>
                      <TableCell className="font-mono text-xs">{it.source_reference_no ?? it.source_record_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-right">{money(it.arranged_amount)}</TableCell>
                      <TableCell className="text-right">{money(it.paid_amount)}</TableCell>
                      <TableCell className="text-right">{money(it.outstanding_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <div className="font-medium mb-1">Schedule</div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {detail.data.installments.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.installment_no}</TableCell><TableCell>{i.due_date}</TableCell>
                      <TableCell className="text-right">{money(i.due_amount)}</TableCell>
                      <TableCell className="text-right">{money(i.paid_amount)}</TableCell>
                      <TableCell>{i.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {detail.data.allocations.length > 0 && (
              <div>
                <div className="font-medium mb-1">Receipts / Payment History</div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Allocated</TableHead><TableHead>Source</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {detail.data.allocations.map((al) => (
                      <TableRow key={al.id}>
                        <TableCell>{al.payment_date}</TableCell>
                        <TableCell className="text-right">{money(al.amount_received)}</TableCell>
                        <TableCell className="text-right">{money(al.allocation_amount)}</TableCell>
                        <TableCell>{al.source_module ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {detail.data.history.length > 0 && (
              <div>
                <div className="font-medium mb-1">Status History</div>
                <ul className="space-y-1 text-xs">
                  {detail.data.history.map((h) => (
                    <li key={h.id}>
                      <span className="font-mono">{new Date(h.performed_at).toLocaleString()}</span>
                      {" — "}{h.from_status ?? "—"} → <span className="font-medium">{h.to_status}</span>
                      {h.reason ? ` · ${h.reason}` : ""}{h.performed_by ? ` · ${h.performed_by}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------- Arrangement row

function ArrangementRow({
  a, ctx, canEdit, onAction,
}: {
  a: CorePaymentArrangement;
  ctx: ContextModule;
  canEdit: boolean;
  onAction: (kind: "activate" | "default" | "supersede" | "view", a: CorePaymentArrangement) => void;
}) {
  const ctxMod = ctx === "LEGAL" ? "LEGAL" : ctx === "COMPLIANCE" ? "COMPLIANCE" : ctx === "BENEFITS" ? "BENEFITS" : "FINANCE";
  const originated = a.source_module_created_by !== ctxMod
    ? `Originated From ${a.source_module_created_by.charAt(0) + a.source_module_created_by.slice(1).toLowerCase()}`
    : null;
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{a.arrangement_no}</div>
        <div className="text-xs text-muted-foreground">{a.arrangement_type.replace(/_/g, " ")}</div>
        {originated && <div className="text-[11px] text-muted-foreground italic">{originated}</div>}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={a.source_module_created_by === ctxMod ? "border-primary" : ""}>
          {a.source_module_created_by}
        </Badge>
      </TableCell>
      <TableCell><StatusBadge status={a.status} /></TableCell>
      <TableCell className="text-right">{money(a.total_arranged_amount)}</TableCell>
      <TableCell className="text-right">{money(a.total_paid)}</TableCell>
      <TableCell className="text-right">{money(a.outstanding_balance)}</TableCell>
      <TableCell>{a.start_date}{a.end_date ? ` → ${a.end_date}` : ""}</TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button size="sm" variant="ghost" onClick={() => onAction("view", a)}>View</Button>
        {canEdit && a.status === "DRAFT" && (
          <Button size="sm" variant="outline" onClick={() => onAction("activate", a)}>Activate</Button>
        )}
        {canEdit && a.status === "ACTIVE" && (
          <Button size="sm" variant="outline" onClick={() => onAction("default", a)}>Mark Default</Button>
        )}
        {canEdit && (a.status === "ACTIVE" || a.status === "DEFAULTED") && (
          <Button size="sm" variant="outline" onClick={() => onAction("supersede", a)}>Supersede</Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// --------------------------------------------------------------- Panel

export default function CentralPaymentArrangementPanel({
  contextModule,
  debtorType,
  debtorId,
  debtorName,
  sourceRecords = [],
  defaultArrangementType,
  allowCreate = true,
  allowSupersede = true,
  allowLinkExisting = true,
  createLabelOverride,
  onArrangementCreated,
  onArrangementLinked,
}: CentralPaymentArrangementPanelProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const copy = COPY[contextModule];

  const bySource = useQuery({
    queryKey: ["core_pa", "bySource", contextModule, sourceRecords.map(s => s.recordId).join(",")],
    queryFn: () => getArrangementsBySourceRecord({
      legalCaseId: sourceRecords.find(s => s.legalCaseId)?.legalCaseId,
      legalActionId: sourceRecords.find(s => s.legalActionId)?.legalActionId,
      complianceCaseId: sourceRecords.find(s => s.complianceCaseId)?.complianceCaseId,
      benefitClaimId: sourceRecords.find(s => s.benefitClaimId)?.benefitClaimId,
      financeDebtId: sourceRecords.find(s => s.financeDebtId)?.financeDebtId,
      courtProceedingId: sourceRecords.find(s => s.courtProceedingId)?.courtProceedingId,
    }),
    enabled: sourceRecords.length > 0,
    staleTime: 30_000,
  });
  const byDebtor = useCoreArrangementsByDebtor(debtorId, debtorType);

  const linkedIds = useMemo(() => new Set((bySource.data ?? []).map(a => a.id)), [bySource.data]);
  const debtorOnly = useMemo(
    () => (byDebtor.data ?? []).filter(a => !linkedIds.has(a.id)),
    [byDebtor.data, linkedIds],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [supersedeFrom, setSupersedeFrom] = useState<CorePaymentArrangement | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["core_pa"] });
    bySource.refetch();
    byDebtor.refetch();
  };

  const activateMut = useMutation({
    mutationFn: (id: string) => activateArrangement(id),
    onSuccess: () => { toast({ title: "Activated" }); refresh(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const defaultMut = useMutation({
    mutationFn: (a: CorePaymentArrangement) => recordDefault(a.id, `Default marked from ${contextModule}`, contextModule),
    onSuccess: () => { toast({ title: "Marked as defaulted" }); refresh(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const handleAction = (kind: "activate" | "default" | "supersede" | "view", a: CorePaymentArrangement) => {
    if (kind === "view") setViewId(a.id);
    if (kind === "activate") activateMut.mutate(a.id);
    if (kind === "default") defaultMut.mutate(a);
    if (kind === "supersede") setSupersedeFrom(a);
  };

  const defaultedAny = [...(bySource.data ?? []), ...debtorOnly].find(a => a.status === "DEFAULTED");
  const ctxMod = contextModule === "LEGAL" ? "LEGAL" : contextModule === "COMPLIANCE" ? "COMPLIANCE" : contextModule === "BENEFITS" ? "BENEFITS" : "FINANCE";
  const activeFromCtx = (bySource.data ?? []).find(a => a.source_module_created_by === ctxMod && a.status === "ACTIVE");
  const presetType = defaultArrangementType ?? copy.defaultTypes[0];

  return (
    <div className="space-y-4">
      {!debtorId && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No debtor linked — debtor-wide arrangement view is unavailable.</AlertDescription>
        </Alert>
      )}

      {defaultedAny && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Defaulted arrangement on this debtor</AlertTitle>
          <AlertDescription>
            {defaultedAny.arrangement_no} ({defaultedAny.source_module_created_by}) is in default.
            Consider continuing under {contextModule} monitoring, superseding, or issuing a new arrangement.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{copy.linkedTitle}</CardTitle>
            <CardDescription>{copy.linkedDesc}</CardDescription>
          </div>
          <div className="flex gap-2">
            {allowLinkExisting && debtorId && (
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                <Link2 className="h-4 w-4 mr-1" /> Link Existing Arrangement
              </Button>
            )}
            {allowCreate && debtorId && (
              <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!!activeFromCtx}>
                <Plus className="h-4 w-4 mr-1" /> {createLabelOverride ?? copy.createBtn}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bySource.isLoading ? (
            <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
          ) : (bySource.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No arrangements linked to this {contextModule.toLowerCase()} context yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Arrangement</TableHead><TableHead>Origin</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Arranged</TableHead><TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead><TableHead>Period</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(bySource.data ?? []).map((a) => (
                  <ArrangementRow key={a.id} a={a} ctx={contextModule} canEdit={allowSupersede} onAction={handleAction} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {debtorId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CornerDownRight className="h-4 w-4" /> {copy.otherTitle}
            </CardTitle>
            <CardDescription>{copy.otherDesc} {debtorName ? `Debtor: ${debtorName}` : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            {byDebtor.isLoading ? (
              <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
            ) : debtorOnly.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other arrangements found for this debtor.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Arrangement</TableHead><TableHead>Origin</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Arranged</TableHead><TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead><TableHead>Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {debtorOnly.map((a) => (
                    <ArrangementRow key={a.id} a={a} ctx={contextModule} canEdit={allowSupersede} onAction={handleAction} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {debtorId && allowCreate && (
        <CreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          ctx={contextModule}
          debtorType={debtorType}
          debtorId={debtorId}
          debtorName={debtorName}
          sourceRecords={sourceRecords}
          presetType={presetType}
          onCreated={(a) => { refresh(); onArrangementCreated?.(a); }}
        />
      )}

      {debtorId && allowSupersede && supersedeFrom && (
        <CreateDialog
          open={!!supersedeFrom}
          onOpenChange={(v) => !v && setSupersedeFrom(null)}
          ctx={contextModule}
          debtorType={debtorType}
          debtorId={debtorId}
          debtorName={debtorName}
          sourceRecords={sourceRecords}
          presetType={supersedeFrom.status === "DEFAULTED" && contextModule === "LEGAL" ? "LEGAL_COURT_ORDERED" : presetType}
          supersedeFromId={supersedeFrom.id}
          onCreated={(a) => { setSupersedeFrom(null); refresh(); onArrangementCreated?.(a); }}
        />
      )}

      {debtorId && allowLinkExisting && (
        <LinkExistingDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          ctx={contextModule}
          debtorId={debtorId}
          debtorType={debtorType}
          sourceRecords={sourceRecords}
          onLinked={(id) => { refresh(); onArrangementLinked?.(id); }}
        />
      )}

      <DetailDialog
        arrangementId={viewId}
        open={!!viewId}
        onOpenChange={(v) => !v && setViewId(null)}
      />
    </div>
  );
}
