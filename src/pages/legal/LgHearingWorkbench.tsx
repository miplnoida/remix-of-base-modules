import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar as CalIcon, Gavel, AlertCircle, Clock, FileCheck, Ban, Hourglass, ClipboardList } from "lucide-react";
import {
  listHearingWorkbench,
  summarize,
  type HearingWorkbenchRow,
  type HearingWorkbenchFilters,
} from "@/services/legal/lgHearingWorkbenchService";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { formatDateForDisplay } from "@/lib/format-config";
import { cn } from "@/lib/utils";

type Row = HearingWorkbenchRow;

const SEGMENTS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today's Hearings" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "adjourned", label: "Adjourned" },
  { key: "awaiting_judgment", label: "Awaiting Judgment" },
  { key: "awaiting_order", label: "Awaiting Order" },
  { key: "documents_missing", label: "Documents Missing" },
  { key: "high_value", label: "High Value Matters" },
  { key: "my_hearings", label: "My Hearings" },
  { key: "supervisor", label: "Supervisor View" },
];

export default function LgHearingWorkbench() {
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const access = useLgAccess();
  const [segment, setSegment] = useState<string>("this_month");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const filters: HearingWorkbenchFilters = useMemo(() => ({
    segment: segment === "all" ? undefined : segment,
    status: status || undefined,
    priority: priority || undefined,
    currentUserCode: userCode ?? undefined,
  }), [segment, status, priority, userCode]);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["lg-hearing-workbench", filters],
    queryFn: () => listHearingWorkbench(filters),
  });

  const summary = useMemo(() => summarize(rows), [rows]);

  const columns: LgColumnDef<Row>[] = useMemo(() => [
    { accessorKey: "hearing_number", header: "Hearing #", meta: { label: "Hearing #", pinLeft: true, width: 150 },
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>() ?? "—"}</span> },
    { accessorKey: "lg_case_no", header: "Matter #", meta: { label: "Matter #", width: 140 },
      cell: ({ row, getValue }) => (
        <button className="text-primary hover:underline font-medium"
          onClick={(e) => { e.stopPropagation(); navigate(`/legal/lg/cases/${row.original.lg_case_id}`); }}>
          {getValue<string>() ?? "—"}
        </button>
      ) },
    { accessorKey: "primary_party_name", header: "Employer / IP", meta: { label: "Employer / IP", width: 200 },
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate">{row.original.primary_party_name ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.primary_party_type ?? ""}</div>
        </div>
      ) },
    { accessorKey: "court_name_display", header: "Court", meta: { label: "Court", width: 160 } },
    { accessorKey: "court_file_number", header: "Court File #", meta: { label: "Court File #", width: 140 } },
    { id: "judge", header: "Judge / Magistrate", meta: { label: "Judge / Magistrate", width: 180 },
      accessorFn: (r) => r.judge_name || r.magistrate_name || "—" },
    { accessorKey: "venue_name_display", header: "Venue", meta: { label: "Venue", width: 140 } },
    { accessorKey: "hearing_type_code", header: "Type", meta: { label: "Hearing Type", width: 130 } },
    { accessorKey: "hearing_stage", header: "Stage", meta: { label: "Hearing Stage", width: 130 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "hearing_date", header: "Date", meta: { label: "Date", width: 110 },
      cell: ({ getValue }) => getValue<string>() ? formatDateForDisplay(getValue<string>()) : "—" },
    { accessorKey: "hearing_time", header: "Time", meta: { label: "Time", width: 90 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "status", header: "Status", meta: { label: "Status", width: 120 },
      cell: ({ getValue }) => <LgStatusBadge status={getValue<string>()} /> },
    { accessorKey: "officer_code", header: "Officer", meta: { label: "Officer", width: 110 } },
    { accessorKey: "lead_counsel_code", header: "Lead Counsel", meta: { label: "Lead Counsel", width: 130 } },
    { accessorKey: "witness_count", header: "Witnesses", meta: { label: "Witness Count", width: 100 } },
    { accessorKey: "evidence_status", header: "Evidence", meta: { label: "Evidence Status", width: 120 },
      cell: ({ row }) => (
        <Badge variant={row.original.evidence_ready ? "default" : "outline"}
          className={row.original.evidence_ready ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : ""}>
          {row.original.evidence_status ?? "NOT_READY"}
        </Badge>
      ) },
    { accessorKey: "documents_ready", header: "Docs", meta: { label: "Documents Ready", width: 90 },
      cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No") },
    { accessorKey: "next_hearing_date", header: "Next Hearing", meta: { label: "Next Hearing", width: 120 },
      cell: ({ getValue }) => getValue<string>() ? formatDateForDisplay(getValue<string>()) : "—" },
    { accessorKey: "adjournment_count", header: "Adj#", meta: { label: "Adjournment Count", width: 80 } },
    { accessorKey: "outcome_code", header: "Outcome", meta: { label: "Current Outcome", width: 140 },
      cell: ({ getValue }) => getValue<string>() ?? "—" },
    { accessorKey: "order_status", header: "Order Status", meta: { label: "Order Status", width: 120 } },
    { accessorKey: "recovery_impact_amount", header: "Recovery Impact", meta: { label: "Recovery Impact", width: 140 },
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return v ? new Intl.NumberFormat("en-US", { style: "currency", currency: "XCD" }).format(v) : "—";
      } },
    { accessorKey: "priority", header: "Priority", meta: { label: "Priority", width: 100 },
      cell: ({ getValue }) => {
        const v = getValue<string>() ?? "NORMAL";
        const cls = v === "HIGH" ? "bg-destructive/10 text-destructive border-destructive/20"
          : v === "LOW" ? "bg-muted text-muted-foreground border-border"
          : "bg-primary/10 text-primary border-primary/20";
        return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>{v}</span>;
      } },
  ], [navigate]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Gavel className="h-6 w-6" /> Hearing Workbench</h1>
              <p className="text-sm text-muted-foreground">Enterprise court operations — preparation, court, outcome, and recovery follow-up.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/legal/lg/hearings")}><CalIcon className="h-4 w-4 mr-1" /> Calendar view</Button>
            <Button variant="outline" onClick={() => navigate("/legal/lg/dashboard")}>Dashboard</Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <SumCard icon={<CalIcon className="h-4 w-4" />} label="Today" value={summary.today} tone="info" />
          <SumCard icon={<CalIcon className="h-4 w-4" />} label="This Week" value={summary.thisWeek} tone="info" />
          <SumCard icon={<Clock className="h-4 w-4" />} label="Adjourned" value={summary.adjourned} tone="warn" />
          <SumCard icon={<Hourglass className="h-4 w-4" />} label="Awaiting Outcome" value={summary.awaitingOutcome} tone="warn" />
          <SumCard icon={<Gavel className="h-4 w-4" />} label="Judgment Reserved" value={summary.judgmentReserved} tone="warn" />
          <SumCard icon={<FileCheck className="h-4 w-4" />} label="Orders Pending" value={summary.ordersPending} tone="warn" />
          <SumCard icon={<Ban className="h-4 w-4" />} label="Cancelled" value={summary.cancelled} tone="danger" />
          <SumCard icon={<ClipboardList className="h-4 w-4" />} label="Upcoming 30d" value={summary.upcoming30d} tone="default" />
        </div>

        {/* Smart filters */}
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={segment === s.key ? "default" : "outline"}
              onClick={() => setSegment(s.key)}
              className="h-7 text-xs"
            >
              {s.label}
            </Button>
          ))}
        </div>

        {error && (
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" /> Failed to load hearings. Please retry.
            </CardContent>
          </Card>
        )}

        <LgDataGrid
          id="lg.hearing.workbench"
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search hearing #, matter, court, file #, judge…"
          defaultSort={[{ id: "hearing_date", desc: false }]}
          toolbarFilters={[
            { key: "status", label: "Status", value: status, onChange: (v) => setStatus(v),
              options: ["SCHEDULED","ADJOURNED","COMPLETED","CANCELLED","NO_SHOW"].map((s) => ({ value: s, label: s })) },
            { key: "priority", label: "Priority", value: priority, onChange: (v) => setPriority(v),
              options: ["LOW","NORMAL","HIGH"].map((s) => ({ value: s, label: s })) },
          ]}
          rowActions={buildLgRowActions<Row>({
            onView: (r) => navigate(`/legal/lg/hearings/${r.id}`),
            onEdit: (r) => navigate(`/legal/lg/hearings/${r.id}?edit=1`),
            canEdit: () => access.can("recordHearingOutcome"),
            onDocuments: (r) => navigate(`/legal/lg/cases/${r.lg_case_id}?tab=documents`),
          })}
          onRowClick={(r) => navigate(`/legal/lg/hearings/${r.id}`)}
          emptyMessage="No hearings match the current filters."
          exportFilename="legal-hearing-workbench"
        />
      </div>
    </div>
  );
}

function SumCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "info" | "warn" | "danger" | "default" }) {
  const toneCls = tone === "info" ? "border-primary/30 bg-primary/5"
    : tone === "warn" ? "border-amber-500/30 bg-amber-500/5"
    : tone === "danger" ? "border-destructive/30 bg-destructive/5"
    : "border-border bg-muted/20";
  return (
    <Card className={cn("border", toneCls)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
