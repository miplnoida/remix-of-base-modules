import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ListPlus, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchEmployerOutstanding,
  fetchEmployerOutstandingByCode,
  type ProposedAction,
} from "@/services/legal/lgActionDuesService";
import {
  LIABILITY_HEAD_LABEL,
  type LgCaseAction,
  type LiabilityHeadCode,
} from "@/services/legal/lgCaseActionService";

const sb = supabase as any;

type HeadGroup = "SS" | "LV" | "PE" | "OTHER";

function groupOf(code: string | null | undefined): HeadGroup {
  const c = String(code ?? "");
  if (c.startsWith("SS_")) return "SS";
  if (c.startsWith("HSD_LEVY")) return "LV";
  if (c.startsWith("SEVERANCE")) return "PE";
  return "OTHER";
}
function isPenalty(code: string | null | undefined) {
  return /PENALTY|FINE/i.test(String(code ?? ""));
}

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface Props {
  caseId: string;
  caseData: any;
  actions: LgCaseAction[];
  canEdit?: boolean;
  onProposeFromDues?: () => void;
}

const FinancialSnapshotPanel: React.FC<Props> = ({
  caseId,
  caseData,
  actions,
  canEdit,
  onProposeFromDues,
}) => {
  const respKind = String(caseData?.respondent_kind ?? "").toUpperCase();
  const srcMode = String(caseData?.source_mode ?? "").toUpperCase();
  const isInternal = respKind === "INTERNAL" || srcMode === "INTERNAL";
  const isBenefit =
    respKind === "INSURED" ||
    srcMode === "BENEFIT_REFERRAL" ||
    srcMode === "MANUAL_MEMBER" ||
    (!caseData?.employer_id && !!caseData?.person_id);
  const isEmployer = !isBenefit && !isInternal && !!caseData?.employer_id;

  // ── A. Source Dues (employer only) ────────────────────────────────
  const duesQ = useQuery({
    queryKey: ["lg-snapshot-dues", caseData?.employer_id, caseData?.employer_account_no],
    enabled: isEmployer && !!caseData?.employer_id,
    queryFn: async () => {
      const a = await fetchEmployerOutstanding(caseData.employer_id);
      const b = caseData.employer_account_no
        ? await fetchEmployerOutstandingByCode(caseData.employer_account_no)
        : [];
      return [...a, ...b];
    },
  });

  const duesByGroup = useMemo(() => {
    const init: Record<HeadGroup, { principal: number; penalty: number; outstanding: number }> = {
      SS: { principal: 0, penalty: 0, outstanding: 0 },
      LV: { principal: 0, penalty: 0, outstanding: 0 },
      PE: { principal: 0, penalty: 0, outstanding: 0 },
      OTHER: { principal: 0, penalty: 0, outstanding: 0 },
    };
    for (const r of (duesQ.data ?? []) as ProposedAction[]) {
      const g = groupOf(r.liability_head_code);
      init[g].principal += Number(r.principal_amount || 0);
      init[g].penalty += Number(r.penalty_amount || 0);
      init[g].outstanding += Number(r.outstanding_amount || 0);
    }
    return init;
  }, [duesQ.data]);

  const totalDues =
    duesByGroup.SS.outstanding +
    duesByGroup.LV.outstanding +
    duesByGroup.PE.outstanding +
    duesByGroup.OTHER.outstanding;

  // ── B. Legal Action Snapshot ──────────────────────────────────────
  const actionByGroup = useMemo(() => {
    const init: Record<
      HeadGroup,
      { principal: number; penalty: number; cost: number; paid: number; outstanding: number; total: number }
    > = {
      SS: { principal: 0, penalty: 0, cost: 0, paid: 0, outstanding: 0, total: 0 },
      LV: { principal: 0, penalty: 0, cost: 0, paid: 0, outstanding: 0, total: 0 },
      PE: { principal: 0, penalty: 0, cost: 0, paid: 0, outstanding: 0, total: 0 },
      OTHER: { principal: 0, penalty: 0, cost: 0, paid: 0, outstanding: 0, total: 0 },
    };
    for (const a of actions ?? []) {
      const g = groupOf(a.liability_head_code);
      init[g].principal += Number(a.principal_amount || 0);
      init[g].penalty += Number(a.penalty_amount || 0);
      init[g].cost += Number(a.cost_amount || 0);
      init[g].paid += Number(a.amount_paid || 0);
      init[g].outstanding += Number(a.outstanding_amount || 0);
      init[g].total += Number(a.total_amount || 0);
    }
    return init;
  }, [actions]);

  const actionTotals = useMemo(() => {
    const t = { principal: 0, penalty: 0, cost: 0, paid: 0, outstanding: 0, total: 0 };
    for (const g of ["SS", "LV", "PE", "OTHER"] as HeadGroup[]) {
      t.principal += actionByGroup[g].principal;
      t.penalty += actionByGroup[g].penalty;
      t.cost += actionByGroup[g].cost;
      t.paid += actionByGroup[g].paid;
      t.outstanding += actionByGroup[g].outstanding;
      t.total += actionByGroup[g].total;
    }
    return t;
  }, [actionByGroup]);

  // ── C. Recovery (arrangement links) ───────────────────────────────
  const recoveryQ = useQuery({
    queryKey: ["lg-snapshot-recovery", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await sb
        .from("lg_payment_arrangement_link")
        .select("*")
        .eq("lg_case_id", caseId)
        .eq("active", true);
      return data ?? [];
    },
  });
  const recoveryTotals = useMemo(() => {
    const rows = recoveryQ.data ?? [];
    let arranged = 0,
      paid = 0,
      outstanding = 0;
    for (const r of rows) {
      arranged += Number(r.arranged_amount ?? r.amount_covered ?? 0);
      paid += Number(r.paid_amount ?? 0);
      outstanding += Number(r.outstanding_amount ?? 0);
    }
    return { arranged, paid, outstanding, count: rows.length };
  }, [recoveryQ.data]);

  // ── D. Court / Legal Cost (fee charges) ───────────────────────────
  const feesQ = useQuery({
    queryKey: ["lg-snapshot-fees", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await sb
        .from("lg_fee_charge")
        .select("fee_head_code,amount,status")
        .eq("lg_case_id", caseId);
      return data ?? [];
    },
  });
  const feeBuckets = useMemo(() => {
    const b = { filing: 0, legal: 0, judgment: 0, enforcement: 0, other: 0, total: 0 };
    for (const f of feesQ.data ?? []) {
      const code = String(f.fee_head_code ?? "").toUpperCase();
      const amt = Number(f.amount ?? 0);
      b.total += amt;
      if (/FILING|COURT_FEE|FILE/.test(code)) b.filing += amt;
      else if (/JUDGMENT|JUDG/.test(code)) b.judgment += amt;
      else if (/ENFORCE|WRIT|WARRANT|EXEC/.test(code)) b.enforcement += amt;
      else if (/LEGAL|ATTORNEY|COUNSEL/.test(code)) b.legal += amt;
      else b.other += amt;
    }
    return b;
  }, [feesQ.data]);

  // ── Empty-state hint ──────────────────────────────────────────────
  const noActions = (actions ?? []).length === 0;
  const showDuesPrompt = isEmployer && noActions && totalDues > 0;
  const showNoDuesPrompt = isEmployer && noActions && totalDues === 0 && !duesQ.isLoading;

  return (
    <div className="space-y-4">
      {showDuesPrompt && (
        <div className="flex items-start gap-2 p-3 rounded border border-amber-300 bg-amber-50 text-amber-900">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            Pending dues found for this employer. Review and create legal actions to track recovery.
          </div>
          {onProposeFromDues && (
            <Button size="sm" onClick={onProposeFromDues} disabled={!canEdit}>
              <ListPlus className="h-4 w-4 mr-1" /> Propose Actions from Dues
            </Button>
          )}
        </div>
      )}
      {showNoDuesPrompt && (
        <div className="flex items-start gap-2 p-3 rounded border bg-muted text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          No outstanding dues found in arrears tables. Add a manual benefit/legal action if this is
          not an employer liability matter.
        </div>
      )}

      {/* ──────── A. Source Dues ──────── */}
      {isEmployer && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">A. Source Dues Snapshot</CardTitle>
                <CardDescription className="text-xs">
                  Live ledger: <code>cn_c3_reported</code> (reported C3) netted against
                  <code> cn_payment</code>. BEMA arrears ledger included when present.
                </CardDescription>
              </div>
              {onProposeFromDues && totalDues > 0 && (
                <Button size="sm" variant="outline" onClick={onProposeFromDues} disabled={!canEdit}>
                  <ListPlus className="h-4 w-4 mr-1" /> Propose Actions from Dues
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {duesQ.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading source dues…
              </div>
            ) : totalDues === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding dues found.</p>
            ) : (
              <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-2 text-xs">
                <span className="font-medium">Head</span>
                <span className="text-right font-medium">Principal</span>
                <span className="text-right font-medium">Penalty</span>
                <span className="text-right font-medium">Outstanding</span>
                {(
                  [
                    ["SS", "SS Contribution / Penalty"],
                    ["LV", "HSD Levy / Penalty"],
                    ["PE", "Severance / Penalty"],
                  ] as [HeadGroup, string][]
                ).map(([g, label]) => (
                  <React.Fragment key={g}>
                    <span>{label}</span>
                    <span className="text-right">{fmt(duesByGroup[g].principal)}</span>
                    <span className="text-right">{fmt(duesByGroup[g].penalty)}</span>
                    <span className="text-right font-semibold">{fmt(duesByGroup[g].outstanding)}</span>
                  </React.Fragment>
                ))}
                <span className="font-semibold border-t pt-1">Total</span>
                <span className="text-right border-t pt-1">
                  {fmt(duesByGroup.SS.principal + duesByGroup.LV.principal + duesByGroup.PE.principal)}
                </span>
                <span className="text-right border-t pt-1">
                  {fmt(duesByGroup.SS.penalty + duesByGroup.LV.penalty + duesByGroup.PE.penalty)}
                </span>
                <span className="text-right border-t pt-1 font-semibold">{fmt(totalDues)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──────── B. Legal Action Snapshot ──────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">B. Legal Action Snapshot</CardTitle>
          <CardDescription className="text-xs">
            Rolled up from confirmed child actions ({actions?.length ?? 0}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {noActions ? (
            <p className="text-sm text-muted-foreground">No child actions yet.</p>
          ) : (
            <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 text-xs">
              <span className="font-medium">Head</span>
              <span className="text-right font-medium">Principal</span>
              <span className="text-right font-medium">Penalty</span>
              <span className="text-right font-medium">Cost</span>
              <span className="text-right font-medium">Paid</span>
              <span className="text-right font-medium">Outstanding</span>
              <span className="text-right font-medium">Total</span>
              {(["SS", "LV", "PE", "OTHER"] as HeadGroup[])
                .filter((g) => actionByGroup[g].total > 0 || actionByGroup[g].outstanding > 0)
                .map((g) => (
                  <React.Fragment key={g}>
                    <span>
                      {g === "SS"
                        ? "SS"
                        : g === "LV"
                          ? "HSD Levy"
                          : g === "PE"
                            ? "Severance"
                            : "Other / Court / Fee"}
                    </span>
                    <span className="text-right">{fmt(actionByGroup[g].principal)}</span>
                    <span className="text-right">{fmt(actionByGroup[g].penalty)}</span>
                    <span className="text-right">{fmt(actionByGroup[g].cost)}</span>
                    <span className="text-right">{fmt(actionByGroup[g].paid)}</span>
                    <span className="text-right font-semibold">{fmt(actionByGroup[g].outstanding)}</span>
                    <span className="text-right">{fmt(actionByGroup[g].total)}</span>
                  </React.Fragment>
                ))}
              <span className="font-semibold border-t pt-1">Total</span>
              <span className="text-right border-t pt-1">{fmt(actionTotals.principal)}</span>
              <span className="text-right border-t pt-1">{fmt(actionTotals.penalty)}</span>
              <span className="text-right border-t pt-1">{fmt(actionTotals.cost)}</span>
              <span className="text-right border-t pt-1">{fmt(actionTotals.paid)}</span>
              <span className="text-right border-t pt-1 font-semibold">{fmt(actionTotals.outstanding)}</span>
              <span className="text-right border-t pt-1">{fmt(actionTotals.total)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ──────── C. Recovery ──────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">C. Recovery Snapshot</CardTitle>
          <CardDescription className="text-xs">
            Payment arrangements linked to this case and payments received.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recoveryQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : recoveryTotals.count === 0 ? (
            <p className="text-sm text-muted-foreground">No arrangements linked to this case.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Arrangements</div>
                <div className="font-semibold">{recoveryTotals.count}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Arranged</div>
                <div className="font-semibold">{fmt(recoveryTotals.arranged)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Paid</div>
                <div className="font-semibold">{fmt(recoveryTotals.paid)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Outstanding</div>
                <div className="font-semibold">{fmt(recoveryTotals.outstanding)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ──────── D. Court / Legal Cost ──────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">D. Court / Legal Cost Snapshot</CardTitle>
          <CardDescription className="text-xs">
            Filing fees, legal fees, judgment and enforcement costs (lg_fee_charge).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feesQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : feeBuckets.total === 0 ? (
            <p className="text-sm text-muted-foreground">No fees or costs recorded.</p>
          ) : (
            <div className="grid grid-cols-5 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Filing</div>
                <div className="font-semibold">{fmt(feeBuckets.filing)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Legal</div>
                <div className="font-semibold">{fmt(feeBuckets.legal)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Judgment</div>
                <div className="font-semibold">{fmt(feeBuckets.judgment)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Enforcement</div>
                <div className="font-semibold">{fmt(feeBuckets.enforcement)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-semibold">{fmt(feeBuckets.total)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSnapshotPanel;
