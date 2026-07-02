import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/common/PageShell";
import { LgDataGrid, type LgColumnDef, type LgRowAction } from "@/components/legal/grid";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Gavel, ShieldAlert, TrendingUp, Scale, FileWarning, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { formatDateForDisplay } from "@/lib/format-config";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import {
  listOrderWorkbench,
  type OrderWorkbenchRow,
  type OrderWorkbenchFilters,
} from "@/services/legal/lgJudicialOrderWorkbenchService";
import { LG_ORDER_STATUS_LABEL, LG_ORDER_STATUSES, LG_ORDER_COMPLIANCE_LABEL } from "@/services/legal/lgOrderStateMachine";
import { LG_ORDER_TYPES } from "@/types/legal/judicial";

/**
 * EPIC-06B — Judicial Orders Workbench.
 * Live data. Liability-aware rollups. No AI, no mock data.
 */
export default function LgJudicialOrdersWorkbench() {
  const navigate = useNavigate();
  const access = useLgAccess();

  const [filters, setFilters] = useState<OrderWorkbenchFilters>({});
  const [orderType, setOrderType] = useState("all");
  const [status, setStatus] = useState("all");
  const [compliance, setCompliance] = useState("all");
  const [appeal, setAppeal] = useState("all");
  const [enforcement, setEnforcement] = useState("all");
  const [highValue, setHighValue] = useState(false);

  useEffect(() => {
    setFilters({
      order_type: orderType !== "all" ? orderType : undefined,
      status: status !== "all" ? status : undefined,
      compliance_status: compliance !== "all" ? compliance : undefined,
      appeal_status: appeal !== "all" ? appeal : undefined,
      enforcement_status: enforcement !== "all" ? enforcement : undefined,
      high_value_only: highValue || undefined,
    });
  }, [orderType, status, compliance, appeal, enforcement, highValue]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["lg_judicial_orders_wb", filters],
    queryFn: () => listOrderWorkbench(filters),
    enabled: access.hasLegalAccess,
    staleTime: 30_000,
  });

  const rows = data?.rows ?? [];
  const kpis = data?.kpis;

  const columns: LgColumnDef<OrderWorkbenchRow>[] = useMemo(() => [
    { key: "order_no", header: "Order No", accessor: (r) => <span className="font-mono text-xs">{r.order_no}</span>, sortable: true },
    { key: "matter", header: "Matter", accessor: (r) => r.lg_case_no ?? "—", sortable: true },
    { key: "type", header: "Type", accessor: (r) => LG_ORDER_TYPES.find(t => t.code === r.order_type_code)?.label ?? r.order_type_code },
    { key: "court", header: "Court", accessor: (r) => r.issued_by_court ?? "—" },
    { key: "judge", header: "Judge", accessor: (r) => r.judge_name ?? "—" },
    { key: "issued", header: "Order Date", accessor: (r) => r.issued_date ? formatDateForDisplay(r.issued_date) : "—", sortable: true },
    { key: "due", header: "Compliance Due", accessor: (r) => r.compliance_date ? formatDateForDisplay(r.compliance_date) : "—" },
    { key: "appeal_deadline", header: "Appeal Deadline", accessor: (r) => r.appeal_deadline ? formatDateForDisplay(r.appeal_deadline) : "—" },
    { key: "amount", header: "Ordered", align: "right", accessor: (r) => r.ordered_amount != null ? `EC$${Number(r.ordered_amount).toLocaleString()}` : "—" },
    { key: "outstanding", header: "Outstanding", align: "right", accessor: (r) => r.liability_outstanding ? `EC$${Number(r.liability_outstanding).toLocaleString()}` : "—" },
    { key: "liab", header: "Liabilities", align: "right", accessor: (r) => r.liability_count ?? 0 },
    { key: "compliance", header: "Compliance", accessor: (r) => <Badge variant="outline">{LG_ORDER_COMPLIANCE_LABEL[(r.compliance_status ?? "NOT_STARTED") as keyof typeof LG_ORDER_COMPLIANCE_LABEL] ?? r.compliance_status ?? "—"}</Badge> },
    { key: "appeal", header: "Appeal", accessor: (r) => r.appeal_status && r.appeal_status !== "NONE" ? <Badge variant="secondary">{r.appeal_status}</Badge> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "enforcement", header: "Enforcement", accessor: (r) => r.enforcement_status && r.enforcement_status !== "NONE" ? <Badge variant="secondary">{r.enforcement_status}</Badge> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "recovery", header: "Recovered", align: "right", accessor: (r) => r.liability_paid ? `EC$${Number(r.liability_paid).toLocaleString()}` : "—" },
    { key: "officer", header: "Officer", accessor: (r) => r.assigned_officer ?? "—" },
    { key: "status", header: "Status", accessor: (r) => <Badge variant={r.status === "BREACHED" ? "destructive" : "outline"}>{LG_ORDER_STATUS_LABEL[r.status] ?? r.status}</Badge>, sortable: true },
    { key: "last", header: "Last Activity", accessor: (r) => r.updated_at ? formatDateForDisplay(r.updated_at) : "—" },
  ], []);

  const rowActions: LgRowAction<OrderWorkbenchRow>[] = [
    { key: "open", label: "Open Order", onClick: (r) => navigate(`/legal/lg/orders/${r.id}`) },
    { key: "matter", label: "Open Matter", onClick: (r) => navigate(`/legal/lg/cases/${r.lg_case_id}`) },
  ];

  return (
    <PageShell
      title="Judicial Orders & Judgments"
      description="Liability-aware order lifecycle: compliance, appeals and enforcement."
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
        <Kpi icon={<Gavel className="h-4 w-4" />} label="Active" value={kpis?.active ?? 0} />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Due for Compliance" value={kpis?.due_for_compliance ?? 0} />
        <Kpi icon={<ShieldAlert className="h-4 w-4 text-destructive" />} label="Breached" value={kpis?.breached ?? 0} />
        <Kpi icon={<Scale className="h-4 w-4" />} label="Under Appeal" value={kpis?.under_appeal ?? 0} />
        <Kpi icon={<FileWarning className="h-4 w-4" />} label="Pending Enforcement" value={kpis?.pending_enforcement ?? 0} />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Amount Ordered" value={`EC$${(kpis?.amount_ordered ?? 0).toLocaleString()}`} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Recovered" value={`EC$${(kpis?.amount_recovered ?? 0).toLocaleString()}`} />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Closing this Month" value={kpis?.closing_this_month ?? 0} />
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4 flex flex-wrap gap-2">
          <FilterSelect label="Type" value={orderType} onChange={setOrderType} options={[{ value: "all", label: "All types" }, ...LG_ORDER_TYPES.map(t => ({ value: t.code, label: t.label }))]} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, ...LG_ORDER_STATUSES.map(s => ({ value: s, label: LG_ORDER_STATUS_LABEL[s] }))]} />
          <FilterSelect label="Compliance" value={compliance} onChange={setCompliance} options={[
            { value: "all", label: "All" },
            { value: "NOT_STARTED", label: "Not Started" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "PARTIALLY_COMPLIED", label: "Partially Complied" },
            { value: "COMPLIED", label: "Complied" },
            { value: "BREACHED", label: "Breached" },
          ]} />
          <FilterSelect label="Appeal" value={appeal} onChange={setAppeal} options={[
            { value: "all", label: "All appeals" },
            { value: "FILED", label: "Filed" }, { value: "UNDER_REVIEW", label: "Under Review" },
            { value: "ALLOWED", label: "Allowed" }, { value: "DISMISSED", label: "Dismissed" },
          ]} />
          <FilterSelect label="Enforcement" value={enforcement} onChange={setEnforcement} options={[
            { value: "all", label: "All enforcement" },
            { value: "SUBMITTED", label: "Submitted" }, { value: "APPROVED", label: "Approved" },
            { value: "IN_PROGRESS", label: "In Progress" }, { value: "EXECUTED", label: "Executed" },
          ]} />
          <Button variant={highValue ? "default" : "outline"} size="sm" onClick={() => setHighValue(!highValue)}>High Value ≥ EC$10k</Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
        </CardContent>
      </Card>

      {isError && (
        <div className="border border-destructive/40 rounded p-4 text-sm text-destructive mb-4">
          Failed to load orders: {(error as any)?.message ?? "Unknown error"}
        </div>
      )}

      <LgDataGrid
        id="legal.judicial-orders.workbench"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        rowActions={rowActions}
        exportFilename="judicial-orders"
        searchPlaceholder="Search order no, matter, court, judge…"
        emptyMessage="No judicial orders match the current filters."
      />
    </PageShell>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-lg font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
