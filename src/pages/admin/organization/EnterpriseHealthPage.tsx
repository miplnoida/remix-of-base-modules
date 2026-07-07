/**
 * Phase 13 UI — Enterprise Configuration Health Dashboard
 */
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { runHealthChecks, type HealthFinding, type HealthSeverity } from "@/lib/enterprise/healthChecks";

const sevIcon: Record<HealthSeverity, JSX.Element> = {
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-muted-foreground" />,
};

const sevBadge: Record<HealthSeverity, "destructive" | "secondary" | "outline"> = {
  error: "destructive",
  warning: "secondary",
  info: "outline",
};

function EnterpriseHealthPageInner() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["enterprise-health"],
    queryFn: runHealthChecks,
    staleTime: 60_000,
  });

  const findings = data ?? [];
  const grouped = findings.reduce<Record<string, HealthFinding[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Enterprise Configuration Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only checks across the communication & branding stack.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Re-run checks
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-destructive">{errors}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-amber-500">{warnings}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total findings</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{findings.length}</div></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : findings.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div className="font-medium">All clear</div>
            <div className="text-sm text-muted-foreground">No configuration issues detected.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <Card key={category}>
              <CardHeader><CardTitle className="text-base">{category}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.map((f) => (
                  <div key={f.id} className="flex items-start gap-3 p-3 rounded-md border bg-card">
                    <div className="mt-0.5">{sevIcon[f.severity]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{f.message}</div>
                      {f.link && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {f.link.screen}
                          {f.link.recordId ? ` · ${f.link.recordId}` : ""}
                        </div>
                      )}
                    </div>
                    <Badge variant={sevBadge[f.severity]} className="capitalize">{f.severity}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EnterpriseHealthPage() {
  // OM-2: gate validation surface via organisation_management module.
  return (
    <PermissionWrapper moduleName="organization_management">
      <EnterpriseHealthPageInner />
    </PermissionWrapper>
  );
}
