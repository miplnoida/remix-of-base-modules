import { Link } from 'react-router-dom';
import { Layers, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  usePlatformServices,
  usePlatformServiceContracts,
  usePlatformServiceConsumers,
  usePlatformChecklist,
  usePlatformAssessments,
  usePlatformAdminAccessHealth,
} from '@/platform/platform-services/hooks';

function StatusBadge({ status }: { status: string }) {
  const v = status.toUpperCase();
  const cls =
    v === 'ACTIVE' || v === 'HEALTHY' || v === 'GA'
      ? 'bg-green-100 text-green-800'
      : v === 'PLANNED' || v === 'DRAFT'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';
  return <Badge variant="outline" className={cls}>{status}</Badge>;
}

export default function PlatformServiceCatalogue() {
  const services = usePlatformServices();
  const contracts = usePlatformServiceContracts();
  const consumers = usePlatformServiceConsumers();
  const checklist = usePlatformChecklist();
  const assessments = usePlatformAssessments();
  const health = usePlatformAdminAccessHealth();

  const totalServices = services.data?.length ?? 0;
  const activeCount = services.data?.filter((s) => s.status === 'ACTIVE').length ?? 0;
  const plannedCount = services.data?.filter((s) => s.status === 'PLANNED').length ?? 0;
  const mandatoryCount = services.data?.filter((s) => s.is_mandatory).length ?? 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Platform Service Catalogue"
        subtitle="Review reusable platform services, module contracts, integration readiness, and service health."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration' },
          { label: 'Governance' },
          { label: 'Platform Service Catalogue' },
        ]}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="consumers">Consumers</TabsTrigger>
          <TabsTrigger value="checklist">Module Checklist</TabsTrigger>
          <TabsTrigger value="assessments">Module Assessments</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total Services', value: totalServices },
              { label: 'Active', value: activeCount },
              { label: 'Planned', value: plannedCount },
              { label: 'Mandatory', value: mandatoryCount },
            ].map((s) => (
              <Card key={s.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">{s.value}</CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" /> Registered Platform Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ServicesTable services={services.data ?? []} loading={services.isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <ServicesTable services={services.data ?? []} loading={services.isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {contracts.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (contracts.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contracts registered yet. Add service contracts to formalize APIs and integration points.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.data!.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.contract_name}</TableCell>
                        <TableCell>{c.contract_type}</TableCell>
                        <TableCell>{c.version}</TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumers" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {consumers.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (consumers.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No consumers registered yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consumer</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumers.data!.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.consumer_name}</TableCell>
                        <TableCell>{c.consumer_module_code}</TableCell>
                        <TableCell>{c.consumption_type}</TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {checklist.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Mandatory</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(checklist.data ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.item_name}</TableCell>
                        <TableCell>{c.category}</TableCell>
                        <TableCell>{c.is_mandatory ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-muted-foreground">{c.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {assessments.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (assessments.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No module assessments recorded yet. Assessments track each module against the checklist above.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Checklist Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waived</TableHead>
                      <TableHead>Assessed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.data!.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.module_code}</TableCell>
                        <TableCell>{a.checklist_item_id}</TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                        <TableCell>{a.waived ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{a.assessed_at ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="pt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Access Control Health</CardTitle>
            </CardHeader>
            <CardContent className="flex items-start gap-3">
              {health.data?.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div className="text-sm">
                <div className="font-medium">Current admin role has Platform Service Catalogue access</div>
                <div className="text-muted-foreground">{health.data?.message ?? 'Checking…'}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServicesTable({
  services,
  loading,
}: {
  services: ReturnType<typeof usePlatformServices>['data'] extends infer T ? Exclude<T, undefined> : never;
  loading: boolean;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading services…</p>;
  if (!services.length) return <p className="text-sm text-muted-foreground">No services registered.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Maturity</TableHead>
          <TableHead>Mandatory</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Primary Route</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <div className="font-medium">{s.service_name}</div>
              <div className="text-xs text-muted-foreground">{s.service_code}</div>
            </TableCell>
            <TableCell>{s.category}</TableCell>
            <TableCell><StatusBadge status={s.status} /></TableCell>
            <TableCell>{s.maturity}</TableCell>
            <TableCell>{s.is_mandatory ? 'Yes' : 'No'}</TableCell>
            <TableCell>{s.owner_module_code}</TableCell>
            <TableCell>
              {s.primary_route ? (
                <Link to={s.primary_route} className="text-primary hover:underline inline-flex items-center gap-1">
                  {s.primary_route} <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <Badge variant="outline">Placeholder</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
