import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Loader2, Plus, Pencil, X, Link2, Gavel, ListPlus, ExternalLink } from "lucide-react";
import ChildActionDrawer from "@/components/legal/lg/actions/ChildActionDrawer";
import {
  useLgCaseActions,
  useCreateCaseActions,
  useUpdateCaseAction,
  useCloseCaseAction,
  useProposedEmployerDues,
} from "@/hooks/legal/useLgCaseActions";
import {
  BENEFIT_ACTION_LABEL,
  LIABILITY_HEAD_LABEL,
  type BenefitActionType,
  type LgCaseAction,
  type LiabilityHeadCode,
} from "@/services/legal/lgCaseActionService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  caseId: string;
  caseData: any;
  canEdit: boolean;
}

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusVariant(status: string) {
  if (status === "CLOSED" || status === "WITHDRAWN") return "secondary" as const;
  if (status === "SETTLED") return "outline" as const;
  return "default" as const;
}

const CaseActionsPanel: React.FC<Props> = ({ caseId, caseData, canEdit }) => {
  const { data: actions, isLoading } = useLgCaseActions(caseId);
  const createMut = useCreateCaseActions(caseId);
  const updateMut = useUpdateCaseAction(caseId);
  const closeMut = useCloseCaseAction(caseId);
  const { toast } = useToast();

  const isBenefit =
    !caseData?.employer_id ||
    String(caseData?.case_type_code ?? "").toUpperCase().includes("BENEFIT") ||
    !!caseData?.person_id;

  const [proposeOpen, setProposeOpen] = useState(false);
  const [benefitOpen, setBenefitOpen] = useState(false);
  const [editing, setEditing] = useState<LgCaseAction | null>(null);
  const [drawerAction, setDrawerAction] = useState<LgCaseAction | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">{isBenefit ? "Case Actions" : "Liability Actions"}</h3>
          <p className="text-xs text-muted-foreground">
            {isBenefit
              ? "One sub-action per matter nature (appeal, overpayment, etc.)"
              : "One sub-action per outstanding liability head (SS, Levy, Severance, Penalties, Costs, Fees)."}
          </p>
        </div>
        <div className="flex gap-2">
          {!isBenefit && (
            <Button size="sm" onClick={() => setProposeOpen(true)} disabled={!canEdit}>
              <ListPlus className="h-4 w-4 mr-1" /> Propose from Dues
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => (isBenefit ? setBenefitOpen(true) : setEditing({} as LgCaseAction))}
            disabled={!canEdit}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Action
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading actions…
        </div>
      ) : (actions ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No actions yet. {!isBenefit && "Use \"Propose from Dues\" to generate per-liability actions from outstanding balances."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(actions ?? []).map((a) => (
            <Card key={a.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                      <span className="font-medium">
                        {a.action_kind === "LIABILITY"
                          ? LIABILITY_HEAD_LABEL[a.liability_head_code as LiabilityHeadCode] ?? a.liability_head_code
                          : BENEFIT_ACTION_LABEL[a.benefit_action_type as BenefitActionType] ?? a.benefit_action_type}
                      </span>
                      {a.period_from && (
                        <span className="text-xs text-muted-foreground">
                          {a.period_from}{a.period_to && a.period_to !== a.period_from ? ` → ${a.period_to}` : ""}
                        </span>
                      )}
                    </div>
                    {a.action_kind === "LIABILITY" ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-xs">
                        <div><span className="text-muted-foreground">Principal:</span> {fmt(a.principal_amount)}</div>
                        <div><span className="text-muted-foreground">Penalty:</span> {fmt(a.penalty_amount)}</div>
                        <div><span className="text-muted-foreground">Cost:</span> {fmt(a.cost_amount)}</div>
                        <div><span className="text-muted-foreground">Paid:</span> {fmt(a.amount_paid)}</div>
                        <div className="font-semibold"><span className="text-muted-foreground">Outstanding:</span> {fmt(a.outstanding_amount)}</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                        <div><span className="text-muted-foreground">Benefit:</span> {a.benefit_type ?? "—"}</div>
                        <div><span className="text-muted-foreground">Claim:</span> {a.claim_id ?? "—"}</div>
                        <div><span className="text-muted-foreground">Overpayment:</span> {fmt(a.overpayment_amount ?? 0)}</div>
                        <div><span className="text-muted-foreground">Paid:</span> {fmt(a.amount_paid)}</div>
                      </div>
                    )}
                    {(a.suit_no || a.judgment_summons_no || a.writ_no || a.warrant_no) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                        {a.suit_no && <div><span className="text-muted-foreground">Suit#:</span> {a.suit_no}</div>}
                        {a.judgment_summons_no && <div><span className="text-muted-foreground">J/S#:</span> {a.judgment_summons_no}</div>}
                        {a.writ_no && <div><span className="text-muted-foreground">Writ#:</span> {a.writ_no}</div>}
                        {a.warrant_no && <div><span className="text-muted-foreground">Warrant#:</span> {a.warrant_no}</div>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)} disabled={!canEdit}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {a.status !== "CLOSED" && a.status !== "WITHDRAWN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => closeMut.mutate(a.id, {
                          onSuccess: () => toast({ title: "Action closed" }),
                          onError: (e: any) => toast({ title: "Close failed", description: e.message, variant: "destructive" }),
                        })}
                        disabled={!canEdit || closeMut.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Close
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProposeDuesDialog
        open={proposeOpen}
        onOpenChange={setProposeOpen}
        caseId={caseId}
        caseData={caseData}
        onAccept={async (rows) => {
          await createMut.mutateAsync(rows);
          toast({ title: `Created ${rows.length} action(s)` });
          setProposeOpen(false);
        }}
      />

      <BenefitActionDialog
        open={benefitOpen}
        onOpenChange={setBenefitOpen}
        caseId={caseId}
        caseData={caseData}
        onCreate={async (row) => {
          await createMut.mutateAsync([row]);
          toast({ title: "Benefit action added" });
          setBenefitOpen(false);
        }}
      />

      <EditActionDialog
        action={editing}
        onClose={() => setEditing(null)}
        caseId={caseId}
        onSave={async (patch) => {
          if (editing && editing.id) {
            await updateMut.mutateAsync({ id: editing.id, patch });
            toast({ title: "Action updated" });
          } else {
            await createMut.mutateAsync([
              {
                case_id: caseId,
                action_kind: "LIABILITY",
                ...patch,
              } as any,
            ]);
            toast({ title: "Action created" });
          }
          setEditing(null);
        }}
      />
    </div>
  );
};

/* ---------------------- Propose from Dues ---------------------- */

const ProposeDuesDialog: React.FC<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
  caseData: any;
  onAccept: (rows: any[]) => Promise<void>;
}> = ({ open, onOpenChange, caseId, caseData, onAccept }) => {
  const { data, isLoading } = useProposedEmployerDues(
    caseData?.employer_id,
    caseData?.employer_account_no ?? null,
  );
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open && data) {
      const all: Record<number, boolean> = {};
      data.forEach((_, i) => (all[i] = true));
      setPicked(all);
    }
  }, [open, data]);

  const handleAccept = async () => {
    if (!data) return;
    const rows = data
      .filter((_, i) => picked[i])
      .map((r) => ({
        case_id: caseId,
        action_kind: "LIABILITY" as const,
        liability_head_code: r.liability_head_code,
        period_from: r.period_from,
        period_to: r.period_to,
        principal_amount: r.principal_amount,
        penalty_amount: r.penalty_amount,
        cost_amount: r.cost_amount,
        amount_paid: r.amount_paid,
        total_amount: r.principal_amount + r.penalty_amount + r.cost_amount,
        outstanding_amount: r.outstanding_amount,
        status: "OPEN" as const,
        stage: "OPEN",
      }));
    if (rows.length === 0) return;
    setSaving(true);
    try {
      await onAccept(rows);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Propose Liability Actions from Outstanding Dues</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Reading dues…</div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No outstanding dues found for this employer.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto space-y-1">
            <div className="grid grid-cols-[24px_1fr_120px_100px_100px_100px_120px] gap-2 text-xs font-medium px-2 py-1 border-b">
              <span></span>
              <span>Liability Head</span>
              <span>Period</span>
              <span className="text-right">Principal</span>
              <span className="text-right">Penalty</span>
              <span className="text-right">Cost</span>
              <span className="text-right">Outstanding</span>
            </div>
            {(data ?? []).map((r, i) => (
              <label key={i} className="grid grid-cols-[24px_1fr_120px_100px_100px_100px_120px] gap-2 text-xs px-2 py-1 items-center hover:bg-muted/50 rounded cursor-pointer">
                <Checkbox checked={!!picked[i]} onCheckedChange={(v) => setPicked((p) => ({ ...p, [i]: !!v }))} />
                <span>{LIABILITY_HEAD_LABEL[r.liability_head_code]}</span>
                <span>{r.period_from ?? "—"}</span>
                <span className="text-right">{fmt(r.principal_amount)}</span>
                <span className="text-right">{fmt(r.penalty_amount)}</span>
                <span className="text-right">{fmt(r.cost_amount)}</span>
                <span className="text-right font-semibold">{fmt(r.outstanding_amount)}</span>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAccept} disabled={saving || !(data ?? []).some((_, i) => picked[i])}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create Selected Actions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------------- Benefit Action ---------------------- */

const BENEFIT_TYPES: BenefitActionType[] = [
  "BENEFIT_APPEAL",
  "OVERPAYMENT_RECOVERY",
  "FRAUD_REVIEW",
  "ESTATE_RECOVERY",
  "ELIGIBILITY_DISPUTE",
];

const BenefitActionDialog: React.FC<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
  caseData: any;
  onCreate: (row: any) => Promise<void>;
}> = ({ open, onOpenChange, caseId, caseData, onCreate }) => {
  const [type, setType] = useState<BenefitActionType>("BENEFIT_APPEAL");
  const [benefitType, setBenefitType] = useState("");
  const [overpayment, setOverpayment] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onCreate({
        case_id: caseId,
        action_kind: "BENEFIT",
        benefit_action_type: type,
        benefit_type: benefitType || null,
        overpayment_amount: overpayment ? Number(overpayment) : null,
        insured_person_id: caseData?.person_id ?? null,
        status: "OPEN",
        stage: "OPEN",
        notes: notes || null,
      });
      setType("BENEFIT_APPEAL"); setBenefitType(""); setOverpayment(""); setNotes("");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Benefit Action</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Action Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BenefitActionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BENEFIT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{BENEFIT_ACTION_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Benefit Type (optional)</Label>
            <Input value={benefitType} onChange={(e) => setBenefitType(e.target.value)} placeholder="e.g. Sickness, Pension" />
          </div>
          {type === "OVERPAYMENT_RECOVERY" && (
            <div>
              <Label>Overpayment Amount</Label>
              <Input type="number" step="0.01" value={overpayment} onChange={(e) => setOverpayment(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------------- Edit Action ---------------------- */

const LIABILITY_HEADS: LiabilityHeadCode[] = [
  "SS_CONTRIBUTION","SS_PENALTY",
  "HSD_LEVY_CONTRIBUTION","HSD_LEVY_PENALTY",
  "SEVERANCE_CONTRIBUTION","SEVERANCE_PENALTY",
  "COURT_COST","LEGAL_FEE",
];

const EditActionDialog: React.FC<{
  action: LgCaseAction | null;
  caseId: string;
  onClose: () => void;
  onSave: (patch: Partial<LgCaseAction>) => Promise<void>;
}> = ({ action, onClose, onSave }) => {
  const open = action !== null;
  const isCreate = open && !action?.id;
  const a: any = action ?? {};
  const [form, setForm] = useState<any>({});
  React.useEffect(() => {
    if (open) {
      setForm({
        liability_head_code: a.liability_head_code ?? "SS_CONTRIBUTION",
        period_from: a.period_from ?? "",
        period_to: a.period_to ?? "",
        principal_amount: a.principal_amount ?? 0,
        penalty_amount: a.penalty_amount ?? 0,
        cost_amount: a.cost_amount ?? 0,
        amount_paid: a.amount_paid ?? 0,
        suit_no: a.suit_no ?? "",
        judgment_summons_no: a.judgment_summons_no ?? "",
        writ_no: a.writ_no ?? "",
        warrant_no: a.warrant_no ?? "",
        status: a.status ?? "OPEN",
        notes: a.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.id, open]);

  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const patch: any = { ...form };
      patch.principal_amount = Number(patch.principal_amount || 0);
      patch.penalty_amount = Number(patch.penalty_amount || 0);
      patch.cost_amount = Number(patch.cost_amount || 0);
      patch.amount_paid = Number(patch.amount_paid || 0);
      if (!patch.period_from) patch.period_from = null;
      if (!patch.period_to) patch.period_to = null;
      Object.keys(patch).forEach((k) => { if (patch[k] === "") patch[k] = null; });
      await onSave(patch);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isCreate ? "Add Liability Action" : "Edit Action"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Liability Head</Label>
            <Select value={form.liability_head_code} onValueChange={(v) => setForm((f: any) => ({ ...f, liability_head_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIABILITY_HEADS.map((h) => <SelectItem key={h} value={h}>{LIABILITY_HEAD_LABEL[h]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OPEN","IN_PROGRESS","SETTLED","CLOSED","WITHDRAWN"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Period From</Label><Input type="date" value={form.period_from ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, period_from: e.target.value }))} /></div>
          <div><Label>Period To</Label><Input type="date" value={form.period_to ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, period_to: e.target.value }))} /></div>
          <div><Label>Principal</Label><Input type="number" step="0.01" value={form.principal_amount} onChange={(e) => setForm((f: any) => ({ ...f, principal_amount: e.target.value }))} /></div>
          <div><Label>Penalty</Label><Input type="number" step="0.01" value={form.penalty_amount} onChange={(e) => setForm((f: any) => ({ ...f, penalty_amount: e.target.value }))} /></div>
          <div><Label>Cost</Label><Input type="number" step="0.01" value={form.cost_amount} onChange={(e) => setForm((f: any) => ({ ...f, cost_amount: e.target.value }))} /></div>
          <div><Label>Paid</Label><Input type="number" step="0.01" value={form.amount_paid} onChange={(e) => setForm((f: any) => ({ ...f, amount_paid: e.target.value }))} /></div>
          <div><Label>Suit #</Label><Input value={form.suit_no} onChange={(e) => setForm((f: any) => ({ ...f, suit_no: e.target.value }))} /></div>
          <div><Label>Judgment Summons #</Label><Input value={form.judgment_summons_no} onChange={(e) => setForm((f: any) => ({ ...f, judgment_summons_no: e.target.value }))} /></div>
          <div><Label>Writ #</Label><Input value={form.writ_no} onChange={(e) => setForm((f: any) => ({ ...f, writ_no: e.target.value }))} /></div>
          <div><Label>Warrant / Commitment #</Label><Input value={form.warrant_no} onChange={(e) => setForm((f: any) => ({ ...f, warrant_no: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} {isCreate ? "Create" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaseActionsPanel;

/* unused helper imports kept for future use */
void Gavel; void Link2; void TooltipProvider; void Tooltip; void TooltipContent; void TooltipTrigger;
