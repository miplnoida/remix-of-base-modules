/**
 * Participant / Party Domain Pack — canonical admin shell (Epic 2.6).
 * Route: /admin/participant (registered in app_modules as participant_domain).
 *
 * Tabs: Party Types · Roles · Relationships · Member Types · Employer Types ·
 *       Occupations · Nationalities · Disability · Life Status · Role Bindings.
 *
 * Read-only baseline surface (Epic 2.6). CRUD and adoption waves land in later
 * epics — the Role Bindings tab is intentionally empty until real Member /
 * Employer adoption begins.
 */
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  usePartyTypes, useParticipantRoles, useRelationshipTypes,
  useMemberTypes, useEmployerTypes, useOccupationCategories,
  useNationalities, useDisabilityTypes, useLifeStatuses, usePartyRoleBindings,
} from '@/hooks/participant/useParticipantDomain';
import {
  useMemberParties, useEmployerParties, usePartySearch,
} from '@/hooks/participant/usePartyProjection';

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
                  {c.render ? c.render(r) : (Array.isArray(r[c.key]) ? r[c.key].join(', ') : (r[c.key] ?? '—'))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ParticipantDomainPage() {
  const partyTypes    = usePartyTypes();
  const roles         = useParticipantRoles();
  const relationships = useRelationshipTypes();
  const memberTypes   = useMemberTypes();
  const employerTypes = useEmployerTypes();
  const occupations   = useOccupationCategories();
  const nationalities = useNationalities();
  const disability    = useDisabilityTypes();
  const lifeStatuses  = useLifeStatuses();
  const bindings      = usePartyRoleBindings();

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Participant / Party Domain"
        subtitle="Shared Social Security participant classification — party types, participant roles, relationships, member/employer types, occupations, nationalities, disability, life status and party-role bindings. Consumed by Member, Employer, BN, Claims, Contributions, Compliance, Legal, Finance, HRMS, Prison, Licensing and Portals."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consumption model</CardTitle>
          <CardDescription>
            All party-role data flows through <code>useParticipantDomain()</code> hooks and
            <code>participantDomainService</code>. Reuses Geography, Identity, Financial
            Reference and Legal Reference. Legacy <code>ip_*</code>, <code>er_*</code>,
            BN, BEMA, Compliance, IA and Legal tables are untouched.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="party-types" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="party-types">Party Types</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="member-types">Member Types</TabsTrigger>
          <TabsTrigger value="employer-types">Employer Types</TabsTrigger>
          <TabsTrigger value="occupations">Occupations</TabsTrigger>
          <TabsTrigger value="nationalities">Nationalities</TabsTrigger>
          <TabsTrigger value="disability">Disability</TabsTrigger>
          <TabsTrigger value="life-status">Life Status</TabsTrigger>
          <TabsTrigger value="bindings">Role Bindings</TabsTrigger>
          <TabsTrigger value="legacy-members">Existing Members</TabsTrigger>
          <TabsTrigger value="legacy-employers">Existing Employers</TabsTrigger>
          <TabsTrigger value="party-projection">Party Role Projection</TabsTrigger>
        </TabsList>

        <TabsContent value="party-types">
          <DataTable empty="party types" rows={partyTypes.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'sort_order', label: 'Order' },
            ]} />
        </TabsContent>

        <TabsContent value="roles">
          <DataTable empty="participant roles" rows={roles.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'applies_to', label: 'Applies to' },
              { key: 'sort_order', label: 'Order' },
            ]} />
        </TabsContent>

        <TabsContent value="relationships">
          <DataTable empty="relationship types" rows={relationships.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'reciprocal_code', label: 'Reciprocal' },
              { key: 'category', label: 'Category' },
            ]} />
        </TabsContent>

        <TabsContent value="member-types">
          <DataTable empty="member types" rows={memberTypes.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'description', label: 'Description' },
            ]} />
        </TabsContent>

        <TabsContent value="employer-types">
          <DataTable empty="employer types" rows={employerTypes.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'description', label: 'Description' },
            ]} />
        </TabsContent>

        <TabsContent value="occupations">
          <DataTable empty="occupation categories" rows={occupations.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'isco_code', label: 'ISCO-08' },
              { key: 'parent_code', label: 'Parent' },
            ]} />
        </TabsContent>

        <TabsContent value="nationalities">
          <DataTable empty="nationalities" rows={nationalities.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'country_code', label: 'Country' },
              { key: 'is_default_domestic', label: 'Default domestic',
                render: (r) => (r.is_default_domestic ? 'Yes' : 'No') },
            ]} />
        </TabsContent>

        <TabsContent value="disability">
          <DataTable empty="disability types" rows={disability.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
            ]} />
        </TabsContent>

        <TabsContent value="life-status">
          <DataTable empty="life statuses" rows={lifeStatuses.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'is_terminal', label: 'Terminal',
                render: (r) => (r.is_terminal ? 'Yes' : 'No') },
            ]} />
        </TabsContent>

        <TabsContent value="bindings" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Party-role bindings</CardTitle>
              <CardDescription>
                A party may hold multiple roles over time. This tab is intentionally
                empty until Member / Employer adoption waves start writing bindings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable empty="party-role bindings" rows={bindings.data ?? []}
                columns={[
                  { key: 'party_kind', label: 'Party kind' },
                  { key: 'party_ref', label: 'Party ref' },
                  { key: 'role_code', label: 'Role' },
                  { key: 'scope_code', label: 'Scope' },
                  { key: 'effective_from', label: 'From' },
                  { key: 'effective_to', label: 'To' },
                  { key: 'is_primary', label: 'Primary',
                    render: (r) => (r.is_primary ? 'Yes' : 'No') },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legacy-members" className="space-y-3">
          <LegacyMembersTab />
        </TabsContent>

        <TabsContent value="legacy-employers" className="space-y-3">
          <LegacyEmployersTab />
        </TabsContent>

        <TabsContent value="party-projection" className="space-y-3">
          <PartyProjectionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Epic 2.6A — Member/Employer Read-Only Adoption Wave sub-components
// Read-only projection from legacy ip_master / er_master via
// v_ssp_party_projection. No writes.
// ---------------------------------------------------------------------------

const projectionColumns = [
  { key: 'legacy_ref', label: 'Legacy Ref' },
  { key: 'display_name', label: 'Name' },
  { key: 'party_kind', label: 'Kind' },
  { key: 'primary_identifier', label: 'Identifier' },
  { key: 'legacy_status', label: 'Status' },
  { key: 'geo_area_code', label: 'Geo' },
  { key: 'projected_roles', label: 'Roles',
    render: (r: any) => (r.projected_roles ?? []).join(', ') },
];

function ReadOnlyBanner({ source }: { source: string }) {
  return (
    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      Read-only projection from <code>{source}</code> via
      <code> v_ssp_party_projection</code>. Legacy tables are not modified.
      No dual-write. Registration remains on existing screens.
    </div>
  );
}

function LegacyMembersTab() {
  const { data, isLoading } = useMemberParties(200);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Existing Members (ip_master)</CardTitle>
        <CardDescription>
          Insured persons projected as canonical parties (roles: MEMBER, CONTRIBUTOR).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ReadOnlyBanner source="ip_master" />
        <div className="text-xs text-muted-foreground">
          {isLoading ? 'Loading…' : `${data?.length ?? 0} records (capped at 200)`}
        </div>
        <DataTable empty="member parties" rows={data ?? []} columns={projectionColumns} />
      </CardContent>
    </Card>
  );
}

function LegacyEmployersTab() {
  const { data, isLoading } = useEmployerParties(200);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Existing Employers (er_master)</CardTitle>
        <CardDescription>
          Employers projected as canonical parties (role: EMPLOYER).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ReadOnlyBanner source="er_master" />
        <div className="text-xs text-muted-foreground">
          {isLoading ? 'Loading…' : `${data?.length ?? 0} records (capped at 200)`}
        </div>
        <DataTable empty="employer parties" rows={data ?? []} columns={projectionColumns} />
      </CardContent>
    </Card>
  );
}

function PartyProjectionTab() {
  const [q, setQ] = useState('');
  const { data, isLoading } = usePartySearch({ q, limit: 100 });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Party Role Projection</CardTitle>
        <CardDescription>
          Unified search across legacy Members and Employers via the shared
          Participant facade. Downstream modules should consume via
          <code> partyProjectionService</code> / <code>usePartySearch</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name, SSN, or REGNO…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-md"
          />
          <Badge variant="outline">Read-only</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {isLoading ? 'Loading…' : `${data?.length ?? 0} matches`}
        </div>
        <DataTable
          empty="matching parties"
          rows={data ?? []}
          columns={[
            { key: 'source_system', label: 'Source' },
            ...projectionColumns,
          ]}
        />
      </CardContent>
    </Card>
  );
}
