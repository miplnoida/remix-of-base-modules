import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, ShieldAlert, Search, Download } from "lucide-react";
import { useLegalCapability } from "@/hooks/legal/useLegalCapability";

interface IntegrityRow {
  case_id: string;
  lg_case_no: string;
  source_module: string | null;
  workbasket_code: string | null;
  team_code: string | null;
  assigned_owner_email: string | null;
  assignment_strategy: string | null;
  issue_code: string;
  issue_message: string;
}

const ISSUE_VARIANT: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
  NO_WORKBASKET: "destructive",
  NO_TEAM: "destructive",
  NO_ELIGIBLE_OWNER: "destructive",
  OWNER_NOT_IN_TEAM: "destructive",
  READ_ONLY_OWNER: "destructive",
  WORKBASKET_NO_TEAM: "destructive",
};

export default function LegalAdminAssignmentIntegrity() {
  const { capability, isReady } = useLegalCapability();
  const [filter, setFilter] = useState("");
  const [issueFilter, setIssueFilter] = useState<string>("ALL");

  const query = useQuery({
    queryKey: ["lg-assignment-integrity"],
    enabled: isReady && capability.canRunIntegrityChecks,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("lg_assignment_integrity_report");
      if (error) throw error;
      return (data as unknown as IntegrityRow[]) ?? [];
    },
  });

  const rows = useMemo(() => {
    const all = query.data ?? [];
    return all.filter((r) => {
      if (issueFilter !== "ALL" && r.issue_code !== issueFilter) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        r.lg_case_no?.toLowerCase().includes(q) ||
        (r.source_module ?? "").toLowerCase().includes(q) ||
        (r.workbasket_code ?? "").toLowerCase().includes(q) ||
        (r.assigned_owner_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [query.data, filter, issueFilter]);

  const byIssue = useMemo(() => {
    const m: Record<string, number> = {};
    (query.data ?? []).forEach((r) => {
      m[r.issue_code] = (m[r.issue_code] ?? 0) + 1;
    });
    return m;
  }, [query.data]);

  const exportCsv = () => {
    const header = [
      "lg_case_no",
      "source_module",
      "workbasket_code",
      "team_code",
      "assigned_owner_email",
      "assignment_strategy",
      "issue_code",
      "issue_message",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((h) => {
            const v = (r as any)[h];
            const s = v == null ? "" : String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal-assignment-integrity-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isReady && !capability.canRunIntegrityChecks) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You do not have permission to view assignment integrity.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
            Assignment Integrity
          </h1>
          <p className="text-sm text-muted-foreground">
            Detects routing, workbasket, team, and owner-assignment problems across all legal cases.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Issue summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setIssueFilter("ALL")}
          className={`text-left rounded border p-3 hover:bg-muted ${
            issueFilter === "ALL" ? "border-primary ring-1 ring-primary" : ""
          }`}
        >
          <div className="text-xs text-muted-foreground">Total issues</div>
          <div className="text-2xl font-semibold">{query.data?.length ?? 0}</div>
        </button>
        {Object.entries(byIssue).map(([code, count]) => (
          <button
            key={code}
            onClick={() => setIssueFilter(code)}
            className={`text-left rounded border p-3 hover:bg-muted ${
              issueFilter === code ? "border-primary ring-1 ring-primary" : ""
            }`}
          >
            <div className="text-xs text-muted-foreground">{code.replace(/_/g, " ")}</div>
            <div className="text-2xl font-semibold">{count}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Findings ({rows.length})</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by case no, source, workbasket, owner…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              Loading integrity report…
            </div>
          ) : query.error ? (
            <div className="p-8 text-center text-destructive">
              Failed to load: {(query.error as Error).message}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No issues found{issueFilter !== "ALL" ? " for this filter" : ""}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case No</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Workbasket</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={`${r.case_id}-${r.issue_code}-${idx}`}>
                    <TableCell className="font-mono text-xs">{r.lg_case_no}</TableCell>
                    <TableCell className="text-xs">{r.source_module ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.workbasket_code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.team_code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.assigned_owner_email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.assignment_strategy ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={ISSUE_VARIANT[r.issue_code] ?? "secondary"}>
                          {r.issue_code}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{r.issue_message}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
