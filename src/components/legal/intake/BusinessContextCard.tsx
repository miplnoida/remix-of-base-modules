import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { BusinessContext } from "@/services/legal/lgIntakeDecisionService";

export function BusinessContextCard({ ctx, loading }: { ctx?: BusinessContext; loading?: boolean }) {
  const nav = useNavigate();
  if (loading) return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Business Context</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Loading…</CardContent></Card>;
  if (!ctx || ctx.kind === "UNKNOWN") return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Business Context — {ctx.kind === "EMPLOYER" ? "Employer" : ctx.kind === "INSURED_PERSON" ? "Insured Person" : "Party"}</span>
          {ctx.route && (
            <Button variant="ghost" size="sm" onClick={() => nav(ctx.route!)}>
              <ExternalLink className="h-3 w-3 mr-1" /> Open
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{ctx.displayName}</span>
          {ctx.identifier && <span className="text-muted-foreground">({ctx.identifier})</span>}
          {ctx.status && <Badge variant="outline">{ctx.status}</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {ctx.metrics.map((m) => (
            <div key={m.label} className="flex justify-between border-b py-0.5">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-medium">{m.value == null || m.value === "" ? "—" : String(m.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
