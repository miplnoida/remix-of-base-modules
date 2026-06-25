import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Wrench, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  listIntegrityIssues,
  repairCreateSourceTask,
  repairResyncStatus,
  repairCloseStaleTasks,
  repairRelinkCase,
  repairRecreateNotification,
  type IntegrityIssue,
} from "@/services/legal/legalReferralIntegrityService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

function SeverityBadge({ s }: { s: IntegrityIssue["issue_severity"] }) {
  if (s === "high") return <Badge variant="destructive">High</Badge>;
  if (s === "medium") return <Badge className="bg-amber-500 hover:bg-amber-500">Medium</Badge>;
  return <Badge variant="secondary">Low</Badge>;
}

export default function LegalAdminReferralIntegrity() {
  const qc = useQueryClient();
  const { profile } = useSupabaseAuth();
  const actor = profile?.user_code ?? "ADMIN";
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["legal-referral-integrity"],
    queryFn: listIntegrityIssues,
  });

  const filtered = useMemo(() => {
    const all = data ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (i) =>
        i.referral_no?.toLowerCase().includes(q) ||
        i.issue_code.toLowerCase().includes(q) ||
        i.issue_message.toLowerCase().includes(q) ||
        (i.source_module ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      high: all.filter((i) => i.issue_severity === "high").length,
      medium: all.filter((i) => i.issue_severity === "medium").length,
    };
  }, [data]);

  async function runRepair(issue: IntegrityIssue) {
    const key = `${issue.referral_id}-${issue.issue_code}-${issue.info_request_id ?? ""}`;
    setBusyKey(key);
    try {
      switch (issue.repair_action) {
        case "CREATE_SOURCE_TASK":
          if (!issue.info_request_id) throw new Error("info_request_id missing");
          await repairCreateSourceTask(issue.info_request_id, actor);
          await repairRecreateNotification(issue.info_request_id).catch(() => null);
          break;
        case "RECREATE_NOTIFICATION":
          if (!issue.info_request_id) throw new Error("info_request_id missing");
          await repairRecreateNotification(issue.info_request_id);
          break;
        case "RESYNC_STATUS":
          await repairResyncStatus(issue.referral_id, actor);
          break;
        case "CLOSE_STALE_TASKS":
          if (!issue.info_request_id) throw new Error("info_request_id missing");
          await repairCloseStaleTasks(issue.info_request_id, actor);
          break;
        case "RELINK_CASE":
          await repairRelinkCase(issue.referral_id, actor);
          break;
        default:
          throw new Error("This issue requires manual fix");
      }
      toast.success("Repair applied");
      qc.invalidateQueries({ queryKey: ["legal-referral-integrity"] });
    } catch (e: any) {
      toast.error("Repair failed", { description: e?.message });
    } finally {
      setBusyKey(null);
    }
  }

  const bulkRepair = useMutation({
    mutationFn: async () => {
      const all = data ?? [];
      const safe = all.filter((i) => i.repair_action !== "MANUAL_FIX");
      let done = 0;
      for (const issue of safe) {
        try {
          await runRepair(issue);
          done++;
        } catch {/* continue */}
      }
      return done;
    },
    onSuccess: (n) => toast.success(`Repaired ${n} issue(s)`),
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" /> Legal Referral Integrity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detects broken Legal referrals (orphan info requests, missing source tasks,
            unsynced status, unlinked legal cases) and offers safe one-click repairs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={counts.total === 0 ? "default" : "destructive"}
                 className={counts.total === 0 ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
            {counts.total === 0
              ? <><CheckCircle2 className="h-3 w-3 mr-1" />Clean</>
              : <><AlertTriangle className="h-3 w-3 mr-1" />{counts.total} issue(s)</>}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-2">Re-run</span>
          </Button>
          <Button size="sm" onClick={() => bulkRepair.mutate()} disabled={!data?.length || bulkRepair.isPending}>
            <Wrench className="h-3.5 w-3.5 mr-2" />Repair All (safe)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total issues" value={counts.total} />
        <Stat label="High severity" value={counts.high} tone="destructive" />
        <Stat label="Medium severity" value={counts.medium} tone="warn" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Detected Issues</CardTitle>
            <CardDescription>Each row is a single referral × issue. Click Repair to fix.</CardDescription>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by referral / code / message…"
            className="w-72"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
              {data?.length === 0 ? "No integrity issues detected." : "No matches for current filter."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referral</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i, idx) => {
                  const key = `${i.referral_id}-${i.issue_code}-${i.info_request_id ?? ""}-${idx}`;
                  const busy = busyKey === `${i.referral_id}-${i.issue_code}-${i.info_request_id ?? ""}`;
                  const manual = i.repair_action === "MANUAL_FIX";
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {i.referral_no}
                          <Link to={`/legal/referrals/${i.referral_id}`} className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{i.source_module ?? <span className="text-destructive">—</span>}</TableCell>
                      <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{i.issue_code}</TableCell>
                      <TableCell><SeverityBadge s={i.issue_severity} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md">{i.issue_message}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={manual ? "outline" : "default"}
                          disabled={busy || manual}
                          onClick={() => runRepair(i)}
                        >
                          {busy
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Wrench className="h-3.5 w-3.5 mr-1" />}
                          {manual ? "Manual" : i.repair_action.replace(/_/g, " ").toLowerCase()}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="py-4 text-sm text-muted-foreground">
          All repair actions are written to <code>legal_referral_audit</code> with{" "}
          <code>event_module = ADMIN</code> and the current user's <code>user_code</code> as the actor.
          No hardcoded users are used.
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "warn" }) {
  const cls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warn"
      ? "text-amber-600"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
