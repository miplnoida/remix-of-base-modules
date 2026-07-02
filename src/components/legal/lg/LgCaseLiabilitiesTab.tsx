/**
 * EPIC-06A — Recoverable Liabilities tab (Matter Workspace).
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Plus, GitMerge, Coins, Trash2, Loader2 } from "lucide-react";
import { LgDataGrid } from "@/components/legal/grid/LgDataGrid";
import type { LgColumnDef, LgRowAction } from "@/components/legal/grid/LgDataGrid";
import {
  useCaseLiabilities,
  useCaseLiabilityRollup,
  useCreateLiability,
  useDeleteLiability,
  useMergeLiabilities,
  useAllocatePayment,
} from "@/hooks/legal/useLgLiabilities";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useToast } from "@/hooks/use-toast";
import type { RecoverableLiability, LiabilityType, FundType, LiabilitySourceModule } from "@/types/legal/liability";
import { formatCurrency } from "@/utils/formatCurrency";

const FUND_OPTIONS: FundType[] = ["SOCIAL_SECURITY", "HOUSING", "SEVERANCE", "BENEFIT", "OTHER"];
const LIAB_TYPES: LiabilityType[] = [
  "SS_CONTRIB", "HOUSING_LEVY", "SEVERANCE", "BN_OVERPAYMENT", "PENSION_RECOVERY",
  "PENALTY", "INTEREST", "COURT_COST", "LEGAL_COST", "ADMIN_COST", "OTHER",
];
const SOURCES: LiabilitySourceModule[] = ["COMPLIANCE", "ER", "BENEFITS", "FINANCE", "AUDIT", "FRAUD", "MANUAL", "OTHER"];

const money = (n: number | string | null | undefined) => formatCurrency(Number(n ?? 0));

export function LgCaseLiabilitiesTab({ caseId }: { caseId: string }) {
  const access = useLgAccess();
  const { toast } = useToast();
  const liab = useCaseLiabilities(caseId);
  const rollup = useCaseLiabilityRollup(caseId);
  const create = useCreateLiability(caseId);
  const del = useDeleteLiability(caseId);
  const merge = useMergeLiabilities(caseId);
  const allocate = useAllocatePayment(caseId);

  const [addOpen, setAddOpen] = useState(false);
  const [allocateFor, setAllocateFor] = useState<RecoverableLiability | null>(null);
  const [fundFilter, setFundFilter] = useState<string>("__all");

  const rows = useMemo(() => {
    const list = liab.data ?? [];
    return fundFilter === "__all" ? list : list.filter((r) => (r.fund_type ?? "") === fundFilter);
  }, [liab.data, fundFilter]);

  const canWrite = access.can("editCase") || access.isAdmin;

  const columns: LgColumnDef<RecoverableLiability>[] = useMemo(() => ([
    { id: "liability_type", header: "Liability", accessorKey: "liability_type", meta: { label: "Liability", pinLeft: true } },
    { id: "fund_type", header: "Fund", accessorFn: (r) => r.fund_type ?? "—", meta: { label: "Fund" } },
    {
      id: "period", header: "Contribution Period", meta: { label: "Period" },
      accessorFn: (r) => r.contribution_period_from
        ? `${r.contribution_period_from}${r.contribution_period_to ? ` → ${r.contribution_period_to}` : ""}`
        : "—",
    },
    { id: "source", header: "Source", accessorKey: "source_module", meta: { label: "Source" } },
    { id: "principal", header: "Principal", meta: { label: "Principal", align: "right" },
      accessorFn: (r) => Number(r.principal), cell: ({ row }) => money(row.original.principal) },
    { id: "interest", header: "Interest", meta: { label: "Interest", align: "right" },
      accessorFn: (r) => Number(r.interest), cell: ({ row }) => money(row.original.interest) },
    { id: "penalty", header: "Penalty", meta: { label: "Penalty", align: "right" },
      accessorFn: (r) => Number(r.penalty), cell: ({ row }) => money(row.original.penalty) },
    { id: "court_cost", header: "Court", meta: { label: "Court Cost", align: "right" },
      accessorFn: (r) => Number(r.court_cost), cell: ({ row }) => money(row.original.court_cost) },
    { id: "legal_cost", header: "Legal", meta: { label: "Legal Cost", align: "right" },
      accessorFn: (r) => Number(r.legal_cost), cell: ({ row }) => money(row.original.legal_cost) },
    { id: "other_cost", header: "Other", meta: { label: "Other Cost", align: "right" },
      accessorFn: (r) => Number(r.other_cost), cell: ({ row }) => money(row.original.other_cost) },
    { id: "total", header: "Total", meta: { label: "Total", align: "right" },
      accessorFn: (r) => Number(r.total_assessed), cell: ({ row }) => <strong>{money(row.original.total_assessed)}</strong> },
    { id: "paid", header: "Paid", meta: { label: "Paid", align: "right" },
      accessorFn: (r) => Number(r.paid), cell: ({ row }) => money(row.original.paid) },
    { id: "outstanding", header: "Outstanding", meta: { label: "Outstanding", align: "right" },
      accessorFn: (r) => Number(r.outstanding), cell: ({ row }) => money(row.original.outstanding) },
    {
      id: "recovery_pct", header: "Recovery %", meta: { label: "Recovery %", align: "right" },
      accessorFn: (r) => Number(r.total_assessed) > 0 ? (Number(r.paid) / Number(r.total_assessed)) * 100 : 0,
      cell: ({ row }) => {
        const r = row.original;
        return Number(r.total_assessed) > 0
          ? `${((Number(r.paid) / Number(r.total_assessed)) * 100).toFixed(1)}%`
          : "—";
      },
    },
    { id: "recovery_status", header: "Recovery", meta: { label: "Recovery" },
      accessorKey: "recovery_status",
      cell: ({ row }) => <Badge variant="outline">{row.original.recovery_status}</Badge> },
    { id: "legal_status", header: "Legal", meta: { label: "Legal Status" },
      accessorKey: "legal_status",
      cell: ({ row }) => <Badge variant="secondary">{row.original.legal_status}</Badge> },
    { id: "risk", header: "Risk", meta: { label: "Risk" },
      accessorFn: (r) => r.risk_level ?? "",
      cell: ({ row }) => {
        const r = row.original.risk_level;
        return r ? <Badge variant={r === "CRITICAL" ? "destructive" : "outline"}>{r}</Badge> : "—";
      } },
    { id: "limitation", header: "Limitation", meta: { label: "Limitation" }, accessorFn: (r) => r.limitation_date ?? "—" },
    { id: "status", header: "Status", meta: { label: "Status" }, accessorKey: "status",
      cell: ({ row }) => <Badge>{row.original.status}</Badge> },
  ]), []);

  const rowActions: LgRowAction<RecoverableLiability>[] | undefined = canWrite ? [
    {
      key: "allocate", label: "Allocate payment", icon: <Coins className="h-4 w-4" />,
      onClick: (r) => setAllocateFor(r),
      hidden: (r) => r.status !== "ACTIVE" || Number(r.outstanding) <= 0,
    },
    {
      key: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" />, variant: "destructive",
      onClick: (r) => {
        if (!confirm("Delete this liability?")) return;
        del.mutate(r.id);
      },
    },
  ] : undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Liabilities" value={rollup.data?.count ?? 0} sub={`${rollup.data?.activeCount ?? 0} active`} />
        <KpiCard label="Total Assessed" value={money(rollup.data?.totalAssessed ?? 0)} />
        <KpiCard label="Paid" value={money(rollup.data?.totalPaid ?? 0)} />
        <KpiCard label="Outstanding" value={money(rollup.data?.totalOutstanding ?? 0)} />
        <KpiCard label="Recovery %" value={`${(rollup.data?.recoveryPct ?? 0).toFixed(1)}%`}
          extra={<Progress value={rollup.data?.recoveryPct ?? 0} className="mt-2 h-1.5" />} />
      </div>

      {(rollup.data?.nearingLimitation.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          {rollup.data!.nearingLimitation.length} liabilit{rollup.data!.nearingLimitation.length === 1 ? "y is" : "ies are"} within 90 days of limitation.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recoverable Liabilities</CardTitle>
            <CardDescription>All amounts the Board is recovering under this matter.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48">
              <Select value={fundFilter} onValueChange={setFundFilter}>
                <SelectTrigger><SelectValue placeholder="All funds" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All funds</SelectItem>
                  {FUND_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!canWrite} onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Liability
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LgDataGrid
            id="case-liabilities"
            columns={columns}
            data={rows}
            isLoading={liab.isLoading}
            emptyMessage="No recoverable liabilities on this matter yet. Add one manually or create the matter from a source module."
            getRowId={(r) => r.id}
            rowActions={rowActions}
            bulkActions={canWrite ? [{
              key: "merge",
              label: "Merge selected",
              icon: <GitMerge className="h-4 w-4" />,
              disabled: (rs) => rs.length < 2,
              onClick: (rs) => merge.mutate({ ids: rs.map((r) => r.id) }, {
                onSuccess: () => toast({ title: "Liabilities merged" }),
                onError: (e: any) => toast({ title: "Merge failed", description: e.message, variant: "destructive" }),
              }),
            }] : undefined}
          />
        </CardContent>
      </Card>

      {addOpen && (
        <AddLiabilityDialog
          caseId={caseId}
          onClose={() => setAddOpen(false)}
          onSubmit={(input) => create.mutate(input, {
            onSuccess: () => { setAddOpen(false); toast({ title: "Liability added" }); },
            onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
          })}
          submitting={create.isPending}
        />
      )}

      {allocateFor && (
        <AllocateDialog
          liability={allocateFor}
          onClose={() => setAllocateFor(null)}
          submitting={allocate.isPending}
          onSubmit={(args) => allocate.mutate({ liabilityId: allocateFor.id, ...args }, {
            onSuccess: () => { setAllocateFor(null); toast({ title: "Allocation recorded" }); },
            onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
          })}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, extra }: { label: string; value: React.ReactNode; sub?: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {extra}
    </div>
  );
}

function AddLiabilityDialog({
  caseId, onClose, onSubmit, submitting,
}: {
  caseId: string;
  onClose: () => void;
  onSubmit: (v: any) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState({
    source_module: "MANUAL" as LiabilitySourceModule,
    liability_type: "SS_CONTRIB" as LiabilityType,
    fund_type: "SOCIAL_SECURITY" as FundType,
    principal: "0", interest: "0", penalty: "0",
    court_cost: "0", legal_cost: "0", other_cost: "0",
    contribution_period_from: "",
    contribution_period_to: "",
    statutory_basis: "",
    source_reference: "",
    remarks: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Recoverable Liability</DialogTitle>
          <DialogDescription>Amounts entered here will be validated against the matter's rollup.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source module">
            <Select value={form.source_module} onValueChange={(v) => set("source_module", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Liability type">
            <Select value={form.liability_type} onValueChange={(v) => set("liability_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LIAB_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Fund">
            <Select value={form.fund_type} onValueChange={(v) => set("fund_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUND_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Statutory basis">
            <Input value={form.statutory_basis} onChange={(e) => set("statutory_basis", e.target.value)} />
          </Field>
          <Field label="Contribution period from">
            <Input type="date" value={form.contribution_period_from} onChange={(e) => set("contribution_period_from", e.target.value)} />
          </Field>
          <Field label="Contribution period to">
            <Input type="date" value={form.contribution_period_to} onChange={(e) => set("contribution_period_to", e.target.value)} />
          </Field>
          {(["principal", "interest", "penalty", "court_cost", "legal_cost", "other_cost"] as const).map((k) => (
            <Field key={k} label={k.replace("_", " ")}>
              <Input type="number" step="0.01" min="0" value={(form as any)[k]} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
          <Field label="Source reference" full>
            <Input value={form.source_reference} onChange={(e) => set("source_reference", e.target.value)} />
          </Field>
          <Field label="Remarks" full>
            <Textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={submitting} onClick={() => onSubmit({
            lg_case_id: caseId,
            source_module: form.source_module,
            liability_type: form.liability_type,
            fund_type: form.fund_type,
            statutory_basis: form.statutory_basis || null,
            contribution_period_from: form.contribution_period_from || null,
            contribution_period_to: form.contribution_period_to || null,
            principal: Number(form.principal) || 0,
            interest: Number(form.interest) || 0,
            penalty: Number(form.penalty) || 0,
            court_cost: Number(form.court_cost) || 0,
            legal_cost: Number(form.legal_cost) || 0,
            other_cost: Number(form.other_cost) || 0,
            source_reference: form.source_reference || null,
            remarks: form.remarks || null,
          })}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add liability"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AllocateDialog({
  liability, onClose, onSubmit, submitting,
}: {
  liability: RecoverableLiability;
  onClose: () => void;
  onSubmit: (v: {
    payment_id: string; payment_ref?: string; payment_date?: string;
    allocated_amount: number; component?: string; allocation_rule?: string; remarks?: string;
  }) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState({
    payment_id: "", payment_ref: "", payment_date: new Date().toISOString().slice(0, 10),
    allocated_amount: "0", component: "PRINCIPAL", allocation_rule: "MANUAL", remarks: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate Payment</DialogTitle>
          <DialogDescription>Outstanding: {money(liability.outstanding)}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment id"><Input value={form.payment_id} onChange={(e) => set("payment_id", e.target.value)} /></Field>
          <Field label="Payment ref"><Input value={form.payment_ref} onChange={(e) => set("payment_ref", e.target.value)} /></Field>
          <Field label="Payment date"><Input type="date" value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} /></Field>
          <Field label="Amount">
            <Input type="number" step="0.01" min="0.01" max={String(liability.outstanding)}
              value={form.allocated_amount} onChange={(e) => set("allocated_amount", e.target.value)} />
          </Field>
          <Field label="Component">
            <Select value={form.component} onValueChange={(v) => set("component", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PRINCIPAL","INTEREST","PENALTY","COURT_COST","LEGAL_COST","OTHER"].map((c) =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Allocation rule">
            <Select value={form.allocation_rule} onValueChange={(v) => set("allocation_rule", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PRINCIPAL_FIRST","INTEREST_FIRST","PENALTY_FIRST","OLDEST_FIRST","MANUAL"].map((c) =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Remarks" full><Textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={submitting || !form.payment_id || Number(form.allocated_amount) <= 0}
            onClick={() => onSubmit({
              payment_id: form.payment_id,
              payment_ref: form.payment_ref || undefined,
              payment_date: form.payment_date || undefined,
              allocated_amount: Number(form.allocated_amount),
              component: form.component,
              allocation_rule: form.allocation_rule,
              remarks: form.remarks || undefined,
            })}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allocate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
