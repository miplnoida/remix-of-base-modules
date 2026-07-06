/**
 * Business Processes tab — resolved-configuration view per SSB process.
 *
 * Read-only view: never edits policy rows. "Configure missing items" links
 * deep-link to the exact /admin/ssb-setup?section=... form. "View in Governance"
 * jumps to /admin/configuration-governance.
 */
import { Link } from "react-router-dom";
import {
  ClipboardList, CheckCircle2, AlertTriangle, XCircle, ExternalLink,
  ShieldCheck, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSsbBusinessProcesses } from "@/hooks/ssb-configuration/useSsbBusinessProcessConfig";
import type {
  BusinessProcessConfiguration, ProcessStatus,
} from "@/services/ssb-configuration/ssbBusinessProcessConfigService";

const statusMeta: Record<ProcessStatus, { color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  Ready:   { color: "bg-emerald-100 text-emerald-800 border-emerald-300", Icon: CheckCircle2 },
  Partial: { color: "bg-amber-100 text-amber-800 border-amber-300",       Icon: AlertTriangle },
  Missing: { color: "bg-rose-100 text-rose-800 border-rose-300",          Icon: XCircle },
};

function StatusBadge({ status }: { status: ProcessStatus }) {
  const m = statusMeta[status];
  return (
    <Badge variant="outline" className={`gap-1 ${m.color}`}>
      <m.Icon className="h-3 w-3" /> {status}
    </Badge>
  );
}

function ProcessCard({ p }: { p: BusinessProcessConfiguration }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{p.processName}</CardTitle>
          </div>
          <StatusBadge status={p.status} />
        </div>
        <CardDescription className="text-xs">
          Consumers: {p.consumers.join(", ") || "—"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <div className="font-medium text-foreground mb-1">Resolved policies</div>
          {p.resolvedPolicies.length === 0 ? (
            <div className="text-muted-foreground">None resolved.</div>
          ) : (
            <ul className="space-y-1">
              {p.resolvedPolicies.map((e) => (
                <li key={e.key} className="flex items-center justify-between">
                  <span>
                    <CheckCircle2 className="inline h-3 w-3 text-emerald-600 mr-1" />
                    {e.label}{e.count && e.count > 1 ? ` (${e.count})` : ""}
                  </span>
                  <Link to={`/admin/ssb-setup?section=${e.section}`} className="text-primary hover:underline">
                    edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {p.missingPolicies.length > 0 && (
          <div>
            <div className="font-medium text-rose-700 mb-1">Missing required policies</div>
            <ul className="space-y-1">
              {p.missingPolicies.map((e) => (
                <li key={e.key} className="flex items-center justify-between">
                  <span>
                    <XCircle className="inline h-3 w-3 text-rose-600 mr-1" />
                    {e.label}
                  </span>
                  <Button asChild size="sm" variant="outline" className="h-6 text-xs">
                    <Link to={`/admin/ssb-setup?section=${e.section}`}>
                      Configure <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {p.optionalWarnings.length > 0 && (
          <div>
            <div className="font-medium text-amber-700 mb-1">Optional / recommended</div>
            <ul className="space-y-1">
              {p.optionalWarnings.map((e) => (
                <li key={e.key} className="flex items-center justify-between">
                  <span>
                    <AlertTriangle className="inline h-3 w-3 text-amber-600 mr-1" />
                    {e.label}
                  </span>
                  <Link to={`/admin/ssb-setup?section=${e.section}`} className="text-primary hover:underline">
                    add
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/configuration-governance">
              <ShieldCheck className="mr-2 h-3 w-3" />View in Governance
            </Link>
          </Button>
          <span className="text-muted-foreground">as of {p.asOfDate}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BusinessProcessesPanel() {
  const { data, isLoading, error } = useSsbBusinessProcesses();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Business Processes
          </CardTitle>
          <CardDescription>
            How SSB policies combine into business processes. This is a resolver
            view — no policy is edited here. Use the "Configure" links to open
            the exact SSB Setup section, or "View in Governance" to package /
            validate / snapshot.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-rose-700">
            Failed to resolve business processes: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((p) => <ProcessCard key={p.processKey} p={p} />)}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 text-xs text-muted-foreground flex items-start gap-2">
          <ExternalLink className="h-3 w-3 mt-0.5" />
          <div>
            Benefit Administration readiness feeds BN Product Builder gating in
            Configuration Governance. BN is Ready only when Benefit Administration
            is Ready and the latest governance validation has zero blocking errors.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
