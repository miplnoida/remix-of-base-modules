import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoveryWorkbench } from "@/hooks/legal/useRecoveryWorkbench";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { PageShell } from "@/components/common/PageShell";
import {
  LgDataGrid,
  LgStatusBadge,
  type LgColumnDef,
  type LgRowAction,
  type LgToolbarFilter,
  type LgSummaryChip,
} from "@/components/legal/grid";
import { Eye, Wallet } from "lucide-react";
import { formatDateForDisplay } from "@/lib/format-config";
import type { RecoveryWorkbenchRow } from "@/services/legal/lgRecoveryWorkbenchService";
import { Badge } from "@/components/ui/badge";

/**
 * EPIC-02 — Legal Recovery Workbench.
 * Primary operational workspace for SSB Legal officers/managers.
 * Live data only (see docs/legal/EPIC-02-LEGAL-RECOVERY-WORKBENCH.md).
 */

const AGEING_BUCKETS: { value: string; label: string }[] = [
  { value: "all", label: "All ageing" },
  { value: "0-30", label: "0–30 days" },
  { value: "31-60", label: "31–60 days" },
  { value: "61-90", label: "61–90 days" },
  { value: "91-180", label: "91–180 days" },
  { value: "180+", label: "180+ days" },
];

const num = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export default function LgRecoveryWorkbench() {
  const navigate = useNavigate();
  const access = useLgAccess();
  const { data: rows = [], isLoading, isError, error } = useRecoveryWorkbench();

  const [ageing, setAgeing] = useState("all");
  const [officer, setOfficer] = useState("all");
  const [territory, setTerritory] = useState("all");
  const [status, setStatus] = useState("all");
  const [recoveryType, setRecoveryType] = useState("all");
  const [partyType, setPartyType] = useState("all");
  const [arrangement, setArrangement] = useState("all");
  const [breach, setBreach] = useState("all");

  const uniques = useMemo(() => {
    const u = (key: keyof RecoveryWorkbenchRow) =>
      Array.from(
        new Set(rows.map((r) => (r[key] as string) ?? "").filter((v) => v !== "")),
      ).sort();
    return {
      officers: u("assigned_officer_name"),
      territories: u("territory"),
      statuses: u("legal_status"),
      recoveryTypes: u("recovery_type"),
      partyTypes: u("party_type"),
      arrangements: u("arrangement_status"),
      breaches: u("breach_status"),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (ageing !== "all" && r.ageing_bucket !== ageing) return false;
      if (officer !== "all" && (r.assigned_officer_name ?? "") !== officer) return false;
      if (territory !== "all" && (r.territory ?? "") !== territory) return false;
      if (status !== "all" && (r.legal_status ?? "") !== status) return false;
      if (recoveryType !== "all" && (r.recovery_type ?? "") !== recoveryType) return false;
      if (partyType !== "all" && (r.party_type ?? "") !== partyType) return false;
      if (arrangement !== "all" && r.arrangement_status !== arrangement) return false;
      if (breach !== "all" && r.breach_status !== breach) return false;
      return true;
    });
  }, [rows, ageing, officer, territory, status, recoveryType, partyType, arrangement, breach]);

  const totals = useMemo(() => {
    const totalRecoverable = filtered.reduce((s, r) => s + r.total_recoverable, 0);
    const totalPaid = filtered.reduce((s, r) => s + r.total_paid, 0);
    const outstanding = filtered.reduce((s, r) => s + r.outstanding_balance, 0);
    const recoveryPct = totalRecoverable > 0 ? (totalPaid / totalRecoverable) * 100 : 0;
    const overdue = filtered.filter(
      (r) => r.next_action_date && new Date(r.next_action_date) < new Date(),
    ).length;
    const breached = filtered.filter((r) => r.breach_status === "YES").length;
    const hearingsDue = filtered.filter(
      (r) => r.next_hearing_date && new Date(r.next_hearing_date) >= new Date(),
    ).length;
    const awaitingAction = filtered.filter((r) => r.sla_status === "AT_RISK" || r.sla_status === "OVERDUE").length;
    return { totalRecoverable, totalPaid, outstanding, recoveryPct, overdue, breached, hearingsDue, awaitingAction };
  }, [filtered]);

  const summary: LgSummaryChip[] = [
    { label: "Total Recoverable", value: num(totals.totalRecoverable), tone: "info" },
    { label: "Total Outstanding", value: num(totals.outstanding), tone: "danger" },
    { label: "Total Recovered", value: num(totals.totalPaid), tone: "success" },
    { label: "Recovery %", value: `${totals.recoveryPct.toFixed(1)}%`, tone: "info" },
    { label: "Overdue Matters", value: totals.overdue, tone: totals.overdue ? "warning" : "muted" },
    { label: "Breached Arrangements", value: totals.breached, tone: totals.breached ? "danger" : "muted" },
    { label: "Hearings Due", value: totals.hearingsDue, tone: "info" },
    { label: "Cases Awaiting Action", value: totals.awaitingAction, tone: totals.awaitingAction ? "warning" : "muted" },
  ];

  const toolbarFilters: LgToolbarFilter[] = [
    { key: "ageing", label: "Ageing", value: ageing, onChange: setAgeing, options: AGEING_BUCKETS },
    { key: "status", label: "Legal Status", value: status, onChange: setStatus,
      options: [{ value: "all", label: "All statuses" }, ...uniques.statuses.map((v) => ({ value: v, label: v }))] },
    { key: "recoveryType", label: "Recovery Type", value: recoveryType, onChange: setRecoveryType,
      options: [{ value: "all", label: "All types" }, ...uniques.recoveryTypes.map((v) => ({ value: v, label: v }))] },
    { key: "partyType", label: "Party Type", value: partyType, onChange: setPartyType,
      options: [{ value: "all", label: "All parties" }, ...uniques.partyTypes.map((v) => ({ value: v, label: v }))] },
    { key: "officer", label: "Officer", value: officer, onChange: setOfficer,
      options: [{ value: "all", label: "All officers" }, ...uniques.officers.map((v) => ({ value: v, label: v }))] },
    { key: "territory", label: "Territory", value: territory, onChange: setTerritory,
      options: [{ value: "all", label: "All territories" }, ...uniques.territories.map((v) => ({ value: v, label: v }))] },
    { key: "arrangement", label: "Arrangement", value: arrangement, onChange: setArrangement,
      options: [{ value: "all", label: "All arrangements" }, ...uniques.arrangements.map((v) => ({ value: v, label: v }))] },
    { key: "breach", label: "Breach", value: breach, onChange: setBreach,
      options: [{ value: "all", label: "All" }, ...uniques.breaches.map((v) => ({ value: v, label: v }))] },
  ];

  const money = (n: number) => num(n);

  const columns: LgColumnDef<RecoveryWorkbenchRow>[] = useMemo(() => [
    { accessorKey: "matter_no", header: "Matter No", meta: { label: "Matter No", pinLeft: true, width: 150 } },
    { accessorKey: "source_module", header: "Source Module", meta: { label: "Source Module", width: 130 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "source_reference", header: "Source Ref", meta: { label: "Source Ref", width: 150 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "party_type", header: "Party Type", meta: { label: "Party Type", width: 130 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "party_ref", header: "Employer No / SSN", meta: { label: "Employer No / SSN", width: 150 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "party_name", header: "Party Name", meta: { label: "Party Name", width: 220 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "recovery_type", header: "Recovery Type", meta: { label: "Recovery Type", width: 140 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "principal_due", header: "Principal", meta: { label: "Principal Due", align: "right", width: 120 },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "interest", header: "Interest", meta: { label: "Interest", align: "right", width: 110, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "penalty", header: "Penalty", meta: { label: "Penalty", align: "right", width: 110, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "court_cost", header: "Court Cost", meta: { label: "Court Cost", align: "right", width: 120, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "legal_cost", header: "Legal Cost", meta: { label: "Legal Cost", align: "right", width: 120, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "total_recoverable", header: "Total Recoverable", meta: { label: "Total Recoverable", align: "right", width: 150 },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "total_paid", header: "Total Paid", meta: { label: "Total Paid", align: "right", width: 130 },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "outstanding_balance", header: "Outstanding", meta: { label: "Outstanding", align: "right", width: 140 },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "recovery_pct", header: "Recovery %", meta: { label: "Recovery %", align: "right", width: 110 },
      cell: ({ getValue }) => `${(getValue<number>() ?? 0).toFixed(1)}%` },
    { accessorKey: "legal_status", header: "Status", meta: { label: "Legal Status", width: 130 },
      cell: ({ getValue }) => <LgStatusBadge status={getValue<string>() ?? "—"} /> },
    { accessorKey: "case_stage", header: "Stage", meta: { label: "Case Stage", width: 140 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "assigned_officer_name", header: "Officer", meta: { label: "Assigned Officer", width: 160 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "team_code", header: "Team", meta: { label: "Team / Workbasket", width: 140, defaultHidden: true },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory / Office", width: 120 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "next_action_date", header: "Next Action", meta: { label: "Next Action Date", width: 130 },
      cell: ({ getValue }) => (getValue<string>() ? formatDateForDisplay(getValue<string>()!) : "—") },
    { accessorKey: "next_hearing_date", header: "Next Hearing", meta: { label: "Next Hearing Date", width: 130 },
      cell: ({ getValue }) => (getValue<string>() ? formatDateForDisplay(getValue<string>()!) : "—") },
    { accessorKey: "arrangement_status", header: "Arrangement", meta: { label: "Arrangement Status", width: 140 },
      cell: ({ getValue }) => <Badge variant="outline">{getValue<string>() ?? "—"}</Badge> },
    { accessorKey: "breach_status", header: "Breach", meta: { label: "Breach Status", width: 110 },
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return <Badge variant={v === "YES" ? "destructive" : "outline"}>{v}</Badge>;
      } },
    { accessorKey: "ageing_days", header: "Ageing", meta: { label: "Ageing Days", align: "right", width: 100 },
      cell: ({ row }) => `${row.original.ageing_days}d (${row.original.ageing_bucket})` },
    { accessorKey: "sla_status", header: "SLA", meta: { label: "SLA Status", width: 110 },
      cell: ({ getValue }) => {
        const v = getValue<string>();
        const tone: Record<string, "destructive" | "secondary" | "outline"> = {
          OVERDUE: "destructive", AT_RISK: "secondary", ON_TIME: "outline", NONE: "outline",
        };
        return <Badge variant={tone[v] ?? "outline"}>{v}</Badge>;
      } },
    { accessorKey: "last_activity", header: "Last Activity", meta: { label: "Last Activity", width: 140, defaultHidden: true },
      cell: ({ getValue }) => (getValue<string>() ? formatDateForDisplay(getValue<string>()!) : "—") },
  ], []);

  const rowActions: LgRowAction<RecoveryWorkbenchRow>[] = [
    {
      key: "recovery",
      label: "Open Recovery Tab",
      icon: <Wallet className="h-3.5 w-3.5" />,
      onClick: (row) => navigate(`/legal/lg/cases/${row.id}?tab=recovery`),
    },
    {
      key: "open",
      label: "Open Case",
      icon: <Eye className="h-3.5 w-3.5" />,
      onClick: (row) => navigate(`/legal/lg/cases/${row.id}`),
    },
  ];

  return (
    <PageShell
      title="Legal Recovery Workbench"
      subtitle="Live recovery view across arrears, overpayments, court costs and legal costs."
      breadcrumbs={[{ label: "Legal", href: "/legal/lg/dashboard" }, { label: "Recovery Workbench" }]}
      isLoading={isLoading}
      error={isError ? (error as Error)?.message ?? "Failed to load recovery data" : null}
      noPermission={!access.can("viewCase")}
    >
      <LgDataGrid
        id="recovery-workbench-epic02"
        columns={columns}
        data={filtered}
        summary={summary}
        toolbarFilters={toolbarFilters}
        rowActions={rowActions}
        emptyMessage="No recovery matters match the current filters."
        exportFilename="legal-recovery-workbench"
        searchPlaceholder="Search matter, party, employer, SSN…"
        onRowClick={(row) => navigate(`/legal/lg/cases/${row.id}?tab=recovery`)}
      />
    </PageShell>
  );
}
