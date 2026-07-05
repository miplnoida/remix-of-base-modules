/**
 * Geography Domain Pack — canonical admin shell (Epic 2.2).
 * Route: /admin/geography (registered in app_modules as geography_domain).
 * Tabs: Countries · Admin Levels · Geo Areas · Address Formats · Jurisdictions · Policies · External Codes.
 * Consumes ssp_* tables via the shared geographyService/useGeography hooks — never direct.
 */
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import {
  useCountries,
  useAdminLevels,
  useGeoAreas,
  useAddressFormats,
  useJurisdictions,
  useCountryPolicies,
  useGeoExternalCodes,
} from '@/hooks/geography/useGeography';

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
      No {label} configured yet. Use the import action or add rows via the reference framework.
    </div>
  );
}

function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  rows: any[];
  empty: string;
}) {
  if (!rows.length) return <EmptyState label={empty} />;
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

export default function GeographyDomainPage() {
  const { data: countries = [], isLoading: cLoading } = useCountries();
  const [countryCode, setCountryCode] = useState<string>('');

  const effectiveCountry = countryCode || countries[0]?.country_code || '';

  const levels = useAdminLevels(effectiveCountry);
  const areas = useGeoAreas(effectiveCountry);
  const formats = useAddressFormats(effectiveCountry);
  const jurisdictions = useJurisdictions(effectiveCountry);
  const policies = useCountryPolicies(effectiveCountry);
  const externalCodes = useGeoExternalCodes(effectiveCountry);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.country_code, label: `${c.country_name} (${c.country_code})` })),
    [countries],
  );

  return (
    <PermissionWrapper moduleName="geography_domain">
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Geography Domain"
          subtitle="Shared Social Security geography foundation — countries, administrative hierarchy, addresses, jurisdictions and policies. Consumed by every module through the useGeography facade."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Administration' },
            { label: 'Platform', href: '/admin/platform' },
            { label: 'Geography' },
          ]}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active country</CardTitle>
            <CardDescription>
              Configuration below is scoped to the selected country. Administrative hierarchy is configurable per country.
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

        <Tabs defaultValue="countries" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="countries">Countries</TabsTrigger>
            <TabsTrigger value="levels">Administrative Levels</TabsTrigger>
            <TabsTrigger value="areas">Geo Areas</TabsTrigger>
            <TabsTrigger value="formats">Address Formats</TabsTrigger>
            <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="codes">External Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="countries">
            <DataTable
              empty="countries"
              rows={countries}
              columns={[
                { key: 'country_code', label: 'Code' },
                { key: 'country_name', label: 'Name' },
                { key: 'iso_alpha2', label: 'ISO α2' },
                { key: 'iso_alpha3', label: 'ISO α3' },
                { key: 'default_timezone', label: 'Timezone' },
                { key: 'default_currency', label: 'Currency' },
                { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="levels">
            <DataTable
              empty="administrative levels"
              rows={levels.data ?? []}
              columns={[
                { key: 'level_no', label: 'Level' },
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'plural_name', label: 'Plural' },
                { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="areas">
            <DataTable
              empty="geo areas"
              rows={areas.data ?? []}
              columns={[
                { key: 'level_no', label: 'Level' },
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'timezone', label: 'Timezone' },
                { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="formats">
            <DataTable
              empty="address formats"
              rows={formats.data ?? []}
              columns={[
                { key: 'format_name', label: 'Format' },
                { key: 'display_template', label: 'Template' },
                { key: 'sample', label: 'Sample' },
                { key: 'is_default', label: 'Default', render: (r) => (r.is_default ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="jurisdictions">
            <DataTable
              empty="jurisdictions"
              rows={jurisdictions.data ?? []}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'kind', label: 'Kind' },
                { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="policies">
            <DataTable
              empty="country policies"
              rows={policies.data ?? []}
              columns={[
                { key: 'policy_key', label: 'Key' },
                { key: 'description', label: 'Description' },
                {
                  key: 'policy_value',
                  label: 'Value',
                  render: (r) => (
                    <code className="text-xs">{JSON.stringify(r.policy_value)}</code>
                  ),
                },
                { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="codes">
            <DataTable
              empty="external codes"
              rows={externalCodes.data ?? []}
              columns={[
                { key: 'system_code', label: 'System' },
                { key: 'entity_kind', label: 'Entity' },
                { key: 'entity_ref', label: 'Ref' },
                { key: 'external_code', label: 'External Code' },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
