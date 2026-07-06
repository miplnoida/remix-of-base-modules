/**
 * SSB Configuration Governance — /admin/configuration-governance
 *
 * Registry / Dependencies / Packages / Validation / Snapshots / Impact.
 * Does NOT duplicate SSB Setup — SSB Setup edits policies; this page
 * governs their lifecycle, packaging, validation and snapshot history.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, ListTree, Network, Package, PlayCircle, Camera,
  Zap, ExternalLink, CheckCircle2, AlertTriangle, XCircle, Info,
  RefreshCw, Plus,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ssbConfigurationGovernanceService as svc,
  type Severity, type ConfigurationPackage,
} from "@/services/ssb-configuration/ssbConfigurationGovernanceService";
import {
  useSsbBusinessProcesses, useBenefitsReadiness,
} from "@/hooks/ssb-configuration/useSsbBusinessProcessConfig";

const sevMeta: Record<Severity, { color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  error:   { color: "bg-rose-100 text-rose-800 border-rose-300",       Icon: XCircle },
  warning: { color: "bg-amber-100 text-amber-800 border-amber-300",    Icon: AlertTriangle },
  info:    { color: "bg-sky-100 text-sky-800 border-sky-300",          Icon: Info },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const m = sevMeta[severity];
  return (
    <Badge variant="outline" className={`gap-1 ${m.color} capitalize`}>
      <m.Icon className="h-3 w-3" /> {severity}
    </Badge>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : score >= 70 ? "bg-amber-100 text-amber-800 border-amber-300"
              : "bg-rose-100 text-rose-800 border-rose-300";
  return <Badge variant="outline" className={color}>Score {score}/100</Badge>;
}

const healthColor: Record<string, string> = {
  ready:    "bg-emerald-100 text-emerald-800 border-emerald-300",
  healthy:  "bg-emerald-100 text-emerald-800 border-emerald-300",
  partial:  "bg-amber-100 text-amber-800 border-amber-300",
  degraded: "bg-amber-100 text-amber-800 border-amber-300",
  missing:  "bg-rose-100 text-rose-800 border-rose-300",
  unhealthy:"bg-rose-100 text-rose-800 border-rose-300",
  error:    "bg-rose-100 text-rose-800 border-rose-300",
  deferred: "bg-slate-100 text-slate-700 border-slate-300",
  unknown:  "bg-slate-100 text-slate-500 border-slate-300",
};

function HealthBadge({ status }: { status: string }) {
  const cls = healthColor[status] ?? healthColor.unknown;
  return <Badge variant="outline" className={`capitalize ${cls}`}>{status}</Badge>;
}

export default function ConfigurationGovernancePage() {
  const qc = useQueryClient();

  const assets   = useQuery({ queryKey: ["cg","assets"],  queryFn: svc.listConfigurationAssets });
  const deps     = useQuery({ queryKey: ["cg","deps"],    queryFn: svc.listAllDependencies });
  const packages = useQuery({ queryKey: ["cg","pkgs"],    queryFn: svc.listConfigurationPackages });
  const snaps    = useQuery({ queryKey: ["cg","snaps"],   queryFn: svc.listConfigurationSnapshots });
  const latestRun= useQuery({ queryKey: ["cg","latestRun"], queryFn: () => svc.getLatestValidationRun() });
  const runResults = useQuery({
    queryKey: ["cg","runResults", latestRun.data?.id],
    queryFn: () => svc.listValidationResults(latestRun.data!.id),
    enabled: !!latestRun.data?.id,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["cg"] });
  };

  const runValidation = async () => {
    try {
      const out = await svc.runSsbSetupValidation();
      toast.success(`Validation complete — score ${out.run.score}/100 (${out.run.errors_count} errors)`);
      invalidateAll();
    } catch (e: any) { toast.error(e.message ?? "Validation failed"); }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Administration" },
    { label: "Setup Centre" },
    { label: "Configuration Governance" },
  ];

  const processes = useSsbBusinessProcesses();
  const benefitsReadiness = useBenefitsReadiness();

  const govErrors = latestRun.data?.errors_count ?? -1;
  const benefitProcess = processes.data?.find((p) => p.processKey === "benefit_administration");
  const bnBlocked = !benefitsReadiness.data?.ready;

  return (
    <PageShell
      title="Configuration Governance"
      subtitle="Registry, dependencies, packages, validation and snapshots for SSB configuration"
      breadcrumbs={breadcrumbs}
    >
      <div className="mb-4 flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <div className="font-medium text-foreground">Governance vs SSB Setup</div>
          <p className="text-muted-foreground">
            Configuration is <b>authored</b> in{" "}
            <Link to="/admin/ssb-setup" className="text-primary hover:underline">SSB Implementation Setup</Link>.
            This page <b>governs</b> that configuration: what exists, what depends on it, how it is
            packaged, whether it validates and what has been snapshotted. No CRUD is duplicated here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Latest Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestRun.data ? (
              <>
                <ScoreBadge score={latestRun.data.score} />
                <div className="text-xs text-muted-foreground">
                  {latestRun.data.errors_count} errors · {latestRun.data.warnings_count} warnings · {latestRun.data.info_count} info
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(latestRun.data.started_at).toLocaleString()}
                </div>
              </>
            ) : <div className="text-xs text-muted-foreground">No runs yet.</div>}
            <Button size="sm" variant="outline" onClick={runValidation}>
              <PlayCircle className="mr-2 h-4 w-4" /> Run validation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Active Package
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            {(() => {
              const active = packages.data?.find(p => p.status === "active");
              return active ? (
                <>
                  <div className="font-medium text-sm">{active.package_name}</div>
                  <div className="text-muted-foreground">v{active.version_no} · effective from {active.effective_from ?? "—"}</div>
                </>
              ) : <div className="text-muted-foreground">No active package.</div>;
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> BN Product Builder
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            {bnBlocked ? (
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="h-4 w-4" /> BLOCKED — clear validation errors.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Eligible to unblock.
              </div>
            )}
            <div className="mt-2 text-muted-foreground">
              Readiness is decided by the latest validation run (errors_count = 0).
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="registry"><ListTree className="mr-2 h-4 w-4" />Registry</TabsTrigger>
          <TabsTrigger value="deps"><Network className="mr-2 h-4 w-4" />Dependencies</TabsTrigger>
          <TabsTrigger value="packages"><Package className="mr-2 h-4 w-4" />Packages</TabsTrigger>
          <TabsTrigger value="validation"><ShieldCheck className="mr-2 h-4 w-4" />Validation</TabsTrigger>
          <TabsTrigger value="snapshots"><Camera className="mr-2 h-4 w-4" />Snapshots</TabsTrigger>
          <TabsTrigger value="impact"><Zap className="mr-2 h-4 w-4" />Impact</TabsTrigger>
        </TabsList>

        {/* ------------- Registry ------------- */}
        <TabsContent value="registry" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Assets</CardTitle>
              <CardDescription>
                Health is computed from active SSB policies. Use <b>Configure</b> to open
                the exact SSB Setup section that owns the policy — governance never edits
                policies directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Policy Table</TableHead>
                    <TableHead>Required for BN</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Configure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(assets.data ?? []).map(a => (
                    <TableRow key={a.asset_key}>
                      <TableCell>
                        <div className="font-medium">{a.asset_name}</div>
                        <div className="text-xs text-muted-foreground">{a.asset_key}</div>
                      </TableCell>
                      <TableCell className="text-xs">{a.engine_owner}<div className="text-muted-foreground">{a.implementation_owner}</div></TableCell>
                      <TableCell className="text-xs"><code>{a.policy_table ?? "—"}</code></TableCell>
                      <TableCell>{a.required_for_benefits ? <Badge className="bg-rose-100 text-rose-800 border-rose-300" variant="outline">Required</Badge> : <Badge variant="outline">Optional</Badge>}</TableCell>
                      <TableCell>
                        <HealthBadge status={a.health_status as string} />
                        {a.health_reasons && a.health_reasons.length > 0 && (
                          <div className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                            {a.health_reasons.slice(0, 2).join(" · ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="space-x-1">
                        {a.setup_section_route ? (
                          <Button size="sm" asChild>
                            <Link to={a.setup_section_route}>Configure <ExternalLink className="ml-2 h-3 w-3" /></Link>
                          </Button>
                        ) : a.canonical_route ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={a.canonical_route}>Reference <ExternalLink className="ml-2 h-3 w-3" /></Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Dependencies ------------- */}
        <TabsContent value="deps" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dependency Graph</CardTitle>
              <CardDescription>Direct consumes / references / blocks edges between assets.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deps.data ?? []).map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{d.source_asset_key}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{d.dependency_type}</Badge></TableCell>
                      <TableCell className="text-xs">{d.target_asset_key}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{d.impact_level}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Packages ------------- */}
        <TabsContent value="packages" className="pt-4 space-y-4">
          <PackageCreator onCreated={invalidateAll} />
          <Card>
            <CardHeader>
              <CardTitle>Packages</CardTitle>
              <CardDescription>Versioned bundle of active SSB policies.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(packages.data ?? []).map(p => (
                    <PackageRow key={p.id} pkg={p} onChanged={invalidateAll} assets={assets.data ?? []} />
                  ))}
                  {(!packages.data || packages.data.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No packages yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Validation ------------- */}
        <TabsContent value="validation" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Latest Validation Run</CardTitle>
                <CardDescription>
                  {latestRun.data
                    ? <>Score {latestRun.data.score}/100 — {latestRun.data.errors_count} errors, {latestRun.data.warnings_count} warnings, {latestRun.data.info_count} info.</>
                    : "No runs yet."}
                </CardDescription>
              </div>
              <Button size="sm" onClick={runValidation}>
                <PlayCircle className="mr-2 h-4 w-4" /> Run validation
              </Button>
            </CardHeader>
            <CardContent>
              {bnBlocked ? (
                <div className="mb-3 flex items-center gap-2 text-rose-700 text-sm">
                  <XCircle className="h-4 w-4" /> BN Product Builder cannot be unblocked while errors remain.
                </div>
              ) : (
                <div className="mb-3 flex items-center gap-2 text-emerald-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" /> BN Product Builder can be unblocked.
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Message / Recommendation</TableHead>
                    <TableHead>Blocking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(runResults.data ?? []).map(r => (
                    <TableRow key={r.id}>
                      <TableCell><SeverityBadge severity={r.severity} /></TableCell>
                      <TableCell className="text-xs font-mono">{r.rule_code}</TableCell>
                      <TableCell className="text-xs">{r.asset_key ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {r.message}
                        {r.recommendation && <div className="text-xs text-muted-foreground">↳ {r.recommendation}</div>}
                      </TableCell>
                      <TableCell>{r.blocking ? <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300">Blocks</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    </TableRow>
                  ))}
                  {(!runResults.data || runResults.data.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Run validation to see findings.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Snapshots ------------- */}
        <TabsContent value="snapshots" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Snapshots</CardTitle>
                <CardDescription>Point-in-time capture of the active configuration.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={async () => {
                try { await svc.createConfigurationSnapshot(null, "manual snapshot"); toast.success("Snapshot created"); invalidateAll(); }
                catch (e: any) { toast.error(e.message ?? "Snapshot failed"); }
              }}>
                <Camera className="mr-2 h-4 w-4" /> Create snapshot
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Snapshot Key</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(snaps.data ?? []).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono">{s.snapshot_key}</TableCell>
                      <TableCell className="text-xs">{s.package_id ?? "—"}</TableCell>
                      <TableCell className="text-xs">{s.effective_date}</TableCell>
                      <TableCell className="text-xs">{s.reason ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {s.snapshot_json?.assets?.length ?? 0} assets · {s.snapshot_json?.dependencies?.length ?? 0} deps
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!snaps.data || snaps.data.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No snapshots yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Impact ------------- */}
        <TabsContent value="impact" className="pt-4">
          <ImpactPanel />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

// -----------------------------------------------------------------
// Package creator
// -----------------------------------------------------------------

function PackageCreator({ onCreated }: { onCreated: () => void }) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const create = async () => {
    if (!key || !name) return toast.error("Key and name are required");
    try {
      await svc.createConfigurationPackage({ package_key: key, package_name: name, notes });
      toast.success("Package created (draft)");
      setKey(""); setName(""); setNotes("");
      onCreated();
    } catch (e: any) { toast.error(e.message ?? "Create failed"); }
  };
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Create Draft Package</CardTitle>
        <CardDescription>Bundle currently-active policies into a versioned package.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input placeholder="package_key" value={key} onChange={(e) => setKey(e.target.value)} />
        <Input placeholder="Package name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea className="md:col-span-2 h-10 min-h-10" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={create} className="md:col-span-4 w-fit"><Plus className="mr-2 h-4 w-4" /> Create draft</Button>
      </CardContent>
    </Card>
  );
}

function PackageRow({ pkg, onChanged, assets }: { pkg: ConfigurationPackage; onChanged: () => void; assets: { asset_key: string; asset_name: string; policy_table: string | null }[] }) {
  const [addingAsset, setAddingAsset] = useState<string>("");

  const validate = async () => {
    try { const r = await svc.validateConfigurationPackage(pkg.id); toast.success(`Validated — ${r.run.errors_count} errors`); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Validate failed"); }
  };
  const schedule = async () => {
    const d = prompt("Effective from (YYYY-MM-DD)?", new Date().toISOString().slice(0, 10));
    if (!d) return;
    try { await svc.scheduleConfigurationPackage(pkg.id, d); toast.success("Scheduled"); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Schedule failed"); }
  };
  const activate = async () => {
    try { await svc.activateConfigurationPackage(pkg.id); toast.success("Activated + snapshot created"); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Activate failed"); }
  };
  const retire = async () => {
    const reason = prompt("Retire reason?") ?? "manual retire";
    try { await svc.retireConfigurationPackage(pkg.id, reason); toast.success("Retired"); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Retire failed"); }
  };
  const addAsset = async () => {
    if (!addingAsset) return;
    const asset = assets.find(a => a.asset_key === addingAsset);
    try { await svc.addPolicyToPackage(pkg.id, addingAsset, asset?.policy_table ?? undefined); toast.success("Asset added"); setAddingAsset(""); }
    catch (e: any) { toast.error(e.message ?? "Add failed"); }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{pkg.package_name}</div>
        <div className="text-xs text-muted-foreground font-mono">{pkg.package_key}</div>
      </TableCell>
      <TableCell>v{pkg.version_no}</TableCell>
      <TableCell><Badge variant="outline" className="capitalize">{pkg.status}</Badge></TableCell>
      <TableCell className="text-xs">{pkg.effective_from ?? "—"}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={addingAsset} onValueChange={setAddingAsset}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Add asset…" /></SelectTrigger>
            <SelectContent>
              {assets.map(a => <SelectItem key={a.asset_key} value={a.asset_key}>{a.asset_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addAsset}>Add</Button>
          <Button size="sm" variant="outline" onClick={validate}>Validate</Button>
          <Button size="sm" variant="outline" onClick={schedule}>Schedule</Button>
          <Button size="sm" variant="outline" onClick={activate}>Activate</Button>
          <Button size="sm" variant="outline" onClick={retire}>Retire</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ImpactPanel() {
  const assets = useQuery({ queryKey: ["cg","assets"],  queryFn: svc.listConfigurationAssets });
  const [assetKey, setAssetKey] = useState<string>("");
  const consumers = useQuery({
    queryKey: ["cg","consumers", assetKey],
    queryFn: () => svc.listConsumers(assetKey),
    enabled: !!assetKey,
  });
  const outgoing = useQuery({
    queryKey: ["cg","outgoing", assetKey],
    queryFn: () => svc.listDependencies(assetKey),
    enabled: !!assetKey,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Impact Analysis</CardTitle>
        <CardDescription>Pick an asset to see what depends on it (consumers) and what it depends on.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={assetKey} onValueChange={setAssetKey}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select asset…" /></SelectTrigger>
          <SelectContent>
            {(assets.data ?? []).map(a => <SelectItem key={a.asset_key} value={a.asset_key}>{a.asset_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {assetKey && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Consumers (depend on this)</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1">
                {(consumers.data ?? []).length === 0 && <div className="text-muted-foreground">No consumers.</div>}
                {(consumers.data ?? []).map(d => (
                  <div key={d.id} className="flex justify-between border rounded px-2 py-1">
                    <span>{d.source_asset_key}</span>
                    <Badge variant="outline" className="capitalize">{d.impact_level}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Depends on</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1">
                {(outgoing.data ?? []).length === 0 && <div className="text-muted-foreground">No outgoing dependencies.</div>}
                {(outgoing.data ?? []).map(d => (
                  <div key={d.id} className="flex justify-between border rounded px-2 py-1">
                    <span>{d.target_asset_key}</span>
                    <Badge variant="outline" className="capitalize">{d.dependency_type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
