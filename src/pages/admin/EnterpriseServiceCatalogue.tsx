import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Search, ExternalLink, CheckCircle2, Clock, AlertTriangle, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Capability = {
  id: string;
  capability_key: string;
  capability_name: string;
  category: string;
  grouping: string;
  owner: string | null;
  status: string;
  version: string | null;
  canonical_route: string | null;
  menu_module_name: string | null;
  permission_hint: string | null;
  feature_flag: string | null;
  consumers: string[];
  dependencies: string[];
  documentation_link: string | null;
  architecture_link: string | null;
  acceptance_link: string | null;
  health_architecture: string;
  health_implementation: string;
  health_menu: string;
  health_permissions: string;
  health_documentation: string;
  health_acceptance: string;
  health_migration: string;
  overall_health: string;
  description: string | null;
  sort_order: number;
};

const GROUPINGS = ["Platform", "Enterprise Core", "Organisation", "Shared Domains", "Business Applications", "Operations", "Governance"];

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "active") return "default";
  if (s === "development") return "secondary";
  if (s === "deprecated") return "destructive";
  return "outline";
};

const healthIcon = (h: string) => {
  if (h === "green") return <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="green" />;
  if (h === "amber" || h === "planned") return <Clock className="h-4 w-4 text-amber-600" aria-label="amber" />;
  if (h === "red") return <AlertTriangle className="h-4 w-4 text-destructive" aria-label="red" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-label="unknown" />;
};

export default function EnterpriseServiceCatalogue() {
  const [query, setQuery] = useState("");
  const [groupingFilter, setGroupingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["enterprise-capability-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enterprise_capability_registry" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Capability[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((c) => {
      if (groupingFilter !== "all" && c.grouping !== groupingFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        c.capability_name, c.capability_key, c.owner ?? "", c.menu_module_name ?? "",
        c.canonical_route ?? "", c.permission_hint ?? "", (c.consumers ?? []).join(","),
        (c.dependencies ?? []).join(","), c.description ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [data, query, groupingFilter, statusFilter]);

  const byGrouping = useMemo(() => {
    const map = new Map<string, Capability[]>();
    for (const g of GROUPINGS) map.set(g, []);
    for (const c of filtered) {
      if (!map.has(c.grouping)) map.set(c.grouping, []);
      map.get(c.grouping)!.push(c);
    }
    return map;
  }, [filtered]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Enterprise Service Catalogue"
        subtitle="Every reusable enterprise capability, its owner, consumers, dependencies and health."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Administration" },
          { label: "Platform", href: "/admin/platform" },
          { label: "Enterprise Service Catalogue" },
        ]}
      />

      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search capability, owner, module, route, permission, consumer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={groupingFilter} onValueChange={setGroupingFilter}>
            <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Grouping" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groupings</SelectItem>
              {GROUPINGS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList>
          <TabsTrigger value="registry"><BookMarked className="h-4 w-4 mr-2" />Registry</TabsTrigger>
          <TabsTrigger value="consumers">Consumers</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="space-y-6 mt-4">
          {isLoading && <div className="text-sm text-muted-foreground">Loading catalogue…</div>}
          {Array.from(byGrouping.entries())
            .filter(([, items]) => items.length > 0)
            .map(([grouping, items]) => (
              <section key={grouping} className="space-y-3">
                <h2 className="text-lg font-semibold">{grouping}</h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((c) => (
                    <Card key={c.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{c.capability_name}</CardTitle>
                            <CardDescription className="text-xs">{c.category} · {c.owner ?? "—"}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {healthIcon(c.overall_health)}
                            <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        {c.description && <p className="text-muted-foreground">{c.description}</p>}
                        <div className="text-xs space-y-1">
                          <div><span className="font-medium">Version:</span> {c.version ?? "—"}</div>
                          <div><span className="font-medium">Route:</span>{" "}
                            {c.canonical_route ? (
                              <Link to={c.canonical_route} className="text-primary hover:underline">{c.canonical_route}</Link>
                            ) : "—"}
                          </div>
                          <div><span className="font-medium">Menu:</span> {c.menu_module_name ?? "—"}</div>
                          <div><span className="font-medium">Permission:</span> {c.permission_hint ?? "—"}</div>
                          {c.feature_flag && <div><span className="font-medium">Flag:</span> {c.feature_flag}</div>}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(c.consumers ?? []).slice(0, 6).map((x) => (
                            <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 text-xs">
                          {c.documentation_link && (
                            <a href={`https://github.com/miplnoida/remix-of-base-modules/blob/main/${c.documentation_link}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />Docs
                            </a>
                          )}
                          {c.acceptance_link && (
                            <a href={`https://github.com/miplnoida/remix-of-base-modules/blob/main/${c.acceptance_link}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />Acceptance
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
        </TabsContent>

        <TabsContent value="consumers" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Consumed By</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr><th className="py-2 pr-4">Capability</th><th className="py-2 pr-4">Consumed By</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{c.capability_name}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(c.consumers ?? []).map((x) => <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Depends On</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr><th className="py-2 pr-4">Capability</th><th className="py-2 pr-4">Depends On</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{c.capability_name}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(c.dependencies ?? []).map((x) => <Badge key={x} variant="secondary" className="text-[10px]">{x}</Badge>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Health Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-3">Capability</th>
                      <th className="py-2 pr-3">Arch</th>
                      <th className="py-2 pr-3">Impl</th>
                      <th className="py-2 pr-3">Menu</th>
                      <th className="py-2 pr-3">Perms</th>
                      <th className="py-2 pr-3">Docs</th>
                      <th className="py-2 pr-3">Acceptance</th>
                      <th className="py-2 pr-3">Migration</th>
                      <th className="py-2 pr-3">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{c.capability_name}</td>
                        <td className="py-2 pr-3">{healthIcon(c.health_architecture)}</td>
                        <td className="py-2 pr-3">{healthIcon(c.health_implementation)}</td>
                        <td className="py-2 pr-3">{healthIcon(c.health_menu)}</td>
                        <td className="py-2 pr-3">{healthIcon(c.health_permissions)}</td>
                        <td className="py-2 pr-3">{healthIcon(c.health_documentation)}</td>
                        <td className="py-2 pr-3">{healthIcon(c.health_acceptance)}</td>
                        <td className="py-2 pr-3">{healthIcon(c.health_migration)}</td>
                        <td className="py-2 pr-3">{healthIcon(c.overall_health)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
