/**
 * Enterprise Consumption Registry — /admin/enterprise-consumption-registry
 *
 * Read-only cockpit for ownership, consumers and violations across the
 * platform. Deep-links only, no duplicate CRUD.
 *
 * See docs/enterprise/ENTERPRISE_CONSUMPTION_REGISTRY_ACCEPTANCE.md
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/common/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  enterpriseConsumptionRegistryService as svc,
  type RegistryEntity, type OwnerLayer,
} from "@/services/enterprise/enterpriseConsumptionRegistryService";

const LAYER_ORDER: OwnerLayer[] = [
  "REFERENCE_FRAMEWORK","ENTERPRISE_MASTER","SHARED_DOMAIN","POLICY","PROCESS","BUSINESS_MODULE","LEGACY","EXTERNAL"
];

const LAYER_LABEL: Record<OwnerLayer, string> = {
  REFERENCE_FRAMEWORK: "Reference Framework",
  ENTERPRISE_MASTER: "Enterprise Masters",
  SHARED_DOMAIN: "Shared Domains",
  POLICY: "SSB Policies",
  PROCESS: "Business Processes",
  BUSINESS_MODULE: "Business Modules",
  LEGACY: "Legacy / Adapters",
  EXTERNAL: "External",
};

const riskColor = (r: string) =>
  r === "HIGH" ? "bg-rose-100 text-rose-800 border-rose-300" :
  r === "MEDIUM" ? "bg-amber-100 text-amber-800 border-amber-300" :
  "bg-emerald-100 text-emerald-800 border-emerald-300";

const statusColor = (s: string) =>
  s === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
  s === "ADAPTER" ? "bg-sky-100 text-sky-800 border-sky-300" :
  s === "LEGACY_READONLY" ? "bg-amber-100 text-amber-800 border-amber-300" :
  s === "PLANNED" ? "bg-slate-100 text-slate-700 border-slate-300" :
  "bg-rose-100 text-rose-800 border-rose-300";

const sevColor = (s: string) =>
  s === "P0" ? "bg-rose-100 text-rose-800 border-rose-300" :
  s === "P1" ? "bg-amber-100 text-amber-800 border-amber-300" :
  "bg-sky-100 text-sky-800 border-sky-300";

export default function EnterpriseConsumptionRegistryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState<string>("ALL");
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  const entitiesQ = useQuery({ queryKey: ["ecr","entities"], queryFn: svc.listEntities });
  const edgesQ    = useQuery({ queryKey: ["ecr","edges"], queryFn: svc.listEdges });
  const violQ     = useQuery({ queryKey: ["ecr","violations"], queryFn: () => svc.listViolations() });
  const bnQ       = useQuery({ queryKey: ["ecr","bn-readiness"], queryFn: svc.getBnConsumptionReadiness });

  const entities = entitiesQ.data ?? [];
  const edges    = edgesQ.data ?? [];
  const violations = violQ.data ?? [];

  const filteredEntities = useMemo(() => {
    const q = search.toLowerCase();
    return entities.filter((e) =>
      (layerFilter === "ALL" || e.owner_layer === layerFilter) &&
      (!q || e.entity_name.toLowerCase().includes(q) || e.entity_key.toLowerCase().includes(q) ||
        (e.canonical_table ?? "").toLowerCase().includes(q) || (e.owner_domain ?? "").toLowerCase().includes(q))
    );
  }, [entities, search, layerFilter]);

  const grouped = useMemo(() => {
    const map = new Map<OwnerLayer, RegistryEntity[]>();
    LAYER_ORDER.forEach((l) => map.set(l, []));
    entities.forEach((e) => map.get(e.owner_layer)?.push(e));
    return map;
  }, [entities]);

  const selected = entities.find((e) => e.entity_key === selectedEntity) ?? null;
  const consumersOfSelected = selected ? edges.filter((x) => x.target_entity_key === selected.entity_key) : [];
  const depsOfSelected      = selected ? edges.filter((x) => x.source_entity_key === selected.entity_key) : [];

  const handleDetect = async () => {
    try {
      await svc.detectConsumptionViolations();
      await qc.invalidateQueries({ queryKey: ["ecr"] });
      toast.success("Consumption scan complete.");
    } catch (e: any) {
      toast.error(e?.message || "Detection failed");
    }
  };

  const openP0 = violations.filter((v) => v.status === "OPEN" && v.severity === "P0").length;
  const openTotal = violations.filter((v) => v.status === "OPEN").length;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Administration" },
    { label: "Platform" },
    { label: "Enterprise Consumption Registry" },
  ];

  return (
    <PageShell
      title="Enterprise Consumption Registry"
      subtitle="One ownership and consumption contract for every enterprise entity — prevents duplicate masters and unauthorised platform reads."
      breadcrumbs={breadcrumbs}
      isLoading={entitiesQ.isLoading}
    >
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Ownership summary</CardTitle>
              <CardDescription>{entities.length} entities · {edges.length} consumption edges · {openTotal} open violation(s)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={openP0 > 0 ? sevColor("P0") : sevColor("P2")}>
                {openP0} open P0
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDetect}><RefreshCw className="w-4 h-4 mr-2" />Run detection</Button>
              <Button asChild variant="outline" size="sm"><Link to="/admin/platform-readiness"><ExternalLink className="w-4 h-4 mr-2" />Platform Readiness</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/admin/configuration-governance"><ExternalLink className="w-4 h-4 mr-2" />Governance</Link></Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="entities" className="w-full">
        <TabsList>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="ownership">Ownership</TabsTrigger>
          <TabsTrigger value="consumers">Consumers</TabsTrigger>
          <TabsTrigger value="violations">Violations {openTotal > 0 && <Badge variant="outline" className={`ml-2 ${sevColor(openP0 > 0 ? "P0" : "P1")}`}>{openTotal}</Badge>}</TabsTrigger>
          <TabsTrigger value="bn">BN Readiness</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Crosswalks</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Search entity, table, domain…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
                <Select value={layerFilter} onValueChange={setLayerFilter}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="All layers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All layers</SelectItem>
                    {LAYER_ORDER.map((l) => <SelectItem key={l} value={l}>{LAYER_LABEL[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Layer / Domain</TableHead>
                      <TableHead>Canonical</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dup risk</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntities.map((e) => (
                      <TableRow key={e.entity_key}>
                        <TableCell>
                          <div className="font-medium">{e.entity_name}</div>
                          <div className="text-xs text-muted-foreground">{e.entity_key}</div>
                        </TableCell>
                        <TableCell>
                          <div>{LAYER_LABEL[e.owner_layer]}</div>
                          <div className="text-xs text-muted-foreground">{e.owner_domain ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.canonical_route && <div><span className="text-muted-foreground">route:</span> {e.canonical_route}</div>}
                          {e.canonical_table && <div><span className="text-muted-foreground">table:</span> {e.canonical_table}</div>}
                          {e.canonical_service && <div><span className="text-muted-foreground">svc:</span> {e.canonical_service}</div>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={riskColor(e.duplicate_risk)}>{e.duplicate_risk}</Badge></TableCell>
                        <TableCell>
                          {e.canonical_route ? (
                            <Button asChild size="sm" variant="ghost"><Link to={e.canonical_route}><ExternalLink className="w-4 h-4" /></Link></Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEntities.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No entities.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ownership" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {LAYER_ORDER.map((layer) => {
              const list = grouped.get(layer) ?? [];
              if (list.length === 0) return null;
              return (
                <Card key={layer}>
                  <CardHeader>
                    <CardTitle className="text-base">{LAYER_LABEL[layer]}</CardTitle>
                    <CardDescription>{list.length} entities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {list.map((e) => (
                        <li key={e.entity_key} className="flex items-center justify-between gap-2">
                          <span>{e.entity_name}</span>
                          <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="consumers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select an entity to view consumers and dependencies</CardTitle>
              <CardDescription>Shows who reads this entity (consumers) and what this entity depends on.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="max-w-md"><SelectValue placeholder="Pick an entity…" /></SelectTrigger>
                <SelectContent>
                  {entities.map((e) => <SelectItem key={e.entity_key} value={e.entity_key}>{e.entity_name} — {LAYER_LABEL[e.owner_layer]}</SelectItem>)}
                </SelectContent>
              </Select>
              {selected && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Consumers ({consumersOfSelected.length})</CardTitle></CardHeader>
                    <CardContent>
                      {consumersOfSelected.length === 0
                        ? <div className="text-sm text-muted-foreground">No registered consumers.</div>
                        : (
                          <ul className="text-sm space-y-1">
                            {consumersOfSelected.map((c) => (
                              <li key={c.id} className="flex justify-between gap-2">
                                <span>{c.source_entity_key}</span>
                                <span className="text-xs text-muted-foreground">{c.relationship_type} · {c.enforcement_level}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Depends on ({depsOfSelected.length})</CardTitle></CardHeader>
                    <CardContent>
                      {depsOfSelected.length === 0
                        ? <div className="text-sm text-muted-foreground">No registered dependencies.</div>
                        : (
                          <ul className="text-sm space-y-1">
                            {depsOfSelected.map((c) => (
                              <li key={c.id} className="flex justify-between gap-2">
                                <span>{c.target_entity_key}</span>
                                <span className="text-xs text-muted-foreground">{c.relationship_type} · {c.enforcement_level}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">Consumption violations</CardTitle>
                  <CardDescription>Duplicate owners, unmapped legacy references, and unknown owners.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleDetect}><RefreshCw className="w-4 h-4 mr-2" />Rescan</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {violations.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell><Badge variant="outline" className={sevColor(v.severity)}>{v.severity}</Badge></TableCell>
                        <TableCell className="text-xs">{v.violation_type}</TableCell>
                        <TableCell className="text-xs">{v.entity_key ?? "—"}</TableCell>
                        <TableCell className="text-sm">{v.message}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{v.recommendation ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {violations.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        <CheckCircle2 className="w-5 h-5 inline mr-2 text-emerald-600" />No violations detected.
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bn" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {bnQ.data?.status === "READY" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {bnQ.data?.status === "READY_WITH_WARNINGS" && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {bnQ.data?.status === "BLOCKED" && <XCircle className="w-5 h-5 text-rose-600" />}
                <CardTitle className="text-base">BN Product Builder — Wave 1 consumption readiness</CardTitle>
              </div>
              <CardDescription>
                {bnQ.data?.status === "BLOCKED"
                  ? bnQ.data.reasons.join(" ")
                  : "BN owns product/rule entities; it must consume platform config only via approved resolvers."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="font-medium mb-2">BN-owned entities</div>
                <ul className="text-sm space-y-1">
                  {(bnQ.data?.ownedByBn ?? []).map((e) => <li key={e.entity_key}>{e.entity_name}</li>)}
                </ul>
              </div>
              <div>
                <div className="font-medium mb-2">Platform-owned (must consume, cannot duplicate)</div>
                <ul className="text-sm space-y-1">
                  {(bnQ.data?.platformOwnedRequired ?? []).map((e) => (
                    <li key={e.entity_key} className="flex justify-between gap-2">
                      <span>{e.entity_name}</span>
                      <span className="text-xs text-muted-foreground">{LAYER_LABEL[e.owner_layer]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legacy" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legacy crosswalks</CardTitle>
              <CardDescription>Read-only view of legacy adapters and their canonical mapping. Managed via <Link className="underline" to="/admin/master-data/bank-codes">Bank Codes</Link> / <Link className="underline" to="/admin/master-data/methods-of-payment">Methods of Payment</Link>.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Legacy entity</TableHead>
                    <TableHead>Adapts to</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {entities.filter((e) => e.owner_layer === "LEGACY").map((e) => {
                      const target = edges.find((x) => x.source_entity_key === e.entity_key);
                      return (
                        <TableRow key={e.entity_key}>
                          <TableCell>{e.entity_name}<div className="text-xs text-muted-foreground">{e.canonical_table}</div></TableCell>
                          <TableCell className="text-xs">{target?.target_entity_key ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.notes ?? "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
