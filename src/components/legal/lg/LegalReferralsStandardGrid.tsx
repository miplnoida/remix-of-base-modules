import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, RefreshCcw, MoreVertical, Search, Columns3, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { computeSlaStatus, slaStatusColor, type SlaStatus } from "@/services/legal/legalReferralSlaService";

export interface StandardReferralRow {
  id: string;
  referral_no: string;
  source_module: string;
  source_reference_no: string | null;
  primary_entity_type: string | null;
  primary_entity_id: string | null;
  matter_type?: string | null;
  submitted_by: string | null;
  submitted_at?: string | null;
  status: string;
  legal_workbasket_code: string | null;
  legal_team_code: string | null;
  pending_info_request_count: number;
  sla_due_date?: string | null;
  sla_status?: SlaStatus | null;
  reminder_at?: string | null;
  escalation_at?: string | null;
  last_status_at: string;
  created_at: string;
}

export interface GridAction<T> {
  label: string;
  onClick: (row: T) => void;
  hidden?: (row: T) => boolean;
}

interface Props<T extends StandardReferralRow> {
  rows: T[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  actions?: GridAction<T>[];
  showSlaColumns?: boolean;
  statusOptions?: string[];
  buildRowLink?: (row: T) => string;
  emptyMessage?: string;
}

const STATUS_COLORS: Record<string, string> = {
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

const ALL_COLUMNS = [
  { key: "referral_no", label: "Referral No", default: true },
  { key: "source_module", label: "Source", default: true },
  { key: "source_reference_no", label: "Source Ref", default: true },
  { key: "primary_entity", label: "Primary Entity", default: true },
  { key: "matter_type", label: "Matter", default: false },
  { key: "submitted_by", label: "Submitted By", default: true },
  { key: "submitted_at", label: "Submitted", default: false },
  { key: "status", label: "Status", default: true },
  { key: "legal_workbasket_code", label: "Workbasket", default: false },
  { key: "legal_team_code", label: "Team", default: false },
  { key: "pending_info_request_count", label: "Pending Info", default: true },
  { key: "sla_due_date", label: "SLA Due", default: true },
  { key: "sla_status", label: "SLA", default: true },
  { key: "last_status_at", label: "Last Update", default: true },
];

export function LegalReferralsStandardGrid<T extends StandardReferralRow>({
  rows,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onRefresh,
  actions = [],
  showSlaColumns = true,
  statusOptions = [],
  buildRowLink,
  emptyMessage = "No referrals.",
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [statusChip, setStatusChip] = useState<string | "ALL">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c.default]))
  );
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const t = search.toLowerCase();
        if (!(
          (r.referral_no ?? "").toLowerCase().includes(t) ||
          (r.source_reference_no ?? "").toLowerCase().includes(t) ||
          (r.submitted_by ?? "").toLowerCase().includes(t) ||
          (r.primary_entity_id ?? "").toLowerCase().includes(t)
        )) return false;
      }
      if (statusChip !== "ALL" && r.status !== statusChip) return false;
      if (fromDate && new Date(r.last_status_at) < new Date(fromDate)) return false;
      if (toDate && new Date(r.last_status_at) > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [rows, search, statusChip, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const cols = ALL_COLUMNS.filter((c) => visible[c.key]);
    const header = cols.map((c) => c.label).join(",");
    const lines = filtered.map((r) =>
      cols.map((c) => {
        const v = (r as any)[c.key];
        const s = v == null ? "" : String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal-referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isCol = (k: string) => visible[k] !== false;

  return (
    <Card className="p-4 space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search referral no, source ref, submitter..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {statusOptions.length > 0 && (
          <Select value={statusChip} onValueChange={(v) => { setStatusChip(v as any); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input type="date" className="w-[150px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" />
        <Input type="date" className="w-[150px]" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1"><Columns3 className="h-4 w-4" /> Columns</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2 max-h-72 overflow-auto">
              {ALL_COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isCol(c.key)} onCheckedChange={(v) => setVisible((p) => ({ ...p, [c.key]: !!v }))} />
                  {c.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1"><Download className="h-4 w-4" /> Export</Button>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1"><RefreshCcw className="h-4 w-4" /> Refresh</Button>
        )}
      </div>

      {/* Body */}
      {isError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-destructive">
          <AlertTriangle className="h-8 w-8" />
          <div>{errorMessage ?? "Failed to load referrals."}</div>
          {onRetry && <Button variant="outline" onClick={onRetry}>Retry</Button>}
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isCol("referral_no") && <TableHead>Referral No</TableHead>}
                {isCol("source_module") && <TableHead>Source</TableHead>}
                {isCol("source_reference_no") && <TableHead>Source Ref</TableHead>}
                {isCol("primary_entity") && <TableHead>Primary Entity</TableHead>}
                {isCol("matter_type") && <TableHead>Matter</TableHead>}
                {isCol("submitted_by") && <TableHead>Submitted By</TableHead>}
                {isCol("submitted_at") && <TableHead>Submitted</TableHead>}
                {isCol("status") && <TableHead>Status</TableHead>}
                {isCol("legal_workbasket_code") && <TableHead>Workbasket</TableHead>}
                {isCol("legal_team_code") && <TableHead>Team</TableHead>}
                {isCol("pending_info_request_count") && <TableHead>Pending</TableHead>}
                {showSlaColumns && isCol("sla_due_date") && <TableHead>SLA Due</TableHead>}
                {showSlaColumns && isCol("sla_status") && <TableHead>SLA</TableHead>}
                {isCol("last_status_at") && <TableHead>Last Update</TableHead>}
                {actions.length > 0 && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={15}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && pageRows.length === 0 && (
                <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-8">{emptyMessage}</TableCell></TableRow>
              )}
              {!isLoading && pageRows.map((r) => {
                const sla: SlaStatus = (r.sla_status as SlaStatus) ?? computeSlaStatus({
                  status: r.status,
                  due_date: r.sla_due_date ?? null,
                  reminder_at: r.reminder_at ?? null,
                  escalation_at: r.escalation_at ?? null,
                });
                const visibleActions = actions.filter((a) => !a.hidden?.(r));
                return (
                  <TableRow key={r.id}>
                    {isCol("referral_no") && (
                      <TableCell className="font-medium">
                        {buildRowLink ? (
                          <Link to={buildRowLink(r)} className="text-primary hover:underline">{r.referral_no}</Link>
                        ) : r.referral_no}
                      </TableCell>
                    )}
                    {isCol("source_module") && <TableCell><Badge variant="outline">{r.source_module}</Badge></TableCell>}
                    {isCol("source_reference_no") && <TableCell>{r.source_reference_no ?? "—"}</TableCell>}
                    {isCol("primary_entity") && (
                      <TableCell className="text-sm">
                        {r.primary_entity_type ? <span className="text-muted-foreground">{r.primary_entity_type}:</span> : null} {r.primary_entity_id ?? "—"}
                      </TableCell>
                    )}
                    {isCol("matter_type") && <TableCell>{r.matter_type ?? "—"}</TableCell>}
                    {isCol("submitted_by") && <TableCell>{r.submitted_by ?? "—"}</TableCell>}
                    {isCol("submitted_at") && <TableCell className="text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : (r.created_at ? new Date(r.created_at).toLocaleString() : "—")}</TableCell>}
                    {isCol("status") && <TableCell><Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status.replace(/_/g, " ")}</Badge></TableCell>}
                    {isCol("legal_workbasket_code") && <TableCell>{r.legal_workbasket_code ?? "—"}</TableCell>}
                    {isCol("legal_team_code") && <TableCell>{r.legal_team_code ?? "—"}</TableCell>}
                    {isCol("pending_info_request_count") && (
                      <TableCell>{(r.pending_info_request_count ?? 0) > 0 ? <Badge variant="destructive">{r.pending_info_request_count}</Badge> : "—"}</TableCell>
                    )}
                    {showSlaColumns && isCol("sla_due_date") && <TableCell className="text-xs">{r.sla_due_date ?? "—"}</TableCell>}
                    {showSlaColumns && isCol("sla_status") && <TableCell><Badge className={slaStatusColor(sla)}>{sla.replace("_", " ")}</Badge></TableCell>}
                    {isCol("last_status_at") && <TableCell className="text-xs">{new Date(r.last_status_at).toLocaleString()}</TableCell>}
                    {actions.length > 0 && (
                      <TableCell className="text-right">
                        {visibleActions.length === 0 ? "—" : visibleActions.length === 1 ? (
                          <Button size="sm" variant="outline" onClick={() => visibleActions[0].onClick(r)}>{visibleActions[0].label}</Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {visibleActions.map((a) => (
                                <DropdownMenuItem key={a.label} onClick={() => a.onClick(r)}>{a.label}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <span>Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>
    </Card>
  );
}
