import {
  Inbox,
  UserCheck,
  Users,
  FolderKanban,
  Hourglass,
  ClipboardList,
  CalendarClock,
  AlertTriangle,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Search, Columns3, Download, MoreVertical, AlertTriangle as AlertIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { slaStatusColor, type SlaStatus } from "@/services/legal/legalReferralSlaService";
import type {
  WorkbenchAdapter,
  WorkbenchCardDef,
  WorkbenchQueueDef,
  WorkbenchRowAction,
} from "@/components/enterprise-workbench";
import {
  isTerminal,
  isWaitingOnLegal,
  useLegalReferralsWorkbenchData,
  type ReferralWorkbenchRow,
} from "./useLegalReferralsWorkbenchData";
import { useLegalAssignmentScope } from "./useLegalAssignmentScope";

const STATUS_TONES: Record<string, string> = {
  SUBMITTED_TO_LEGAL: "bg-blue-100 text-blue-800",
  RECEIVED_BY_LEGAL: "bg-blue-100 text-blue-800",
  INFO_REQUESTED: "bg-amber-100 text-amber-800",
  INFO_RESPONDED: "bg-purple-100 text-purple-800",
  UNDER_LEGAL_REVIEW: "bg-purple-100 text-purple-800",
  ACCEPTED: "bg-green-100 text-green-800",
  LEGAL_CASE_CREATED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const PRIORITY_TONES: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  URGENT: "bg-red-100 text-red-800",
  CRITICAL: "bg-red-100 text-red-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-gray-100 text-gray-700",
};

function isHighPriority(r: ReferralWorkbenchRow) {
  const p = (r.priority_code ?? "").toUpperCase();
  return p === "HIGH" || p === "URGENT" || p === "CRITICAL";
}
function isOverdue(r: ReferralWorkbenchRow) {
  if (!r.sla_due_date) return false;
  if (isTerminal(r.status)) return false;
  return new Date(r.sla_due_date).getTime() < Date.now() && r.sla_status !== "ESCALATED";
}
function isBreached(r: ReferralWorkbenchRow) {
  return r.sla_status === "ESCALATED";
}
function isDueToday(r: ReferralWorkbenchRow) {
  if (!r.sla_due_date) return false;
  const d = new Date(r.sla_due_date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
function isWaitingOnSource(r: ReferralWorkbenchRow) {
  return r.pending_info_request_count > 0 || r.status === "INFO_REQUESTED";
}

const DEFAULT_COLUMNS: Array<{ key: string; label: string; default?: boolean }> = [
  { key: "referral_no", label: "Referral No", default: true },
  { key: "matter_type", label: "Matter Type", default: true },
  { key: "origin_department", label: "Origin", default: true },
  { key: "primary_entity", label: "Primary Entity", default: true },
  { key: "assigned_workbasket_code", label: "Workbasket", default: true },
  { key: "assigned_team_code", label: "Team", default: true },
  { key: "assigned_officer_code", label: "Officer", default: true },
  { key: "priority_code", label: "Priority", default: true },
  { key: "current_stage", label: "Stage", default: true },
  { key: "sla_status", label: "SLA Status", default: true },
  { key: "sla_due_date", label: "SLA Due", default: true },
  { key: "days_remaining", label: "Days Left", default: true },
  { key: "last_activity_at", label: "Last Activity", default: true },
  { key: "status", label: "Status", default: true },
];

function buildRowLink(r: ReferralWorkbenchRow) {
  const anyR = r as any;
  const wsUrl = r.workspace?.navigation?.open_url;
  if (wsUrl) return wsUrl;
  if (anyR.legal_case_id) return `/legal/cases/${anyR.legal_case_id}`;
  if (anyR.lg_intake_id) return `/legal/cases/intake/${anyR.lg_intake_id}`;
  return `/legal/referrals-workbench`;
}

/** Inline grid used by the workbench. Reuses LgDataGrid-style controls. */
function WorkbenchReferralGrid({
  rows,
  isLoading,
  isError,
  errorMessage,
  onRefresh,
  onRowAction,
}: {
  rows: ReferralWorkbenchRow[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRefresh: () => void;
  onRowAction: (r: ReferralWorkbenchRow) => WorkbenchRowAction<ReferralWorkbenchRow>[];
}) {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.key, c.default !== false]))
  );
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [
        r.referral_no, r.source_reference_no, r.submitted_by,
        r.primary_entity_id, r.assigned_officer_code, r.assigned_team_code,
        r.assigned_workbasket_code, r.matter_type,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isCol = (k: string) => visible[k] !== false;

  const exportCsv = () => {
    const cols = DEFAULT_COLUMNS.filter((c) => isCol(c.key));
    const header = cols.map((c) => c.label).join(",");
    const lines = filtered.map((r) =>
      cols
        .map((c) => {
          let v: any = (r as any)[c.key];
          if (c.key === "primary_entity") v = `${r.primary_entity_type ?? ""}:${r.primary_entity_id ?? ""}`;
          const s = v == null ? "" : String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal-referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search referral, officer, team, entity…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Columns3 className="h-4 w-4" /> Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2 max-h-72 overflow-auto">
              {DEFAULT_COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={isCol(c.key)}
                    onCheckedChange={(v) => setVisible((p) => ({ ...p, [c.key]: !!v }))}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1">
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {isError ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-destructive">
          <AlertIcon className="h-8 w-8" />
          <div>{errorMessage ?? "Failed to load referrals."}</div>
          <Button variant="outline" onClick={onRefresh}>Retry</Button>
        </Card>
      ) : (
        <div className="overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {DEFAULT_COLUMNS.filter((c) => isCol(c.key)).map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={DEFAULT_COLUMNS.length + 1}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={DEFAULT_COLUMNS.length + 1}
                    className="text-center text-muted-foreground py-10"
                  >
                    No referrals in this queue.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && pageRows.map((r) => {
                const actions = onRowAction(r);
                const sla: SlaStatus = (r.sla_status as SlaStatus) ?? "ON_TIME";
                return (
                  <TableRow key={r.id}>
                    {isCol("referral_no") && (
                      <TableCell className="font-medium">
                        <Link to={buildRowLink(r)} className="text-primary hover:underline">
                          {r.referral_no}
                        </Link>
                      </TableCell>
                    )}
                    {isCol("matter_type") && <TableCell>{r.matter_type ?? "—"}</TableCell>}
                    {isCol("origin_department") && (
                      <TableCell><Badge variant="outline">{r.origin_department}</Badge></TableCell>
                    )}
                    {isCol("primary_entity") && (
                      <TableCell className="text-sm">
                        <div className="font-medium">{r.primary_display_name ?? "Not linked"}</div>
                        {r.primary_entity_type && (
                          <div className="text-xs text-muted-foreground">{r.primary_entity_type}</div>
                        )}
                      </TableCell>
                    )}
                    {isCol("assigned_workbasket_code") && (
                      <TableCell className="text-sm">{r.assigned_workbasket_code ?? <span className="text-muted-foreground">Pending assignment</span>}</TableCell>
                    )}
                    {isCol("assigned_team_code") && (
                      <TableCell className="text-sm">{r.assigned_team_code ?? <span className="text-muted-foreground">Pending assignment</span>}</TableCell>
                    )}
                    {isCol("assigned_officer_code") && (
                      <TableCell className="text-sm">{r.assigned_officer_code ?? <span className="text-muted-foreground">Pending assignment</span>}</TableCell>
                    )}
                    {isCol("priority_code") && (
                      <TableCell>
                        {r.priority_code ? (
                          <Badge className={PRIORITY_TONES[r.priority_code.toUpperCase()] ?? ""}>
                            {r.priority_code}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                    )}
                    {isCol("current_stage") && <TableCell>{r.current_stage ?? "—"}</TableCell>}
                    {isCol("sla_status") && (
                      <TableCell>
                        {r.sla_due_date ? (
                          <Badge className={slaStatusColor(sla)}>
                            {sla.replace("_", " ")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    )}
                    {isCol("sla_due_date") && (
                      <TableCell className="text-xs">
                        {r.sla_due_date ? new Date(r.sla_due_date).toLocaleDateString() : "—"}
                      </TableCell>
                    )}
                    {isCol("days_remaining") && (
                      <TableCell className="text-xs tabular-nums">
                        {r.days_remaining == null
                          ? "—"
                          : r.days_remaining < 0
                            ? <span className="text-destructive">{r.days_remaining}d</span>
                            : `${r.days_remaining}d`}
                      </TableCell>
                    )}
                    {isCol("last_activity_at") && (
                      <TableCell className="text-xs">
                        {new Date(r.last_activity_at).toLocaleString()}
                      </TableCell>
                    )}
                    {isCol("status") && (
                      <TableCell>
                        <Badge className={STATUS_TONES[r.status] ?? ""}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {actions.length === 0 ? "—" : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((a) => (
                              <DropdownMenuItem
                                key={a.id}
                                onClick={() => a.onSelect(r)}
                                className={a.destructive ? "text-destructive" : undefined}
                              >
                                {a.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <span>Page {safePage} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

export interface LegalReferralsAdapterOptions {
  onRequestInfo: (row: ReferralWorkbenchRow) => void;
  onView: (row: ReferralWorkbenchRow) => void;
  onAccept?: (row: ReferralWorkbenchRow) => void;
  onReject?: (row: ReferralWorkbenchRow) => void;
  onClose?: (row: ReferralWorkbenchRow) => void;
  onEscalate?: (row: ReferralWorkbenchRow) => void;
  onReassign?: (row: ReferralWorkbenchRow) => void;
  onCreateIntake?: (row: ReferralWorkbenchRow) => void;
  onCreateCase?: (row: ReferralWorkbenchRow) => void;
  onAssignOfficer?: (row: ReferralWorkbenchRow) => void;
  /**
   * Optional display label overrides supplied by the caller from the
   * Enterprise Context Resolver. Never hardcode "Legal" / "Legal Department"
   * here — keep the adapter agnostic to the resolved module / department.
   */
  moduleName?: string;
  departmentName?: string;
}

const TERMINAL_STATUSES = new Set(["REJECTED", "CLOSED", "LEGAL_CASE_CREATED"]);

export function createLegalReferralsAdapter(
  opts: LegalReferralsAdapterOptions
): WorkbenchAdapter<ReferralWorkbenchRow> {
  const moduleName = opts.moduleName?.trim() || "Legal";
  const departmentName = opts.departmentName?.trim() || "Legal Department";

  const cards: WorkbenchCardDef<ReferralWorkbenchRow>[] = [
    { id: "new",            label: "New Referrals",          icon: Inbox,          tone: "info",    predicate: (r) => r.status === "SUBMITTED_TO_LEGAL" },
    { id: "mine",           label: "Assigned to Me",         icon: UserCheck,      tone: "info",    predicate: (r, s) => !!s.userCode && r.assigned_officer_code === s.userCode, switchToQueue: "my" },
    { id: "team",           label: "Assigned to My Team",    icon: Users,                          predicate: (r, s) => !!r.assigned_team_code && s.teamCodes.includes(r.assigned_team_code), switchToQueue: "team" },
    { id: "workbasket",     label: "Assigned to Workbasket", icon: FolderKanban,                   predicate: (r, s) => !!r.assigned_workbasket_code && s.workbasketCodes.includes(r.assigned_workbasket_code), switchToQueue: "workbasket" },
    { id: "waiting_source", label: "Waiting on Source",      icon: Hourglass,      tone: "warning", predicate: isWaitingOnSource, switchToQueue: "waiting_source" },
    { id: "waiting_legal",  label: `Waiting on ${moduleName}`, icon: ClipboardList,                predicate: (r) => isWaitingOnLegal(r.status), switchToQueue: "waiting_legal" },
    { id: "due_today",      label: "Due Today",              icon: CalendarClock,  tone: "warning", predicate: isDueToday },
    { id: "overdue",        label: "Overdue",                icon: AlertTriangle,  tone: "danger",  predicate: isOverdue, switchToQueue: "overdue" },
    { id: "breached",       label: "SLA Breached",           icon: ShieldAlert,    tone: "danger",  predicate: isBreached, switchToQueue: "breached" },
    { id: "high_priority",  label: "High Priority",          icon: Flame,          tone: "danger",  predicate: isHighPriority },
  ];

  const queues: WorkbenchQueueDef<ReferralWorkbenchRow>[] = [
    { id: "my",             label: "My Queue",         predicate: (r, s) => !!s.userCode && r.assigned_officer_code === s.userCode && !isTerminal(r.status), isDefault: true },
    { id: "team",           label: "Team Queue",       predicate: (r, s) => !!r.assigned_team_code && s.teamCodes.includes(r.assigned_team_code) && !r.assigned_officer_code && !isTerminal(r.status) },
    { id: "workbasket",     label: "Workbasket Queue", predicate: (r, s) => !!r.assigned_workbasket_code && s.workbasketCodes.includes(r.assigned_workbasket_code) && !r.assigned_team_code && !r.assigned_officer_code && !isTerminal(r.status) },
    { id: "waiting_source", label: "Waiting on Source", predicate: (r) => isWaitingOnSource(r) && !isTerminal(r.status) },
    { id: "waiting_legal",  label: `Waiting on ${moduleName}`,  predicate: (r) => isWaitingOnLegal(r.status) },
    { id: "overdue",        label: "Overdue",          predicate: isOverdue },
    { id: "breached",       label: "SLA Breached",     predicate: isBreached },
    { id: "completed",      label: "Completed",        predicate: (r) => isTerminal(r.status) },
  ];

  return {
    title: `${moduleName} Referrals Workbench`,
    subtitle: `Assignment + SLA driven operational dashboard for ${departmentName}. Source department is a filter, not a navigation tab.`,
    useRows: useLegalReferralsWorkbenchData,
    useScope: useLegalAssignmentScope,
    getRowId: (r) => r.id,
    queues,
    cards,
    filterChips: [
      {
        id: "source_module",
        label: "Source",
        options: [
          { value: "BENEFITS", label: "Benefits" },
          { value: "COMPLIANCE", label: "Compliance" },
        ],
        predicate: (r, v) => r.source_module === v,
      },
    ],
    // Row-level lifecycle actions. Every menu item is gated by:
    //   - Legal workspace permissions (can_accept, can_reassign, …)
    //   - The state machine (terminal statuses hide all mutating actions)
    // Actions requiring rich context (letter generation, party edits) still
    // live on the detail page — this menu covers the workbench-safe lifecycle.
    actions: (r) => {
      const list: WorkbenchRowAction<ReferralWorkbenchRow>[] = [];
      const ws = r.workspace;
      const perms = ws.permissions;
      const nav = ws.navigation;
      const terminal = TERMINAL_STATUSES.has(r.status);

      list.push({ id: "view", label: "Open", onSelect: opts.onView });

      if (nav.case_url && ws.identity.lifecycle_object_type !== "CASE") {
        list.push({ id: "open_case", label: "Open Case", onSelect: (row) => { window.location.assign(row.workspace.navigation.case_url!); } });
      }
      if (nav.source_url) {
        list.push({ id: "view_source", label: "View Source", onSelect: (row) => { window.location.assign(row.workspace.navigation.source_url!); } });
      }

      if (!terminal && perms.can_accept && opts.onAccept) {
        list.push({ id: "accept", label: "Accept Referral", onSelect: opts.onAccept });
      }
      if (!terminal && perms.can_request_info) {
        list.push({ id: "request_info", label: "Request Information", onSelect: opts.onRequestInfo });
      }
      if (!terminal && perms.can_create_case && opts.onCreateIntake && !r.lg_intake_id) {
        list.push({ id: "create_intake", label: "Create Intake", onSelect: opts.onCreateIntake });
      }
      if (!terminal && perms.can_create_case && opts.onCreateCase && r.lg_intake_id && !r.legal_case_id) {
        list.push({ id: "create_case", label: "Create Legal Case", onSelect: opts.onCreateCase });
      }
      if (!terminal && perms.can_reassign && opts.onAssignOfficer && r.legal_case_id) {
        list.push({ id: "assign_officer", label: "Assign Officer", onSelect: opts.onAssignOfficer });
      }
      if (!terminal && perms.can_reassign && opts.onReassign) {
        list.push({ id: "reassign", label: "Reassign Team / Workbasket", onSelect: opts.onReassign });
      }
      if (!terminal && opts.onEscalate) {
        list.push({ id: "escalate", label: "Escalate", onSelect: opts.onEscalate });
      }
      if (!terminal && perms.can_reject && opts.onReject) {
        list.push({ id: "reject", label: "Reject Referral", onSelect: opts.onReject, destructive: true });
      }
      if (!terminal && opts.onClose) {
        list.push({ id: "close", label: "Close Referral", onSelect: opts.onClose, destructive: true });
      }
      return list;
    },
    renderGrid: (args) => <WorkbenchReferralGrid {...args} />,
  };
}
