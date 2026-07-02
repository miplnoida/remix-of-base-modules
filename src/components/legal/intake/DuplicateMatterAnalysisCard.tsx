import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { DuplicateAnalysis, DuplicateMatter } from "@/services/legal/lgIntakeDecisionService";

const num = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function Row({ m }: { m: DuplicateMatter }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b last:border-0 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className="shrink-0">{m.kind.replace("_", " ")}</Badge>
        <span className="truncate">{m.ref ?? m.id.slice(0, 8)}</span>
        {m.status && <span className="text-muted-foreground truncate">· {m.status}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {m.amount != null && <span className="tabular-nums">{num(m.amount)}</span>}
        {m.route && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => nav(m.route!)}>
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function DuplicateMatterAnalysisCard({ data, loading }: { data?: DuplicateAnalysis; loading?: boolean }) {
  if (loading) {
    return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Duplicate Matter Analysis</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Loading…</CardContent></Card>;
  }
  if (!data) return null;
  const all = [...data.openCases, ...data.closedCases, ...data.orders, ...data.settlements, ...data.arrangements, ...data.recoveries];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Duplicate Matter Analysis</span>
          <div className="flex gap-1">
            <Badge variant={data.totalOpen > 0 ? "destructive" : "outline"}>{data.totalOpen} open</Badge>
            <Badge variant="outline">{data.totalClosed} closed</Badge>
            {data.outstandingRecovery > 0 && (
              <Badge variant="secondary">Recovery {num(data.outstandingRecovery)}</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {all.length === 0 ? (
          <div className="text-xs text-muted-foreground">No related matters found. Informational only — case creation is not blocked.</div>
        ) : (
          <div className="max-h-56 overflow-auto">
            {all.map((m) => <Row key={`${m.kind}-${m.id}`} m={m} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
