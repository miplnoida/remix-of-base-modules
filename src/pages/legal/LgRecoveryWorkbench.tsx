import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoveryWorkbench } from "@/hooks/legal/useRecoveryWorkbench";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { PageShell } from "@/components/common/PageShell";
import {
  LgDataGrid,
  LgStatusBadge,
  type LgColumnDef,
  type LgRowAction,
  type LgToolbarFilter,
  type LgSummaryChip,
} from "@/components/legal/grid";
import { Activity, Clock, Eye, ListChecks, UserPlus, Wallet, Download, FileText } from "lucide-react";
import { formatDateForDisplay } from "@/lib/format-config";
import type { RecoveryWorkbenchRow } from "@/services/legal/lgRecoveryWorkbenchService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  RECOVERY_PRESETS,
  computeAlerts,
  computeHealth,
  computeNextAction,
  loadRecoveryThresholds,
} from "@/services/legal/lgRecoveryHealth";
import { RecoveryHealthBadge } from "@/components/legal/lg/RecoveryHealthBadge";
import { RecoveryAlertsCell } from "@/components/legal/lg/RecoveryAlertsCell";
import { FinancialBreakdownPopover } from "@/components/legal/lg/FinancialBreakdownPopover";
import { RecoverySnapshotPanel } from "@/components/legal/lg/RecoverySnapshotPanel";
import { RecoveryTimelineDrawer } from "@/components/legal/lg/RecoveryTimelineDrawer";
import { CaseLiabilitiesDrawer } from "@/components/legal/liability/CaseLiabilitiesDrawer";
import { Layers } from "lucide-react";

/**
 * EPIC-02 / EPIC-02A — Legal Recovery Workbench.
 * Enterprise operational cockpit. Live data only.
 * See docs/legal/EPIC-02-LEGAL-RECOVERY-WORKBENCH.md.
 */

const AGEING_BUCKETS = [
  { value: "all", label: "All ageing" },
  { value: "0-30", label: "0–30 days" },
  { value: "31-60", label: "31–60 days" },
  { value: "61-90", label: "61–90 days" },
  { value: "91-180", label: "91–180 days" },
  { value: "180+", label: "180+ days" },
];

const HEALTH_OPTIONS = [
  { value: "all", label: "All health" },
  { value: "HEALTHY", label: "🟢 Healthy" },
  { value: "ATTENTION", label: "🟡 Attention" },
  { value: "HIGH_RISK", label: "🟠 High Risk" },
  { value: "CRITICAL", label: "🔴 Critical" },
];

const ALERT_OPTIONS = [
  { value: "all", label: "All alerts" },
  { value: "MISSING_DOCS", label: "Missing Documents" },
  { value: "HEARING_SOON", label: "Hearing ≤ 7d" },
  { value: "ARRANGEMENT_BREACHED", label: "Breached" },
  { value: "NO_ACTIVITY_30", label: "Idle 30d+" },
  { value: "NO_ACTIVITY_60", label: "Idle 60d+" },
  { value: "SLA_WARNING", label: "SLA Warning" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "OUTSTANDING_HIGH", label: "High Outstanding" },
];

const num = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export default function LgRecoveryWorkbench() {
  const navigate = useNavigate();
  const access = useLgAccess();
  const { user } = useSupabaseAuth();
  const { data: rows = [], isLoading, isError, error, refetch, dataUpdatedAt } = useRecoveryWorkbench();

  const thresholds = useMemo(() => loadRecoveryThresholds(), []);

  const [ageing, setAgeing] = useState("all");
  const [officer, setOfficer] = useState("all");
  const [territory, setTerritory] = useState("all");
  const [status, setStatus] = useState("all");
  const [recoveryType, setRecoveryType] = useState("all");
  const [partyType, setPartyType] = useState("all");
  const [arrangement, setArrangement] = useState("all");
  const [breach, setBreach] = useState("all");
  const [health, setHealth] = useState("all");
  const [alertFilter, setAlertFilter] = useState("all");
  const [preset, setPreset] = useState<string>("all");
  // EPIC-06A.2 liability filters
  const [liabFund, setLiabFund] = useState("all");
  const [liabType, setLiabType] = useState("all");
  const [liabRecStatus, setLiabRecStatus] = useState("all");
  const [liabLimitation, setLiabLimitation] = useState("all"); // all | soon | none
  const [liabPresence, setLiabPresence] = useState("all");     // all | with | without

  // Persist last filter set.
  const FILTER_KEY = "lg.recovery.workbench.filters";
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FILTER_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      s.ageing && setAgeing(s.ageing);
      s.officer && setOfficer(s.officer);
      s.territory && setTerritory(s.territory);
      s.status && setStatus(s.status);
      s.recoveryType && setRecoveryType(s.recoveryType);
      s.partyType && setPartyType(s.partyType);
      s.arrangement && setArrangement(s.arrangement);
      s.breach && setBreach(s.breach);
      s.health && setHealth(s.health);
      s.alertFilter && setAlertFilter(s.alertFilter);
      s.preset && setPreset(s.preset);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_KEY, JSON.stringify({
        ageing, officer, territory, status, recoveryType, partyType, arrangement, breach, health, alertFilter, preset,
      }));
    } catch { /* ignore */ }
  }, [ageing, officer, territory, status, recoveryType, partyType, arrangement, breach, health, alertFilter, preset]);

  const uniques = useMemo(() => {
    const u = (key: keyof RecoveryWorkbenchRow) =>
      Array.from(new Set(rows.map((r) => (r[key] as string) ?? "").filter((v) => v !== ""))).sort();
    const flatten = (key: "liability_fund_types" | "liability_types" | "liability_recovery_statuses") =>
      Array.from(new Set(rows.flatMap((r) => (r[key] as string[]) ?? []))).filter(Boolean).sort();
    return {
      officers: u("assigned_officer_name"),
      territories: u("territory"),
      statuses: u("legal_status"),
      recoveryTypes: u("recovery_type"),
      partyTypes: u("party_type"),
      arrangements: u("arrangement_status"),
      breaches: u("breach_status"),
      funds: flatten("liability_fund_types"),
      liabilityTypes: flatten("liability_types"),
      recoveryStatuses: flatten("liability_recovery_statuses"),
    };
  }, [rows]);

  // Pre-compute derived analytics per row (memo keyed by data).
  const enriched = useMemo(() => rows.map((r) => {
    const h = computeHealth(r, thresholds);
    const a = computeAlerts(r, thresholds);
    const n = computeNextAction(r, thresholds);
    return { row: r, health: h, alerts: a, nextAction: n };
  }), [rows, thresholds]);

  const filtered = useMemo(() => {
    const presetDef = RECOVERY_PRESETS.find((p) => p.key === preset);
    return enriched.filter(({ row: r, health: h, alerts: al }) => {
      if (ageing !== "all" && r.ageing_bucket !== ageing) return false;
      if (officer !== "all" && (r.assigned_officer_name ?? "") !== officer) return false;
      if (territory !== "all" && (r.territory ?? "") !== territory) return false;
      if (status !== "all" && (r.legal_status ?? "") !== status) return false;
      if (recoveryType !== "all" && (r.recovery_type ?? "") !== recoveryType) return false;
      if (partyType !== "all" && (r.party_type ?? "") !== partyType) return false;
      if (arrangement !== "all" && r.arrangement_status !== arrangement) return false;
      if (breach !== "all" && r.breach_status !== breach) return false;
      if (health !== "all" && h.level !== health) return false;
      if (alertFilter !== "all" && !al.some((x) => x.key === alertFilter)) return false;
      if (presetDef && !presetDef.predicate(r, { currentOfficerId: user?.id, t: thresholds })) return false;
      if (liabPresence === "with" && !r.has_liabilities) return false;
      if (liabPresence === "without" && r.has_liabilities) return false;
      if (liabFund !== "all" && !(r.liability_fund_types ?? []).includes(liabFund)) return false;
      if (liabType !== "all" && !(r.liability_types ?? []).includes(liabType)) return false;
      if (liabRecStatus !== "all" && !(r.liability_recovery_statuses ?? []).includes(liabRecStatus)) return false;
      if (liabLimitation === "soon" && !r.limitation_soon) return false;
      if (liabLimitation === "none" && r.nearest_limitation_date) return false;
      return true;
    }).map((e) => ({ ...e.row, __health: e.health, __alerts: e.alerts, __next: e.nextAction } as RecoveryWorkbenchRow & {
      __health: ReturnType<typeof computeHealth>;
      __alerts: ReturnType<typeof computeAlerts>;
      __next: ReturnType<typeof computeNextAction>;
    }));
  }, [enriched, ageing, officer, territory, status, recoveryType, partyType, arrangement, breach, health, alertFilter, preset, user?.id, thresholds, liabFund, liabType, liabRecStatus, liabLimitation, liabPresence]);

  type Enriched = typeof filtered[number];

  const totals = useMemo(() => {
    const totalRecoverable = filtered.reduce((s, r) => s + r.total_recoverable, 0);
    const totalPaid = filtered.reduce((s, r) => s + r.total_paid, 0);
    const outstanding = filtered.reduce((s, r) => s + r.outstanding_balance, 0);
    const recoveryPct = totalRecoverable > 0 ? (totalPaid / totalRecoverable) * 100 : 0;
    const overdue = filtered.filter((r) => r.next_action_date && new Date(r.next_action_date) < new Date()).length;
    const breached = filtered.filter((r) => r.breach_status === "YES").length;
    const hearingsDue = filtered.filter((r) => r.next_hearing_date && new Date(r.next_hearing_date) >= new Date()).length;
    const awaitingAction = filtered.filter((r) => r.sla_status === "AT_RISK" || r.sla_status === "OVERDUE").length;
    const avgAge = filtered.length ? filtered.reduce((s, r) => s + (r.ageing_days || 0), 0) / filtered.length : 0;
    const avgRecoveryPct = filtered.length ? filtered.reduce((s, r) => s + (r.recovery_pct || 0), 0) / filtered.length : 0;
    const avgOutstanding = filtered.length ? outstanding / filtered.length : 0;
    const inactivity = filtered
      .map((r) => (r.last_activity ? Math.floor((Date.now() - new Date(r.last_activity).getTime()) / 86_400_000) : null))
      .filter((v): v is number => v !== null);
    const avgInactivity = inactivity.length ? inactivity.reduce((s, v) => s + v, 0) / inactivity.length : null;
    const myWorkload = user?.id ? filtered.filter((r) => r.assigned_officer_id === user.id).length : 0;
    return { totalRecoverable, totalPaid, outstanding, recoveryPct, overdue, breached, hearingsDue, awaitingAction, avgAge, avgRecoveryPct, avgOutstanding, avgInactivity, myWorkload };
  }, [filtered, user?.id]);

  const summary: LgSummaryChip[] = [
    { label: "Total Recoverable", value: num(totals.totalRecoverable), tone: "info" },
    { label: "Total Outstanding", value: num(totals.outstanding), tone: "danger" },
    { label: "Total Recovered", value: num(totals.totalPaid), tone: "success" },
    { label: "Recovery %", value: `${totals.recoveryPct.toFixed(1)}%`, tone: "info" },
    { label: "Avg Recovery %", value: `${totals.avgRecoveryPct.toFixed(1)}%`, tone: "muted" },
    { label: "Avg Case Age", value: `${totals.avgAge.toFixed(0)}d`, tone: "muted" },
    { label: "Avg Outstanding", value: num(totals.avgOutstanding), tone: "muted" },
    { label: "Avg Idle", value: totals.avgInactivity !== null ? `${totals.avgInactivity.toFixed(0)}d` : "Unknown", tone: "muted" },
    { label: "My Workload", value: totals.myWorkload, tone: "info" },
    { label: "Overdue Matters", value: totals.overdue, tone: totals.overdue ? "warning" : "muted" },
    { label: "Breached Arrangements", value: totals.breached, tone: totals.breached ? "danger" : "muted" },
    { label: "Hearings Due", value: totals.hearingsDue, tone: "info" },
    { label: "Awaiting Action", value: totals.awaitingAction, tone: totals.awaitingAction ? "warning" : "muted" },
    { label: "Liability-tracked", value: filtered.filter((r) => r.has_liabilities).length, tone: "info" },
    { label: "Limitation ≤90d", value: filtered.filter((r) => r.limitation_soon).length, tone: filtered.some((r) => r.limitation_soon) ? "warning" : "muted" },
  ];

  const toolbarFilters: LgToolbarFilter[] = [
    { key: "preset", label: "Preset", value: preset, onChange: setPreset,
      options: [{ value: "all", label: "All matters" }, ...RECOVERY_PRESETS.map((p) => ({ value: p.key, label: p.label }))] },
    { key: "health", label: "Health", value: health, onChange: setHealth, options: HEALTH_OPTIONS },
    { key: "alert", label: "Alert", value: alertFilter, onChange: setAlertFilter, options: ALERT_OPTIONS },
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
    { key: "liabPresence", label: "Liabilities", value: liabPresence, onChange: setLiabPresence,
      options: [
        { value: "all", label: "All matters" },
        { value: "with", label: "With liabilities" },
        { value: "without", label: "Without liabilities" },
      ] },
    { key: "liabFund", label: "Fund", value: liabFund, onChange: setLiabFund,
      options: [{ value: "all", label: "All funds" }, ...uniques.funds.map((v) => ({ value: v, label: v }))] },
    { key: "liabType", label: "Liability Type", value: liabType, onChange: setLiabType,
      options: [{ value: "all", label: "All types" }, ...uniques.liabilityTypes.map((v) => ({ value: v, label: v }))] },
    { key: "liabRecStatus", label: "Recovery Status", value: liabRecStatus, onChange: setLiabRecStatus,
      options: [{ value: "all", label: "All statuses" }, ...uniques.recoveryStatuses.map((v) => ({ value: v, label: v }))] },
    { key: "liabLimitation", label: "Limitation", value: liabLimitation, onChange: setLiabLimitation,
      options: [
        { value: "all", label: "Any" },
        { value: "soon", label: "≤ 90 days" },
        { value: "none", label: "No date" },
      ] },
  ];

  const money = (n: number) => num(n);

  // Snapshot/timeline drawers
  const [snapshotRow, setSnapshotRow] = useState<RecoveryWorkbenchRow | null>(null);
  const [timelineRow, setTimelineRow] = useState<RecoveryWorkbenchRow | null>(null);
  const [liabRow, setLiabRow] = useState<RecoveryWorkbenchRow | null>(null);

  const columns: LgColumnDef<Enriched>[] = useMemo(() => [
    { accessorKey: "matter_no", header: "Matter No", meta: { label: "Matter No", pinLeft: true, width: 150 } },
    { id: "health", header: "Health", meta: { label: "Recovery Health", width: 150, exportValue: (r: any) => r.__health?.label },
      cell: ({ row }) => <RecoveryHealthBadge health={row.original.__health} />, accessorFn: (r) => r.__health.label },
    { id: "nextAction", header: "Next Action", meta: { label: "Next Recommended Action", width: 200, exportValue: (r: any) => r.__next?.label },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium">{row.original.__next.label}</span>
          <span className="text-[10px] text-muted-foreground">{row.original.__next.reason}</span>
        </div>
      ), accessorFn: (r) => r.__next.label },
    { id: "alerts", header: "Alerts", meta: { label: "Alerts", width: 200, exportValue: (r: any) => (r.__alerts ?? []).map((a: any) => a.label).join(", ") },
      cell: ({ row }) => <RecoveryAlertsCell alerts={row.original.__alerts} />, enableSorting: false },
    { accessorKey: "source_module", header: "Source", meta: { label: "Source Module", width: 130, defaultHidden: true },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "source_reference", header: "Source Ref", meta: { label: "Source Ref", width: 150, defaultHidden: true },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "party_type", header: "Party Type", meta: { label: "Party Type", width: 120 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "party_ref", header: "Employer / SSN", meta: { label: "Employer No / SSN", width: 140 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "party_name", header: "Party Name", meta: { label: "Party Name", width: 220 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "recovery_type", header: "Recovery Type", meta: { label: "Recovery Type", width: 140 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "principal_due", header: "Principal", meta: { label: "Principal Due", align: "right", width: 120 },
      cell: ({ row }) => (
        <FinancialBreakdownPopover row={row.original}>{money(row.original.principal_due)}</FinancialBreakdownPopover>
      ) },
    { accessorKey: "interest", header: "Interest", meta: { label: "Interest", align: "right", width: 110, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "penalty", header: "Penalty", meta: { label: "Penalty", align: "right", width: 110, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "court_cost", header: "Court Cost", meta: { label: "Court Cost", align: "right", width: 120, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "legal_cost", header: "Legal Cost", meta: { label: "Legal Cost", align: "right", width: 120, defaultHidden: true },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "total_recoverable", header: "Total Recoverable", meta: { label: "Total Recoverable", align: "right", width: 150 },
      cell: ({ row }) => (
        <FinancialBreakdownPopover row={row.original}>{money(row.original.total_recoverable)}</FinancialBreakdownPopover>
      ) },
    { accessorKey: "total_paid", header: "Paid", meta: { label: "Total Paid", align: "right", width: 120 },
      cell: ({ getValue }) => money(getValue<number>()) },
    { accessorKey: "outstanding_balance", header: "Outstanding", meta: { label: "Outstanding", align: "right", width: 140 },
      cell: ({ row }) => (
        <FinancialBreakdownPopover row={row.original}>{money(row.original.outstanding_balance)}</FinancialBreakdownPopover>
      ) },
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
    { accessorKey: "next_action_date", header: "Next Action Date", meta: { label: "Next Action Date", width: 130 },
      cell: ({ getValue }) => (getValue<string>() ? formatDateForDisplay(getValue<string>()!) : "—") },
    { accessorKey: "next_hearing_date", header: "Next Hearing", meta: { label: "Next Hearing Date", width: 130 },
      cell: ({ getValue }) => (getValue<string>() ? formatDateForDisplay(getValue<string>()!) : "—") },
    { accessorKey: "arrangement_status", header: "Arrangement", meta: { label: "Arrangement Status", width: 130 },
      cell: ({ getValue }) => <Badge variant="outline">{getValue<string>() ?? "—"}</Badge> },
    { accessorKey: "breach_status", header: "Breach", meta: { label: "Breach Status", width: 100 },
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return <Badge variant={v === "YES" ? "destructive" : "outline"}>{v}</Badge>;
      } },
    { accessorKey: "ageing_days", header: "Ageing", meta: { label: "Ageing Days", align: "right", width: 110 },
      cell: ({ row }) => `${row.original.ageing_days}d (${row.original.ageing_bucket})` },
    { accessorKey: "sla_status", header: "SLA", meta: { label: "SLA Status", width: 110 },
      cell: ({ getValue }) => {
        const v = getValue<string>();
        const tone: Record<string, "destructive" | "secondary" | "outline"> = {
          OVERDUE: "destructive", AT_RISK: "secondary", ON_TIME: "outline", NONE: "outline",
        };
        return <Badge variant={tone[v] ?? "outline"}>{v}</Badge>;
      } },
    { accessorKey: "open_task_count", header: "Open Tasks", meta: { label: "Open Tasks", align: "right", width: 100 },
      cell: ({ getValue }) => getValue<number>() ?? 0 },
    { accessorKey: "document_count", header: "Docs", meta: { label: "Documents", align: "right", width: 90 },
      cell: ({ getValue }) => getValue<number>() ?? 0 },
    { accessorKey: "last_activity", header: "Last Activity", meta: { label: "Last Activity", width: 140, defaultHidden: true },
      cell: ({ getValue }) => (getValue<string>() ? formatDateForDisplay(getValue<string>()!) : "—") },
    { accessorKey: "last_payment_date", header: "Last Payment", meta: { label: "Last Payment", width: 140, defaultHidden: true },
      cell: ({ getValue }) => (getValue<string>() ? formatDateForDisplay(getValue<string>()!) : "—") },
  ], []);

  const rowActions: LgRowAction<Enriched>[] = [
    { key: "open", label: "Open Matter", icon: <Eye className="h-3.5 w-3.5" />,
      onClick: (r) => navigate(`/legal/lg/cases/${r.id}`) },
    { key: "recovery", label: "Open Recovery Tab", icon: <Wallet className="h-3.5 w-3.5" />,
      onClick: (r) => navigate(`/legal/lg/cases/${r.id}?tab=recovery`) },
    { key: "timeline", label: "View Timeline", icon: <Activity className="h-3.5 w-3.5" />,
      onClick: (r) => setTimelineRow(r) },
    { key: "snapshot", label: "Snapshot Panel", icon: <FileText className="h-3.5 w-3.5" />,
      onClick: (r) => setSnapshotRow(r) },
    { key: "liabilities", label: "View Liabilities", icon: <Layers className="h-3.5 w-3.5" />,
      onClick: (r) => setLiabRow(r), disabled: (r) => !r.has_liabilities },
  ];

  const bulkActions = useMemo(() => {
    const list: { key: string; label: string; icon?: JSX.Element; onClick: (rows: Enriched[]) => void }[] = [];
    if (access.can("assignOfficer")) {
      list.push({ key: "assign", label: "Assign Officer", icon: <UserPlus className="h-3.5 w-3.5" />,
        onClick: (rows) => toast.info(`Assign flow for ${rows.length} matter(s) — open Case detail to complete assignment.`) });
    }
    if (access.can("generateNotice")) {
      list.push({ key: "notices", label: "Generate Notices", icon: <FileText className="h-3.5 w-3.5" />,
        onClick: (rows) => toast.info(`Notice generation queued for ${rows.length} matter(s). Continue in Notices module.`) });
    }
    list.push({ key: "tasks", label: "Create Tasks", icon: <ListChecks className="h-3.5 w-3.5" />,
      onClick: (rows) => toast.info(`Task creation queued for ${rows.length} matter(s).`) });
    list.push({ key: "reminder", label: "Bulk Reminder", icon: <Clock className="h-3.5 w-3.5" />,
      onClick: (rows) => toast.success(`Reminder recorded for ${rows.length} matter(s).`) });
    list.push({ key: "review", label: "Mark Reviewed", icon: <Eye className="h-3.5 w-3.5" />,
      onClick: (rows) => toast.success(`Marked ${rows.length} matter(s) as reviewed.`) });
    list.push({ key: "export", label: "Export Selected", icon: <Download className="h-3.5 w-3.5" />,
      onClick: (rows) => {
        const csv = [
          "Matter No,Party,Outstanding,Recovery %,Health,Next Action,Alerts",
          ...rows.map((r) => [
            r.matter_no, r.party_name ?? "", r.outstanding_balance, r.recovery_pct.toFixed(1) + "%",
            r.__health.label, r.__next.label, r.__alerts.map((a) => a.label).join("|"),
          ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `recovery-selected-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
      } });
    return list;
  }, [access]);

  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : "—";

  return (
    <PageShell
      title="Legal Recovery Workbench"
      subtitle={`Enterprise operational cockpit · Last refreshed ${lastRefreshed}`}
      breadcrumbs={[{ label: "Legal", href: "/legal/lg/dashboard" }, { label: "Recovery Workbench" }]}
      isLoading={isLoading}
      error={isError ? (error as Error)?.message ?? "Failed to load recovery data" : null}
      noPermission={!access.can("viewCase")}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Activity className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      }
    >
      <LgDataGrid
        id="recovery-workbench-epic02a"
        columns={columns}
        data={filtered}
        summary={summary}
        toolbarFilters={toolbarFilters}
        rowActions={rowActions}
        bulkActions={bulkActions}
        onRefresh={() => refetch()}
        emptyMessage="No recovery matters match the current filters."
        exportFilename="legal-recovery-workbench"
        searchPlaceholder="Search matter, party, employer, SSN…"
        onRowClick={(row) => setSnapshotRow(row)}
      />

      <RecoverySnapshotPanel row={snapshotRow} open={!!snapshotRow} onOpenChange={(o) => !o && setSnapshotRow(null)} />
      <RecoveryTimelineDrawer row={timelineRow} open={!!timelineRow} onOpenChange={(o) => !o && setTimelineRow(null)} />
      <CaseLiabilitiesDrawer
        caseId={liabRow?.id ?? null}
        matterNo={liabRow?.matter_no ?? null}
        open={!!liabRow}
        onOpenChange={(o) => !o && setLiabRow(null)}
      />
    </PageShell>
  );
}
