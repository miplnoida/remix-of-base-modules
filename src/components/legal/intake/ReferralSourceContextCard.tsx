import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SourceContext } from "@/services/legal/lgIntakeDecisionService";

export function ReferralSourceContextCard({ ctx, loading }: { ctx?: SourceContext; loading?: boolean }) {
  if (loading) return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Referral Source Context</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Loading…</CardContent></Card>;
  if (!ctx) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Referral Source Context</span>
          <Badge variant="outline">{ctx.module}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {ctx.fields.map((f) => (
          <div key={f.label} className="flex justify-between border-b py-0.5">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium truncate max-w-[60%] text-right">{f.value == null || f.value === "" ? "—" : String(f.value)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
