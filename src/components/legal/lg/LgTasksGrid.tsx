import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowRightLeft, AlertTriangle, XCircle, Undo2, Pencil, History, ListChecks,
} from "lucide-react";
import { LgDataGrid, type LgColumnDef, type LgRowAction, type LgToolbarFilter, type LgSummaryChip } from "@/components/legal/grid";
import { useUserCode } from "@/hooks/useUserCode";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import {
  useLgTasks, useCompleteLgTask, useCloseLgTask, useReopenLgTask,
} from "@/hooks/legal/useLgWorkflow";
import { useLgTaskPermissions } from "@/hooks/legal/useLgTaskPermissions";
import {
  LG_TASK_SLA_LABEL, LG_TASK_STATUS_LABEL, LG_TASK_PRIORITY_LABEL, isTerminalTaskStatus, priorityRank,
  type LgTaskSlaStatus,
} from "@/services/legal/lgTaskSla";
import { LgTaskDialog } from "./LgTaskDialog";
import { LgTaskEscalateDialog } from "./LgTaskEscalateDialog";
import { LgTaskAuditDialog } from "./LgTaskAuditDialog";
import { formatDateForDisplay } from "@/lib/format-config";

interface Props {
  caseId?: string;
  myOnly?: boolean;
  teamCode?: string;
  gridId?: string;
  showCaseColumn?: boolean;
  showCreate?: boolean;
}

const SLA_VARIANT: Record<LgTaskSlaStatus, "default" | "secondary" | "outline" | "destructive"> = {
  ON_TIME: "secondary",
  AT_RISK: "outline",
  OVERDUE: "destructive",
  ESCALATED: "destructive",
  CLOSED: "outline",
};

export function LgTasksGrid({
  caseId, myOnly, teamCode, gridId = "tasks", showCaseColumn = true, showCreate = true,
}: Props) {
  const { user } = useSupabaseAuth();
  const { userCode } = useUserCode();
  const perms = useLgTaskPermissions();
  const [statusFilter, setStatusFilter] = useState<string>("__ACTIVE__");
  const [slaFilter, setSlaFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  const filter = useMemo(() => ({
    caseId,
    assignedTo: myOnly ? user?.id : undefined,
    teamCode: teamCode || undefined,
    status: statusFilter === "__ACTIVE__" || statusFilter === "__ALL__" ? undefined : statusFilter,
    activeOnly: statusFilter === "__ACTIVE__",
    priority: priorityFilter || undefined,
    slaStatus: slaFilter || undefined,
  }), [caseId, myOnly, teamCode, user?.id, statusFilter, slaFilter, priorityFilter]);

  const { data = [], isLoading } = useLgTasks(filter);
  const complete = useCompleteLgTask();
  const close = useCloseLgTask();
  const reopen = useReopenLgTask();

  const [editRow, setEditRow] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [escalateRow, setEscalateRow] = useState<any | null>(null);
  const [auditRow, setAuditRow] = useState<any | null>(null);

  const chips: LgSummaryChip[] = useMemo(() => {
    const byStatus = (s: LgTaskSlaStatus) => data.filter((t: any) => t.sla_status === s).length;
    return [
      { label: "Total", value: data.length },
      { label: "On Time", value: byStatus("ON_TIME"), tone: "success" },
      { label: "At Risk", value: byStatus("AT_RISK"), tone: "warning" },
      { label: "Overdue", value: byStatus("OVERDUE"), tone: "danger" },
      { label: "Escalated", value: byStatus("ESCALATED"), tone: "danger" },
    ];
  }, [data]);

  const toolbarFilters: LgToolbarFilter[] = [
    {
      key: "status", label: "Status", value: statusFilter,
      options: [
        { label: "Active", value: "__ACTIVE__" },
        { label: "All", value: "__ALL__" },
        ...Object.entries(LG_TASK_STATUS_LABEL).map(([v, l]) => ({ label: l, value: v })),
      ],
      onChange: (v) => setStatusFilter(v || "__ACTIVE__"),
    },
    {
      key: "sla", label: "SLA", value: slaFilter,
      options: Object.entries(LG_TASK_SLA_LABEL).map(([v, l]) => ({ label: l, value: v })),
      onChange: setSlaFilter,
    },
    {
      key: "priority", label: "Priority", value: priorityFilter,
      options: Object.entries(LG_TASK_PRIORITY_LABEL).map(([v, l]) => ({ label: l, value: v })),
      onChange: setPriorityFilter,
    },
  ];

  const columns: LgColumnDef<any>[] = useMemo(() => {
    const cols: LgColumnDef<any>[] = [
      {
        id: "title",
        header: "Task",
        accessorKey: "title",
        meta: { label: "Task", pinLeft: true },
        cell: ({ row }) => {
          const t = row.original as any;
          return (
            <div className="min-w-0">
              <div className="font-medium truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {t.task_type_code}{t.description ? ` · ${String(t.description).slice(0, 80)}` : ""}
              </div>
            </div>
          );
        },
      },
    ];
    if (showCaseColumn) {
      cols.push({
        id: "case", header: "Case", meta: { label: "Case" },
        accessorFn: (t: any) => t.lg_case?.lg_case_no ?? "—",
      });
    }
    cols.push(
      {
        id: "priority", header: "Priority", meta: { label: "Priority" },
        accessorFn: (t: any) => priorityRank(t.priority_code),
        cell: ({ row }) => {
          const t = row.original as any;
          return <Badge variant="outline">{LG_TASK_PRIORITY_LABEL[t.priority_code] ?? t.priority_code}</Badge>;
        },
      },
      {
        id: "due_date", header: "Due", meta: { label: "Due" }, accessorKey: "due_date",
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? formatDateForDisplay(v) : "—";
        },
      },
      {
        id: "assignee", header: "Assignee", meta: { label: "Assignee" },
        accessorFn: (t: any) => t.assigned_to_user_id ?? t.assigned_team_code ?? "",
        cell: ({ row }) => {
          const t = row.original as any;
          if (t.assigned_to_user_id) return <span className="font-mono text-xs">{String(t.assigned_to_user_id).slice(0, 8)}…</span>;
          if (t.assigned_team_code) return <Badge variant="outline">Team: {t.assigned_team_code}</Badge>;
          return <span className="text-muted-foreground">Unassigned</span>;
        },
      },
      {
        id: "sla", header: "SLA", meta: { label: "SLA" }, accessorKey: "sla_status",
        cell: ({ getValue }) => {
          const s = ((getValue() as string) ?? "ON_TIME") as LgTaskSlaStatus;
          return <Badge variant={SLA_VARIANT[s]}>{LG_TASK_SLA_LABEL[s]}</Badge>;
        },
      },
      {
        id: "status", header: "Status", meta: { label: "Status" }, accessorKey: "status",
        cell: ({ getValue }) => {
          const s = String(getValue() ?? "");
          return <Badge variant={isTerminalTaskStatus(s) ? "outline" : "default"}>{LG_TASK_STATUS_LABEL[s] ?? s}</Badge>;
        },
      },
    );
    return cols;
  }, [showCaseColumn]);

  const rowActions: LgRowAction<any>[] = [
    {
      key: "complete", label: "Complete", icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      onClick: async (t) => {
        if (!(perms.canComplete || t.assigned_to_user_id === user?.id)) {
          toast.error("You do not have permission to complete this task"); return;
        }
        try { await complete.mutateAsync({ id: t.id, userCode: userCode ?? null }); toast.success("Task completed"); }
        catch (e: any) { toast.error(e.message ?? "Failed"); }
      },
      disabled: (t) => isTerminalTaskStatus(t.status),
    },
    {
      key: "edit", label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: (t) => { if (!perms.canEdit) { toast.error("No permission to edit"); return; } setEditRow(t); },
      disabled: (t) => isTerminalTaskStatus(t.status),
    },
    {
      key: "reassign", label: "Reassign", icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
      onClick: (t) => { if (!perms.canReassign) { toast.error("No permission to reassign"); return; } setEditRow(t); },
      disabled: (t) => isTerminalTaskStatus(t.status),
    },
    {
      key: "escalate", label: "Escalate", icon: <AlertTriangle className="h-3.5 w-3.5" />,
      onClick: (t) => { if (!perms.canEscalate) { toast.error("No permission to escalate"); return; } setEscalateRow(t); },
      disabled: (t) => isTerminalTaskStatus(t.status),
    },
    {
      key: "close", label: "Close", icon: <XCircle className="h-3.5 w-3.5" />, variant: "destructive",
      onClick: async (t) => {
        if (!perms.canClose) { toast.error("No permission to close"); return; }
        const reason = window.prompt("Reason for closing (optional):") ?? "";
        try { await close.mutateAsync({ id: t.id, reason: reason || null, actor: userCode ?? null }); toast.success("Task closed"); }
        catch (e: any) { toast.error(e.message ?? "Failed"); }
      },
      disabled: (t) => isTerminalTaskStatus(t.status),
    },
    {
      key: "reopen", label: "Reopen", icon: <Undo2 className="h-3.5 w-3.5" />,
      onClick: async (t) => {
        if (!perms.canReopen) { toast.error("No permission to reopen"); return; }
        try { await reopen.mutateAsync({ id: t.id, actor: userCode ?? null }); toast.success("Task reopened"); }
        catch (e: any) { toast.error(e.message ?? "Failed"); }
      },
      disabled: (t) => !isTerminalTaskStatus(t.status),
    },
    {
      key: "audit", label: "History", icon: <History className="h-3.5 w-3.5" />,
      onClick: (t) => setAuditRow(t),
    },
  ];

  const canShowCreate = showCreate && perms.canCreate && !!caseId;

  return (
    <>
      <LgDataGrid
        id={gridId}
        columns={columns}
        data={data}
        getRowId={(r: any) => r.id}
        isLoading={isLoading}
        summary={chips}
        toolbarFilters={toolbarFilters}
        rowActions={rowActions}
        toolbarExtras={canShowCreate ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <ListChecks className="h-4 w-4 mr-1" /> Add Task
          </Button>
        ) : undefined}
        emptyMessage="No tasks match the current filters."
        searchPlaceholder="Search tasks..."
      />

      {caseId && createOpen && (
        <LgTaskDialog open={createOpen} onOpenChange={setCreateOpen} lgCaseId={caseId} mode="create" />
      )}
      {editRow && (
        <LgTaskDialog
          open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}
          lgCaseId={editRow.lg_case_id} mode="edit" task={editRow}
        />
      )}
      {escalateRow && (
        <LgTaskEscalateDialog open={!!escalateRow} onOpenChange={(o) => !o && setEscalateRow(null)} task={escalateRow} />
      )}
      {auditRow && (
        <LgTaskAuditDialog open={!!auditRow} onOpenChange={(o) => !o && setAuditRow(null)} task={auditRow} />
      )}
    </>
  );
}

export default LgTasksGrid;
