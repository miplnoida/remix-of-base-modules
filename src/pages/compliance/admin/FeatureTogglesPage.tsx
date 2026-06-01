import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useActionPermissions } from '@/hooks/useActionPermission';
import { useUserCode } from '@/hooks/useUserCode';
import { PageShell } from '@/components/common/PageShell';
import { toast } from 'sonner';
import { Info, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

const MODULE_NAME = 'compliance_admin_feature_toggles';
const FLAG_PREFIX = 'compliance.';

interface CatalogEntry {
  key: string;
  name: string;
  group: string;
  description: string;
  fallback: string;
}

// Catalog mirrors seeded compliance.* flags. Group ordering preserved.
const CATALOG: CatalogEntry[] = [
  // Core Case Flow
  { key: 'compliance.core.verification_queue', name: 'Verification Queue', group: 'Core Case Flow', description: 'Manual verification step for incoming violations before case creation.', fallback: 'Violations skip verification and go directly to case intake.' },
  { key: 'compliance.core.case_merge', name: 'Case Merge', group: 'Core Case Flow', description: 'Allow officers to merge duplicate compliance cases.', fallback: 'Cases must be closed individually; no merge action available.' },
  { key: 'compliance.core.case_reopen', name: 'Case Reopen', group: 'Core Case Flow', description: 'Allow reopening of closed compliance cases.', fallback: 'Closed cases are final; a new case must be opened instead.' },
  { key: 'compliance.core.notice_approval', name: 'Notice Approval', group: 'Core Case Flow', description: 'Require supervisor approval before notices are issued.', fallback: 'Notices are issued immediately without approval.' },
  { key: 'compliance.core.case_closure_approval', name: 'Case Closure Approval', group: 'Core Case Flow', description: 'Require supervisor approval before closing a compliance case.', fallback: 'Officers close cases directly without supervisor approval.' },

  // Employer Interaction
  { key: 'compliance.employer.online_response', name: 'Employer Online Response', group: 'Employer Interaction', description: 'Allow employers to respond to notices via the online portal.', fallback: 'Employer responses are accepted in person or by email only.' },
  { key: 'compliance.employer.self_service', name: 'Employer Self Service Compliance', group: 'Employer Interaction', description: 'Enable self-service compliance actions for employers.', fallback: 'All employer actions are handled by compliance officers.' },
  { key: 'compliance.employer.evidence_upload', name: 'Evidence Upload', group: 'Employer Interaction', description: 'Allow employers to upload evidence for disputes.', fallback: 'Evidence must be submitted physically to the office.' },
  { key: 'compliance.employer.dispute_submission', name: 'Dispute Submission', group: 'Employer Interaction', description: 'Allow employers to submit disputes through the portal.', fallback: 'Disputes must be filed manually with a compliance officer.' },
  { key: 'compliance.employer.arrangement_request', name: 'Arrangement Request', group: 'Employer Interaction', description: 'Allow employers to request payment arrangements online.', fallback: 'Arrangement requests are accepted only in person.' },

  // Payment And Recovery
  { key: 'compliance.payment.arrangement', name: 'Payment Arrangement', group: 'Payment And Recovery', description: 'Enable payment arrangement workflow.', fallback: 'Only full payment is accepted; no installments.' },
  { key: 'compliance.payment.allocation', name: 'Payment Allocation', group: 'Payment And Recovery', description: 'Enable manual/automatic allocation of payments to installments.', fallback: 'Payments are applied using the default ledger rule only.' },
  { key: 'compliance.payment.installment_breach_detection', name: 'Installment Breach Detection', group: 'Payment And Recovery', description: 'Automatically detect missed installments and flag breaches.', fallback: 'Breaches must be detected and recorded manually.' },
  { key: 'compliance.payment.waiver_requests', name: 'Waiver Requests', group: 'Payment And Recovery', description: 'Enable employer waiver request workflow.', fallback: 'No waivers can be requested or granted in the system.' },

  // Inspection
  { key: 'compliance.inspection.field', name: 'Field Inspection', group: 'Inspection', description: 'Enable field inspection module.', fallback: 'Inspections are recorded outside the system.' },
  { key: 'compliance.inspection.planning', name: 'Inspection Planning', group: 'Inspection', description: 'Enable weekly inspection planning workflow.', fallback: 'Inspections are assigned ad hoc without a weekly plan.' },
  { key: 'compliance.inspection.evidence', name: 'Inspection Evidence', group: 'Inspection', description: 'Allow inspectors to attach evidence to findings.', fallback: 'Findings are recorded without supporting evidence.' },
  { key: 'compliance.inspection.convert_finding', name: 'Convert Finding To Violation', group: 'Inspection', description: 'Allow inspectors to convert inspection findings into violations.', fallback: 'Findings remain informational and never become violations.' },

  // Legal
  { key: 'compliance.legal.handoff', name: 'Legal Handoff', group: 'Legal', description: 'Enable handoff of cases to the Legal module.', fallback: 'Legal action must be initiated outside this system.' },
  { key: 'compliance.legal.pack_generation', name: 'Legal Pack Generation', group: 'Legal', description: 'Enable automated legal pack/document generation.', fallback: 'Legal packs are prepared manually.' },
  { key: 'compliance.legal.court_monitoring', name: 'Court Or Judgment Monitoring', group: 'Legal', description: 'Monitor court status and judgments for escalated cases.', fallback: 'Court status is tracked outside the system.' },
  { key: 'compliance.legal.returned_handling', name: 'Returned From Legal Handling', group: 'Legal', description: 'Workflow for cases returned by the Legal module.', fallback: 'Returned cases are handled manually with no dedicated queue.' },

  // Risk And Automation
  { key: 'compliance.risk.scoring', name: 'Risk Scoring', group: 'Risk And Automation', description: 'Enable employer risk scoring engine.', fallback: 'Risk is assessed manually by officers.' },
  { key: 'compliance.risk.automation_jobs', name: 'Automation Jobs', group: 'Risk And Automation', description: 'Run scheduled automation jobs for compliance.', fallback: 'No background automation runs; all actions are manual.' },
  { key: 'compliance.risk.automated_escalation', name: 'Automated Escalation', group: 'Risk And Automation', description: 'Auto-escalate cases when escalation rules match.', fallback: 'Escalations are decided manually by supervisors.' },
  { key: 'compliance.risk.rule_simulator', name: 'Rule Simulator', group: 'Risk And Automation', description: 'Simulate rule changes before activation.', fallback: 'Rule changes go live without a simulation step.' },
  { key: 'compliance.risk.risk_simulator', name: 'Risk Simulator', group: 'Risk And Automation', description: 'Simulate risk scoring outcomes against historical data.', fallback: 'Risk scoring changes cannot be simulated.' },

  // Reporting And Analytics
  { key: 'compliance.reports.standard', name: 'Standard Reports', group: 'Reporting And Analytics', description: 'Enable standard compliance reports.', fallback: 'Standard reports are unavailable in the UI.' },
  { key: 'compliance.reports.dashboards', name: 'Management Dashboards', group: 'Reporting And Analytics', description: 'Enable management dashboards.', fallback: 'Dashboards are hidden; only list views remain.' },
  { key: 'compliance.reports.advanced_analytics', name: 'Advanced Analytics And Forecasting', group: 'Reporting And Analytics', description: 'Enable advanced analytics and forecasting views.', fallback: 'Only basic reports are available; no forecasting.' },

  // External Integrations
  { key: 'compliance.integration.employer_portal', name: 'Employer Portal', group: 'External Integrations', description: 'Integration with the employer-facing portal.', fallback: 'Portal-driven flows are disabled.' },
  { key: 'compliance.integration.legal_module', name: 'Legal Module', group: 'External Integrations', description: 'Integration with the Legal module.', fallback: 'Legal data is not synchronised with the Legal module.' },
  { key: 'compliance.integration.finance_cashier', name: 'Finance Or Cashier Integration', group: 'External Integrations', description: 'Integration with finance/cashier for payments.', fallback: 'Payments must be reconciled manually outside the system.' },
  { key: 'compliance.integration.external_agency', name: 'External Agency Referral', group: 'External Integrations', description: 'Allow referrals to external enforcement agencies.', fallback: 'External agency referrals are handled outside the system.' },
];

const GROUP_ORDER = [
  'Core Case Flow',
  'Employer Interaction',
  'Payment And Recovery',
  'Inspection',
  'Legal',
  'Risk And Automation',
  'Reporting And Analytics',
  'External Integrations',
];

interface FlagRow {
  id: string;
  flag_key: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

function FeatureTogglesInner() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const { can, isAdmin } = useActionPermissions(MODULE_NAME);
  const editable = isAdmin || can('edit') || can('update') || can('manage');

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // NOTE: unique queryKey on purpose — the global bootstrap hook
  // (useComplianceFeatureFlagsBootstrap) uses 'compliance-feature-flags' with a
  // different return shape (Record<string, boolean>). Sharing the key caused
  // the page to read a non-array from cache and crash with TypeError.
  const { data: flagRowsRaw, isLoading, error, refetch } = useQuery({
    queryKey: ['compliance-feature-flags-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, flag_key, display_name, description, is_enabled, updated_at, updated_by')
        .like('flag_key', `${FLAG_PREFIX}%`)
        .order('flag_key');
      if (error) throw error;
      return (data || []) as FlagRow[];
    },
  });
  // Defensive: tolerate any unexpected cache shape without crashing the page.
  const flagRows: FlagRow[] = Array.isArray(flagRowsRaw) ? flagRowsRaw : [];

  const flagsByKey = useMemo(() => {
    const m = new Map<string, FlagRow>();
    flagRows.forEach((f) => m.set(f.flag_key, f));
    return m;
  }, [flagRows]);

  const toggleMutation = useMutation({
    mutationFn: async (params: { row: FlagRow; next: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          is_enabled: params.next,
          updated_by: userCode || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.row.id);
      if (error) throw error;
    },
    onMutate: (p) => setSavingKey(p.row.flag_key),
    onSettled: () => setSavingKey(null),
    onSuccess: (_, p) => {
      qc.invalidateQueries({ queryKey: ['compliance-feature-flags-admin'] });
      qc.invalidateQueries({ queryKey: ['compliance-feature-flags'] });
      toast.success(`${p.row.display_name} ${p.next ? 'enabled' : 'disabled'}`);
    },
    onError: (e: any) => toast.error('Failed to update: ' + (e?.message || 'Unknown error')),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CATALOG.filter((c) => {
      if (groupFilter !== 'all' && c.group !== groupFilter) return false;
      const row = flagsByKey.get(c.key);
      const enabled = row?.is_enabled ?? false;
      if (statusFilter === 'enabled' && !enabled) return false;
      if (statusFilter === 'disabled' && enabled) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [search, groupFilter, statusFilter, flagsByKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogEntry[]>();
    GROUP_ORDER.forEach((g) => map.set(g, []));
    filtered.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    });
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  const missingCount = CATALOG.filter((c) => !flagsByKey.has(c.key)).length;

  return (
    <PageShell
      title="Feature Toggles"
      subtitle="Enable or disable optional Compliance & Enforcement capabilities"
      breadcrumbs={[
        { label: 'Compliance & Enforcement' },
        { label: 'Setup' },
        { label: 'Feature Toggles' },
      ]}
      isLoading={isLoading}
      error={error ? (error as Error).message : null}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <CardTitle className="text-base">About Feature Toggles</CardTitle>
              <CardDescription className="mt-1">
                Feature toggles let administrators detach optional Compliance stages without code changes.
                When a feature is disabled the related screens, workflows, and automations stop running,
                and the documented fallback behavior takes over. Changes apply immediately and are audited.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {missingCount > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <span>
              {missingCount} feature toggle{missingCount === 1 ? '' : 's'} from the catalog {missingCount === 1 ? 'is' : 'are'} not yet seeded in the database. Run the latest seed migration to make them configurable.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, key, or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {GROUP_ORDER.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {grouped.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No feature toggles match the current filters.
          </CardContent>
        </Card>
      )}

      {grouped.map(([groupName, entries]) => (
        <Card key={groupName}>
          <CardHeader>
            <CardTitle className="text-lg">{groupName}</CardTitle>
            <CardDescription>{entries.length} feature{entries.length === 1 ? '' : 's'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((c) => {
              const row = flagsByKey.get(c.key);
              const enabled = row?.is_enabled ?? false;
              const isSaving = savingKey === c.key;
              return (
                <div
                  key={c.key}
                  className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 p-4 border rounded-lg bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium">{c.name}</h4>
                      <Badge variant={enabled ? 'default' : 'secondary'}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {!row && <Badge variant="outline" className="text-destructive border-destructive/40">Not seeded</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{c.key}</p>
                    <p className="text-sm mt-2">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">When disabled:</span> {c.fallback}
                    </p>
                    {row?.updated_at && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Last updated {formatDateForDisplay(row.updated_at)}
                        {row.updated_by ? ` by ${row.updated_by}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:pt-1">
                    <Switch
                      checked={enabled}
                      disabled={!row || !editable || isSaving || toggleMutation.isPending}
                      onCheckedChange={(v) => row && toggleMutation.mutate({ row, next: v })}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </PageShell>
  );
}

export default function FeatureTogglesPage() {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <FeatureTogglesInner />
    </PermissionWrapper>
  );
}
