import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Info, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useEmployerRegistryList, useEmployerRegistryStats } from '@/platform/employer-registry/hooks';
import type { EmployerLifecycleStatus } from '@/platform/employer-registry/types';

function statusVariant(status: EmployerLifecycleStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'default' as const;
    case 'SUSPENDED':
      return 'destructive' as const;
    case 'INACTIVE':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

export default function EmployerRegistry() {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useEmployerRegistryList({ search: debounced, limit: 100 });
  const statsQuery = useEmployerRegistryStats({ search: debounced, limit: 100 });
  const rows = listQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Employer Registry"
        subtitle="Modern governed employer screen — runs in parallel with the existing employer screens (pilot)."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration' },
          { label: 'Employer Registry' },
        ]}
      />

      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <div className="font-medium text-foreground">Pilot screen — existing employer screens are still available</div>
          <p className="text-muted-foreground">
            This is a new governed screen for pilot and administrator users. It reads employer data through the legacy
            adapter and routes all changes through approval workflows. Existing employer directories, forms and menus
            continue to work as they do today.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Employers" value={stats?.total ?? '—'} />
        <StatCard label="Active" value={stats?.active ?? '—'} />
        <StatCard label="Suspended" value={stats?.suspended ?? '—'} />
        <StatCard label="Inactive" value={stats?.inactive ?? '—'} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Employers</CardTitle>
          </div>
          <div className="relative mt-2 max-w-md">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or employer number"
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading employers…</div>
          ) : rows.length === 0 ? (
            <EmptyState title="No employers found" description="Try a different search term." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employer #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.employerId}>
                      <TableCell className="font-mono text-sm">{r.employerNumber}</TableCell>
                      <TableCell className="font-medium">{r.employerName || '—'}</TableCell>
                      <TableCell>{r.employerType ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.employerStatus)}>{r.employerStatus}</Badge>
                      </TableCell>
                      <TableCell>{r.officeCode ?? '—'}</TableCell>
                      <TableCell>{r.registrationDate ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/employer-registry/${encodeURIComponent(r.employerId)}`}>
                            Open
                          </Link>
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
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
