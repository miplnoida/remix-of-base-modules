import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/common/PageShell";
import {
  LgDataGrid,
  LgStatusBadge,
  type LgColumnDef,
  type LgRowAction,
  type LgToolbarFilter,
  type LgSummaryChip,
} from "@/components/legal/grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { useIntakeWorkbench } from "@/hooks/legal/useLgIntake";
import { computeIntakeKpis, type IntakeWorkbenchRow } from "@/services/legal/lgIntakeWorkbenchService";
import { computeSupervisorKpis, computeManagementKpis } from "@/services/legal/lgIntakeDecisionService";
import { formatDateForDisplay } from "@/lib/format-config";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "INFO_REQUESTED", label: "Awaiting Info" },
  { value: "SUPERVISOR_REVIEW", label: "Supervisor Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RETURNED", label: "Returned" },
  { value: "CONVERTED_TO_CASE", label: "Converted" },
];

const AGEING_OPTIONS = [
  { value: "all", label: "All ageing" },
  { value: "0-3", label: "0–3 days" },
  { value: "4-7", label: "4–7 days" },
  { value: "8-14", label: "8–14 days" },
  { value: "15-30", label: "15–30 days" },
  { value: "30+", label: "30+ days" },
];

const num = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function LgIntakeWorkbench() {
  const navigate = useNavigate();
  const access = useLgAccess();
  const { data: rows = [], isLoading, isError, error, refetch } = useIntakeWorkbench();

  const [status, setStatus] = useState("all");
  const [ageing, setAgeing] = useState("all");
  const [source, setSource] = useState("all");
  const [priority, setPriority] = useState("all");
  const [officer, setOfficer] = useState("all");
  const [result, setResult] = useState("all");

  const uniq = (key: keyof IntakeWorkbenchRow) =>
    Array.from(new Set(rows.map((r) => (r[key] as string) ?? "").filter(Boolean))).sort();

  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.qualification_status !== status) return false;
    if (ageing !== "all" && r.ageing_bucket !== ageing) return false;
    if (source !== "all" && r.source_module !== source) return false;
    if (priority !== "all" && r.priority_code !== priority) return false;
    if (officer !== "all" && (r.intake_officer_id ?? "") !== officer) return false;
    if (result !== "all" && (r.qualification_result ?? "") !== result) return false;
    return true;
  }), [rows, status, ageing, source, priority, officer, result]);

  const kpis = useMemo(() => computeIntakeKpis(rows), [rows]);

  const summary: LgSummaryChip[] = [
    { label: "New Referrals", value: kpis.newReferrals, tone: "info" },
    { label: "Pending Qualification", value: kpis.pendingQualification, tone: "warning" },
    { label: "Waiting Information", value: kpis.waitingInformation, tone: "warning" },
    { label: "Supervisor Review", value: kpis.supervisorReview, tone: "info" },
    { label: "Accepted Today", value: kpis.acceptedToday, tone: "success" },
    { label: "Rejected Today", value: kpis.rejectedToday, tone: "danger" },
    { label: "Converted to Cases", value: kpis.convertedToCases, tone: "success" },
    { label: "Avg Qualification", value: kpis.avgQualificationHours != null ? `${kpis.avgQualificationHours.toFixed(1)}h` : "—", tone: "muted" },
  ];

  const toolbarFilters: LgToolbarFilter[] = [
    { key: "status", label: "Status", value: status, onChange: setStatus, options: STATUS_OPTIONS },
    { key: "ageing", label: "Ageing", value: ageing, onChange: setAgeing, options: AGEING_OPTIONS },
    { key: "source", label: "Source Module", value: source, onChange: setSource,
      options: [{ value: "all", label: "All sources" }, ...uniq("source_module").map((v) => ({ value: v, label: v }))] },
    { key: "priority", label: "Priority", value: priority, onChange: setPriority,
      options: [{ value: "all", label: "All priorities" }, ...uniq("priority_code").map((v) => ({ value: v, label: v }))] },
    { key: "officer", label: "Officer", value: officer, onChange: setOfficer,
      options: [{ value: "all", label: "All officers" }, ...uniq("intake_officer_id").map((v) => ({ value: v, label: v }))] },
    { key: "result", label: "Result", value: result, onChange: setResult,
      options: [
        { value: "all", label: "All results" },
        { value: "ACCEPTED", label: "Accepted" },
        { value: "REJECTED", label: "Rejected" },
        { value: "RETURNED", label: "Returned" },
        { value: "INFO_REQUIRED", label: "Info Required" },
        { value: "ESCALATED", label: "Escalated" },
        { value: "CONVERTED", label: "Converted" },
      ] },
  ];

  const columns: LgColumnDef<IntakeWorkbenchRow>[] = [
    { accessorKey: "intake_no", header: "Intake No", meta: { label: "Intake No", pinLeft: true, width: 150 } },
    { accessorKey: "referral_no", header: "Referral No", meta: { label: "Referral No", width: 150 } },
    { accessorKey: "source_module", header: "Source", meta: { label: "Source Module", width: 120 } },
    { accessorKey: "source_reference_no", header: "Source Ref", meta: { label: "Source Reference", width: 140 } },
    { accessorKey: "matter_type_code", header: "Matter Type", meta: { label: "Matter Type", width: 140 } },
    { accessorKey: "primary_entity_type", header: "Party Type", meta: { label: "Party Type", width: 120 } },
    { id: "party", header: "Employer / IP",
      meta: { label: "Employer / IP", width: 200, exportValue: (r: any) => r.legacy_primary_entity_name ?? r.primary_entity_id ?? "" },
      cell: ({ row }) => row.original.legacy_primary_entity_name ?? row.original.primary_entity_id ?? "—" },
    { accessorKey: "employer_no", header: "Employer No", meta: { label: "Employer No", width: 130 } },
    { accessorKey: "ip_no", header: "IP No", meta: { label: "Insured Person No", width: 130 } },
    { id: "exposure", header: "Financial Exposure", accessorFn: (r) => r.financial_exposure ?? r.exposure_amount ?? 0,
      cell: ({ row }) => num(row.original.financial_exposure ?? row.original.exposure_amount),
      meta: { label: "Financial Exposure", width: 160, align: "right" } },
    { accessorKey: "priority_code", header: "Priority", meta: { label: "Priority", width: 100 },
      cell: ({ getValue }) => <LgStatusBadge status={String(getValue() ?? "")} /> },
    { accessorKey: "urgency", header: "Urgency", meta: { label: "Urgency", width: 100 } },
    { accessorKey: "submitted_at", header: "Received", meta: { label: "Received Date", width: 130 },
      cell: ({ getValue }) => formatDateForDisplay(getValue() as string) },
    { id: "ageing", header: "Ageing", accessorKey: "ageing_days", meta: { label: "Ageing (days)", width: 100 },
      cell: ({ row }) => `${row.original.ageing_days}d (${row.original.ageing_bucket})` },
    { accessorKey: "intake_officer_id", header: "Officer", meta: { label: "Assigned Intake Officer", width: 150 } },
    { accessorKey: "qualification_status", header: "Status", meta: { label: "Current Intake Status", width: 170 },
      cell: ({ getValue }) => <LgStatusBadge status={String(getValue() ?? "")} /> },
    { accessorKey: "outstanding_info_count", header: "Info Outstanding", meta: { label: "Information Outstanding", width: 140, align: "right" } },
    { id: "supReq", header: "Supervisor?", accessorFn: (r) => (r.supervisor_required ? "Yes" : "No"),
      meta: { label: "Supervisor Approval Required", width: 130 } },
    { accessorKey: "qualification_result", header: "Result", meta: { label: "Qualification Result", width: 140 } },
    { accessorKey: "recommended_action", header: "Recommended Action", meta: { label: "Recommended Action", width: 220 } },
  ];

  const rowActions: LgRowAction<IntakeWorkbenchRow>[] = [
    { key: "open", label: "Open Workspace", icon: <Eye className="h-4 w-4" />, onClick: (r) => navigate(`/legal/lg/intake/${r.id}`) },
  ];

  if (!access.can("viewLegalModule")) {
    return <PageShell title="Intake & Qualification"><div className="p-6">You do not have permission to view Legal Intake.</div></PageShell>;
  }

  return (
    <PageShell title="Legal Intake & Qualification" subtitle="Mandatory qualification workspace between Referral and Legal Case.">
      <LgDataGrid
        id="intake.workbench"
        data={filtered}
        columns={columns}
        rowActions={rowActions}
        toolbarFilters={toolbarFilters}
        summary={summary}
        isLoading={isLoading}
        emptyMessage={isError ? `Failed to load: ${(error as any)?.message ?? "unknown"}` : "No referrals in intake."}
        onRefresh={refetch}
        onRowClick={(r) => navigate(`/legal/lg/intake/${r.id}`)}
      />
    </PageShell>
  );
}
