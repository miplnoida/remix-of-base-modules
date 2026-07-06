/**
 * EnterpriseConfigurationAssetShell
 *
 * Reusable presentation shell for every Configuration Asset in the platform.
 * Wraps an existing configuration surface with a standard header, status
 * banner, tabs (Configuration · Dependencies · Consumers · Validation ·
 * History · Impact) and actions.
 *
 * Delegates ALL behaviour to existing services. Does NOT duplicate CRUD,
 * validation, lifecycle or readiness logic.
 *
 * See docs/enterprise/ENTERPRISE_CONFIGURATION_ASSET_FRAMEWORK.md
 */
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, AlertTriangle, Info, RefreshCcw, ExternalLink,
  GitBranch, Users, ClipboardList, Activity, History,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadAssetMetadata,
  loadAssetValidation,
  loadAssetDependencies,
  loadAssetConsumers,
  loadAssetReadiness,
  refreshAssetValidation,
  type ConfigurationAssetDescriptor,
} from "@/services/enterprise/enterpriseConfigurationAssetService";

export interface EnterpriseConfigurationAssetShellProps {
  descriptor: ConfigurationAssetDescriptor;
  /** The authoring surface (existing form component). Rendered inside the Configuration tab. */
  children: React.ReactNode;
  /** Optional extra header actions (e.g. lifecycle buttons owned by the form). */
  headerActions?: React.ReactNode;
}

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "ready": return "default";
    case "warning": return "secondary";
    case "blocked": return "destructive";
    default: return "outline";
  }
};

export function EnterpriseConfigurationAssetShell({
  descriptor,
  children,
  headerActions,
}: EnterpriseConfigurationAssetShellProps) {
  const qc = useQueryClient();
  const { assetKey, registryEntityKey } = descriptor;

  const meta = useQuery({ queryKey: ["asset.meta", assetKey], queryFn: () => loadAssetMetadata(assetKey) });
  const validation = useQuery({ queryKey: ["asset.validation", assetKey], queryFn: () => loadAssetValidation(assetKey) });
  const dependencies = useQuery({ queryKey: ["asset.deps", assetKey], queryFn: () => loadAssetDependencies(assetKey, registryEntityKey) });
  const consumers = useQuery({ queryKey: ["asset.cons", assetKey], queryFn: () => loadAssetConsumers(assetKey, registryEntityKey) });
  const readiness = useQuery({ queryKey: ["asset.readiness", assetKey], queryFn: () => loadAssetReadiness(assetKey, registryEntityKey) });

  const handleRefresh = async () => {
    try {
      await refreshAssetValidation();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["asset.validation", assetKey] }),
        qc.invalidateQueries({ queryKey: ["asset.readiness", assetKey] }),
      ]);
      toast.success("Readiness refreshed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to refresh readiness");
    }
  };

  const r = readiness.data;
  const v = validation.data;

  return (
    <div className="space-y-4">
      {/* Asset Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{descriptor.assetName}</CardTitle>
                <Badge variant="outline">{descriptor.assetType}</Badge>
                <Badge variant="secondary">{descriptor.ownerDomain}</Badge>
              </div>
              {descriptor.description && (
                <p className="text-sm text-muted-foreground max-w-3xl">{descriptor.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <span className="font-mono">{assetKey}</span>
                <span>·</span>
                <a href={descriptor.canonicalRoute} className="inline-flex items-center gap-1 hover:underline">
                  {descriptor.canonicalRoute} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {r && (
                <Badge variant={statusVariant(r.status)} className="uppercase">
                  {r.status}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={handleRefresh}>
                <RefreshCcw className="h-4 w-4 mr-1" /> Refresh Readiness
              </Button>
              {headerActions}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <SummaryStat icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} label="Score" value={v?.score ?? "—"} />
            <SummaryStat icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Blocking" value={r?.blockingFindings ?? 0} />
            <SummaryStat icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Warnings" value={r?.warningFindings ?? 0} />
            <SummaryStat icon={<Users className="h-4 w-4 text-primary" />} label="Consumers" value={r?.consumerCount ?? 0} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="configuration"><ClipboardList className="h-4 w-4 mr-1" />Configuration</TabsTrigger>
          <TabsTrigger value="dependencies"><GitBranch className="h-4 w-4 mr-1" />Dependencies</TabsTrigger>
          <TabsTrigger value="consumers"><Users className="h-4 w-4 mr-1" />Consumers</TabsTrigger>
          <TabsTrigger value="validation"><ShieldCheck className="h-4 w-4 mr-1" />Validation</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" />History</TabsTrigger>
          <TabsTrigger value="impact"><Activity className="h-4 w-4 mr-1" />Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="pt-4">
          {children}
        </TabsContent>

        <TabsContent value="dependencies" className="pt-4">
          <EdgeTable
            title="Depends on"
            edges={dependencies.data ?? []}
            loading={dependencies.isLoading}
            emptyMessage="No dependencies registered for this asset."
          />
        </TabsContent>

        <TabsContent value="consumers" className="pt-4">
          <EdgeTable
            title="Used by"
            edges={consumers.data ?? []}
            loading={consumers.isLoading}
            emptyMessage="No consumers registered for this asset."
          />
        </TabsContent>

        <TabsContent value="validation" className="pt-4">
          <ValidationPanel report={v} loading={validation.isLoading} />
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Version history is captured by <span className="font-mono">ssb_policy_audit</span> and
              configuration snapshots. Open <a className="underline" href="/admin/configuration-governance">Configuration Governance → Snapshots</a> to review changes for this asset.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="pt-4">
          <Card>
            <CardContent className="pt-6 text-sm">
              <p className="text-muted-foreground mb-3">
                Changing this asset affects the consumers listed under the <strong>Consumers</strong> tab
                and any downstream business processes tracked by the Enterprise Consumption Registry.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <ImpactStat label="Direct consumers" value={r?.consumerCount ?? 0} />
                <ImpactStat label="Blocking findings" value={r?.blockingFindings ?? 0} tone="destructive" />
                <ImpactStat label="Warnings" value={r?.warningFindings ?? 0} tone="warning" />
              </div>
              <div className="mt-4">
                <a href="/admin/enterprise-consumption-registry" className="text-xs underline">
                  Open Enterprise Consumption Registry →
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
      {icon}
      <div>
        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function ImpactStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "destructive" | "warning" }) {
  const toneCls = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-amber-600" : "";
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

function EdgeTable({ title, edges, loading, emptyMessage }: { title: string; edges: any[]; loading: boolean; emptyMessage: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : edges.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edges.map((e) => (
                <TableRow key={e.key}>
                  <TableCell className="font-mono text-xs">{e.otherKey}</TableCell>
                  <TableCell><Badge variant="outline">{e.relationship}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{e.source}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.notes ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ValidationPanel({ report, loading }: { report: any; loading: boolean }) {
  if (loading) return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  if (!report) return <Card><CardContent className="pt-6 text-sm text-muted-foreground">No validation run available. Refresh readiness to run.</CardContent></Card>;

  const sections = [
    { key: "errors",   title: "Blocking",   icon: <AlertTriangle className="h-4 w-4 text-destructive" />, rows: report.errors,   emptyLabel: "No blocking findings" },
    { key: "warnings", title: "Warnings",   icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,   rows: report.warnings, emptyLabel: "No warnings" },
    { key: "info",     title: "Information",icon: <Info className="h-4 w-4 text-primary" />,              rows: report.info,     emptyLabel: "No informational findings" },
  ];

  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <Card key={s.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">{s.icon}{s.title} ({s.rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {s.rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">{s.emptyLabel}</p>
            ) : (
              <ul className="space-y-2">
                {s.rows.map((r: any) => (
                  <li key={r.id} className="text-sm border rounded p-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.rule_code}</span>
                      {r.blocking && <Badge variant="destructive">blocking</Badge>}
                    </div>
                    <div className="mt-1">{r.message}</div>
                    {r.recommendation && (
                      <div className="text-xs text-muted-foreground mt-1">Fix: {r.recommendation}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
