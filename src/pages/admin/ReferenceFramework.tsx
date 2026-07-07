/**
 * ReferenceFramework — Enterprise Reference Governance Console (Epic 1.1.2).
 *
 * NOT another CRUD screen. Governance-only view over the existing
 * core_reference_category / core_reference_group / core_reference_value tables
 * and coreReferenceDataService. Legacy /admin/master-data/* pages remain
 * fully operational for day-to-day editing.
 */
import React from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import {
  loadCategories, loadGroups, loadHealth,
  analyseConsumers, loadDependencies,
  type GovernanceGroup, type ConsumerAnalysis,
} from '@/services/core/referenceGovernanceService';
import {
  Layers, Boxes, Users, GitBranch, Activity, History,
  Search as SearchIcon, ShieldAlert, Network, Gauge, Info,
} from 'lucide-react';
import { ReferenceGovernanceSection } from '@/components/admin/reference/ReferenceGovernanceSection';

/* ---------- Small helpers ---------- */
const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'warn' | 'ok' }> = ({
  label, value, hint, tone = 'default',
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={
        'text-2xl font-semibold ' +
        (tone === 'warn' ? 'text-destructive' : tone === 'ok' ? 'text-emerald-600' : 'text-foreground')
      }>{value}</div>
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </CardContent>
  </Card>
);

const YesNo: React.FC<{ v?: boolean | null }> = ({ v }) => (
  <Badge variant={v ? 'default' : 'outline'} className="text-[10px]">{v ? 'Yes' : 'No'}</Badge>
);

const Missing: React.FC<{ v: unknown }> = ({ v }) =>
  v ? <span>{String(v)}</span> : <Badge variant="destructive" className="text-[10px]">missing</Badge>;

/* ---------- Page ---------- */
export default function ReferenceFramework() {
  const [search, setSearch] = React.useState('');
  const categoriesQ = useQuery({ queryKey: ['ref-gov', 'categories'], queryFn: loadCategories });
  const groupsQ = useQuery({ queryKey: ['ref-gov', 'groups'], queryFn: loadGroups });
  const healthQ = useQuery({ queryKey: ['ref-gov', 'health'], queryFn: loadHealth });
  const consumersQ = useQuery({ queryKey: ['ref-gov', 'consumers'], queryFn: analyseConsumers });
  const depsQ = useQuery({ queryKey: ['ref-gov', 'deps'], queryFn: loadDependencies });

  const groups = groupsQ.data ?? [];
  const filtered = React.useMemo(() => {
    if (!search) return groups;
    const s = search.toLowerCase();
    return groups.filter((g) =>
      g.group_code.toLowerCase().includes(s) ||
      g.group_name.toLowerCase().includes(s) ||
      (g.category_code ?? '').toLowerCase().includes(s) ||
      (g.module_code ?? '').toLowerCase().includes(s)
    );
  }, [groups, search]);

  const h = healthQ.data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Enterprise Reference Framework"
        subtitle="Governance console for the shared reference data service consumed by every enterprise module."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration', href: '/admin/platform' },
          { label: 'Reference Framework' },
        ]}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Governance surface, not a CRUD screen</AlertTitle>
        <AlertDescription>
          Day-to-day editing continues on the existing <code>/admin/master-data/*</code> pages.
          This console governs categories, ownership, lifecycle, versioning, hierarchy, i18n,
          external codes, consumers, dependencies and reference health.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="dashboard"><Gauge className="h-3.5 w-3.5 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="categories"><Layers className="h-3.5 w-3.5 mr-1" />Categories</TabsTrigger>
          <TabsTrigger value="groups"><Boxes className="h-3.5 w-3.5 mr-1" />Groups</TabsTrigger>
          <TabsTrigger value="ownership"><Users className="h-3.5 w-3.5 mr-1" />Ownership</TabsTrigger>
          <TabsTrigger value="hierarchy"><GitBranch className="h-3.5 w-3.5 mr-1" />Hierarchy</TabsTrigger>
          <TabsTrigger value="lifecycle"><Activity className="h-3.5 w-3.5 mr-1" />Lifecycle</TabsTrigger>
          <TabsTrigger value="version"><History className="h-3.5 w-3.5 mr-1" />Version</TabsTrigger>
          <TabsTrigger value="consumers"><Users className="h-3.5 w-3.5 mr-1" />Consumers</TabsTrigger>
          <TabsTrigger value="dependencies"><Network className="h-3.5 w-3.5 mr-1" />Dependencies</TabsTrigger>
          <TabsTrigger value="search"><SearchIcon className="h-3.5 w-3.5 mr-1" />Search</TabsTrigger>
          <TabsTrigger value="impact"><ShieldAlert className="h-3.5 w-3.5 mr-1" />Impact</TabsTrigger>
          <TabsTrigger value="health"><Activity className="h-3.5 w-3.5 mr-1" />Health</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {!h ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <Metric label="Categories" value={h.categoriesSeeded} hint="Enterprise category taxonomy" tone="ok" />
                <Metric label="Groups" value={h.totalGroups} hint={`${h.activeGroups} active`} />
                <Metric label="Values" value={h.totalValues} hint={`${h.activeValues} active`} />
                <Metric label="Deprecated" value={h.deprecatedValues} tone={h.deprecatedValues ? 'warn' : 'default'} />
                <Metric label="Empty groups" value={h.emptyGroups} tone={h.emptyGroups ? 'warn' : 'ok'} />
                <Metric label="Duplicate candidates" value={h.duplicateCandidates} tone={h.duplicateCandidates ? 'warn' : 'ok'} />
              </div>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <Metric label="Missing category" value={h.missingCategory} tone={h.missingCategory ? 'warn' : 'ok'} />
                <Metric label="Missing ownership" value={h.missingOwnership} tone={h.missingOwnership ? 'warn' : 'ok'} />
                <Metric label="Missing business owner" value={h.missingBusinessOwner} tone={h.missingBusinessOwner ? 'warn' : 'ok'} />
                <Metric label="Missing technical owner" value={h.missingTechnicalOwner} tone={h.missingTechnicalOwner ? 'warn' : 'ok'} />
                <Metric label="Missing steward" value={h.missingSteward} tone={h.missingSteward ? 'warn' : 'ok'} />
                <Metric label="Missing docs" value={h.missingDocumentation} tone={h.missingDocumentation ? 'warn' : 'ok'} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Metric label="Hierarchy-enabled groups" value={h.hierarchyEnabled} />
                <Metric label="i18n-enabled groups" value={h.i18nEnabled} />
                <Metric label="External-code-enabled groups" value={h.externalCodeEnabled} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Categories</CardTitle>
              <CardDescription>
                Permanent, platform-owned taxonomy that every future product consumes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner module</TableHead>
                    <TableHead className="text-right">Groups</TableHead>
                    <TableHead>Lifecycle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(categoriesQ.data ?? []).map((c) => (
                    <TableRow key={c.category_code}>
                      <TableCell className="font-mono text-xs">{c.category_code}</TableCell>
                      <TableCell>{c.category_name}</TableCell>
                      <TableCell>{c.owner_module_code ?? '—'}</TableCell>
                      <TableCell className="text-right">{c.group_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.lifecycle_status ?? 'ACTIVE'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups */}
        <TabsContent value="groups" className="mt-4">
          <GroupsTable groups={filtered} search={search} setSearch={setSearch} columns="core" />
        </TabsContent>

        {/* Ownership */}
        <TabsContent value="ownership" className="mt-4">
          <GroupsTable groups={filtered} search={search} setSearch={setSearch} columns="ownership" />
        </TabsContent>

        {/* Hierarchy */}
        <TabsContent value="hierarchy" className="mt-4">
          <GroupsTable groups={filtered} search={search} setSearch={setSearch} columns="capabilities" />
        </TabsContent>

        {/* Lifecycle */}
        <TabsContent value="lifecycle" className="mt-4">
          <GroupsTable groups={filtered} search={search} setSearch={setSearch} columns="lifecycle" />
        </TabsContent>

        {/* Version */}
        <TabsContent value="version" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Version strategy</CardTitle>
              <CardDescription>
                Row-level versioning via <code>version</code> / <code>supersedes_id</code> is the platform default.
                Group-level overrides can be declared per group.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Version strategy</TableHead>
                    <TableHead>Scope default</TableHead>
                    <TableHead>Lifecycle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs">{g.group_code}</TableCell>
                      <TableCell>{g.category_code ?? <Missing v={null} />}</TableCell>
                      <TableCell>{g.version_strategy ?? 'ROW_VERSION'}</TableCell>
                      <TableCell>{g.scope_default ?? 'PLATFORM'}</TableCell>
                      <TableCell><Badge variant="outline">{g.lifecycle_status ?? 'ACTIVE'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consumers */}
        <TabsContent value="consumers" className="mt-4">
          <ConsumersTable data={consumersQ.data ?? []} />
        </TabsContent>

        {/* Dependencies */}
        <TabsContent value="dependencies" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Category → Group → Module dependency map</CardTitle>
              <CardDescription>Which modules depend on which reference categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(depsQ.data ?? []).map((d) => (
                <div key={d.category_code} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{d.category_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{d.category_code}</div>
                    </div>
                    <Badge variant="outline">{d.groups.length} groups</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Modules: {d.modules.length ? d.modules.join(', ') : '—'}
                  </div>
                  {d.groups.length > 0 && (
                    <div className="mt-1 text-xs">
                      Groups: <span className="font-mono">{d.groups.slice(0, 8).join(', ')}</span>
                      {d.groups.length > 8 ? ` +${d.groups.length - 8} more` : ''}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search */}
        <TabsContent value="search" className="mt-4">
          <GroupsTable groups={filtered} search={search} setSearch={setSearch} columns="core" />
        </TabsContent>

        {/* Impact */}
        <TabsContent value="impact" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Impact analysis</CardTitle>
              <CardDescription>
                For each group, the set of consuming modules and duplicate candidates identifies
                the blast radius of a change or retirement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Consumers</TableHead>
                    <TableHead>Duplicate candidates</TableHead>
                    <TableHead>Retirement?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(consumersQ.data ?? []).map((c) => (
                    <TableRow key={c.group.id}>
                      <TableCell className="font-mono text-xs">{c.group.group_code}</TableCell>
                      <TableCell>{c.group.category_code ?? '—'}</TableCell>
                      <TableCell>{c.currentConsumers.length}</TableCell>
                      <TableCell>{c.duplicateCandidates.length}</TableCell>
                      <TableCell>
                        {c.retirementCandidate
                          ? <Badge variant="destructive">Candidate</Badge>
                          : <Badge variant="outline">No</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health */}
        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reference Health</CardTitle>
              <CardDescription>Governance completeness signals across the framework.</CardDescription>
            </CardHeader>
            <CardContent>
              {h ? (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Signal</TableHead><TableHead className="text-right">Count</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    <HealthRow label="Complete groups" v={h.totalGroups - h.missingCategory - h.missingOwnership} />
                    <HealthRow label="In use (values > 0)" v={h.totalGroups - h.emptyGroups} />
                    <HealthRow label="Unused (empty)" v={h.emptyGroups} />
                    <HealthRow label="Duplicate candidates" v={h.duplicateCandidates} />
                    <HealthRow label="Deprecated values" v={h.deprecatedValues} />
                    <HealthRow label="Pending migration (BN_*)" v={groups.filter((g) => g.group_code.startsWith('BN_')).length} />
                    <HealthRow label="Missing governance (any of business/tech/steward)"
                      v={groups.filter((g) => !g.business_owner || !g.technical_owner || !g.steward).length} />
                    <HealthRow label="Missing category" v={h.missingCategory} />
                    <HealthRow label="Missing ownership" v={h.missingOwnership} />
                    <HealthRow label="Missing documentation" v={h.missingDocumentation} />
                  </TableBody>
                </Table>
              ) : <div className="text-sm text-muted-foreground">Loading…</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReferenceGovernanceSection />
    </div>
  );
}

const HealthRow: React.FC<{ label: string; v: number }> = ({ label, v }) => (
  <TableRow>
    <TableCell>{label}</TableCell>
    <TableCell className="text-right font-mono">{v}</TableCell>
  </TableRow>
);

/* ---------- Groups table (multi-mode) ---------- */
const GroupsTable: React.FC<{
  groups: GovernanceGroup[];
  search: string;
  setSearch: (s: string) => void;
  columns: 'core' | 'ownership' | 'capabilities' | 'lifecycle';
}> = ({ groups, search, setSearch, columns }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>Reference Groups</CardTitle>
          <CardDescription>{groups.length} groups match your filter.</CardDescription>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, name, category, module…"
          className="w-72"
        />
      </div>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <Table>
        <TableHeader>
          {columns === 'core' && (
            <TableRow>
              <TableHead>Group</TableHead><TableHead>Name</TableHead>
              <TableHead>Category</TableHead><TableHead>Module</TableHead>
              <TableHead className="text-right">Values</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          )}
          {columns === 'ownership' && (
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Ownership module</TableHead>
              <TableHead>Business owner</TableHead>
              <TableHead>Technical owner</TableHead>
              <TableHead>Steward</TableHead>
              <TableHead>Platform-owned?</TableHead>
              <TableHead>Org-overridable?</TableHead>
            </TableRow>
          )}
          {columns === 'capabilities' && (
            <TableRow>
              <TableHead>Group</TableHead><TableHead>Category</TableHead>
              <TableHead>Hierarchy</TableHead><TableHead>i18n</TableHead>
              <TableHead>External codes</TableHead>
            </TableRow>
          )}
          {columns === 'lifecycle' && (
            <TableRow>
              <TableHead>Group</TableHead><TableHead>Lifecycle</TableHead>
              <TableHead>Active?</TableHead><TableHead>System?</TableHead>
              <TableHead>Scope default</TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <TableRow key={g.id}>
              {columns === 'core' && (
                <>
                  <TableCell className="font-mono text-xs">{g.group_code}</TableCell>
                  <TableCell>{g.group_name}</TableCell>
                  <TableCell>{g.category_code ?? <Missing v={null} />}</TableCell>
                  <TableCell>{g.module_code ?? '—'}</TableCell>
                  <TableCell className="text-right">{g.active_value_count}/{g.value_count}</TableCell>
                  <TableCell>
                    <Badge variant={g.is_active ? 'default' : 'outline'}>{g.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                </>
              )}
              {columns === 'ownership' && (
                <>
                  <TableCell className="font-mono text-xs">{g.group_code}</TableCell>
                  <TableCell><Missing v={g.ownership_module_code} /></TableCell>
                  <TableCell><Missing v={g.business_owner} /></TableCell>
                  <TableCell><Missing v={g.technical_owner} /></TableCell>
                  <TableCell><Missing v={g.steward} /></TableCell>
                  <TableCell><YesNo v={g.is_platform_owned} /></TableCell>
                  <TableCell><YesNo v={g.is_org_overridable} /></TableCell>
                </>
              )}
              {columns === 'capabilities' && (
                <>
                  <TableCell className="font-mono text-xs">{g.group_code}</TableCell>
                  <TableCell>{g.category_code ?? '—'}</TableCell>
                  <TableCell><YesNo v={g.supports_hierarchy} /></TableCell>
                  <TableCell><YesNo v={g.supports_i18n} /></TableCell>
                  <TableCell><YesNo v={g.supports_external_codes} /></TableCell>
                </>
              )}
              {columns === 'lifecycle' && (
                <>
                  <TableCell className="font-mono text-xs">{g.group_code}</TableCell>
                  <TableCell><Badge variant="outline">{g.lifecycle_status ?? 'ACTIVE'}</Badge></TableCell>
                  <TableCell><YesNo v={g.is_active} /></TableCell>
                  <TableCell><YesNo v={g.is_system} /></TableCell>
                  <TableCell>{g.scope_default ?? 'PLATFORM'}</TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

/* ---------- Consumers table ---------- */
const ConsumersTable: React.FC<{ data: ConsumerAnalysis[] }> = ({ data }) => (
  <Card>
    <CardHeader>
      <CardTitle>Consumer Analysis</CardTitle>
      <CardDescription>
        For each reference group: current consumers, potential consumers, duplicate & migration
        candidates and retirement candidates. Feeds the Epic 0.36D migration backlog.
      </CardDescription>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead>Current consumers</TableHead>
            <TableHead>Potential consumers</TableHead>
            <TableHead>Duplicate candidates</TableHead>
            <TableHead>Migration candidates</TableHead>
            <TableHead>Retirement?</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => (
            <TableRow key={c.group.id}>
              <TableCell className="font-mono text-xs">{c.group.group_code}</TableCell>
              <TableCell className="text-xs">{c.currentConsumers.join(', ') || '—'}</TableCell>
              <TableCell className="text-xs">{c.potentialConsumers.slice(0, 5).join(', ') || '—'}</TableCell>
              <TableCell className="text-xs font-mono">
                {c.duplicateCandidates.slice(0, 3).join(', ') || '—'}
                {c.duplicateCandidates.length > 3 ? ` +${c.duplicateCandidates.length - 3}` : ''}
              </TableCell>
              <TableCell className="text-xs">{c.migrationCandidates.join('; ') || '—'}</TableCell>
              <TableCell>
                {c.retirementCandidate
                  ? <Badge variant="destructive">Candidate</Badge>
                  : <Badge variant="outline">No</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);
