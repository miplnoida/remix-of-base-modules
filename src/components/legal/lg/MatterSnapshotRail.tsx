/**
 * EPIC-04A §1 — Persistent right-side snapshot rail.
 *
 * Renders the compact "at-a-glance" view of the matter used by the 360°
 * Legal Matter Workspace. Reuses lgRecoveryHealth + lgRecoveryWorkbenchService
 * (§2 requirement) so numbers here match the Recovery Workbench exactly.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { formatDateForDisplay } from "@/lib/format-config";
import { supabase } from "@/integrations/supabase/client";
import { getRecoveryWorkbenchRowForCase } from "@/services/legal/lgRecoveryWorkbenchService";
import {
  computeAlerts,
  computeHealth,
  computeNextAction,
} from "@/services/legal/lgRecoveryHealth";
import { RecoveryHealthBadge } from "./RecoveryHealthBadge";
import { RecoveryAlertsCell } from "./RecoveryAlertsCell";
import { FileText, Calendar, Wallet, Users, ExternalLink } from "lucide-react";

const sb = supabase as any;
const money = (n: number | null | undefined) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n ?? 0));

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2 text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

export function MatterSnapshotRail({ lgCaseId }: { lgCaseId: string }) {
  const row = useQuery({
    queryKey: ["lg-snapshot-row", lgCaseId],
    queryFn: () => getRecoveryWorkbenchRowForCase(lgCaseId),
    enabled: !!lgCaseId,
    staleTime: 30_000,
  });

  // Key documents (latest 5 links for the case) — for the "Key documents" section.
  const docs = useQuery({
    queryKey: ["lg-snapshot-docs", lgCaseId],
    enabled: !!lgCaseId,
    queryFn: async () => {
      const { data } = await sb
        .from("lg_document_link")
        .select("id, display_name, document_type_code, generated_document_id, created_at")
        .eq("lg_case_id", lgCaseId)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  if (row.isLoading) {
    return (
      <Card><CardContent className="p-4 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent></Card>
    );
  }

  const r = row.data;
  if (!r) {
    return (
      <Card><CardContent className="p-4 text-xs text-muted-foreground">
        Snapshot unavailable.
      </CardContent></Card>
    );
  }

  const health = computeHealth(r);
  const alerts = computeAlerts(r);
  const next = computeNextAction(r);

  return (
    <div className="space-y-3 lg:sticky lg:top-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Party</div>
            <div className="font-semibold text-sm">{r.party_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {r.party_type ?? "—"}{r.party_ref ? ` · ${r.party_ref}` : ""}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <RecoveryHealthBadge health={health} />
            <Badge variant="outline">{next.label}</Badge>
            {r.arrangement_status && r.arrangement_status !== "NONE" && (
              <Badge variant="secondary">Arr: {r.arrangement_status}</Badge>
            )}
            {r.breach_status === "YES" && <Badge variant="destructive">Breached</Badge>}
          </div>

          {alerts.length > 0 && <RecoveryAlertsCell alerts={alerts} />}

          <Separator />

          <section>
            <div className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Financials
            </div>
            <Line label="Total Recoverable" value={money(r.total_recoverable)} />
            <Line label="Paid" value={money(r.total_paid)} />
            <Line label="Outstanding" value={<span className="font-semibold">{money(r.outstanding_balance)}</span>} />
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Recovery</span><span>{r.recovery_pct.toFixed(1)}%</span>
              </div>
              <Progress value={r.recovery_pct} className="h-1.5" />
            </div>
          </section>

          <Separator />

          <section>
            <div className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Schedule
            </div>
            <Line label="Next Hearing" value={r.next_hearing_date ? formatDateForDisplay(r.next_hearing_date) : "—"} />
            <Line label="Next Action" value={r.next_action_date ? formatDateForDisplay(r.next_action_date) : "—"} />
            <Line label="Ageing" value={`${r.ageing_days}d (${r.ageing_bucket})`} />
            <Line label="SLA" value={r.sla_status} />
            <Line label="Open Tasks" value={r.open_task_count} />
          </section>

          <Separator />

          <section>
            <div className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="h-3 w-3" /> Ownership
            </div>
            <Line label="Officer" value={r.assigned_officer_name ?? "—"} />
            <Line label="Team" value={r.team_code ?? "—"} />
            <Line label="Stage" value={r.case_stage ?? "—"} />
            <Line label="Status" value={r.legal_status ?? "—"} />
          </section>

          <Separator />

          <section>
            <div className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Key Documents ({r.document_count})
            </div>
            {docs.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (docs.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents linked.</p>
            ) : (
              <ul className="space-y-1">
                {(docs.data ?? []).map((d) => (
                  <li key={d.id} className="text-xs truncate">
                    <span className="text-muted-foreground">{d.document_type_code ?? "DOC"}: </span>
                    {d.display_name ?? String(d.generated_document_id ?? d.id).slice(0, 12)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Separator />

          <div className="text-[10px] text-muted-foreground">
            Last activity: {r.last_activity ? new Date(r.last_activity).toLocaleString() : "—"}
          </div>

          <Link
            to={`/legal/lg/recovery-workbench?matter=${r.matter_no}`}
            className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
          >
            Open in Recovery Workbench <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default MatterSnapshotRail;
