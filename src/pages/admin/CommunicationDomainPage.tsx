/**
 * Communication & Correspondence Domain Pack — canonical admin shell (Epic 2.7).
 * Route: /admin/communication-domain (module: communication_domain).
 *
 * Reuses existing notification_templates and comm_* assets — this screen is
 * the shared reference/config surface (channels, correspondence types,
 * recipient preferences, template bindings, legal notice mapping, delivery
 * statuses, provider codes, recipient resolver). It does NOT replace the
 * template designer at /admin/notification-templates.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCommunicationChannels, useCorrespondenceTypes, useDeliveryStatuses,
  useRecipientPreferences, useTemplateBindings, useLegalNoticeMappings,
  useProviderCodes, useResolveRecipient,
} from '@/hooks/communication/useCommunicationDomain';
import type { PartySourceSystem } from '@/services/participant/partyProjectionService';

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
      No {label} configured yet. Seed via the reference framework or import action.
    </div>
  );
}

function DataTable({ columns, rows, empty }: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  rows: any[]; empty: string;
}) {
  if (!rows?.length) return <EmptyState label={empty} />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>{columns.map(c => (
            <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-t">
              {columns.map(c => (
                <td key={c.key} className="px-3 py-2 align-top">
                  {c.render ? c.render(r)
                    : (Array.isArray(r[c.key]) ? r[c.key].join(', ') : (r[c.key] ?? '—'))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CommunicationDomainPage() {
  const channels    = useCommunicationChannels();
  const types       = useCorrespondenceTypes();
  const statuses    = useDeliveryStatuses();
  const preferences = useRecipientPreferences();
  const bindings    = useTemplateBindings();
  const legalMap    = useLegalNoticeMappings();
  const providers   = useProviderCodes();

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Communication & Correspondence Domain"
        subtitle="Shared foundation for channels, correspondence types, recipient preferences, template bindings, legal notice mapping, delivery statuses and provider codes. Reuses notification_templates and comm_* assets. Consumed by BN, Claims, Compliance, Legal, Member, Employer, Finance, HRMS and Portals."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consumption model</CardTitle>
          <CardDescription>
            All correspondence config flows through <code>useCommunicationDomain()</code> hooks
            and <code>communicationDomainService</code>. Recipients resolve through the
            <Link to="/admin/participant" className="underline mx-1">Participant facade</Link>
            (via <code>v_ssp_party_projection</code>). Templates continue to live in
            <Link to="/admin/notification-templates" className="underline mx-1">Notification Templates</Link>
            — this screen only <em>binds</em> templates to correspondence types and channels.
            Legal notices link to
            <Link to="/admin/legal-reference" className="underline mx-1">Legal Reference</Link>.
            Legacy <code>comm_*</code>, <code>notification_*</code>, BN, Legal, Compliance,
            BEMA and IA tables are untouched.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="types">Correspondence Types</TabsTrigger>
          <TabsTrigger value="preferences">Recipient Preferences</TabsTrigger>
          <TabsTrigger value="bindings">Template Bindings</TabsTrigger>
          <TabsTrigger value="legal-map">Legal Notice Mapping</TabsTrigger>
          <TabsTrigger value="statuses">Delivery Statuses</TabsTrigger>
          <TabsTrigger value="providers">Provider Codes</TabsTrigger>
          <TabsTrigger value="resolver">Recipient Resolver</TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <DataTable empty="communication channels" rows={channels.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'is_two_way', label: 'Two-way',
                render: (r) => (r.is_two_way ? 'Yes' : 'No') },
              { key: 'supports_attachments', label: 'Attachments',
                render: (r) => (r.supports_attachments ? 'Yes' : 'No') },
              { key: 'sort_order', label: 'Order' },
            ]} />
        </TabsContent>

        <TabsContent value="types">
          <DataTable empty="correspondence types" rows={types.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'legal_binding', label: 'Legal binding',
                render: (r) => (r.legal_binding ? 'Yes' : 'No') },
            ]} />
        </TabsContent>

        <TabsContent value="preferences">
          <DataTable empty="recipient preferences" rows={preferences.data ?? []}
            columns={[
              { key: 'party_source', label: 'Source' },
              { key: 'party_ref', label: 'Party Ref' },
              { key: 'channel_code', label: 'Channel' },
              { key: 'is_preferred', label: 'Preferred',
                render: (r) => (r.is_preferred ? 'Yes' : 'No') },
              { key: 'opt_in', label: 'Opt-in',
                render: (r) => (r.opt_in ? 'Yes' : 'No') },
              { key: 'effective_from', label: 'From' },
              { key: 'effective_to', label: 'To' },
            ]} />
        </TabsContent>

        <TabsContent value="bindings" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Correspondence → Template bindings</CardTitle>
              <CardDescription>
                Bind a correspondence type + channel to an existing notification
                template. Templates themselves are authored in
                <Link to="/admin/notification-templates" className="underline mx-1">
                  Notification Templates
                </Link>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable empty="template bindings" rows={bindings.data ?? []}
                columns={[
                  { key: 'correspondence_code', label: 'Correspondence' },
                  { key: 'channel_code', label: 'Channel' },
                  { key: 'template_source', label: 'Template Source' },
                  { key: 'template_ref', label: 'Template Ref' },
                  { key: 'language_code', label: 'Language' },
                  { key: 'country_code', label: 'Country' },
                  { key: 'is_default', label: 'Default',
                    render: (r) => (r.is_default ? 'Yes' : 'No') },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal-map" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legal notice mapping</CardTitle>
              <CardDescription>
                Correspondence types marked as <em>legal binding</em> should
                cite an act/section from the
                <Link to="/admin/legal-reference" className="underline mx-1">Legal Reference domain</Link>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable empty="legal notice mappings" rows={legalMap.data ?? []}
                columns={[
                  { key: 'correspondence_code', label: 'Correspondence' },
                  { key: 'legal_reference_code', label: 'Legal Reference' },
                  { key: 'country_code', label: 'Country' },
                  { key: 'citation', label: 'Citation' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statuses">
          <DataTable empty="delivery statuses" rows={statuses.data ?? []}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'is_terminal', label: 'Terminal',
                render: (r) => (r.is_terminal ? 'Yes' : 'No') },
              { key: 'is_success', label: 'Success',
                render: (r) => (r.is_success ? 'Yes' : 'No') },
            ]} />
        </TabsContent>

        <TabsContent value="providers">
          <DataTable empty="provider codes" rows={providers.data ?? []}
            columns={[
              { key: 'channel_code', label: 'Channel' },
              { key: 'provider_name', label: 'Provider' },
              { key: 'provider_code', label: 'Provider Code' },
              { key: 'internal_code', label: 'Internal Code' },
              { key: 'code_type', label: 'Type' },
            ]} />
        </TabsContent>

        <TabsContent value="resolver">
          <RecipientResolverTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecipientResolverTab() {
  const [source, setSource] = useState<PartySourceSystem>('ip_master');
  const [legacyId, setLegacyId] = useState('');
  const [query, setQuery] = useState<{ src: PartySourceSystem; id: string } | null>(null);
  const { data, isLoading, error } = useResolveRecipient(query?.src, query?.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recipient resolver</CardTitle>
        <CardDescription>
          Resolves a legacy party (SSN for members, REGNO for employers) through
          the Participant facade and returns its communication preferences.
          Read-only — no legacy tables touched.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Source</label>
            <Select value={source} onValueChange={(v) => setSource(v as PartySourceSystem)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ip_master">ip_master (Member)</SelectItem>
                <SelectItem value="er_master">er_master (Employer)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Legacy identifier</label>
            <Input placeholder={source === 'ip_master' ? 'SSN (e.g. 000123)' : 'REGNO (e.g. 000456)'}
              value={legacyId} onChange={(e) => setLegacyId(e.target.value)}
              className="w-64" />
          </div>
          <Button onClick={() => setQuery({ src: source, id: legacyId.trim() })}
            disabled={!legacyId.trim()}>Resolve</Button>
          <Badge variant="outline">Read-only</Badge>
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Resolving…</div>}
        {error && <div className="text-sm text-destructive">Error: {String((error as any).message ?? error)}</div>}

        {data && (
          <div className="space-y-3">
            {data.party ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">{data.party.display_name || '(unnamed)'} </div>
                <div className="text-xs text-muted-foreground">
                  {data.party.party_kind} · {data.party.primary_identifier_type}
                  {' '}{data.party.primary_identifier} · Roles:{' '}
                  {(data.party.projected_roles ?? []).join(', ')}
                </div>
                <div className="mt-2 text-xs">
                  Preferred channel:{' '}
                  <Badge variant={data.preferredChannel ? 'default' : 'outline'}>
                    {data.preferredChannel ?? 'none configured'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No party found for that identifier.
              </div>
            )}

            <DataTable empty="preferences for this recipient" rows={data.preferences}
              columns={[
                { key: 'channel_code', label: 'Channel' },
                { key: 'is_preferred', label: 'Preferred',
                  render: (r) => (r.is_preferred ? 'Yes' : 'No') },
                { key: 'opt_in', label: 'Opt-in',
                  render: (r) => (r.opt_in ? 'Yes' : 'No') },
                { key: 'effective_from', label: 'From' },
                { key: 'effective_to', label: 'To' },
              ]} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
