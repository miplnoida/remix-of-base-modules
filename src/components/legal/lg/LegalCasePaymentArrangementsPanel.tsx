// Cross-module Payment Arrangements panel for a Legal Case.
// Shows arrangements from all source modules (Compliance / Legal / Benefits / Finance)
// belonging to the same debtor (employer), plus those already linked via item.legal_case_id.
// Supports: Continue (link), Mark Default, Supersede with a Legal-originated arrangement,
// and Create New Legal arrangement (PRE_COURT / COURT_ORDERED / POST_JUDGMENT).

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Scale, ShieldAlert, CornerDownRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useCoreArrangementsByDebtor,
  useCoreArrangementsByLegalCase,
  useCoreArrangementDetail,
} from "@/hooks/core/useCorePaymentArrangements";
import {
  createArrangement,
  markDefault,
  supersedeArrangement,
  activateArrangement,
} from "@/services/core/corePaymentArrangementService";
import type {
  ArrangementFrequency,
  ArrangementType,
  CorePaymentArrangement,
  ArrangementStatus,
} from "@/types/corePaymentArrangement";

interface Props {
  lgCaseId: string;
  employerId?: string | null;
  employerName?: string | null;
  legalActionId?: string | null;
  canEdit: boolean;
}

const LEGAL_TYPE_OPTIONS: { value: ArrangementType; label: string }[] = [
  { value: "LEGAL_PRE_COURT", label: "Legal — Pre-Court Plan" },
  { value: "LEGAL_COURT_ORDERED", label: "Legal — Court-Ordered" },
  { value: "LEGAL_POST_JUDGMENT", label: "Legal — Post-Judgment" },
  { value: "ENFORCEMENT_PLAN", label: "Enforcement Plan" },
];

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

function NewLegalArrangementDialog({
  open,
  onOpenChange,
  lgCaseId,
  employerId,
  employerName,
  legalActionId,
  supersedeFromId,
  presetType,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lgCaseId: string;
  employerId?: string | null;
  employerName?: string | null;
  legalActionId?: string | null;
  supersedeFromId?: string | null;
  presetType?: ArrangementType;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [arrangementType, setArrangementType] = useState<ArrangementType>(presetType ?? "LEGAL_PRE_COURT");
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
      if (!employerId) throw new Error("Employer is required to create an arrangement.");
      if (total <= 0) throw new Error("Arranged amount must be greater than zero.");
      const baseInput = {
        debtor_type: "EMPLOYER" as const,
        debtor_id: employerId,
        debtor_name: employerName ?? null,
        source_module_created_by: "LEGAL" as const,
        arrangement_type: arrangementType,
        frequency,
        start_date: startDate,
        down_payment_amount: Number(downPayment || 0),
        number_of_installments: Number(numInstallments || 1),
        terms_text: terms || null,
        items: [
          {
            source_module: "LEGAL" as const,
            source_record_type: "CASE" as const,
            source_record_id: lgCaseId,
            source_reference_no: null,
            compliance_case_id: null,
            legal_case_id: lgCaseId,
            legal_action_id: legalActionId ?? null,
            court_proceeding_id: null,
            benefit_claim_id: null,
            finance_debt_id: null,
            liability_type: "SS" as const,
            period_from: null,
            period_to: null,
            principal_amount: Number(principal || 0),
            penalty_amount: Number(penalty || 0),
            cost_amount: Number(cost || 0),
            arranged_amount: total,
            notes: null,
          },
        ],
      };
      if (supersedeFromId) {
        return supersedeArrangement(supersedeFromId, baseInput, reason || "Superseded by Legal arrangement");
      }
      return createArrangement(baseInput);
    },
    onSuccess: () => {
      toast({ title: supersedeFromId ? "Arrangement superseded" : "Arrangement created" });
      onOpenChange(false);
      onCreated();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {supersedeFromId ? "Supersede with a Legal Arrangement" : "Create Legal Payment Arrangement"}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Arrangement Type *</Label>
              <Select value={arrangementType} onValueChange={(v) => setArrangementType(v as ArrangementType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEGAL_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
            <div>
              <Label>Start date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Number of installments *</Label>
              <Input type="number" min={1} value={numInstallments} onChange={(e) => setNumInstallments(e.target.value)} />
            </div>
            <div>
              <Label>Principal (SS)</Label>
              <Input type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
            </div>
            <div>
              <Label>Penalty</Label>
              <Input type="number" step="0.01" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
            </div>
            <div>
              <Label>Cost</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div>
              <Label>Down payment</Label>
              <Input type="number" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Terms / Notes</Label>
              <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
            {supersedeFromId && (
              <div className="md:col-span-2">
                <Label>Reason for supersession *</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Court order issued, terms renegotiated" />
              </div>
            )}
          </div>
          <Alert>
            <AlertTitle>Total arranged: {money(total)}</AlertTitle>
            <AlertDescription className="text-xs">
              The arrangement will be created in DRAFT and linked to this Legal Case. Approve to activate.
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

// --------------------------------------------------------------- Arrangement row + detail

function ArrangementRow({
  a,
  highlightSourceModule,
  canEdit,
  onAction,
}: {
  a: CorePaymentArrangement;
  highlightSourceModule?: string;
  canEdit: boolean;
  onAction: (kind: "activate" | "default" | "supersede" | "view", a: CorePaymentArrangement) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{a.arrangement_no}</div>
        <div className="text-xs text-muted-foreground">{a.arrangement_type.replace(/_/g, " ")}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={a.source_module_created_by === highlightSourceModule ? "border-primary" : ""}>
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

function ArrangementDetailDialog({
  arrangementId,
  open,
  onOpenChange,
}: {
  arrangementId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const detail = useCoreArrangementDetail(arrangementId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Arrangement Detail</DialogTitle>
        </DialogHeader>
        {detail.isLoading ? (
          <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : detail.data ? (
          <div className="space-y-4 text-sm">
            <div className="grid md:grid-cols-4 gap-3">
              <div><div className="text-xs text-muted-foreground">No.</div><div className="font-medium">{detail.data.arrangement.arrangement_no}</div></div>
              <div><div className="text-xs text-muted-foreground">Status</div><StatusBadge status={detail.data.arrangement.status} /></div>
              <div><div className="text-xs text-muted-foreground">Total</div><div>{money(detail.data.arrangement.total_arranged_amount)}</div></div>
              <div><div className="text-xs text-muted-foreground">Outstanding</div><div>{money(detail.data.arrangement.outstanding_balance)}</div></div>
            </div>

            <div>
              <div className="font-medium mb-1">Covered Liabilities</div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Source</TableHead><TableHead>Type</TableHead><TableHead>Ref</TableHead>
                  <TableHead className="text-right">Arranged</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead>
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
                      <TableCell>{i.installment_no}</TableCell>
                      <TableCell>{i.due_date}</TableCell>
                      <TableCell className="text-right">{money(i.due_amount)}</TableCell>
                      <TableCell className="text-right">{money(i.paid_amount)}</TableCell>
                      <TableCell>{i.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {detail.data.history.length > 0 && (
              <div>
                <div className="font-medium mb-1">Status History</div>
                <ul className="space-y-1 text-xs">
                  {detail.data.history.map((h) => (
                    <li key={h.id}>
                      <span className="font-mono">{new Date(h.performed_at).toLocaleString()}</span>
                      {" — "}{h.from_status ?? "—"} → <span className="font-medium">{h.to_status}</span>
                      {h.reason ? ` · ${h.reason}` : ""}
                      {h.performed_by ? ` · ${h.performed_by}` : ""}
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

// --------------------------------------------------------------- Main panel

export default function LegalCasePaymentArrangementsPanel({
  lgCaseId, employerId, employerName, legalActionId, canEdit,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const byCase = useCoreArrangementsByLegalCase(lgCaseId);
  const byDebtor = useCoreArrangementsByDebtor(employerId, "EMPLOYER");

  const linkedIds = useMemo(() => new Set((byCase.data ?? []).map((a) => a.id)), [byCase.data]);
  const debtorOnly = useMemo(
    () => (byDebtor.data ?? []).filter((a) => !linkedIds.has(a.id)),
    [byDebtor.data, linkedIds],
  );

  const [newOpen, setNewOpen] = useState(false);
  const [supersedeFrom, setSupersedeFrom] = useState<CorePaymentArrangement | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["core_pa"] });
    byCase.refetch();
    byDebtor.refetch();
  };

  const activateMut = useMutation({
    mutationFn: (id: string) => activateArrangement(id),
    onSuccess: () => { toast({ title: "Activated" }); refresh(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const defaultMut = useMutation({
    mutationFn: (a: CorePaymentArrangement) => markDefault(a.id, "Default marked from Legal case", "LEGAL"),
    onSuccess: () => { toast({ title: "Marked as defaulted" }); refresh(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const handleAction = (kind: "activate" | "default" | "supersede" | "view", a: CorePaymentArrangement) => {
    if (kind === "view") setViewId(a.id);
    if (kind === "activate") activateMut.mutate(a.id);
    if (kind === "default") defaultMut.mutate(a);
    if (kind === "supersede") setSupersedeFrom(a);
  };

  const activeLegal = (byCase.data ?? []).find((a) => a.source_module_created_by === "LEGAL" && a.status === "ACTIVE");
  const defaultedAny = [...(byCase.data ?? []), ...debtorOnly].find((a) => a.status === "DEFAULTED");

  return (
    <div className="space-y-4">
      {!employerId && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>This case is not linked to an employer — debtor-wide arrangement view is unavailable.</AlertDescription>
        </Alert>
      )}

      {defaultedAny && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Defaulted arrangement on this debtor</AlertTitle>
          <AlertDescription>
            {defaultedAny.arrangement_no} ({defaultedAny.source_module_created_by}) is in default.
            Consider continuing under Legal monitoring, superseding, or issuing a court-ordered plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Section 1: Arrangements linked to this Legal Case */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" /> Legal Case Arrangements</CardTitle>
            <CardDescription>Active and historical arrangements linked to this case.</CardDescription>
          </div>
          {canEdit && employerId && (
            <Button size="sm" onClick={() => setNewOpen(true)} disabled={!!activeLegal}>
              <Plus className="h-4 w-4 mr-1" /> New Legal Arrangement
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {byCase.isLoading ? (
            <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
          ) : (byCase.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No arrangements linked to this case yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Arrangement</TableHead><TableHead>Origin</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Arranged</TableHead><TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(byCase.data ?? []).map((a) => (
                  <ArrangementRow key={a.id} a={a} highlightSourceModule="LEGAL" canEdit={canEdit} onAction={handleAction} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Arrangements on debtor from other modules */}
      {employerId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CornerDownRight className="h-4 w-4" /> Other Arrangements for this Debtor
            </CardTitle>
            <CardDescription>
              Arrangements created by Compliance / Benefits / Finance for {employerName ?? employerId}.
              Legal may continue, supersede, or issue a new arrangement.
            </CardDescription>
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
                  <TableHead className="text-right">Outstanding</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {debtorOnly.map((a) => (
                    <ArrangementRow key={a.id} a={a} highlightSourceModule="LEGAL" canEdit={canEdit} onAction={handleAction} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <NewLegalArrangementDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        lgCaseId={lgCaseId}
        employerId={employerId}
        employerName={employerName}
        legalActionId={legalActionId}
        onCreated={refresh}
      />

      <NewLegalArrangementDialog
        open={!!supersedeFrom}
        onOpenChange={(v) => !v && setSupersedeFrom(null)}
        lgCaseId={lgCaseId}
        employerId={employerId}
        employerName={employerName}
        legalActionId={legalActionId}
        supersedeFromId={supersedeFrom?.id ?? null}
        presetType={supersedeFrom?.status === "DEFAULTED" ? "LEGAL_COURT_ORDERED" : "LEGAL_PRE_COURT"}
        onCreated={refresh}
      />

      <ArrangementDetailDialog
        arrangementId={viewId}
        open={!!viewId}
        onOpenChange={(v) => !v && setViewId(null)}
      />
    </div>
  );
}
