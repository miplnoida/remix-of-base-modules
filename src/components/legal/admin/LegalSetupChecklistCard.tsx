import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ClipboardCheck, ArrowRight } from "lucide-react";
import { useLegalSetupValidation } from "@/hooks/legal/useLegalSetupValidation";

function StatusIcon({ status }: { status: "ok" | "warn" | "fail" }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
  return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
}

/**
 * Read-only validation panel for Legal Admin setup.
 * No auto-fix / one-click configuration — only deep links to each section.
 */
export function LegalSetupChecklistCard() {
  const { data, isLoading, refetch, isFetching } = useLegalSetupValidation();

  const headerBg = data?.ready
    ? "border-emerald-300 bg-emerald-50/40"
    : "border-amber-300 bg-amber-50/30";

  return (
    <Card className={headerBg}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Legal Setup Validation
              {data?.ready && <Badge className="bg-emerald-600 hover:bg-emerald-600">Ready</Badge>}
            </CardTitle>
            <CardDescription>
              Each area must be configured manually in its own screen — open the linked screen to make changes.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-validate"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/legal/admin/validation">Full Report <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading validation…
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {data.areas.map((a) => (
              <li key={a.key} className="flex items-start justify-between gap-3 border-b last:border-b-0 pb-2">
                <div className="flex items-start gap-2 min-w-0">
                  <StatusIcon status={a.status} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.area}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.detail}</div>
                    {a.missing.length > 0 && (
                      <div className="text-xs text-amber-700 mt-0.5">
                        Missing: {a.missing.slice(0, 3).join(", ")}
                        {a.missing.length > 3 ? `, +${a.missing.length - 3} more` : ""}
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs shrink-0">
                  <Link to={a.action.to}>{a.action.label}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default LegalSetupChecklistCard;
