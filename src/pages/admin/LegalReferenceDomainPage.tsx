/**
 * Legal Reference Domain Pack — canonical admin shell (Epic 2.5).
 * Route: /admin/legal-reference (registered in app_modules as legal_reference_domain).
 *
 * Tabs: Acts · Sections · Regulations · Jurisdictions · Courts · Legal References ·
 *       Applicability · External Codes · Types.
 *
 * Country selector consumes the Geography Domain Pack (useCountries) — NO parallel
 * country source is introduced. Auto-selects the single active country (KN today).
 */
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountries } from '@/hooks/geography/useGeography';
import {
  useLegalActs,
  useLegalSections,
  useRegulations,
  useJurisdictions,
  useCourtReferences,
  useLegalReferences,
  useLegalExternalCodes,
  useCountryLegalApplicability,
  useLegalReferenceTypes,
} from '@/hooks/legal-reference/useSspLegalReference';

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

export default function LegalReferenceDomainPage() {
  const { data: countries = [] } = useCountries();
  const [countryCode, setCountryCode] = useState<string>('');
  const effectiveCountry = countryCode || countries[0]?.country_code || 'KN';
  const [selectedActId, setSelectedActId] = useState<string>('');

  const acts = useLegalActs(effectiveCountry);
  const sections = useLegalSections(selectedActId);
  const regulations = useRegulations(effectiveCountry);
  const jurisdictions = useJurisdictions(effectiveCountry);
  const courts = useCourtReferences(effectiveCountry);
  const refs = useLegalReferences(effectiveCountry);
  const applicability = useCountryLegalApplicability(effectiveCountry);
  const external = useLegalExternalCodes();
  const types = useLegalReferenceTypes();

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Legal Reference Domain"
        description="Shared Social Security Legal Reference foundation — acts, sections, regulations, jurisdictions, courts, references, applicability and external codes. Consumed by BN, Claims, Compliance, Legal, Finance, Employer, Member and Portals."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Country scope</CardTitle>
          <CardDescription>
            Country linkage sourced from the Geography Domain Pack. When only one active
            country exists it is auto-selected (current default: <strong>KN — St. Kitts &amp; Nevis</strong>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={effectiveCountry} onValueChange={setCountryCode}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {countries.map((c: any) => (
                  <SelectItem key={c.country_code} value={c.country_code}>
                    {c.country_code} — {c.country_name ?? c.iso_alpha3 ?? c.country_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="acts" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="acts">Acts</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="regulations">Regulations</TabsTrigger>
          <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
          <TabsTrigger value="courts">Courts</TabsTrigger>
          <TabsTrigger value="refs">Legal References</TabsTrigger>
          <TabsTrigger value="applicability">Applicability</TabsTrigger>
          <TabsTrigger value="external">External Codes</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
        </TabsList>

        <TabsContent value="acts">
          <DataTable
            empty="legal acts"
            rows={acts.data ?? []}
            columns={[
              { key: 'act_code', label: 'Code' },
              { key: 'act_name', label: 'Name' },
              { key: 'short_title', label: 'Short title' },
              { key: 'chapter', label: 'Chapter' },
              { key: 'year', label: 'Year' },
              { key: 'status', label: 'Status' },
              { key: 'effective_from', label: 'Effective from' },
            ]}
          />
        </TabsContent>

        <TabsContent value="sections" className="space-y-3">
          <div className="max-w-md">
            <Select value={selectedActId} onValueChange={setSelectedActId}>
              <SelectTrigger><SelectValue placeholder="Select act to load its sections" /></SelectTrigger>
              <SelectContent>
                {(acts.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.act_code} — {a.act_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable
            empty="sections"
            rows={sections.data ?? []}
            columns={[
              { key: 'section_code', label: 'Section' },
              { key: 'subsection', label: 'Subsection' },
              { key: 'section_title', label: 'Title' },
              { key: 'effective_from', label: 'Effective from' },
            ]}
          />
        </TabsContent>

        <TabsContent value="regulations">
          <DataTable
            empty="regulations"
            rows={regulations.data ?? []}
            columns={[
              { key: 'regulation_code', label: 'Code' },
              { key: 'regulation_name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'status', label: 'Status' },
              { key: 'effective_from', label: 'Effective from' },
            ]}
          />
        </TabsContent>

        <TabsContent value="jurisdictions">
          <DataTable
            empty="jurisdictions"
            rows={jurisdictions.data ?? []}
            columns={[
              { key: 'jurisdiction_code', label: 'Code' },
              { key: 'jurisdiction_name', label: 'Name' },
              { key: 'country_code', label: 'Country' },
            ]}
          />
        </TabsContent>

        <TabsContent value="courts">
          <DataTable
            empty="courts"
            rows={courts.data ?? []}
            columns={[
              { key: 'court_code', label: 'Code' },
              { key: 'court_name', label: 'Name' },
              { key: 'court_level', label: 'Level' },
              { key: 'legacy_court_ref', label: 'Legacy ref' },
            ]}
          />
        </TabsContent>

        <TabsContent value="refs">
          <DataTable
            empty="legal references"
            rows={refs.data ?? []}
            columns={[
              { key: 'ref_code', label: 'Code' },
              { key: 'short_title', label: 'Short title' },
              { key: 'ref_type_code', label: 'Type' },
              { key: 'full_citation', label: 'Citation' },
              { key: 'status', label: 'Status' },
              { key: 'effective_from', label: 'Effective from' },
            ]}
          />
        </TabsContent>

        <TabsContent value="applicability">
          <DataTable
            empty="country applicability rules"
            rows={applicability.data ?? []}
            columns={[
              { key: 'entity_type', label: 'Entity' },
              { key: 'entity_ref', label: 'Ref' },
              { key: 'is_available', label: 'Available', render: (r) => (r.is_available ? 'Yes' : 'No') },
              { key: 'effective_from', label: 'From' },
              { key: 'effective_to', label: 'To' },
            ]}
          />
        </TabsContent>

        <TabsContent value="external">
          <DataTable
            empty="external legal code mappings"
            rows={external.data ?? []}
            columns={[
              { key: 'system_code', label: 'System' },
              { key: 'entity_type', label: 'Entity' },
              { key: 'external_code', label: 'External code' },
              { key: 'local_ref', label: 'Local ref' },
            ]}
          />
        </TabsContent>

        <TabsContent value="types">
          <DataTable
            empty="reference types"
            rows={types.data ?? []}
            columns={[
              { key: 'type_code', label: 'Code' },
              { key: 'type_name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'sort_order', label: 'Order' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
