import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Briefcase, AlertTriangle, Clock, ListChecks, Info } from "lucide-react";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { useLegalEnterpriseLabels } from "@/hooks/legal/useLegalEnterpriseLabels";
import { useLegalMatterUserWorkbasket } from "@/hooks/legal/useLegalMatterWorkspace";
import { useLegalAssignmentScope } from "@/workbenches/legal-referrals/useLegalAssignmentScope";
import { formatDateForDisplay } from "@/lib/format-config";
import type {
  LegalMatterWorkspace,
  LegalMatterLifecycleObjectType,
  LegalMatterCategory,
} from "@/types/legalMatterWorkspace";
import { LMW_FALLBACK } from "@/types/legalMatterWorkspace";

/**
 * My Work / Matters — the logged-in legal user's complete workload across the
 * full Legal lifecycle (Referrals, Intakes, Cases, Advice). Backed by the
 * unified Legal Matter Workspace DTO — no mock data.
 *
 * NOTE: "My Queue" (incoming department referrals only) still lives under the
 * Department Referrals tab. This screen intentionally does not duplicate it.
 */

const LIFECYCLE_OPTIONS: { value: LegalMatterLifecycleObjectType; label: string }[] = [
  { value: "REFERRAL", label: "Referral" },
  { value: "INTAKE", label: "Intake" },
  { value: "CASE", label: "Case" },
  { value: "ADVICE_REQUEST", label: "Advice / Contract" },
];

const CATEGORY_OPTIONS: { value: LegalMatterCategory; label: string }[] = [
  { value: "BENEFITS", label: "Benefits" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "ENFORCEMENT", label: "Enforcement" },
  { value: "CONTRACT", label: "Contract" },
  { value: "ADVISORY", label: "Advisory" },
  { value: "INTERNAL", label: "Internal" },
];

const LegalWorkbench = () => {
  const navigate = useNavigate();
  const labels = useLegalEnterpriseLabels();
  const scope = useLegalAssignmentScope();
  const [filterLifecycle, setFilterLifecycle] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const { data, isLoading, isError, error } = useLegalMatterUserWorkbasket(scope);
  const allItems = data?.items ?? [];

  const rows = useMemo(() => {
    return allItems.filter((m) => {
      if (filterLifecycle && m.identity.lifecycle_object_type !== filterLifecycle) return false;
      if (filterCategory && m.classification.category !== filterCategory) return false;
      return true;
    });
  }, [allItems, filterLifecycle, filterCategory]);

  const stats = useMemo(() => {
    const total = allItems.length;
    let overdue = 0;
    let waiting = 0;
    let openTasksActions = 0;
    for (const m of allItems) {
      if (m.sla.sla_status === "OVERDUE" || m.sla.sla_status === "ESCALATED") overdue++;
      if (m.status.overall_status === "WAITING_ON_SOURCE") waiting++;
      openTasksActions += (m.counts.open_task_count || 0) + (m.counts.open_action_count || 0);
    }
    return { total, overdue, waiting, openTasksActions };
  }, [allItems]);

  const columns: LgColumnDef<LegalMatterWorkspace>[] = useMemo(() => [
    {
      accessorKey: "identity.matter_no", id: "matter_no", header: "Matter No",
      meta: { label: "Matter No", pinLeft: true, width: 160 },
      cell: ({ row }) => <span className="font-medium">{row.original.identity.matter_no}</span>,
    },
    {
      accessorKey: "identity.lifecycle_object_type", id: "lifecycle", header: "Lifecycle",
      meta: { label: "Lifecycle", width: 120 },
      cell: ({ getValue }) => {
        const v = String(getValue() ?? "");
        const label = v === "ADVICE_REQUEST" ? "Advice" : v.charAt(0) + v.slice(1).toLowerCase();
        return <LgStatusBadge status={v} label={label} />;
      },
    },
    {
      accessorKey: "classification.category", id: "category", header: "Category",
      meta: { label: "Category", width: 130 },
      cell: ({ getValue }) => {
        const v = String(getValue() ?? "");
        return v ? v.charAt(0) + v.slice(1).toLowerCase() : "—";
      },
    },
    {
      accessorKey: "party.primary_display_name", id: "party", header: "Party",
      meta: { label: "Party", width: 220 },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.party.primary_display_name || LMW_FALLBACK.unknownParty}</div>
          <div className="text-xs text-muted-foreground">{row.original.party.primary_entity_type || "—"}</div>
        </div>
      ),
    },
    {
      accessorKey: "source.source_module", id: "source", header: "Source Dept",
      meta: { label: "Source Dept", width: 130 },
      cell: ({ row }) => row.original.source.source_module || "—",
    },
    {
      accessorKey: "status.overall_status", id: "status", header: "Status",
      meta: { label: "Status", width: 160 },
      cell: ({ getValue }) => {
        const v = String(getValue() ?? "");
        return <LgStatusBadge status={v} label={v.replace(/_/g, " ")} />;
      },
    },
    {
      accessorKey: "status.current_stage_code", id: "stage", header: "Stage",
      meta: { label: "Stage", width: 140 },
      cell: ({ row }) => row.original.status.current_stage_name || row.original.status.current_stage_code || "—",
    },
    {
      accessorKey: "assignment.team_code", id: "team", header: "Team",
      meta: { label: "Team", width: 120 },
      cell: ({ row }) => row.original.assignment.team_name || row.original.assignment.team_code || "—",
    },
    {
      accessorKey: "assignment.owner_name", id: "officer", header: "Officer",
      meta: { label: "Officer", width: 150 },
      cell: ({ row }) => row.original.assignment.owner_name || row.original.assignment.owner_user_code || LMW_FALLBACK.pendingAssignment,
    },
    {
      accessorKey: "sla.due_date", id: "sla_due", header: "SLA Due",
      meta: { label: "SLA Due", width: 120 },
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? formatDateForDisplay(v) : "—";
      },
    },
    {
      accessorKey: "sla.sla_status", id: "sla_status", header: "SLA",
      meta: { label: "SLA", width: 110 },
      cell: ({ row }) => {
        const s = row.original.sla.sla_status;
        if (!s) return <span className="text-muted-foreground">—</span>;
        const label = row.original.sla.overdue_days && row.original.sla.overdue_days > 0
          ? `${s} (${row.original.sla.overdue_days}d)`
          : s;
        return <LgStatusBadge status={s} label={label} />;
      },
    },
    {
      accessorKey: "counts.open_task_count", id: "tasks", header: "Tasks",
      meta: { label: "Open Tasks", align: "right", width: 90 },
      cell: ({ row }) => row.original.counts.open_task_count ?? 0,
    },
    {
      accessorKey: "counts.open_action_count", id: "actions", header: "Actions",
      meta: { label: "Open Actions", align: "right", width: 100 },
      cell: ({ row }) => row.original.counts.open_action_count ?? 0,
    },
    {
      accessorKey: "counts.document_count", id: "docs", header: "Docs",
      meta: { label: "Documents", align: "right", width: 90 },
      cell: ({ row }) => row.original.counts.document_count ?? 0,
    },
    {
      accessorKey: "latest.last_activity_at", id: "activity", header: "Last Activity",
      meta: { label: "Last Activity", width: 140 },
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? formatDateForDisplay(v) : LMW_FALLBACK.noActivity;
      },
    },
  ], []);

  const openMatter = (m: LegalMatterWorkspace) => {
    const url = m.navigation.open_url;
    if (!url) return;
    if (url.startsWith("http")) window.open(url, "_blank", "noopener");
    else navigate(url);
  };

  const summary = useMemo(() => [
    { label: "My Matters", value: stats.total, tone: "default" as const },
    { label: "Overdue / Breached", value: stats.overdue, tone: "danger" as const },
    { label: "Waiting on Source", value: stats.waiting, tone: "warning" as const },
    { label: "Open Tasks / Actions", value: stats.openTasksActions, tone: "info" as const },
  ], [stats]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`${labels.moduleName} — My Work / Matters`}
        subtitle={`All legal work assigned to you across the full lifecycle · ${labels.departmentName}`}
        breadcrumbs={[
          { label: `${labels.moduleName} Management`, href: "/legal/dashboard" },
          { label: "My Work / Matters" },
        ]}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>My Work</strong> shows all legal matters assigned to you across the full lifecycle —
          referrals, intakes, active cases, advice and contract reviews.
          <strong> Department Referrals</strong> shows only incoming referrals from source departments.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Matters</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all lifecycles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue / SLA Breached</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting on Source</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
            <p className="text-xs text-muted-foreground">Awaiting source dept</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks / Actions</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTasksActions}</div>
            <p className="text-xs text-muted-foreground">Across my matters</p>
          </CardContent>
        </Card>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load your matters. {(error as Error)?.message || "Please try again."}
          </AlertDescription>
        </Alert>
      ) : (
        <LgDataGrid
          id="lg.workbench.my-work"
          columns={columns}
          data={rows}
          getRowId={(r: LegalMatterWorkspace) => r.identity.matter_id}
          isLoading={isLoading}
          searchPlaceholder="Search matter no, party, source reference…"
          summary={summary}
          defaultSort={[{ id: "sla_due", desc: false }]}
          toolbarFilters={[
            {
              key: "lifecycle", label: "Lifecycle", value: filterLifecycle, onChange: setFilterLifecycle,
              options: LIFECYCLE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            },
            {
              key: "category", label: "Category", value: filterCategory, onChange: setFilterCategory,
              options: CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            },
          ]}
          rowActions={buildLgRowActions<LegalMatterWorkspace>({
            onView: openMatter,
          })}
          emptyMessage={
            scope.userId
              ? "You have no legal matters assigned. New referrals routed to your team or workbasket will appear here."
              : "Sign in with a Legal role to see your assigned matters."
          }
          exportFilename="legal-my-work"
        />
      )}
    </div>
  );
};

export default LegalWorkbench;
