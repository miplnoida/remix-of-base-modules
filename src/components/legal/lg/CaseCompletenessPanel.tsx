import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { auditCase, type CaseIntegrityRow } from "@/services/legal/legalCaseIntegrityService";

/**
 * Inline read-only Case Completeness checklist.
 * Mirrors the requirements from "Case completeness validation" in the spec —
 * green when complete, red when blocking gaps remain. Drives the block on
 * Demand-Notice generation and case closure (those gates are enforced by the
 * caller checking `audit.is_clean`).
 */
export default function CaseCompletenessPanel({ lgCaseId }: { lgCaseId: string }) {
  const { data, isLoading } = useQuery<CaseIntegrityRow | null>({
    queryKey: ["lg-case-integrity", lgCaseId],
    enabled: !!lgCaseId,
    queryFn: () => auditCase(lgCaseId),
    staleTime: 30_000,
  });

  if (isLoading) return null;
  if (!data) return null;

  const Row = ({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) => (
    <li className="flex items-start gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      )}
      <div>
        <span className={ok ? "" : "font-medium text-destructive"}>{label}</span>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </li>
  );

  const hasParties = data.parties_count > 0;
  const hasLiabilities = (data.liabilities_count ?? 0) > 0;
  const hasDocs = data.documents_count > 0;
  const hasAmount = ((data.liabilities_assessed ?? 0) > 0) || ((data.claim_amount ?? 0) > 0);
  const hasSource = !!data.source_module;
  const hasRecipientAddress = !data.issues.some((i) => i.code === "NO_RECIPIENT_ADDRESS");
  const amountOk = !data.issues.some((i) => i.code === "ZERO_AMOUNT_VS_SOURCE");
  const docsOk = !data.issues.some((i) => i.code === "MISSING_DOCS");
  const liabOk = !data.issues.some((i) => i.code === "NO_LIABILITIES");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Case Completeness
          {data.is_clean ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Complete</Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.issues.length} issue{data.issues.length === 1 ? "" : "s"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid md:grid-cols-2 gap-x-6 gap-y-2">
          <Row ok={hasSource} label="Source module linked" sub={data.source_module ?? "missing"} />
          <Row ok={hasParties} label={`Parties present (${data.parties_count})`} />
          <Row ok={hasRecipientAddress} label="Recipient has address" sub={hasRecipientAddress ? undefined : "Letters will be blocked"} />
          <Row ok={hasLiabilities && liabOk} label={`Recoverable liabilities (${data.liabilities_count ?? 0})`} sub={hasLiabilities ? `${(data.liabilities_assessed ?? 0).toFixed(2)} assessed` : "Import from source referral items"} />
          <Row ok={hasAmount && amountOk} label={`Assessed amount (${(data.liabilities_assessed || data.claim_amount || 0).toFixed(2)})`} sub={!amountOk ? `Source exposure ${data.source_exposure ?? 0}` : undefined} />
          <Row ok={hasDocs || docsOk} label={`Documents linked (${data.documents_count})`} sub={!docsOk ? `Source has ${data.source_documents} document(s)` : undefined} />
        </ul>
        {!data.is_clean && (
          <p className="text-xs text-muted-foreground mt-3">
            Run <em>Case Integrity</em> repair in Legal Admin to import any missing data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
