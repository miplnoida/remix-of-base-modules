/**
 * Compliance Feature Toggle Runtime Diagnostics (UAT only).
 *
 * Reachable via direct URL: /compliance/admin/feature-toggle-diagnostics
 * Not added to the main sidebar. Gated by the existing Compliance Setup
 * permission via PermissionWrapper. Read-only.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useComplianceFeatureFlagsBootstrap } from '@/hooks/compliance/useComplianceFeatureFlags';
import {
  getComplianceDbFlag,
  hasComplianceDbFlagsLoaded,
  subscribeComplianceDbFlags,
} from '@/lib/compliance/featureFlagCache';
import {
  isComplianceFeatureEnabled,
  COMPLIANCE_HELPER_TO_DB_FLAG,
  type ComplianceFeatureKey,
} from '@/lib/compliance/featureToggles';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

const PHASE1_DB_FLAGS = [
  'compliance.core.verification_queue',
  'compliance.payment.arrangement',
  'compliance.risk.automation_jobs',
];

const PHASE1_HELPER_KEYS: ComplianceFeatureKey[] = [
  'violations.verificationQueue',
  'arrangements.new',
  'arrangements.active',
  'arrangements.pendingApproval',
  'arrangements.installmentsDue',
  'arrangements.paymentAllocation',
  'reports.automationJobs',
];

interface RouteTest {
  path: string;
  flagKey: string;
  expectedWhenOff: 'FeatureDisabled' | 'blocked-write' | 'normal';
}

const ROUTE_TESTS: RouteTest[] = [
  { path: '/compliance/violations/verification-queue', flagKey: 'compliance.core.verification_queue', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/arrangements/new', flagKey: 'compliance.payment.arrangement', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/arrangements/active', flagKey: 'compliance.payment.arrangement', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/arrangements/payment-allocation', flagKey: 'compliance.payment.arrangement', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/admin/automation/jobs', flagKey: 'compliance.risk.automation_jobs', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/reports/automation-jobs', flagKey: 'compliance.risk.automation_jobs', expectedWhenOff: 'FeatureDisabled' },
];

function BoolBadge({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <Badge variant="outline">unloaded</Badge>;
  return value ? <Badge className="bg-emerald-600">ON</Badge> : <Badge variant="destructive">OFF</Badge>;
}

export default function FeatureToggleDiagnosticsPage() {
  const auth = useSupabaseAuth();
  const { isLoading, isError, refetch } = useComplianceFeatureFlagsBootstrap();
  // Force re-render when cache changes
  const [, setTick] = useState(0);
  useEffect(() => subscribeComplianceDbFlags(() => setTick((t) => t + 1)), []);

  const loaded = hasComplianceDbFlagsLoaded();

  return (
    <PermissionWrapper moduleName="ce_admin_feature_toggles">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Feature Toggle Runtime Diagnostics"
          subtitle="UAT-only — verifies the DB feature_flags ↔ runtime helper bridge."
        />

        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 flex gap-3 items-start text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">UAT diagnostics only.</p>
              <p className="text-muted-foreground">
                Do not link this page from the main menu. Read-only view of the
                compliance feature toggle runtime cache. Reachable by direct URL.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1. Session & cache status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-muted-foreground">User:</span> <span className="font-mono">{auth?.user?.email ?? '—'}</span></div>
            <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{auth?.user?.id ?? '—'}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Cache loaded:</span> <BoolBadge value={loaded} />
              {isLoading && <Badge variant="outline">loading…</Badge>}
              {isError && <Badge variant="destructive">load error</Badge>}
              <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-auto gap-2">
                <RefreshCw className="h-3 w-3" /> Refresh flags
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Raw DB flag values (Phase 1)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2">flag_key</th>
                  <th className="py-2">DB value</th>
                </tr>
              </thead>
              <tbody>
                {PHASE1_DB_FLAGS.map((k) => (
                  <tr key={k} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{k}</td>
                    <td className="py-2"><BoolBadge value={getComplianceDbFlag(k)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Runtime helper results (isComplianceFeatureEnabled)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2">helper key</th>
                  <th className="py-2">mapped DB key</th>
                  <th className="py-2">result</th>
                </tr>
              </thead>
              <tbody>
                {PHASE1_HELPER_KEYS.map((k) => (
                  <tr key={k} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{k}</td>
                    <td className="py-2 font-mono text-xs">{COMPLIANCE_HELPER_TO_DB_FLAG[k] ?? '—'}</td>
                    <td className="py-2"><BoolBadge value={isComplianceFeatureEnabled(k)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Active route tests</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2">route</th>
                  <th className="py-2">flag</th>
                  <th className="py-2">DB</th>
                  <th className="py-2">expected when OFF</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {ROUTE_TESTS.map((t) => (
                  <tr key={t.path} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{t.path}</td>
                    <td className="py-2 font-mono text-xs">{t.flagKey}</td>
                    <td className="py-2"><BoolBadge value={getComplianceDbFlag(t.flagKey)} /></td>
                    <td className="py-2 text-xs">{t.expectedWhenOff}</td>
                    <td className="py-2 text-right">
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to={t.path} target="_blank" rel="noreferrer">
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Where to change flags</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Edit at{' '}
            <Link to="/compliance/admin/feature-toggles" className="text-primary underline">
              Compliance → Setup → Feature Toggles
            </Link>. Click <em>Refresh flags</em> above after changing.
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}
