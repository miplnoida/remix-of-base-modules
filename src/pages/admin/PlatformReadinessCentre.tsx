/**
 * Platform Readiness Centre — /admin/platform-readiness
 *
 * Aggregates Configuration Governance, Business Process Resolvers, Policy
 * Health and live source-control orphan detection into one BN Wave 1
 * readiness cockpit. Does not create duplicate CRUD; every Fix Now deep
 * links to the canonical screen or SSB Setup section.
 *
 * See docs/social-security/PLATFORM_READINESS_CENTRE_ACCEPTANCE.md
 */
import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  ExternalLink, PackageCheck, Workflow, Hash, Coins, MessageSquare,
  Gauge, ListTree, Info,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  platformReadinessService as svc,
  type ReadinessStatus, type ReadinessFinding, type ReadinessCategory,
} from "@/services/ssb-configuration/platformReadinessService";

const statusColor: Record<ReadinessStatus, string> = {
  ready:   "bg-emerald-100 text-emerald-800 border-emerald-300",
  warning: "bg-amber-100 text-amber-800 border-amber-300",
  blocked: "bg-rose-100 text-rose-800 border-rose-300",
  unknown: "bg-slate-100 text-slate-700 border-slate-300",
};

function StatusBadge({ status }: { status: ReadinessStatus }) {
  return <Badge variant="outline" className={`capitalize ${statusColor[status]}`}>{status}</Badge>;
}

function SevBadge({ sev }: { sev: ReadinessFinding["severity"] }) {
  const cls = sev === "blocking" ? statusColor.blocked : sev === "warning" ? statusColor.warning : "bg-sky-100 text-sky-800 border-sky-300";
  return <Badge variant="outline" className={`capitalize ${cls}`}>{sev}</Badge>;
}

const catIcons: Partial<Record<ReadinessCategory["key"], React.ComponentType<{ className?: string }>>> = {
  active_package: PackageCheck,
  governance_validation: ShieldCheck,
  business_processes: ListTree,
  policy_health: Gauge,
  source_control_refs: ShieldCheck,
  workflow_refs: Workflow,
  numbering_refs: Hash,
  financial_refs: Coins,
  communication_refs: MessageSquare,
  bn_product_builder: PackageCheck,
};

export default function PlatformReadinessCentre() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["platform-readiness", "summary"],
    queryFn: svc.getPlatformReadinessSummary,
  });

  const summary = q.data;

  const handleRefresh = async () => {
    try {
      await svc.refreshReadiness();
      await qc.invalidateQueries({ queryKey: ["platform-readiness"] });
      toast.success("Readiness refreshed");
    } catch (e: any) {
      toast.error(e?.message || "Refresh failed");
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Administration" },
    { label: "Setup Centre" },
    { label: "Platform Readiness" },
  ];

  const bnStatusColor =
    summary?.bnWave1Status === "READY" ? statusColor.ready :
    summary?.bnWave1Status === "READY WITH WARNINGS" ? statusColor.warning :
    statusColor.blocked;

  return (
    <PageShell
      title="Platform Readiness Centre"
      subtitle="One cockpit for BN Product Builder Wave 1 readiness — aggregates governance, resolvers and source-control checks."
      breadcrumbs={breadcrumbs}
      isLoading={q.isLoading}
    >
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                BN Wave 1 Readiness
              </CardTitle>
              <CardDescription>
                Active package: <b>{summary?.activePackageKey ?? "—"}</b> ·
                Latest validation score: <b>{summary?.latestValidationScore ?? "—"}</b>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={bnStatusColor}>{summary?.bnWave1Status ?? "…"}</Badge>
              <Badge variant="outline" className={statusColor.blocked}>{summary?.blockingCount ?? 0} blocking</Badge>
              <Badge variant="outline" className={statusColor.warning}>{summary?.warningCount ?? 0} warnings</Badge>
              <Button size="sm" variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/configuration-governance"><ExternalLink className="h-4 w-4 mr-1" />Governance</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/ssb-setup"><ExternalLink className="h-4 w-4 mr-1" />SSB Setup</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Category cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {(summary?.categories ?? []).map((c) => {
          const Icon = catIcons[c.key] ?? Info;
          return (
            <Card key={c.key}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {c.label}
                  </CardTitle>
                  <StatusBadge status={c.status} />
                </div>
                <CardDescription>{c.summary}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-3 text-muted-foreground">
                    <span>Blocking: <b className="text-foreground">{c.blockingCount}</b></span>
                    <span>Warnings: <b className="text-foreground">{c.warningCount}</b></span>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={c.fixRoute}>Configure</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Findings table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Blocking & Warning Findings</CardTitle>
          <CardDescription>
            Data-level references that do not resolve against their canonical source. Fix Now deep-links to the exact policy section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(summary?.findings ?? []).length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              No orphan references detected. Source-control layer is clean.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Orphan Reference</TableHead>
                    <TableHead>Expected Source</TableHead>
                    <TableHead>Affected</TableHead>
                    <TableHead>Recommended Fix</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(summary?.findings ?? []).map((f) => (
                    <TableRow key={f.finding_id}>
                      <TableCell><SevBadge sev={f.severity} /></TableCell>
                      <TableCell className="text-xs">{f.category.replace(/_/g, " ")}</TableCell>
                      <TableCell className="font-mono text-xs">{f.orphan_value ?? "(empty)"}</TableCell>
                      <TableCell className="text-xs">{f.expected_source}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{f.affected_process ?? "—"}</div>
                        <div className="text-muted-foreground">{f.affected_policy}</div>
                      </TableCell>
                      <TableCell className="text-xs max-w-sm">{f.recommended_action}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={f.fix_route}>Fix Now</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module readiness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module Readiness</CardTitle>
          <CardDescription>Downstream module gates driven by platform configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {(summary?.modules ?? []).map((m) => (
              <div key={m.moduleKey} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="font-medium text-sm">{m.label}</div>
                  {m.reasons.length > 0 && (
                    <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                      {m.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
