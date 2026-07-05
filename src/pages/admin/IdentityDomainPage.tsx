/**
 * Identity Domain Pack — canonical admin shell (Epic 2.3).
 * Route: /admin/identity (registered in app_modules as identity_domain).
 * Tabs: Identity Types · Country Rules · Validation Patterns · Party Identities ·
 *       External References · Verification Events · Match Keys.
 *
 * Country selector consumes the Geography Domain Pack (useCountries) — NO parallel
 * country source is introduced.
 */
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useCountries } from '@/hooks/geography/useGeography';
import {
  useIdentityTypes,
  useValidationPatterns,
  useCountryIdentityRules,
  useIdentityValidation,
} from '@/hooks/identity/useIdentity';
import type { ValidationResult } from '@/services/identity/identityService';

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
      No {label} configured yet. Seed via the reference framework or import action.
    </div>
  );
}

function DataTable({
  columns, rows, empty,
}: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  rows: any[];
  empty: string;
}) {
  if (!rows?.length) return <EmptyState label={empty} />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-t">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 align-top">
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidatorPanel({ countryCode }: { countryCode: string }) {
  const { data: types = [] } = useIdentityTypes();
  const { validate } = useIdentityValidation();
  const [typeCode, setTypeCode] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [busy, setBusy] = useState(false);

  const onCheck = async () => {
    if (!countryCode || !typeCode) return;
    setBusy(true);
    try {
      setResult(await validate(countryCode, typeCode, value));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Live validator</CardTitle>
        <CardDescription>
          Runs identity_service.validateIdentity against the active country rule set. Same facade
          consumed by Member, Employer, BN, Compliance, HRMS, Prison, Licensing, Portals.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto]">
        <Select value={typeCode} onValueChange={setTypeCode} disabled={!types.length}>
          <SelectTrigger><SelectValue placeholder="Identity type" /></SelectTrigger>
          <SelectContent>
            {types.map((t) => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value to validate" maxLength={64} />
        <Button onClick={onCheck} disabled={busy || !countryCode || !typeCode}>Validate</Button>
        {result && (
          <div className="md:col-span-3 text-sm">
            {result.valid ? (
              <Badge className="bg-emerald-600">Valid</Badge>
            ) : (
              <>
                <Badge variant="destructive">Invalid</Badge>
                <span className="ml-2 text-muted-foreground">{result.reason}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function IdentityDomainPage() {
  const { data: countries = [], isLoading: cLoading } = useCountries();
  const [countryCode, setCountryCode] = useState<string>('');
  const effectiveCountry = countryCode || countries[0]?.country_code || '';

  const types = useIdentityTypes();
  const patterns = useValidationPatterns();
  const rules = useCountryIdentityRules(effectiveCountry);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.country_code, label: `${c.country_name} (${c.country_code})` })),
    [countries],
  );

  return (
    <PermissionWrapper moduleName="identity_domain">
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Identity Domain"
          subtitle="Shared Social Security identity foundation — ID types, country rules, validation patterns, party identities, external references, verification and duplicate-matching. Consumes Geography for country linkage."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Administration' },
            { label: 'Platform', href: '/admin/platform' },
            { label: 'Identity' },
          ]}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active country (via Geography Domain Pack)</CardTitle>
            <CardDescription>
              Country list is served by <code>useCountries()</code> from the Geography Domain Pack.
              Identity does not maintain its own country source.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm">
              <Select value={effectiveCountry} onValueChange={setCountryCode} disabled={cLoading || !countries.length}>
                <SelectTrigger>
                  <SelectValue placeholder={cLoading ? 'Loading…' : countries.length ? 'Select country' : 'No countries registered yet'} />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="types" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="types">Identity Types</TabsTrigger>
            <TabsTrigger value="rules">Country Rules</TabsTrigger>
            <TabsTrigger value="patterns">Validation Patterns</TabsTrigger>
            <TabsTrigger value="party">Party Identities</TabsTrigger>
            <TabsTrigger value="external">External References</TabsTrigger>
            <TabsTrigger value="verification">Verification Events</TabsTrigger>
            <TabsTrigger value="match">Match Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="types">
            <DataTable
              empty="identity types"
              rows={types.data ?? []}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'description', label: 'Description' },
                { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <DataTable
              empty="country identity rules"
              rows={rules.data ?? []}
              columns={[
                { key: 'identity_type_code', label: 'Identity Type' },
                { key: 'is_primary', label: 'Primary', render: (r) => (r.is_primary ? 'Yes' : 'No') },
                { key: 'is_mandatory', label: 'Mandatory', render: (r) => (r.is_mandatory ? 'Yes' : 'No') },
                { key: 'format_hint', label: 'Format' },
                { key: 'min_length', label: 'Min' },
                { key: 'max_length', label: 'Max' },
                { key: 'regex', label: 'Regex' },
                { key: 'expiry_required', label: 'Expiry', render: (r) => (r.expiry_required ? 'Yes' : 'No') },
                { key: 'issuing_authority', label: 'Authority' },
              ]}
            />
            <ValidatorPanel countryCode={effectiveCountry} />
          </TabsContent>

          <TabsContent value="patterns">
            <DataTable
              empty="validation patterns"
              rows={patterns.data ?? []}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'regex', label: 'Regex' },
                { key: 'checksum_algorithm', label: 'Checksum' },
                { key: 'sample', label: 'Sample' },
              ]}
            />
          </TabsContent>

          <TabsContent value="party">
            <EmptyState label="party identities (write surfaces land with the Member adoption wave — read-only until then)" />
          </TabsContent>

          <TabsContent value="external">
            <EmptyState label="external identity references (populated as legacy adopters wire in)" />
          </TabsContent>

          <TabsContent value="verification">
            <EmptyState label="verification events (populated when identities are recorded)" />
          </TabsContent>

          <TabsContent value="match">
            <EmptyState label="match keys (populated by the matching engine wave)" />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
