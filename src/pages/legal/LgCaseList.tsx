import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Scale } from "lucide-react";
import { useLgCases, useLgReference } from "@/hooks/legal/useLgCases";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { formatDateForDisplay } from "@/lib/format-config";
import { NewCaseDialog } from "@/components/legal/lg/NewCaseDialog";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import type { LgCase } from "@/services/legal/lgCaseService";
import { toast } from "sonner";

export default function LgCaseList() {
  const navigate = useNavigate();
  const access = useLgAccess();
  const [params, setParams] = useSearchParams();
  const [newOpen, setNewOpen] = useState(false);

  const search = params.get("q") ?? "";
  const stage = params.get("stage") ?? "";
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";

  const { data: cases = [], isLoading, refetch } = useLgCases({
    search: search || undefined,
    current_stage_code: stage || undefined,
    status_code: status || undefined,
    priority_code: priority || undefined,
  });
  const { data: stages = [] } = useLgReference("LG_CASE_STAGE");
  const { data: statuses = [] } = useLgReference("LG_CASE_STATUS");

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const stageLabel = useMemo(
    () => (code?: string | null) => (code ? (stages.find((s) => s.code === code)?.label ?? code) : "—"),
    [stages],
  );

  const columns: LgColumnDef<LgCase>[] = useMemo(() => [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true, width: 150 } },
    { accessorKey: "court_case_no", header: "Court No", meta: { label: "Court No", width: 140 } },
    { accessorKey: "case_type_code", header: "Type", meta: { label: "Type", width: 120 } },
    {
      accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage", width: 160 },
      cell: ({ getValue }) => stageLabel(getValue<string>()),
    },
    {
      accessorKey: "status_code", header: "Status", meta: { label: "Status", width: 130 },
      cell: ({ getValue }) => <LgStatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: "priority_code", header: "Priority", meta: { label: "Priority", width: 110 },
      cell: ({ getValue }) => <LgStatusBadge status={getValue<string>()} size="sm" />,
    },
    {
      accessorKey: "next_hearing_date", header: "Next Hearing", meta: { label: "Next Hearing", width: 130 },
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? formatDateForDisplay(v) : "—";
      },
    },
    {
      accessorKey: "outstanding_amount_snapshot", header: "Outstanding", meta: { label: "Outstanding", align: "right", width: 130 },
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        return v == null ? "—" : Number(v).toFixed(2);
      },
    },
    {
      accessorKey: "opened_date", header: "Opened", meta: { label: "Opened", width: 120 },
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? formatDateForDisplay(v) : "—";
      },
    },
    {
      accessorKey: "assigned_officer_id", header: "Officer", meta: { label: "Officer", width: 140, defaultHidden: true },
      cell: ({ getValue }) => (getValue<string | null>() ?? "—"),
    },
  ], [stageLabel]);

  const summary = useMemo(() => {
    const open = cases.filter((c) => c.status_code === "OPEN" || c.status_code === "IN_PROGRESS").length;
    const closed = cases.filter((c) => c.status_code === "CLOSED" || c.status_code === "SETTLED").length;
    const overdue = cases.filter((c) => c.next_hearing_date && new Date(c.next_hearing_date) < new Date() && c.status_code !== "CLOSED").length;
    return [
      { label: "Total", value: cases.length, tone: "default" as const },
      { label: "Open", value: open, tone: "info" as const },
      { label: "Closed", value: closed, tone: "muted" as const },
      { label: "Overdue", value: overdue, tone: "danger" as const },
    ];
  }, [cases]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" /> Legal Cases</h1>
            <p className="text-sm text-muted-foreground">All legal cases tracked in lg_case — standardized grid.</p>
          </div>
          <Button
            onClick={() => setNewOpen(true)}
            disabled={!access.can("createCase")}
            title={!access.can("createCase") ? "You do not have permission to create cases" : undefined}
          >
            <Plus className="h-4 w-4 mr-1" /> New Case
          </Button>
        </div>

        <LgDataGrid
          id="lg.cases"
          columns={columns}
          data={cases}
          isLoading={isLoading}
          searchPlaceholder="Search case no, court no, employer, officer…"
          summary={summary}
          defaultSort={[{ id: "opened_date", desc: true }]}
          toolbarFilters={[
            {
              key: "stage", label: "Stage", value: stage, onChange: (v) => setParam("stage", v),
              options: stages.map((s) => ({ value: s.code, label: s.label })),
            },
            {
              key: "status", label: "Status", value: status, onChange: (v) => setParam("status", v),
              options: (statuses.length ? statuses : [
                { code: "OPEN", label: "Open" }, { code: "CLOSED", label: "Closed" }, { code: "SETTLED", label: "Settled" },
              ]).map((s) => ({ value: s.code, label: s.label })),
            },
            {
              key: "priority", label: "Priority", value: priority, onChange: (v) => setParam("priority", v),
              options: ["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => ({ value: p, label: p })),
            },
          ]}
          rowActions={buildLgRowActions<LgCase>({
            onView: (r) => navigate(`/legal/lg/cases/${r.id}`),
            onEdit: (r) => navigate(`/legal/lg/cases/${r.id}?edit=1`),
            canEdit: () => access.can("editCase"),
            onHistory: (r) => navigate(`/legal/lg/cases/${r.id}?tab=history`),
            onDocuments: (r) => navigate(`/legal/lg/cases/${r.id}?tab=documents`),
          })}
          bulkActions={[
            { key: "assign", label: "Assign Officer", onClick: () => { toast.info("Bulk assign coming soon"); } },
            { key: "stage", label: "Update Stage", onClick: () => { toast.info("Bulk stage update coming soon"); } },
            { key: "notice", label: "Generate Notice", onClick: () => { toast.info("Bulk notice generation coming soon"); } },
            { key: "review", label: "Mark Reviewed", onClick: () => { toast.info("Bulk review coming soon"); } },
          ]}
          onRowClick={(r) => navigate(`/legal/lg/cases/${r.id}`)}
          onRefresh={() => refetch()}
          onCreate={access.can("createCase") ? () => setNewOpen(true) : undefined}
          emptyMessage="No cases match these filters."
          exportFilename="legal-cases"
        />
      </div>

      <NewCaseDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
