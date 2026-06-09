/**
 * Rule Governance Status Card
 *
 * Surfaces a live snapshot of the BN Rule Governance pipeline:
 *   - count of catalogue rules per governance_status
 *   - count of rules attached to ACTIVE product versions that are NOT yet
 *     LEGAL_CONFIRMED / READY_FOR_PRODUCT_USE / ACTIVE (publish-blocking)
 *   - basic workflow plumbing check (roles + workflow template exist)
 *
 * Read-only — no transitions are triggered from here. Drives the
 * Configuration Validation dashboard.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GovernanceStatusBadge } from './GovernanceStatusBadge';
import type { GovernanceStatus } from '@/services/bn/governance/ruleGovernanceService';

const db = supabase as any;

const STATUSES: GovernanceStatus[] = [
  'DRAFT',
  'TECHNICAL_REVIEW',
  'LEGAL_REVIEW',
  'LEGAL_CONFIRMED',
  'READY_FOR_PRODUCT_USE',
  'ACTIVE',
  'RETIRED',
];

const REQUIRED_ROLES = [
  'BN_RULE_AUTHOR',
  'BN_RULE_TECHNICAL_REVIEWER',
  'BN_RULE_LEGAL_APPROVER',
  'BN_PRODUCT_MANAGER',
  'BN_PRODUCT_APPROVER',
  'BN_CONFIG_ADMIN',
  'BN_AUDITOR',
];

interface Snapshot {
  counts: Record<GovernanceStatus, number>;
  total: number;
  ungovernedOnActive: number;
  rolesPresent: number;
  workflowExists: boolean;
  workbasketCount: number;
}

async function loadSnapshot(): Promise<Snapshot> {
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<GovernanceStatus, number>);

  const { data: cat } = await db
    .from('bn_rule_catalogue')
    .select('governance_status');
  let total = 0;
  for (const r of (cat ?? []) as any[]) {
    const s = (r.governance_status ?? 'DRAFT') as GovernanceStatus;
    if (counts[s] !== undefined) counts[s]++;
    total++;
  }

  // Attached rules on ACTIVE versions
  const { data: activeVersions } = await db
    .from('bn_product_version')
    .select('id')
    .eq('status', 'ACTIVE');
  const activeIds = ((activeVersions ?? []) as any[]).map(v => v.id);

  let ungovernedOnActive = 0;
  if (activeIds.length > 0) {
    const { data: attached } = await db
      .from('bn_eligibility_rule')
      .select('catalogue_rule_id')
      .in('product_version_id', activeIds)
      .not('catalogue_rule_id', 'is', null);

    const ids = Array.from(new Set(((attached ?? []) as any[]).map(a => a.catalogue_rule_id)));
    if (ids.length > 0) {
      const { data: catRows } = await db
        .from('bn_rule_catalogue')
        .select('id, governance_status')
        .in('id', ids);
      const allowed = new Set(['LEGAL_CONFIRMED', 'READY_FOR_PRODUCT_USE', 'ACTIVE']);
      ungovernedOnActive = ((catRows ?? []) as any[]).filter(
        r => !allowed.has(r.governance_status),
      ).length;
    }
  }

  const { data: roles } = await db
    .from('roles')
    .select('role_code')
    .in('role_code', REQUIRED_ROLES);
  const rolesPresent = (roles ?? []).length;

  const { data: wf } = await db
    .from('workflow_definitions')
    .select('id')
    .eq('workflow_name', 'RULE_GOVERNANCE_WORKFLOW')
    .maybeSingle();
  const workflowExists = !!wf;

  const { data: wb } = await db
    .from('bn_workbasket')
    .select('id')
    .like('workbasket_code', 'BN_GOV_%');
  const workbasketCount = (wb ?? []).length;

  return { counts, total, ungovernedOnActive, rolesPresent, workflowExists, workbasketCount };
}

export function RuleGovernanceStatusCard() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setSnap(await loadSnapshot());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const allRolesOk = snap?.rolesPresent === REQUIRED_ROLES.length;
  const plumbingOk = allRolesOk && snap?.workflowExists && (snap?.workbasketCount ?? 0) >= 6;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Rule Governance Pipeline</CardTitle>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {snap && snap.ungovernedOnActive > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Governance gap on ACTIVE products</AlertTitle>
            <AlertDescription>
              {snap.ungovernedOnActive} catalogue rule(s) are attached to ACTIVE product versions but
              have not reached <strong>LEGAL_CONFIRMED</strong>. Re-publish is blocked for these
              products until governance is advanced.
            </AlertDescription>
          </Alert>
        )}

        {snap && !plumbingOk && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Governance plumbing incomplete</AlertTitle>
            <AlertDescription>
              Roles present: {snap.rolesPresent}/{REQUIRED_ROLES.length} ·{' '}
              Workflow template: {snap.workflowExists ? 'OK' : 'MISSING'} ·{' '}
              Workbaskets: {snap.workbasketCount}/6
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {STATUSES.map((s) => (
            <div
              key={s}
              className="flex flex-col items-start gap-2 rounded-md border bg-card p-3"
            >
              <GovernanceStatusBadge status={s} />
              <span className="text-2xl font-semibold">{snap?.counts[s] ?? '–'}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Total catalogue rules: <strong>{snap?.total ?? '–'}</strong></span>
          <Badge variant={plumbingOk ? 'default' : 'secondary'}>
            {plumbingOk ? 'Plumbing OK' : 'Plumbing check'}
          </Badge>
          <Badge variant={snap?.ungovernedOnActive ? 'destructive' : 'default'}>
            {snap?.ungovernedOnActive
              ? `${snap.ungovernedOnActive} ungoverned on ACTIVE`
              : 'No ungoverned ACTIVE rules'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
