/**
 * EPIC-04A §6 — Matter Completeness indicator.
 *
 * Extends the existing CaseCompletenessPanel by also checking presence of
 * hearing, order and audit trail entries — the 360° workspace items.
 * All checks are read-only Supabase queries; no mock data.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const sb = supabase as any;

interface Props { lgCaseId: string; caseData: any; }

async function countRows(table: string, filter: Record<string, any>): Promise<number> {
  try {
    const q = sb.from(table).select("id", { count: "exact", head: true });
    let x = q;
    for (const [k, v] of Object.entries(filter)) x = x.eq(k, v);
    const { count } = await x;
    return count ?? 0;
  } catch { return 0; }
}

export function MatterCompletenessIndicator({ lgCaseId, caseData }: Props) {
  const q = useQuery({
    queryKey: ["lg-matter-completeness", lgCaseId],
    enabled: !!lgCaseId,
    queryFn: async () => {
      const [parties, actions, docs, hearings, orders, arr, audit] = await Promise.all([
        countRows("lg_case_party", { lg_case_id: lgCaseId }),
        countRows("lg_case_action", { case_id: lgCaseId }),
        countRows("lg_document_link", { lg_case_id: lgCaseId }),
        countRows("lg_hearing", { lg_case_id: lgCaseId }),
        countRows("lg_order", { lg_case_id: lgCaseId }),
        countRows("lg_payment_arrangement_link", { lg_case_id: lgCaseId }),
        countRows("lg_case_activity", { lg_case_id: lgCaseId }),
      ]);
      const hasFinancial = Number(caseData?.claim_amount ?? 0) > 0 || actions > 0;
      return {
        parties: parties > 0,
        financials: hasFinancial,
        documents: docs > 0,
        hearing: hearings > 0,
        order: orders > 0,
        arrangement: arr > 0,
        audit: audit > 0,
      };
    },
    staleTime: 30_000,
  });

  if (q.isLoading || !q.data) {
    return <Card><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>;
  }

  const items: Array<[string, boolean, boolean]> = [
    ["Party", q.data.parties, true],
    ["Financials", q.data.financials, true],
    ["Documents", q.data.documents, true],
    ["Hearing", q.data.hearing, false],
    ["Order", q.data.order, false],
    ["Arrangement", q.data.arrangement, false],
    ["Audit trail", q.data.audit, true],
  ];
  const critical = items.filter(([, , req]) => req);
  const criticalOk = critical.filter(([, ok]) => ok).length;
  const totalOk = items.filter(([, ok]) => ok).length;
  const pct = Math.round((totalOk / items.length) * 100);
  const complete = criticalOk === critical.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Matter Completeness
          {complete ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              Complete · {pct}%
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {critical.length - criticalOk} critical gap{critical.length - criticalOk === 1 ? "" : "s"} · {pct}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={pct} className="h-1.5" />
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {items.map(([label, ok, required]) => (
            <li key={label} className="flex items-center gap-1">
              {ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <XCircle className={`h-3.5 w-3.5 ${required ? "text-destructive" : "text-muted-foreground"}`} />
              )}
              <span className={ok ? "" : (required ? "font-medium text-destructive" : "text-muted-foreground")}>
                {label}{required ? "" : " (optional)"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default MatterCompletenessIndicator;
