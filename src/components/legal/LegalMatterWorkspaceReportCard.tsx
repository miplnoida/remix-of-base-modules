/**
 * LegalMatterWorkspaceReportCard
 *
 * Live report driven by the unified Legal Matter Workspace resolver.
 * No mock data — counts by lifecycle / category / overall status / SLA,
 * straight from useLegalMatterWorkspaceList.
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useLegalMatterWorkspaceList } from "@/hooks/legal/useLegalMatterWorkspace";
import type { LegalMatterWorkspace } from "@/types/legalMatterWorkspace";

function bucket<T extends string>(items: LegalMatterWorkspace[], get: (m: LegalMatterWorkspace) => T | null | undefined) {
  const out = new Map<string, number>();
  for (const m of items) {
    const k = (get(m) ?? "—") as string;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return Array.from(out.entries()).sort((a, b) => b[1] - a[1]);
}

export function LegalMatterWorkspaceReportCard() {
  const { data, isLoading } = useLegalMatterWorkspaceList({ limit: 500 });

  const items = data?.items ?? [];

  const byLifecycle = useMemo(() => bucket(items, (m) => m.identity.lifecycle_object_type), [items]);
  const byCategory = useMemo(() => bucket(items, (m) => m.classification.category), [items]);
  const byStatus = useMemo(() => bucket(items, (m) => m.status.overall_status), [items]);
  const bySla = useMemo(() => bucket(items, (m) => m.sla.sla_status ?? "N/A"), [items]);

  const renderRow = (label: string, rows: [string, number][]) => (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wide mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {rows.length === 0 ? (
          <span className="text-xs text-muted-foreground">No data</span>
        ) : rows.map(([k, v]) => (
          <Badge key={k} variant="outline">{k}: <strong className="ml-1">{v}</strong></Badge>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal Matter Workspace Report</CardTitle>
        <CardDescription>Live unified view across referrals, intakes, cases and advice requests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading workspace…
          </div>
        ) : (
          <>
            <div className="text-sm">
              Total matters: <strong>{items.length}</strong>
            </div>
            {renderRow("By lifecycle", byLifecycle)}
            {renderRow("By category", byCategory)}
            {renderRow("By overall status", byStatus)}
            {renderRow("By SLA status", bySla)}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default LegalMatterWorkspaceReportCard;
